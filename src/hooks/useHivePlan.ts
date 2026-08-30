import { useState, useCallback, useEffect, useRef } from 'react';
import type { HivePlan, PlacedBuilding, EditorState, ToolMode } from '../types';
import { createEmptyPlan, generateId, canPlaceBuilding, isWithinGrid } from '../utils/grid';
import { getBuildingById } from '../data/buildings';
import {
  savePlansToStorage,
  loadPlansFromStorage,
  saveCurrentPlanId,
  loadCurrentPlanId,
  loadPlanFromUrl,
  sanitizeShareToken,
} from '../utils/storage';
import {
  listPlans,
  upsertPlan,
  deletePlanRow,
  joinPlanByToken,
  getPlanById,
  acquireEditLock,
  heartbeatEditLock,
  releaseEditLock,
  takeEditLock,
} from '../utils/cloudStorage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { trackEvent, Events } from '../utils/analytics';
import { HIVE_TEMPLATES } from '../data/templates';

const MIGRATED_KEY = 'hivewar-migrated-to-cloud';
const SAVE_DEBOUNCE_MS = 500;
const HEARTBEAT_MS = 60_000;
const LOCK_STALE_MS = 3 * 60_000;
const BOOTSTRAP_TIMEOUT_MS = 8_000;
const SEED_PLAN_KEY = 'hivewar-seed-plan-id';

// Wrap async operations with timeout to prevent silent hangs
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => 
      setTimeout(() => resolve(fallback), timeoutMs)
    ),
  ]);
}

export interface EditLockState {
  editorUserId: string | null;
  acquiredAt: number | null; // epoch ms
}

export function useHivePlan() {
  const { user, loading: authLoading } = useAuth();

  const [plans, setPlans] = useState<HivePlan[]>([]);
  // Eager seed: immediately load from cache or create from Diamond Defense template
  // SYNCHRONOUSLY so visitors see the hive before auth completes. Bootstrap will
  // sync this to cloud when ready. ZERO awaits before SEED_PLAN_KEY is written.
  const [currentPlan, setCurrentPlan] = useState<HivePlan | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasShareToken = !!(params.get('share') || params.get('view'));
    if (hasShareToken) return null; // Let bootstrap handle share links
    
    // Try cache first
    const cached = loadPlansFromStorage();
    if (cached.length > 0) {
      const mostRecent = cached.reduce((latest, p) => 
        (!latest || p.updatedAt > latest.updatedAt) ? p : latest, 
        cached[0]
      );
      sessionStorage.setItem(SEED_PLAN_KEY, mostRecent.id);
      return mostRecent;
    }
    
    // No cache - seed from Diamond Defense template SYNCHRONOUSLY (no await!)
    const newPlan = createEmptyPlan('Diamond Defense');
    const diamondTemplate = HIVE_TEMPLATES.find(t => t.id === 'diamond-defense');
    if (diamondTemplate) {
      newPlan.buildings = diamondTemplate.buildings.map(b => ({
        ...b,
        id: generateId()
      }));
    }
    
    // Write to storage and mark as seed BEFORE any async can interfere
    savePlansToStorage([newPlan]);
    saveCurrentPlanId(newPlan.id);
    sessionStorage.setItem(SEED_PLAN_KEY, newPlan.id);
    
    return newPlan;
  });
  const [editorState, setEditorState] = useState<EditorState>({
    selectedBuildingId: null,
    selectedBuildingTypeId: null,
    toolMode: 'select',
    showGrid: true,
    showCoords: false,
    snapToGrid: true,
  });
  const [history, setHistory] = useState<PlacedBuilding[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Track if user joined via share/view link to suppress onboarding
  const [joinedViaShareLink, setJoinedViaShareLink] = useState(false);
  // Track if user is in view-only mode (from ?view= link)
  const [isViewOnly, setIsViewOnly] = useState(false);
  // Track bootstrap errors for user feedback
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  // Track when bootstrap has completed successfully (for hive-first token mint)
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  
  // Guard to prevent bootstrap from creating multiple plans if effect runs multiple times
  const bootstrappedRef = useRef(false);
  // In-flight flag to prevent overlapping bootstrap calls from creating duplicate plans
  const bootstrapInFlightRef = useRef(false);

  // Live editing lock for the currently-viewed plan. Null when the plan
  // is unshared (only one user) or when the lock state is still loading.
  const [lockState, setLockState] = useState<EditLockState>({
    editorUserId: null,
    acquiredAt: null,
  });
  const lockStateRef = useRef(lockState);
  lockStateRef.current = lockState;

  // Sync plans state with currentPlan on mount if seeded
  useEffect(() => {
    if (currentPlan && plans.length === 0) {
      setPlans([currentPlan]);
    }
  }, []);

  // Number of OTHER users currently subscribed to the plan's realtime
  // channel (peer count via Supabase Realtime Presence).
  const [peerCount, setPeerCount] = useState(0);

  // Pending debounced cloud save (per plan id) so rapid edits coalesce.
  const saveTimers = useRef<Map<string, number>>(new Map());

  // Initialize once auth is ready: pull from cloud, migrate localStorage on
  // first run, fall back to creating an empty plan for brand-new users.
  useEffect(() => {
    if (authLoading || !user) return;
    // Prevent duplicate bootstraps if effect runs multiple times
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let cancelled = false;

    async function bootstrap() {
      try {
        // Guard against overlapping bootstrap calls from creating duplicate first-run plans
        if (bootstrapInFlightRef.current) {
          console.warn('[plan] Bootstrap already in flight, skipping duplicate call');
          return;
        }
        bootstrapInFlightRef.current = true;
        
        // Live-share / view token in URL: join the plan as a collaborator,
        // then it shows up in the regular cloud plan list via RLS.
        const params = new URLSearchParams(window.location.search);
        const rawToken = params.get('share') || params.get('view');
        // Sanitize the token to handle Discord backticks, trailing punctuation, etc.
        const collabToken = sanitizeShareToken(rawToken);
        const isViewOnlyLink = !!params.get('view');
        let joinedPlanId: string | null = null;
      
      // Check if view-only mode was preserved from a previous load
      // BUT only honor it if we have a collabToken in the URL, or if we're loading from a legacy URL plan.
      // Otherwise, clear the stale flag so normal users can create share links.
      const wasViewOnly = sessionStorage.getItem('hivewar-view-only') === 'true';
      if (wasViewOnly && !collabToken) {
        // Stale view-only flag without a current share link - clear it
        sessionStorage.removeItem('hivewar-view-only');
      }
      
      // REFRESH FIX: If we have a view token AND this is a refresh (wasViewOnly flag present),
      // optimistically load from cache immediately to avoid showing loading screen.
      // The rest of bootstrap will still run to verify/update from backend.
      if (collabToken && wasViewOnly) {
        const cachedPlans = loadPlansFromStorage();
        if (cachedPlans.length > 0) {
          setPlans(cachedPlans);
          // Find the most recently updated plan or first plan
          const mostRecent = cachedPlans.reduce((latest, p) => 
            (!latest || p.updatedAt > latest.updatedAt) ? p : latest, 
            cachedPlans[0]
          );
          setCurrentPlan(mostRecent);
          saveCurrentPlanId(mostRecent.id);
          // Set view-only state immediately
          setIsViewOnly(true);
          setJoinedViaShareLink(true);
        }
      }
      
      if (collabToken) {
        try {
          // Timeout guard: if joinPlanByToken hangs, fail fast so the user
          // can refresh or continue rather than staring at the spinner forever.
          const result = await withTimeout(
            joinPlanByToken(collabToken),
            BOOTSTRAP_TIMEOUT_MS,
            null as any
          );
          if (!result) {
            throw new Error('Join timed out. Check your connection and try again.');
          }
          if (cancelled) return;
          joinedPlanId = result.plan_id;
          setJoinedViaShareLink(true);
          
          // Track view-only mode for this session
          if (isViewOnlyLink || result.role === 'viewer') {
            setIsViewOnly(true);
            sessionStorage.setItem('hivewar-view-only', 'true');
          }
          
          trackEvent(Events.JOINED_VIA_LINK, { role: result.role });
          
          // Keep the ?view= param for view-only links (requirement: URL keeps ?view=)
          // Only remove ?share= tokens to avoid re-joining on refresh
          if (!isViewOnlyLink) {
            params.delete('share');
            const newSearch = params.toString();
            const newUrl =
              window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
            window.history.replaceState({}, '', newUrl);
          }
        } catch (e) {
          // Token is invalid, expired, or network failed. Instead of showing a
          // dead-end error screen, fall through to normal first-run so the user
          // sees Diamond Defense + "Copy alliance link" modal.
          console.error('[plan] joinPlanByToken failed:', e);
          console.log('[plan] Falling through to normal first-run experience');
          
          // Remove bad token from URL so refresh doesn't loop the error
          params.delete('view');
          params.delete('share');
          const newSearch = params.toString();
          const newUrl =
            window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
          window.history.replaceState({}, '', newUrl);
          
          // Clear any stale view-only flag
          sessionStorage.removeItem('hivewar-view-only');
          
          // Continue with normal bootstrap below (don't return early)
        }
      }

      // Legacy snapshot share (?plan=lzstring...) still loads as a read-only
      // local-only view; we don't auto-save it to the user's cloud account.
      const urlPlan = loadPlanFromUrl();
      if (urlPlan && !joinedPlanId) {
        if (cancelled) return;
        setCurrentPlan(urlPlan);
        setJoinedViaShareLink(true);
        setIsViewOnly(true);
        sessionStorage.setItem('hivewar-view-only', 'true');
        window.history.replaceState({}, '', window.location.pathname);
        // Don't create any new plans for view-only users
        return;
      }

      // Timeout guard: if listPlans hangs, bail early without changing state.
      // Keep what is already on screen, don't upsert, don't discard seed, don't setPlans([]).
      // Leave bootstrapComplete false so hive-first mint doesn't fire against an unsynced seed.
      let cloudPlans = await withTimeout(listPlans(), BOOTSTRAP_TIMEOUT_MS, null as any);
      if (cancelled) return;
      
      const cloudTimedOut = cloudPlans === null;
      if (cloudTimedOut) {
        console.warn('[plan] listPlans timed out, keeping on-screen state without sync');
        // Don't change state, don't set bootstrapComplete. The hive stays visible; mint waits.
        return;
      }

      // Read and preserve the seed from localStorage BEFORE any writes that might destroy it.
      const seedPlanId = sessionStorage.getItem(SEED_PLAN_KEY);
      let seededPlan: HivePlan | null = null;
      if (seedPlanId) {
        const cachedPlans = loadPlansFromStorage();
        seededPlan = cachedPlans.find(p => p.id === seedPlanId) || null;
      }

      // If listPlans returned empty but we have a seed, retry once to handle auth/RLS race.
      // A returning user with existing plans may briefly see [] due to RLS policy lag.
      if (cloudPlans.length === 0 && seedPlanId && !joinedPlanId) {
        console.log('[plan] Cloud empty but seed exists - retrying listPlans to catch auth race');
        await new Promise(resolve => setTimeout(resolve, 500));
        if (cancelled) return;
        cloudPlans = await withTimeout(listPlans(), BOOTSTRAP_TIMEOUT_MS, null as any);
        if (cancelled) return;
        if (cloudPlans === null) {
          // Second timeout - bail early without changing state
          console.warn('[plan] listPlans retry timed out, keeping on-screen state');
          return;
        }
        console.log('[plan] Retry complete, cloud has', cloudPlans.length, 'plans');
      }

      // First-time migration: if cloud is empty and we have localStorage
      // plans from the pre-cloud era (NOT including the seed), push them up.
      const alreadyMigrated = localStorage.getItem(MIGRATED_KEY) === 'true';
      if (cloudPlans.length === 0 && !alreadyMigrated && !joinedPlanId) {
        const localPlans = loadPlansFromStorage();
        // Filter out the seed plan - migration is ONLY for pre-cloud legacy plans
        const legacyPlans = localPlans.filter(p => p.id !== seedPlanId);
        if (legacyPlans.length > 0) {
          console.log('[plan] Migrating', legacyPlans.length, 'pre-cloud plans (excluding seed)');
          await Promise.all(legacyPlans.map((p) => upsertPlan(p, user!.id)));
          if (cancelled) return;
          cloudPlans = legacyPlans;
        }
        localStorage.setItem(MIGRATED_KEY, 'true');
      }

      // If cloud has plans and they are NOT the seed itself, discard the local seed.
      // (If cloud only contains the seed we upserted earlier, keep the seed marker for now.)
      if (seedPlanId && cloudPlans.length > 0) {
        const cloudHasNonSeedPlans = cloudPlans.some((p: HivePlan) => p.id !== seedPlanId);
        if (cloudHasNonSeedPlans) {
          // Cloud already has real plans (user is returning, not first-run).
          // Discard the seed - don't upsert it, don't merge it.
          console.log('[plan] Cloud has plans, discarding local seed:', seedPlanId);
          sessionStorage.removeItem(SEED_PLAN_KEY);
          seededPlan = null;
        }
      }

      setPlans(cloudPlans);
      // Mirror to localStorage as an offline cache.
      // Safe to overwrite now: if cloud has non-seed plans, we cleared seed above.
      // If cloud is empty, we haven't written yet and will upsert seed below.
      savePlansToStorage(cloudPlans);

      // If we just joined a plan via share/view token, switch to it.
      if (joinedPlanId) {
        let joined = cloudPlans.find((p: HivePlan) => p.id === joinedPlanId);
        if (!joined) {
          // Race: realtime / RLS might lag, fetch directly with retries.
          // Try up to 3 times with a short delay between attempts.
          let fetched: HivePlan | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            fetched = await withTimeout(
              getPlanById(joinedPlanId),
              BOOTSTRAP_TIMEOUT_MS,
              null
            );
            if (cancelled) return;
            if (fetched) break;
            // Wait 1s before retry, except on the last attempt
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (fetched) {
            joined = fetched;
            setPlans([fetched, ...cloudPlans]);
            savePlansToStorage([fetched, ...cloudPlans]);
          }
        }
        if (joined) {
          setCurrentPlan(joined);
          saveCurrentPlanId(joined.id);
          // Clear seed marker - we joined via share link
          sessionStorage.removeItem(SEED_PLAN_KEY);
          // Mark bootstrap as complete
          setBootstrapComplete(true);
          return;
        }
        // If joined plan not found after retries, show error instead of hanging
        console.error('[plan] Joined plan not found after retries');
        setBootstrapError(
          'Unable to load the shared plan. Please check your connection and try refreshing the page.'
        );
        return;
      }

      const currentId = loadCurrentPlanId();
      let found = currentId ? cloudPlans.find((p: HivePlan) => p.id === currentId) : null;

      if (found) {
        setCurrentPlan(found);
        // Seed was already cleared above if cloud had non-seed plans
      } else if (cloudPlans.length > 0) {
        // Current plan not in list, but other plans exist - prefer non-empty plan
        const firstNonEmpty = cloudPlans.find((p: HivePlan) => p.buildings.length > 0) || cloudPlans[0];
        setCurrentPlan(firstNonEmpty);
        saveCurrentPlanId(firstNonEmpty.id);
        // Seed was already cleared above if cloud had non-seed plans
      } else {
        // Cloud is empty (listPlans succeeded with []) - check if we preserved a seed
        if (!seedPlanId || !seededPlan) {
          // No seed exists - this should only happen if user landed on a share link,
          // or if useState initializer was skipped (shouldn't be possible).
          console.error('[plan] Bootstrap reached empty-cloud with no seed!');
          setBootstrapError(
            'Failed to initialize your hive. Please refresh the page.'
          );
          return;
        }
        
        console.log('[plan] Upserting seeded plan to cloud:', seededPlan.id);
        
        // Sync the seeded plan to cloud
        await upsertPlan(seededPlan, user!.id);
        console.log('[plan] Seeded plan synced to cloud successfully');
        
        // Verify the plan was saved
        try {
          const verified = await getPlanById(seededPlan.id);
          if (verified) {
            console.log('[plan] Verified plan exists in database:', verified.id);
          } else {
            console.warn('[plan] Plan not found after upsert! This may cause share link creation to fail.');
          }
        } catch (verifyError) {
          console.error('[plan] Error verifying plan:', verifyError);
        }
        
        if (cancelled) return;
        
        // Update state (may already be set from seed initializer)
        setPlans([seededPlan]);
        savePlansToStorage([seededPlan]);
        setCurrentPlan(seededPlan);
        saveCurrentPlanId(seededPlan.id);
        
        // Clear the seed marker now that bootstrap is complete
        sessionStorage.removeItem(SEED_PLAN_KEY);
      }
      
      // Mark bootstrap as complete so hive-first token mint can proceed
      setBootstrapComplete(true);
      } finally {
        // Always clear in-flight flag when bootstrap completes or is cancelled
        bootstrapInFlightRef.current = false;
      }
    }

    bootstrap().catch((e) => {
      console.error('[plan] bootstrap failed:', e);
      // Always show error to user so they can retry, even if bootstrap was cancelled
      setBootstrapError(
        'Failed to load your plans. Please check your connection and try again.'
      );
    });

    return () => {
      cancelled = true;
      // Reset bootstrapped flag on cleanup so remounts can bootstrap again
      bootstrappedRef.current = false;
    };
  }, [authLoading, user?.id]);

  // Apply a remote plan update (from the realtime channel) without
  // triggering our own cloud save. Idempotent: ignores stale updates.
  const applyRemoteData = useCallback((remotePlan: HivePlan) => {
    setCurrentPlan((prev) => {
      if (!prev || prev.id !== remotePlan.id) return prev;
      if (remotePlan.updatedAt <= prev.updatedAt) return prev;
      return remotePlan;
    });
    setPlans((prev) => {
      const idx = prev.findIndex((p) => p.id === remotePlan.id);
      if (idx === -1) return prev;
      if (remotePlan.updatedAt <= prev[idx].updatedAt) return prev;
      const next = [...prev];
      next[idx] = remotePlan;
      savePlansToStorage(next);
      return next;
    });
  }, []);

  // True iff the local user is currently free to make edits. Either the
  // plan has no active editor lock, the lock is ours, or the lock has
  // gone stale and is up for grabs. Read at edit time via the ref so
  // we always see the latest value without bloating callback deps.
  const canEditNow = useCallback((): boolean => {
    if (!user) return false;
    const ls = lockStateRef.current;
    if (!ls.editorUserId) return true;
    if (ls.editorUserId === user.id) return true;
    if (ls.acquiredAt != null && Date.now() - ls.acquiredAt > LOCK_STALE_MS) return true;
    return false;
  }, [user]);

  // Realtime subscription + edit-lock lifecycle, scoped to the current
  // plan. Acquires the lock on plan-open, heartbeats while held, listens
  // for other clients' updates, and releases on unmount / plan switch.
  // IMPORTANT: Only acquire lock after bootstrap completes to avoid P0001 errors on unsynced seeds.
  useEffect(() => {
    if (!currentPlan?.id || !user?.id) return;
    // Don't acquire lock until bootstrap completes (plan is synced to cloud)
    if (!bootstrapComplete) return;
    
    const planId = currentPlan.id;
    const userId = user.id;

    let cancelled = false;

    async function tryAcquire() {
      try {
        const result = await acquireEditLock(planId);
        if (cancelled) return;
        setLockState({
          editorUserId: result.editor_user_id,
          acquiredAt: result.editor_acquired_at
            ? new Date(result.editor_acquired_at).getTime()
            : null,
        });
      } catch (e) {
        console.error('[lock] acquire failed:', e);
      }
    }
    void tryAcquire();

    const channel = supabase
      .channel(`plan:${planId}`, { config: { presence: { key: userId } } })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'plans',
          filter: `id=eq.${planId}`,
        },
        (payload) => {
          const row = payload.new as {
            data: HivePlan;
            editor_user_id: string | null;
            editor_acquired_at: string | null;
          };
          if (row.data) applyRemoteData(row.data);
          setLockState({
            editorUserId: row.editor_user_id,
            acquiredAt: row.editor_acquired_at
              ? new Date(row.editor_acquired_at).getTime()
              : null,
          });
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Number of distinct user keys other than us.
        const others = Object.keys(state).filter((k) => k !== userId);
        setPeerCount(others.length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ joined_at: Date.now() });
        }
      });

    const heartbeatTimer = window.setInterval(() => {
      const ls = lockStateRef.current;
      if (ls.editorUserId === userId) {
        heartbeatEditLock(planId).catch(() => {});
      } else {
        const stale =
          ls.acquiredAt != null && Date.now() - ls.acquiredAt > LOCK_STALE_MS;
        if (!ls.editorUserId || stale) void tryAcquire();
      }
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatTimer);
      supabase.removeChannel(channel);
      if (lockStateRef.current.editorUserId === userId) {
        releaseEditLock(planId).catch(() => {});
      }
      setLockState({ editorUserId: null, acquiredAt: null });
      setPeerCount(0);
    };
  }, [currentPlan?.id, user?.id, bootstrapComplete, applyRemoteData]);

  // Best-effort lock release when the user closes the tab. Browsers
  // are aggressive about killing in-flight requests on unload, so the
  // server-side 3-minute stale timeout is the real backstop.
  useEffect(() => {
    function onUnload() {
      if (currentPlan?.id && lockStateRef.current.editorUserId === user?.id) {
        releaseEditLock(currentPlan.id).catch(() => {});
      }
    }
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [currentPlan?.id, user?.id]);

  // Debounced cloud upsert per plan, keyed by plan id.
  const scheduleCloudSave = useCallback(
    (plan: HivePlan) => {
      if (!user) return;
      const timers = saveTimers.current;
      const existing = timers.get(plan.id);
      if (existing !== undefined) window.clearTimeout(existing);
      const handle = window.setTimeout(() => {
        timers.delete(plan.id);
        upsertPlan(plan, user.id).catch((e) =>
          console.error('[plan] cloud save failed:', e)
        );
      }, SAVE_DEBOUNCE_MS);
      timers.set(plan.id, handle);
    },
    [user]
  );

  // Save to history for undo/redo
  const pushToHistory = useCallback(
    (buildings: PlacedBuilding[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push([...buildings]);
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  // Update current plan and save (state + localStorage cache + debounced cloud).
  // Silently no-ops if another user holds the edit lock — the UI reflects
  // that the canvas is read-only in that case.
  const updatePlan = useCallback(
    (updates: Partial<HivePlan>) => {
      if (!currentPlan) return;
      if (!canEditNow()) return;

      const updated = {
        ...currentPlan,
        ...updates,
        updatedAt: Date.now(),
      };

      setCurrentPlan(updated);

      setPlans((prev) => {
        const newPlans = prev.map((p) => (p.id === updated.id ? updated : p));
        savePlansToStorage(newPlans);
        return newPlans;
      });

      scheduleCloudSave(updated);
    },
    [currentPlan, scheduleCloudSave, canEditNow]
  );

  // Add building
  const addBuilding = useCallback(
    (buildingTypeId: string, gridX: number, gridY: number, level: number = 1) => {
      if (!currentPlan) return;

      const buildingType = getBuildingById(buildingTypeId);
      if (!buildingType) return;

      if (
        !isWithinGrid(
          gridX,
          gridY,
          buildingType.width,
          buildingType.height,
          currentPlan.gridWidth
        )
      ) {
        return;
      }

      const newBuilding: PlacedBuilding = {
        id: generateId(),
        buildingTypeId,
        gridX,
        gridY,
        rotation: 0,
        level,
      };

      if (!canPlaceBuilding(currentPlan.buildings, newBuilding)) {
        return;
      }

      const newBuildings = [...currentPlan.buildings, newBuilding];
      pushToHistory(currentPlan.buildings);
      updatePlan({ buildings: newBuildings });

      setEditorState((prev) => ({
        ...prev,
        selectedBuildingId: newBuilding.id,
        toolMode: 'select',
      }));
    },
    [currentPlan, updatePlan, pushToHistory]
  );

  // Update building
  const updateBuilding = useCallback(
    (buildingId: string, updates: Partial<PlacedBuilding>) => {
      if (!currentPlan) return;

      const buildingIndex = currentPlan.buildings.findIndex((b) => b.id === buildingId);
      if (buildingIndex === -1) return;

      const updatedBuilding = { ...currentPlan.buildings[buildingIndex], ...updates };

      if (updates.gridX !== undefined || updates.gridY !== undefined) {
        const buildingType = getBuildingById(updatedBuilding.buildingTypeId);
        if (buildingType) {
          if (
            !isWithinGrid(
              updatedBuilding.gridX,
              updatedBuilding.gridY,
              buildingType.width,
              buildingType.height,
              currentPlan.gridWidth
            )
          ) {
            return;
          }
          if (!canPlaceBuilding(currentPlan.buildings, updatedBuilding, buildingId)) {
            return;
          }
        }
      }

      const newBuildings = [...currentPlan.buildings];
      newBuildings[buildingIndex] = updatedBuilding;

      pushToHistory(currentPlan.buildings);
      updatePlan({ buildings: newBuildings });
    },
    [currentPlan, updatePlan, pushToHistory]
  );

  // Delete building
  const deleteBuilding = useCallback(
    (buildingId: string) => {
      if (!currentPlan) return;

      pushToHistory(currentPlan.buildings);
      const newBuildings = currentPlan.buildings.filter((b) => b.id !== buildingId);
      updatePlan({ buildings: newBuildings });

      setEditorState((prev) => ({
        ...prev,
        selectedBuildingId: null,
      }));
    },
    [currentPlan, updatePlan, pushToHistory]
  );

  // Rotate building
  const rotateBuilding = useCallback(
    (buildingId: string) => {
      if (!currentPlan) return;

      const building = currentPlan.buildings.find((b) => b.id === buildingId);
      if (!building) return;

      const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
      const currentIndex = rotations.indexOf(building.rotation);
      const newRotation = rotations[(currentIndex + 1) % 4];

      updateBuilding(buildingId, { rotation: newRotation });
    },
    [currentPlan, updateBuilding]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndex < 0 || !currentPlan) return;

    const previousState = history[historyIndex];
    if (previousState) {
      updatePlan({ buildings: previousState });
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex, currentPlan, updatePlan]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !currentPlan) return;

    const nextState = history[historyIndex + 1];
    if (nextState) {
      updatePlan({ buildings: nextState });
      setHistoryIndex((prev) => prev + 1);
    }
  }, [history, historyIndex, currentPlan, updatePlan]);

  // Clear all buildings
  const clearBuildings = useCallback(() => {
    if (!currentPlan) return;
    pushToHistory(currentPlan.buildings);
    updatePlan({ buildings: [] });
  }, [currentPlan, updatePlan, pushToHistory]);

  // Create new plan
  const createNewPlan = useCallback(
    (name: string) => {
      if (!user) return;
      const newPlan = createEmptyPlan(name);
      setPlans((prev) => {
        const updated = [...prev, newPlan];
        savePlansToStorage(updated);
        return updated;
      });
      setCurrentPlan(newPlan);
      saveCurrentPlanId(newPlan.id);
      setHistory([]);
      setHistoryIndex(-1);
      // Persist to cloud immediately so the new plan exists for upserts later.
      upsertPlan(newPlan, user.id).catch((e) =>
        console.error('[plan] createNewPlan cloud save failed:', e)
      );
    },
    [user]
  );

  // Switch plan
  const switchPlan = useCallback(
    (planId: string) => {
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        setCurrentPlan(plan);
        saveCurrentPlanId(planId);
        setHistory([]);
        setHistoryIndex(-1);
        setEditorState((prev) => ({ ...prev, selectedBuildingId: null }));
      }
    },
    [plans]
  );

  // Delete plan
  const deletePlan = useCallback(
    (planId: string) => {
      setPlans((prev) => {
        const updated = prev.filter((p) => p.id !== planId);
        savePlansToStorage(updated);

        if (currentPlan?.id === planId) {
          if (updated.length > 0) {
            setCurrentPlan(updated[0]);
            saveCurrentPlanId(updated[0].id);
          } else if (user) {
            const newPlan = createEmptyPlan('My Hive');
            updated.push(newPlan);
            setCurrentPlan(newPlan);
            saveCurrentPlanId(newPlan.id);
            savePlansToStorage(updated);
            upsertPlan(newPlan, user.id).catch((e) =>
              console.error('[plan] deletePlan replacement save failed:', e)
            );
          }
        }

        return updated;
      });

      // Cancel any pending debounced save for this plan, then delete from cloud.
      const pending = saveTimers.current.get(planId);
      if (pending !== undefined) {
        window.clearTimeout(pending);
        saveTimers.current.delete(planId);
      }
      deletePlanRow(planId).catch((e) =>
        console.error('[plan] cloud delete failed:', e)
      );
    },
    [currentPlan, user]
  );

  // Set tool mode
  const setToolMode = useCallback((mode: ToolMode) => {
    setEditorState((prev) => ({ ...prev, toolMode: mode }));
  }, []);

  // Select building type for placement
  const selectBuildingType = useCallback((typeId: string | null) => {
    setEditorState((prev) => ({
      ...prev,
      selectedBuildingTypeId: typeId,
      toolMode: typeId ? 'place' : 'select',
    }));
  }, []);

  // Select placed building
  const selectBuilding = useCallback((buildingId: string | null) => {
    setEditorState((prev) => ({
      ...prev,
      selectedBuildingId: buildingId,
    }));
  }, []);

  // Toggle settings
  const toggleGrid = useCallback(() => {
    setEditorState((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const toggleCoords = useCallback(() => {
    setEditorState((prev) => ({ ...prev, showCoords: !prev.showCoords }));
  }, []);

  const hasEditLock = !!(user && lockState.editorUserId === user.id);
  const otherUserHoldsLock = !!(
    user &&
    lockState.editorUserId &&
    lockState.editorUserId !== user.id
  );
  const isLockStale =
    lockState.acquiredAt != null &&
    Date.now() - lockState.acquiredAt > LOCK_STALE_MS;
  const canEdit = !otherUserHoldsLock || isLockStale;

  // User-driven toggle: explicitly take the lock from whoever currently
  // has it (no waiting for the holder to go stale). Pairs with releaseLock
  // to make a single "I'm editing" toggle in the UI.
  const takeLock = useCallback(async () => {
    if (!currentPlan) return;
    try {
      const result = await takeEditLock(currentPlan.id);
      trackEvent(Events.COLLAB_EDIT_LOCK_TAKEN);
      setLockState({
        editorUserId: result.editor_user_id,
        acquiredAt: result.editor_acquired_at
          ? new Date(result.editor_acquired_at).getTime()
          : null,
      });
    } catch (e) {
      console.error('[lock] take failed:', e);
    }
  }, [currentPlan]);

  const releaseLock = useCallback(async () => {
    if (!currentPlan) return;
    try {
      await releaseEditLock(currentPlan.id);
      setLockState({ editorUserId: null, acquiredAt: null });
    } catch (e) {
      console.error('[lock] release failed:', e);
    }
  }, [currentPlan]);

  // Retry bootstrap after an error (e.g., network failure on view-only link)
  const retryBootstrap = useCallback(() => {
    setBootstrapError(null);
    window.location.reload();
  }, []);

  return {
    // State
    plans,
    currentPlan,
    editorState,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,

    // Share link tracking
    joinedViaShareLink,
    isViewOnly,

    // Error handling
    bootstrapError,
    retryBootstrap,
    bootstrapComplete,

    // Live-collab state
    lockState,
    hasEditLock,
    otherUserHoldsLock,
    isLockStale,
    canEdit,
    peerCount,
    takeLock,
    releaseLock,

    // Building operations
    addBuilding,
    updateBuilding,
    deleteBuilding,
    rotateBuilding,
    clearBuildings,

    // Plan operations
    updatePlan,
    createNewPlan,
    switchPlan,
    deletePlan,

    // Editor operations
    setToolMode,
    selectBuildingType,
    selectBuilding,
    toggleGrid,
    toggleCoords,
    undo,
    redo,
  };
}

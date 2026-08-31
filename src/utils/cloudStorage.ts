import { supabase } from '../lib/supabase';
import type { HivePlan } from '../types';

interface PlanRow {
  data: HivePlan;
}

export async function listPlans(): Promise<HivePlan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('data')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[cloud] listPlans failed:', error);
    return [];
  }

  return ((data ?? []) as PlanRow[]).map((row) => row.data);
}

export async function getPlanById(planId: string): Promise<HivePlan | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('data')
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    console.error('[cloud] getPlanById failed:', error);
    return null;
  }

  return data ? (data as PlanRow).data : null;
}

export async function upsertPlan(plan: HivePlan, userId: string): Promise<void> {
  // owner_user_id is required for INSERT but the enforce_plans_owner trigger
  // overrides it on UPDATE so collaborators can safely upsert plans they
  // don't own.
  const { error } = await supabase
    .from('plans')
    .upsert(
      {
        id: plan.id,
        owner_user_id: userId,
        name: plan.name,
        data: plan,
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('[cloud] upsertPlan failed:', error);
    throw error;
  }
}

export async function deletePlanRow(planId: string): Promise<void> {
  const { error } = await supabase.from('plans').delete().eq('id', planId);

  if (error) {
    console.error('[cloud] deletePlanRow failed:', error);
    throw error;
  }
}

export interface ShareTokens {
  share_token: string;
  view_token: string;
}

export async function getExistingShareTokens(planId: string): Promise<ShareTokens | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('share_token, view_token')
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    console.error('[cloud] getExistingShareTokens failed:', error);
    return null;
  }

  if (!data || !data.share_token || !data.view_token) {
    return null;
  }

  return {
    share_token: data.share_token,
    view_token: data.view_token,
  };
}

async function ensurePlanOwnership(planId: string, userId: string): Promise<void> {
  // Check if the plan's owner_user_id matches the current user.
  // If not, re-upsert to fix ownership (this can happen when a seed plan
  // was created before auth completed, or when anonymous sessions change).
  console.log('[cloud] Checking plan ownership for planId:', planId, 'userId:', userId);
  
  const { data, error } = await supabase
    .from('plans')
    .select('owner_user_id, data')
    .eq('id', planId)
    .maybeSingle();
  
  if (error) {
    console.error('[cloud] Failed to check plan ownership:', error);
    return; // Continue anyway, let the mint attempt fail with a better error
  }
  
  if (!data) {
    console.error('[cloud] Plan not found in database:', planId);
    throw new Error('Plan not found in database. Please refresh and try again.');
  }
  
  const currentOwnerId = data.owner_user_id;
  console.log('[cloud] Plan owner_user_id:', currentOwnerId, 'current user:', userId);
  
  if (currentOwnerId === userId) {
    console.log('[cloud] Ownership is correct, proceeding with mint');
    return;
  }
  
  // Ownership mismatch - fix it by re-upserting the plan
  console.warn('[cloud] Ownership mismatch detected! Re-upserting plan to fix ownership...');
  console.warn('[cloud] Old owner:', currentOwnerId, '→ New owner:', userId);
  
  try {
    await upsertPlan(data.data, userId);
    console.log('[cloud] Successfully fixed plan ownership');
  } catch (upsertError) {
    console.error('[cloud] Failed to fix plan ownership:', upsertError);
    throw new Error('Could not claim ownership of plan. Please refresh and try again.');
  }
}

export async function getOrCreateShareTokens(planId: string): Promise<ShareTokens> {
  console.log('[cloud] getOrCreateShareTokens called for planId:', planId);
  
  // Check current auth state for debugging
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[cloud] current user:', user?.id, 'is_anonymous:', user?.is_anonymous);
  
  if (!user) {
    throw new Error('You must be signed in to create share links');
  }
  
  // First, try to get existing tokens without calling the RPC
  const existingTokens = await getExistingShareTokens(planId);
  if (existingTokens) {
    console.log('[cloud] Using existing share tokens from database');
    return existingTokens;
  }
  
  // No existing tokens, need to mint new ones via RPC
  console.log('[cloud] No existing tokens, minting new ones via RPC');
  
  // CRITICAL: Ensure plan ownership is correct before attempting to mint.
  // This fixes the "only the plan owner" error on anonymous first-run.
  await ensurePlanOwnership(planId, user.id);
  
  // Retry logic to handle potential timing issues on mobile
  let lastError: any = null;
  const maxRetries = 3;
  const retryDelays = [0, 1000, 2000]; // 0ms, 1000ms, 2000ms (longer delays for DB commit time)
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`[cloud] Retry attempt ${attempt + 1}/${maxRetries} after ${retryDelays[attempt]}ms`);
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
    }
    
    const { data, error } = await supabase.rpc('get_or_create_share_tokens', {
      plan_id_input: planId,
    });

    if (!error) {
      console.log('[cloud] getOrCreateShareTokens success:', data);
      return data as ShareTokens;
    }
    
    lastError = error;
    console.error(`[cloud] getOrCreateShareTokens attempt ${attempt + 1} failed:`, error);
    
    // Don't retry if it's a definitive auth error (but we already fixed ownership, so this shouldn't happen)
    const errorMessage = error?.message || '';
    if (errorMessage.includes('must be signed in')) {
      console.log('[cloud] Auth error detected, not retrying');
      break;
    }
    
    // If we still get "only the plan owner" error after fixing ownership,
    // there's a deeper issue - but retry once more in case of timing
    if (errorMessage.includes('only the plan owner') && attempt === 0) {
      console.log('[cloud] Ownership error after fix - will retry once');
      continue;
    }
  }
  
  // All retries failed
  console.error('[cloud] getOrCreateShareTokens failed after all retries');
  console.error('[cloud] error details:', JSON.stringify(lastError, null, 2));
  console.error('[cloud] planId:', planId, 'user:', user?.id);
  throw lastError;
}

export interface JoinResult {
  plan_id: string;
  role: 'viewer' | 'editor';
}

export async function joinPlanByToken(token: string): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('join_plan_by_token', { token });

  if (error) {
    console.error('[cloud] joinPlanByToken failed:', error);
    throw error;
  }

  return data as JoinResult;
}

export interface LockState {
  editor_user_id: string | null;
  editor_acquired_at: string | null;
  acquired: boolean;
}

export async function acquireEditLock(planId: string): Promise<LockState> {
  const { data, error } = await supabase.rpc('acquire_edit_lock', {
    plan_id_input: planId,
  });
  if (error) {
    console.error('[cloud] acquireEditLock failed:', error);
    throw error;
  }
  return data as LockState;
}

export async function takeEditLock(planId: string): Promise<LockState> {
  const { data, error } = await supabase.rpc('take_edit_lock', {
    plan_id_input: planId,
  });
  if (error) {
    console.error('[cloud] takeEditLock failed:', error);
    throw error;
  }
  return data as LockState;
}

export async function heartbeatEditLock(planId: string): Promise<void> {
  const { error } = await supabase.rpc('heartbeat_edit_lock', {
    plan_id_input: planId,
  });
  if (error) console.error('[cloud] heartbeatEditLock failed:', error);
}

export async function releaseEditLock(planId: string): Promise<void> {
  const { error } = await supabase.rpc('release_edit_lock', {
    plan_id_input: planId,
  });
  if (error) console.error('[cloud] releaseEditLock failed:', error);
}

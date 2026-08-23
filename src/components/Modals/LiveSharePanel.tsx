import { useState, useEffect } from 'react';
import { getOrCreateShareTokens, getPlanById, type ShareTokens } from '../../utils/cloudStorage';
import { supabase } from '../../lib/supabase';
import { copyToClipboard } from '../../utils/storage';
import { trackEvent, Events } from '../../utils/analytics';
import { playConfirmSound } from '../../utils/audio';
import './ShareModal.css';

interface Props {
  planId: string;
  autoCopyView?: boolean;
}

// Live-collaboration tab body. Lives inside ShareHub's tabbed shell.
export default function LiveSharePanel({ planId, autoCopyView = false }: Props) {
  const [tokens, setTokens] = useState<ShareTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // First, verify we're authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('You must be signed in to create share links.');
        }
        console.log('[LiveSharePanel] Current user:', user.id, 'is_anonymous:', user.is_anonymous);
        
        // Verify the plan exists and we own it
        const plan = await getPlanById(planId);
        if (!plan) {
          throw new Error('Plan not found. Please refresh and try again.');
        }
        console.log('[LiveSharePanel] Plan exists:', planId);
        
        // Now create/fetch the tokens
        const t = await getOrCreateShareTokens(planId);
        if (cancelled) return;
        setTokens(t);
      } catch (e) {
        if (cancelled) return;
        console.error('[LiveSharePanel] getOrCreateShareTokens error:', e);
        console.error('[LiveSharePanel] error type:', typeof e, 'is Error:', e instanceof Error);
        console.error('[LiveSharePanel] error details:', JSON.stringify(e, null, 2));
        
        // Extract error message from various formats
        let raw = 'Failed to create share link.';
        if (e instanceof Error) {
          raw = e.message;
        } else if (typeof e === 'object' && e !== null) {
          // Supabase error object format
          const err = e as any;
          raw = err.message || err.error_description || err.error || raw;
        } else if (typeof e === 'string') {
          raw = e;
        }
        
        // Show the actual error message to help diagnose issues
        setError(
          raw.toLowerCase().includes('owner')
            ? "Only the plan's owner can create share links. Ask whoever created this plan to send you the link."
            : `Failed to create share link: ${raw}`
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const baseUrl = window.location.origin + window.location.pathname;
  const editUrl = tokens ? `${baseUrl}?share=${tokens.share_token}` : '';
  const viewUrl = tokens ? `${baseUrl}?view=${tokens.view_token}` : '';

  useEffect(() => {
    if (!autoCopyView || !tokens) return;
    const url = `${baseUrl}?view=${tokens.view_token}`;
    copyToClipboard(url).then((ok) => {
      if (ok) trackEvent(Events.COLLAB_LINK_COPIED, { type: 'view', source: 'first_run' });
    });
  }, [autoCopyView, tokens, baseUrl]);

  return (
    <div className="share-panel">
      {loading && <p className="share-modal-loading">Generating links…</p>}

      {error && <div className="share-modal-error">{error}</div>}

      {tokens && !loading && !error && (
        <>
          <p className="share-modal-explain">
            Send a link to your alliance and edit the same hive together in
            real time. Only one person edits at a time — everyone else sees
            changes live and can take over with one click.
          </p>

          <ShareLinkRow
            label="Edit link"
            hint="Teammates can take edit access and change the layout."
            url={editUrl}
            variant="edit"
          />
          <ShareLinkRow
            label="View-only link"
            hint={autoCopyView ? "✓ Copied! Send this to Discord so your alliance can see their spots." : "Recipients watch live but can't change anything. Safe to post publicly."}
            url={viewUrl}
            variant="view"
            startCopied={autoCopyView}
          />
        </>
      )}
    </div>
  );
}

function ShareLinkRow({
  label,
  hint,
  url,
  variant,
  startCopied = false,
}: {
  label: string;
  hint: string;
  url: string;
  variant: 'edit' | 'view';
  startCopied?: boolean;
}) {
  const [copied, setCopied] = useState(startCopied);

  async function copy() {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      playConfirmSound(); // Classy click on successful copy
      trackEvent(Events.COLLAB_LINK_COPIED, { type: variant });
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className={`share-link-row share-link-row-${variant}`}>
      <div className="share-link-meta">
        <strong>{label}</strong>
        <p>{hint}</p>
      </div>
      <div className="share-link-control">
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button onClick={copy} className={copied ? 'copied' : ''}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

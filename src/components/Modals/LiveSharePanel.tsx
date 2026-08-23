import { useState, useEffect } from 'react';
import { getOrCreateShareTokens, type ShareTokens } from '../../utils/cloudStorage';
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
        const t = await getOrCreateShareTokens(planId);
        if (cancelled) return;
        setTokens(t);
      } catch (e) {
        if (cancelled) return;
        const raw = e instanceof Error ? e.message : 'Failed to create share link.';
        setError(
          raw.toLowerCase().includes('owner')
            ? "Only the plan's owner can create share links. Ask whoever created this plan to send you the link."
            : raw
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

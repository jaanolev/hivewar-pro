import { useState, useEffect } from 'react';
import { getOrCreateShareTokens, type ShareTokens } from '../../utils/cloudStorage';
import { copyToClipboard } from '../../utils/storage';
import './ShareModal.css';

interface Props {
  planId: string;
  planName: string;
  onClose: () => void;
}

export default function ShareModal({ planId, planName, onClose }: Props) {
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
            ? "Only the plan's owner can create share links. Ask the original creator to share the link with you."
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

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>Live share</h2>
          <button className="share-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="share-modal-subtitle">{planName}</p>

        {loading && <p className="share-modal-loading">Generating links…</p>}

        {error && <div className="share-modal-error">{error}</div>}

        {tokens && !loading && !error && (
          <>
            <p className="share-modal-explain">
              Anyone with these links sees your plan in real time. Only one
              person can edit at a time — others see live updates but can't
              make changes until the editor steps back.
            </p>

            <ShareLinkRow
              label="Edit link"
              hint="Recipient can take edit access. Best for alliance teammates."
              url={editUrl}
              variant="edit"
            />
            <ShareLinkRow
              label="View link"
              hint="Recipient can only watch. Safe to share publicly."
              url={viewUrl}
              variant="view"
            />
          </>
        )}
      </div>
    </div>
  );
}

function ShareLinkRow({
  label,
  hint,
  url,
  variant,
}: {
  label: string;
  hint: string;
  url: string;
  variant: 'edit' | 'view';
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
        <button onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
      </div>
    </div>
  );
}

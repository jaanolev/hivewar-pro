import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import './AccountMenu.css';

export default function AccountMenu() {
  const { user, isAnonymous, loading, signInWithDiscord, signInWithGoogle, signOut } =
    useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (loading || !user) return null;

  const meta = user.user_metadata as
    | { avatar_url?: string; full_name?: string; name?: string; user_name?: string }
    | undefined;
  const displayName =
    meta?.full_name || meta?.name || meta?.user_name || user.email || 'Anonymous';
  const avatarUrl = meta?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase();

  async function handleSignIn(provider: 'discord' | 'google') {
    try {
      if (provider === 'discord') await signInWithDiscord();
      else await signInWithGoogle();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed.';
      alert(msg);
    }
  }

  async function handleSignOut() {
    if (!confirm('Sign out? Your plans will stay safe in your account.')) return;
    await signOut();
    setOpen(false);
  }

  return (
    <div className="account-menu" ref={ref}>
      <button
        className="account-trigger"
        onClick={() => setOpen((o) => !o)}
        title={isAnonymous ? 'Sign in to sync plans across devices' : displayName}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="account-avatar-img" />
        ) : (
          <span className="account-avatar-initial">{isAnonymous ? '?' : initial}</span>
        )}
        {isAnonymous && <span className="account-pulse" aria-hidden="true" />}
      </button>

      {open && (
        <div className="account-popover" role="dialog">
          {isAnonymous ? (
            <>
              <div className="account-popover-header">
                <strong>Sync your plans</strong>
                <p>
                  Sign in to access your plans on any device. Your current plans
                  will carry over.
                </p>
              </div>
              <button
                className="account-action account-action-discord"
                onClick={() => handleSignIn('discord')}
              >
                Continue with Discord
              </button>
              <button
                className="account-action account-action-google"
                onClick={() => handleSignIn('google')}
              >
                Continue with Google
              </button>
            </>
          ) : (
            <>
              <div className="account-popover-header">
                <strong>{displayName}</strong>
                {user.email && <p className="account-email">{user.email}</p>}
              </div>
              <button className="account-action" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

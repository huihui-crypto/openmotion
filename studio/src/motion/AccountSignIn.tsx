import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { AccountSummary } from '../../../shared/provider-directory';
import { RemixIcon } from '../icons/RemixIcons';
import { useI18n } from '../i18n/I18n';
import { useAccountSummary } from './AccountSettings';
import { gatewayRequest } from './gatewayClient';
import { notifyProvidersChanged } from './useProviderDirectory';
import { trackMotion } from './tracking';

type SignInArea = 'asset_generation' | 'asset_model_hint' | 'media_generator';

/**
 * Optional OpenDesign sign-in for generation surfaces. It never blocks a user who brings
 * their own provider or local Agent: signed-in users see nothing, and Settings → Account
 * shows the authorization code and progress.
 */
function useAccountSignIn(area: SignInArea, openAccount: () => void) {
  const { account, setAccount } = useAccountSummary(), [busy, setBusy] = useState(false);
  const lastState = useRef<AccountSummary['state'] | undefined>(undefined);
  useEffect(() => {
    const previous = lastState.current;
    lastState.current = account?.state;
    if (previous === 'authorizing' && account?.state === 'signed-in') {
      notifyProvidersChanged(); window.dispatchEvent(new Event('motion:account-changed'));
    }
  }, [account?.state]);
  const visible = Boolean(account && account.state !== 'signed-in'), pending = account?.state === 'authorizing';
  const signIn = async (event: MouseEvent<HTMLButtonElement>) => {
    void trackMotion('ui_click', { page_name: 'studio', area, element: 'sign_in', interaction_method: event.detail === 0 ? 'keyboard' : 'pointer' });
    if (pending) { openAccount(); return; }
    setBusy(true);
    try {
      setAccount(await gatewayRequest<AccountSummary>('settings/account/login', 'POST', {}));
      notifyProvidersChanged(); window.dispatchEvent(new Event('motion:account-changed'));
    } catch { /* The account page shows the connection error and a retry. */ }
    finally { setBusy(false); openAccount(); }
  };
  return { visible, pending, busy, signIn };
}

/** Shown where no media model is available. */
export function AccountSignInButton({ area, openAccount, className = 'om-button' }: {
  area: 'asset_generation' | 'media_generator'; openAccount: () => void; className?: string;
}) {
  const { t } = useI18n(), { visible, pending, busy, signIn } = useAccountSignIn(area, openAccount);
  if (!visible) return null;
  return <button type="button" className={className} disabled={busy} onClick={event => void signIn(event)}>
    <RemixIcon name="login-box-line" size={16} />{t(pending ? 'Waiting for browser authorization…' : 'Sign in to use OpenDesign models')}
  </button>;
}

/** Shown under an available model choice, so local Codex and own providers stay selectable. */
export function AccountSignInHint({ openAccount }: { openAccount: () => void }) {
  const { t } = useI18n(), { visible, pending, busy, signIn } = useAccountSignIn('asset_model_hint', openAccount);
  if (!visible) return null;
  return <div className="om-account-hint">
    <RemixIcon name="sparkling-line" size={16} />
    <span>{t(pending ? 'Complete sign-in in your browser' : 'Sign in to OpenDesign for more image, video and audio models')}</span>
    <button type="button" className="om-button" data-primary disabled={busy} onClick={event => void signIn(event)}>{t(pending ? 'Waiting for browser authorization…' : 'Sign in')}</button>
  </div>;
}

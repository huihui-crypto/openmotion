import { useState, type MouseEvent } from 'react';
import type { AccountSummary } from '../../../shared/provider-directory';
import { RemixIcon } from '../icons/RemixIcons';
import { useI18n } from '../i18n/I18n';
import { useAccountSummary } from './AccountSettings';
import { gatewayRequest } from './gatewayClient';
import { notifyProvidersChanged } from './useProviderDirectory';
import { trackMotion } from './tracking';

/**
 * Optional OpenDesign sign-in offered where no media model is available.
 * It never blocks a user who brings their own provider: signed-in users see nothing,
 * and the account page shows the authorization code and progress.
 */
export function AccountSignInButton({ area, openAccount, className = 'om-button' }: {
  area: 'asset_generation' | 'media_generator'; openAccount: () => void; className?: string;
}) {
  const { t } = useI18n(), { account, setAccount } = useAccountSummary(), [busy, setBusy] = useState(false);
  if (!account || account.state === 'signed-in') return null;
  const pending = account.state === 'authorizing';
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
  return <button type="button" className={className} disabled={busy} onClick={event => void signIn(event)}>
    <RemixIcon name="login-box-line" size={16} />{t(pending ? 'Waiting for browser authorization…' : 'Sign in to use OpenDesign models')}
  </button>;
}

// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AccountSignInButton, AccountSignInHint } from './AccountSignIn';
const { gatewayRequest, trackMotion, notifyProvidersChanged } = vi.hoisted(() => ({ gatewayRequest: vi.fn(), trackMotion: vi.fn(), notifyProvidersChanged: vi.fn() }));
vi.mock('./gatewayClient', () => ({ gatewayRequest }));
vi.mock('./tracking', () => ({ trackMotion }));
vi.mock('./useProviderDirectory', () => ({ notifyProvidersChanged }));
vi.mock('../i18n/I18n', () => ({ useI18n: () => ({ t: (text: string) => text }) }));
let root: Root, container: HTMLDivElement;
const openAccount = vi.fn();
const respond = (state: string) => gatewayRequest.mockImplementation(async (path: string) => path === 'settings/account/login' ? { state: 'authorizing' } : { state });
beforeEach(() => { vi.clearAllMocks(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); });

it('stays out of the way once the OpenDesign account is connected', async () => {
  respond('signed-in');
  await act(async () => root.render(<AccountSignInButton area="asset_generation" openAccount={openAccount} />));
  expect(container.querySelector('button')).toBeNull();
  expect(notifyProvidersChanged).not.toHaveBeenCalled();
});
it.each(['button', 'hint'] as const)('refreshes providers and account once when the %s observes authorization completion', async surface => {
  vi.useFakeTimers();
  respond('authorizing');
  await act(async () => root.render(surface === 'button'
    ? <AccountSignInButton area="asset_generation" openAccount={openAccount} />
    : <AccountSignInHint openAccount={openAccount} />));
  expect(notifyProvidersChanged).not.toHaveBeenCalled();
  const accountChanged = vi.fn();
  window.addEventListener('motion:account-changed', accountChanged);
  try {
    respond('signed-in');
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    expect(container.querySelector('button')).toBeNull();
    expect(notifyProvidersChanged).toHaveBeenCalledOnce();
    expect(accountChanged).toHaveBeenCalledOnce();
    await act(async () => {
      window.dispatchEvent(new Event('motion:account-changed'));
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(notifyProvidersChanged).toHaveBeenCalledOnce();
    expect(accountChanged).toHaveBeenCalledTimes(2);
  } finally { window.removeEventListener('motion:account-changed', accountChanged); }
});
it('starts OpenDesign sign-in, reports the click and opens the account page', async () => {
  respond('signed-out');
  await act(async () => root.render(<AccountSignInButton area="asset_generation" openAccount={openAccount} />));
  expect(container.textContent).toContain('Sign in to use OpenDesign models');
  await act(async () => container.querySelector('button')!.click());
  expect(trackMotion).toHaveBeenCalledWith('ui_click', expect.objectContaining({ page_name: 'studio', area: 'asset_generation', element: 'sign_in' }));
  expect(gatewayRequest).toHaveBeenCalledWith('settings/account/login', 'POST', {});
  expect(notifyProvidersChanged).toHaveBeenCalled();
  expect(openAccount).toHaveBeenCalledOnce();
});
it('reopens the account page without restarting an authorization in progress', async () => {
  respond('authorizing');
  await act(async () => root.render(<AccountSignInButton area="media_generator" openAccount={openAccount} />));
  expect(container.textContent).toContain('Waiting for browser authorization…');
  await act(async () => container.querySelector('button')!.click());
  expect(gatewayRequest).not.toHaveBeenCalledWith('settings/account/login', 'POST', {});
  expect(openAccount).toHaveBeenCalledOnce();
});
it('keeps an available model selectable and offers sign-in beside it', async () => {
  respond('signed-out');
  const { AccountSignInHint } = await import('./AccountSignIn');
  await act(async () => root.render(<AccountSignInHint openAccount={openAccount} />));
  expect(container.textContent).toContain('Sign in to OpenDesign for more image, video and audio models');
  await act(async () => container.querySelector('button')!.click());
  expect(trackMotion).toHaveBeenCalledWith('ui_click', expect.objectContaining({ area: 'asset_model_hint', element: 'sign_in' }));
  expect(openAccount).toHaveBeenCalledOnce();
});

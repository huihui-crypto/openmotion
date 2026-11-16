// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AccountSignInButton } from './AccountSignIn';
const { gatewayRequest, trackMotion, notifyProvidersChanged } = vi.hoisted(() => ({ gatewayRequest: vi.fn(), trackMotion: vi.fn(), notifyProvidersChanged: vi.fn() }));
vi.mock('./gatewayClient', () => ({ gatewayRequest }));
vi.mock('./tracking', () => ({ trackMotion }));
vi.mock('./useProviderDirectory', () => ({ notifyProvidersChanged }));
vi.mock('../i18n/I18n', () => ({ useI18n: () => ({ t: (text: string) => text }) }));
let root: Root, container: HTMLDivElement;
const openAccount = vi.fn();
const respond = (state: string) => gatewayRequest.mockImplementation(async (path: string) => path === 'settings/account/login' ? { state: 'authorizing' } : { state });
beforeEach(() => { vi.clearAllMocks(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

it('stays out of the way once the OpenDesign account is connected', async () => {
  respond('signed-in');
  await act(async () => root.render(<AccountSignInButton area="asset_generation" openAccount={openAccount} />));
  expect(container.querySelector('button')).toBeNull();
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

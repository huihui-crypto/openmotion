// @vitest-environment happy-dom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AssetDetailWorkspace } from './AssetDetailWorkspace';
import type { LibraryAsset } from '../../../shared/asset-library';
vi.mock('../i18n/I18n', () => ({ useI18n: () => ({ t: (text: string) => text, formatDate: (date: number) => `Date ${date}` }) }));
vi.mock('./ResizablePane', () => ({ ResizablePane: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('./assetClient', () => ({ assetRequest: async () => ({ assets: [], total: 0, nextOffset: null }) }));
const asset: LibraryAsset = { id: 'asset-1', name: 'Landscape', modality: 'image', createdAt: 1, updatedAt: 2, currentVersionId: 'v2', versions: [
  { id: 'v1', createdAt: 1, source: 'upload', filename: 'first.png', mimeType: 'image/png', bytes: 1024, sha256: 'one', references: [] },
  { id: 'v2', createdAt: 2, source: 'generated', filename: 'second.png', mimeType: 'image/png', bytes: 2048, sha256: 'two', prompt: 'Add clouds', model: 'codex:image-generation', references: [{ assetId: 'asset-1', versionId: 'v1' }], parentVersionId: 'v1' },
] };
let root: Root, container: HTMLDivElement;
const update = vi.fn(async () => {}), version = vi.fn(), edit = vi.fn(), back = vi.fn(), reference = vi.fn();
beforeEach(() => { vi.clearAllMocks(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function render(versionId = 'v2', editor?: ReactNode) { await act(async () => root.render(<AssetDetailWorkspace asset={asset} versionId={versionId} navigation={<div>Asset navigation</div>} active uploading={false} editor={editor} onBack={back} onVersion={version} onUpdate={update} onEdit={edit} onReference={vi.fn()} onOpenReference={reference} onUpload={vi.fn()} onDownload={vi.fn()} />)); }
const button = (text: string) => [...container.querySelectorAll('button')].find(node => node.textContent?.includes(text))!;
it('shows an inline preview, pins download and restoration to the selected immutable version', async () => {
  await render('v1');
  expect(container.querySelector('dialog, [role="dialog"]')).toBeNull();
  expect(container.querySelector('.om-asset-viewer img')?.getAttribute('src')).toContain('/versions/v1/file');
  expect(container.querySelector('a[download]')?.getAttribute('href')).toContain('/versions/v1/file?download=1');
  await act(async () => button('Make current version').click());
  expect(update).toHaveBeenCalledWith({ currentVersionId: 'v1' });
  await act(async () => container.querySelector<HTMLButtonElement>('.om-asset-version')!.click());
  expect(version).toHaveBeenCalledWith('v2');
});
it('keeps editing beside the preview and exposes provenance and exact reference navigation', async () => {
  await render();
  expect(container.textContent).toContain('Add clouds'); expect(container.textContent).toContain('codex:image-generation');
  await act(async () => button('View reference').click());
  expect(reference).toHaveBeenCalledWith({ assetId: 'asset-1', versionId: 'v1' });
  await act(async () => button('Edit as new version').click()); expect(edit).toHaveBeenCalledOnce();
  await render('v2', <div>Version editor</div>);
  expect(container.textContent).toContain('Version editor');
  expect(container.querySelector('.om-asset-viewer img')?.getAttribute('src')).toContain('/versions/v2/file');
  await act(async () => button('All assets').click()); expect(back).toHaveBeenCalledOnce();
});

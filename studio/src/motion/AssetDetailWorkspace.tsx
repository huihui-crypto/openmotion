import { useEffect, useState, type ReactNode } from 'react';
import { assetMediaUrl, assetVersion, type AssetReference, type LibraryAsset } from '../../../shared/asset-library';
import { useI18n } from '../i18n/I18n';
import { RemixIcon } from '../icons/RemixIcons';
import { AssetPreview } from './AssetBrowser';
import { ResizablePane } from './ResizablePane';

export function AssetDetailWorkspace({ asset, versionId, active, uploading, saving = false, navigation, editor, taskControls, onBack, onVersion, onUpdate, onEdit, onReference, onOpenReference, onUpload, onDownload }: {
  asset: LibraryAsset; versionId: string; active: boolean; uploading: boolean; saving?: boolean; navigation: ReactNode; editor?: ReactNode; taskControls?: ReactNode;
  onBack: () => void; onVersion: (id: string) => void;
  onUpdate: (changes: Record<string, unknown>) => Promise<void>; onEdit: () => void; onReference: () => void;
  onOpenReference: (reference: AssetReference) => void; onUpload: () => void; onDownload: () => void;
}) {
  const { t, formatDate } = useI18n();
  const [name, setName] = useState(asset.name);
  useEffect(() => setName(asset.name), [asset.id, asset.name]);
  const version = assetVersion(asset, versionId) ?? assetVersion(asset)!;
  const number = asset.versions.findIndex(v => v.id === version.id) + 1;
  const update = async (changes: Record<string, unknown>) => { if (!saving) await onUpdate(changes); };
  return <section className="om-asset-workspace" aria-label={t('Asset preview')} data-editing={Boolean(editor)}>
    <header className="om-asset-workspace-header">
      <button className="om-nav-item" onClick={onBack}><RemixIcon name="arrow-left-line" size={16} />{t('All assets')}</button>
      <strong title={asset.name}>{asset.name}</strong><span className="om-badge">V{number}</span>
      <div className="om-asset-workspace-actions">{taskControls}<a className="om-button" href={assetMediaUrl(asset.id, version.id) + '?download=1'} download onClick={onDownload}><RemixIcon name="download-2-line" size={15} />{t('Download')}</a></div>
    </header>
    <div className="om-asset-workspace-body">
      <ResizablePane className="om-asset-filmstrip om-surface-divider" storageKey="motion-asset-filmstrip-width" initial={196} min={164} max={280} edge="right" label={t('Resize asset navigation')}>
        {navigation}
      </ResizablePane>
      <main className="om-asset-viewer">
        <div className="om-asset-viewer-stage">{active && <AssetPreview key={`${asset.id}/${version.id}`} asset={asset} version={version} controls />}</div>
        <footer className="om-asset-viewer-caption om-muted"><span>{version.width && version.height ? `${version.width} × ${version.height}` : version.mimeType}</span><span>{(version.bytes / 1024 / 1024).toFixed(2)} MB</span><span>V{number}{version.id === asset.currentVersionId ? ` · ${t('Current')}` : ''}</span></footer>
      </main>
      <ResizablePane className="om-asset-inspector-pane" storageKey="motion-asset-inspector-width" initial={360} min={280} max={600} edge="left" label={t('Resize asset details')}>
        {editor ?? <aside className="om-asset-inspector" aria-label={t('Asset details')}>
          <div className="om-asset-inspector-title"><h2 className="om-subtitle">{t('Asset details')}</h2><span className="om-badge">{t(version.source === 'upload' ? 'Uploaded' : 'Generated')}</span></div>
          <div className="om-asset-actions om-control-row"><label className="om-field"><input aria-label={t('Asset name')} maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label><button className="om-button" disabled={saving || !name.trim() || name === asset.name} onClick={() => void update({ name })}>{t('Rename')}</button></div>
          <dl className="om-asset-metadata"><dt>{t('Created')}</dt><dd>{formatDate(version.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd><dt>{t('Format')}</dt><dd>{version.mimeType}</dd>{version.model && <><dt>{t('Generation model')}</dt><dd>{version.model}</dd></>}{version.parentVersionId && <><dt>{t('Based on')}</dt><dd>V{asset.versions.findIndex(v => v.id === version.parentVersionId) + 1}</dd></>}</dl>
          {version.prompt && <section className="om-asset-provenance"><h3 className="om-eyebrow">{t('Prompt')}</h3><p>{version.prompt}</p></section>}
          {version.parameters && Object.keys(version.parameters).length > 0 && <details className="om-asset-provenance"><summary className="om-nav-item">{t('Generation settings')}</summary><pre>{JSON.stringify(version.parameters, null, 2)}</pre></details>}
          {version.references.length > 0 && <section className="om-asset-provenance"><h3 className="om-eyebrow">{t('References')}</h3>{version.references.map(ref => <button className="om-nav-item" key={`${ref.assetId}/${ref.versionId}`} onClick={() => onOpenReference(ref)}><RemixIcon name="links-line" size={14} />{t('View reference')} · {ref.assetId.slice(0, 8)}</button>)}</section>}
          {!asset.trashedAt && <div className="om-asset-version-actions"><button className="om-button" data-primary onClick={onEdit}><RemixIcon name="sparkling-line" size={16} />{t('Edit as new version')}</button><button className="om-button" onClick={onReference}><RemixIcon name="add-line" size={16} />{t('Use as reference')}</button></div>}
          <section className="om-asset-versions" aria-label={t('Version history')}><div className="om-asset-inspector-title"><h3 className="om-subtitle">{t('Version history')}</h3><span className="om-eyebrow">{asset.versions.length}</span></div>
            <div className="om-asset-version-list">{[...asset.versions].reverse().map((item, i) => <button key={item.id} className="om-nav-item om-asset-version" aria-pressed={item.id === version.id} onClick={() => onVersion(item.id)}><AssetPreview asset={asset} version={item} /><span><strong>V{asset.versions.length - i}{item.id === asset.currentVersionId && <span className="om-badge">{t('Current')}</span>}</strong><small>{formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</small><small>{t(item.source === 'upload' ? 'Uploaded' : 'Generated')}{item.parentVersionId ? ` · ${t('Based on')} V${asset.versions.findIndex(v => v.id === item.parentVersionId) + 1}` : ''}</small></span>{item.id === version.id && <RemixIcon name="check-line" size={14} />}</button>)}</div>
            {version.id !== asset.currentVersionId && <button className="om-button" disabled={saving} onClick={() => void update({ currentVersionId: version.id })}><RemixIcon name="history-line" size={15} />{t('Make current version')}</button>}
          </section>
          <div className="om-asset-inspector-footer">{!asset.trashedAt && <button className="om-nav-item" disabled={uploading} onClick={onUpload}><RemixIcon name="upload-2-line" size={15} />{t('Upload new version')}</button>}<button className="om-nav-item" disabled={saving} onClick={() => void update({ trashed: !asset.trashedAt })}><RemixIcon name={asset.trashedAt ? 'history-line' : 'delete-bin-line'} size={15} />{t(asset.trashedAt ? 'Restore asset' : 'Move to trash')}</button></div>
        </aside>}
      </ResizablePane>
    </div>
  </section>;
}

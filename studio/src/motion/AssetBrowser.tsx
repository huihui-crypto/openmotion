import { CreationEmblem, creationKinds } from './AssetCreationVisuals';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { assetMediaUrl, assetVersion, type AssetReference, type LibraryAsset, type AssetVersion } from '../../../shared/asset-library';
import { useI18n } from '../i18n/I18n';
import { RemixIcon } from '../icons/RemixIcons';
import { Skeleton } from '../components/ui/Skeleton';
import { Select } from '../components/ui/Select';
import { SettingsDialog } from './settingsPrimitives';
import { assetRequest } from './assetClient';
export const assetKinds = [{ id: 'all', label: 'All assets', icon: 'folder-open-line' }, { id: 'image', label: 'Images', icon: 'image-line' }, { id: 'video', label: 'Videos', icon: 'movie-line' }, { id: 'audio', label: 'Audio', icon: 'music-2-line' }] as const;
export type AssetKind = typeof assetKinds[number]['id'] | 'trash';
export const AssetPreview = memo(function AssetPreview({ asset, version = assetVersion(asset)!, controls = false }: { asset: LibraryAsset; version?: AssetVersion; controls?: boolean }) {
  return <AssetPreviewContent key={`${asset.id}/${version.id}`} asset={asset} version={version} controls={controls} />;
});
function AssetPreviewContent({ asset, version, controls }: { asset: LibraryAsset; version: AssetVersion; controls: boolean }) {
  const { t } = useI18n(), [failed, setFailed] = useState(false), [loaded, setLoaded] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const src = assetMediaUrl(asset.id, version.id);
  useLayoutEffect(() => { if (image.current?.complete && image.current.naturalWidth > 0) setLoaded(true); }, [src]);
  return <div className="om-asset-preview om-media-surface" data-kind={asset.modality}>
    {failed ? <div className="om-empty"><RemixIcon name="error-warning-line" size={24} /><span>{t('Preview unavailable')}</span>{controls && <button className="om-button" onClick={e => { e.stopPropagation(); setFailed(false); }}>{t('Retry')}</button>}</div>
      : asset.modality === 'image' ? <>{!loaded && <Skeleton className="om-asset-poster-skeleton" />}<img ref={image} src={src} alt={asset.name} width={version.width} height={version.height} loading={controls ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} /></>
      : controls ? asset.modality === 'video' ? <video src={src} controls preload="metadata" onError={() => setFailed(true)} /> : <audio src={src} controls preload="metadata" onError={() => setFailed(true)} />
      : <div className="om-asset-media-symbol"><RemixIcon name={asset.modality === 'video' ? 'play-fill' : 'music-2-line'} size={40} /><span className="om-muted">{version.duration ? `${Math.round(version.duration)}s` : t(asset.modality === 'video' ? 'Video' : 'Audio')}</span></div>}
  </div>;
}
/** The gallery and detail filmstrip share one loaded collection and filter state. */
export function useAssetBrowser({ kind, revision = 0, active = true }: { kind: AssetKind; revision?: number; active?: boolean }) {
  const [query, setQuery] = useState(''), [source, setSource] = useState('all'), [sort, setSort] = useState('newest');
  const [result, setResult] = useState<{ key: string; assets: LibraryAsset[]; total: number; nextOffset: number | null }>();
  const [error, setError] = useState(false), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0), [page, setPage] = useState(0);
  const signature = `${kind}|${query}|${source}|${sort}|${revision}`;
  const requestKey = `${signature}|${page}`;
  // Keep the last settled collection visible while a new filter or tab request
  // is in flight. Skeleton cards are reserved for the initial load, so tab
  // changes do not flash a second loading surface over the existing gallery.
  const data = result;
  const stale = Boolean(data && data.key !== requestKey);
  const [previous, setPrevious] = useState(signature);
  if (previous !== signature) { setPrevious(signature); setPage(0); }
  useEffect(() => {
    if (!active) return;
    let cancelled = false; setLoading(true); setError(false);
    const timer = setTimeout(() => {
      void assetRequest<{ assets: LibraryAsset[]; total: number; nextOffset: number | null }>({ action: 'list', ...(kind !== 'all' && kind !== 'trash' ? { modality: kind } : {}), trash: kind === 'trash', query, ...(source !== 'all' ? { source } : {}), sort, offset: page * 40, limit: 40 })
        .then(result => { if (!cancelled) setResult({ ...result, key: requestKey }); }).catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    }, query ? 180 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active, kind, query, source, sort, page, revision, retry, requestKey]);
  return { kind, query, setQuery, source, setSource, sort, setSort, data, stale, loading: loading || (stale && !error), error, page, setPage, retry: () => setRetry(v => v + 1) };
}
type BrowserActions = { onOpen: (asset: LibraryAsset) => void; onCreate?: (kind: 'image' | 'video' | 'audio') => void; compact?: boolean; selectedId?: string };
export function AssetBrowser({ kind, revision, active, ...actions }: BrowserActions & { kind: AssetKind; revision?: number; active?: boolean }) {
  const browser = useAssetBrowser({ kind, revision, active });
  return <AssetBrowserContent browser={browser} {...actions} />;
}
export function AssetBrowserContent({ browser, onOpen, onCreate, compact = false, selectedId }: BrowserActions & { browser: ReturnType<typeof useAssetBrowser> }) {
  const { t } = useI18n();
  const { kind, query, setQuery, source, setSource, sort, setSort, data, stale, loading, error, page, setPage, retry } = browser;
  return <section data-compact={compact} aria-label={t('Asset library')}>
    <div className="om-asset-filters om-control-row">
      <label className="om-field om-asset-search"><RemixIcon name="search-line" size={16} /><input type="search" aria-label={t('Search assets')} placeholder={t('Search assets...')} value={query} onChange={e => setQuery(e.target.value)} maxLength={200} /></label>
      {!compact && <><Select label={t('Source')} value={source} onCommit={setSource} options={[{ value: 'all', label: t('All sources') }, { value: 'generated', label: t('Your creations') }, { value: 'upload', label: t('Uploads') }]} />
      <Select label={t('Sort')} value={sort} onCommit={setSort} options={[{ value: 'newest', label: t('Newest first') }, { value: 'oldest', label: t('Oldest first') }, { value: 'name', label: t('Name') }]} /></>}
      {(query || source !== 'all') && <button className="om-nav-item" onClick={() => { setQuery(''); setSource('all'); }}>{t('Clear filters')}</button>}
    </div>
    <div className="om-asset-results" aria-busy={loading} inert={stale && !error}>
      {error ? <div className="om-empty"><RemixIcon name="error-warning-line" size={32} /><p>{t('Could not load assets')}</p><button className="om-button" onClick={retry}>{t('Retry')}</button></div>
        : !data ? <div className="om-asset-grid">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="om-asset-loading-card" />)}</div>
        : !data?.assets.length && onCreate && !query && source === 'all' && kind !== 'trash' ? <div className="om-asset-welcome"><span className="om-creation-kicker">{t('YOUR NEXT CREATION STARTS HERE')}</span><h2 className="om-title">{t('One idea. Endless possibilities.')}</h2><p className="om-muted">{t('Upload your own media or create an image, video or audio asset.')}</p><div className="om-asset-starters">{creationKinds.filter(k => kind === 'all' || kind === k.id).map(item => <button className="om-creation-suggestion om-asset-starter" key={item.id} onClick={() => onCreate(item.id)}><CreationEmblem kind={item.id} /><strong>{t(item.title)}</strong><span className="om-muted">{t(item.hint)}</span><span className="om-asset-starter-action">{t(item.action)}<RemixIcon name="arrow-right-line" size={16} /></span></button>)}</div></div>
        : !data?.assets.length ? <div className="om-empty om-asset-empty"><RemixIcon name={kind === 'trash' ? 'delete-bin-line' : 'image-line'} size={40} /><h2 className="om-subtitle">{t(query || source !== 'all' ? 'No matching assets' : kind === 'trash' ? 'Trash is empty' : 'Your next idea starts here')}</h2><p className="om-muted">{t(kind === 'trash' ? 'Assets moved to trash can be restored.' : 'Upload your own media or create an image, video or audio asset.')}</p></div>
        : <><p className="om-muted">{t('{count} assets', { count: data.total })}</p><div className="om-asset-grid">{data.assets.map(asset => <div key={asset.id} className="om-asset-tile om-card"><button className="om-nav-item om-asset-open" onClick={() => onOpen(asset)} aria-label={asset.name} aria-current={selectedId === asset.id ? 'true' : undefined}>
          <AssetPreview asset={asset} /><span className="om-asset-tile-caption"><strong>{asset.name}</strong><span className="om-muted">{t(assetVersion(asset)?.source === 'upload' ? 'Uploaded' : 'Generated')} · V{asset.versions.findIndex(v => v.id === asset.currentVersionId) + 1}</span></span>
        </button></div>)}</div>{(page > 0 || data.nextOffset !== null) && <div className="om-asset-pagination"><button className="om-button" disabled={!page || loading} onClick={() => setPage(v => v - 1)}>{t('Previous')}</button><span className="om-muted">{page + 1}</span><button className="om-button" disabled={data.nextOffset === null || loading} onClick={() => setPage(v => v + 1)}>{t('Next')}</button></div>}</>}
    </div>
  </section>;
}
export function AssetPicker({ onClose, onPick, title = 'Choose an asset', confirmLabel = 'Use selected version', busyLabel = 'Working…', busy = false, revision = 0 }: { onClose: () => void; onPick: (reference: AssetReference, asset: LibraryAsset) => void; title?: string; confirmLabel?: string; busyLabel?: string; busy?: boolean; revision?: number }) {
  const { t } = useI18n(), [kind, setKind] = useState<AssetKind>('all'), [selected, setSelected] = useState<LibraryAsset>(), [version, setVersion] = useState('');
  const pick = useCallback((asset: LibraryAsset) => { if (!busy) { setSelected(asset); setVersion(asset.currentVersionId); } }, [busy]);
  return <SettingsDialog title={t(title)} onClose={onClose}><div className="om-asset-picker">
    <div className="om-asset-tabs">{assetKinds.map(item => <button key={item.id} className="om-nav-item" disabled={busy} aria-pressed={kind === item.id} onClick={() => setKind(item.id)}>{t(item.label)}</button>)}</div>
    <AssetBrowser kind={kind} onOpen={pick} revision={revision} />
    {selected && <div className="om-asset-picker-selection"><strong>{selected.name}</strong><Select disabled={busy} label={t('Version')} value={version} onCommit={setVersion} options={selected.versions.map((v, i) => ({ value: v.id, label: `V${i + 1}` }))} /><button className="om-button" data-primary disabled={busy} aria-busy={busy} onClick={() => onPick({ assetId: selected.id, versionId: version }, selected)}>{busy && <RemixIcon name="loader-4-line" size={16} className="animate-spin motion-reduce:animate-none" />}{t(busy ? busyLabel : confirmLabel)}</button></div>}
  </div></SettingsDialog>;
}

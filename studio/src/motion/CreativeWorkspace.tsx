import type { TechniqueStudio } from '../../../shared/studio-catalog';
import type { RefObject } from 'react';
import { useI18n } from '../i18n/I18n';
import { RemixIcon } from '../icons/RemixIcons';
import { AssetsPage } from './AssetsPage';
import type { AssetDraft } from './AssetComposer';
import { useMediaCatalog } from './useMediaCatalog';
import { destinationTarget, reportCreativeClick } from './exploreTracking';
import { scenesForStudio, studioDestination, studioDraftKey, supportsScene, type StudioDestination } from './creativeStudios';

export type StudioCreation = {
  destination: StudioDestination;
  catalog: ReturnType<typeof useMediaCatalog>;
  initialDraft?: AssetDraft;
  remember: (draft: AssetDraft) => void;
  useAsFirstFrame?: (reference: AssetDraft['references'][number]) => void;
  chooseModel: (model: string) => void;
};

export function CreativeWorkspace({ destination, skill, visit, onNavigate, onExplore, onCollection, onOpenAssets, hasProject, active, drafts }: {
  onOpenAssets?: () => void;
  skill: string | null; onCollection: (studio: TechniqueStudio) => void; onExplore: () => void; drafts: RefObject<Map<string, AssetDraft>>; destination: StudioDestination | null; active: boolean; visit: number; onNavigate: (next: StudioDestination) => void; hasProject: boolean;
}) {
  const { t } = useI18n();
  const catalog = useMediaCatalog(active && Boolean(destination));
  if (!destination) return null;
  const { scene, studio } = destination;
  const draftKey = studioDraftKey(destination, skill);
  const firstFrameScene = studio.scenes.find(id => id === 'image-to-video');
  const useAsFirstFrame = scene.modality === 'image' && firstFrameScene ? (reference: AssetDraft['references'][number]) => {
    const next = studioDestination(studio, firstFrameScene);
    const key = studioDraftKey(next, skill);
    const previous = drafts.current.get(key);
    drafts.current.set(key, { ...previous, modality: 'video', prompt: previous?.prompt ?? '', references: [reference] });
    onNavigate(next);
  } : undefined;
  const pinned = catalog.catalog?.models.find(model => model.id === destination.model);
  return <div className="om-assets-host om-creative-workspace">
    <header className="om-studio-bar">
      {studio.surface === 'techniques' ? <button className="om-nav-item om-studio-back" onClick={() => { reportCreativeClick('creative_studio', 'studio_bar', 'open_skills', destinationTarget(destination)); onCollection(studio); }} aria-label={t('Back to {studio}', { studio: t(studio.title) })}><RemixIcon name="arrow-left-line" size={16} /><span>{t('Skills')}</span></button> : <button className="om-nav-item om-studio-back" onClick={() => { reportCreativeClick('creative_studio', 'studio_bar', 'back_to_explore', destinationTarget(destination)); onExplore(); }} aria-label={t('Back to Explore')}><RemixIcon name="arrow-left-line" size={16} /><span>{t('Explore')}</span></button>}
      <h1 className="om-subtitle"><span className="om-creation-icon" data-tone={scene.modality}><RemixIcon name={destination.landing ? scene.icon : studio.icon} size={18} /></span>{destination.landing ? t(scene.label) : t(studio.title)}</h1>
      {destination.landing ? <button className="om-button" onClick={() => { reportCreativeClick('creative_studio', 'studio_bar', 'open_in_studio', destinationTarget(destination)); onNavigate(studioDestination(studio, scene.id, destination.model)); }}>
        {t('Open in {studio}', { studio: t(studio.title) })}<RemixIcon name="arrow-right-line" size={15} />
      </button> : <nav className="om-asset-tabs" aria-label={t('Scenes')}>{scenesForStudio(studio).map(item => <button className="om-nav-item" key={item.id}
        aria-current={item.id === scene.id ? 'page' : undefined} onClick={() => {
        if (item.id === scene.id) return;
        const next = { studio, scene: item, model: pinned && supportsScene(pinned, item) ? pinned.id : null };
        reportCreativeClick('creative_studio', 'studio_bar', 'scene_tab', destinationTarget(next));
        onNavigate(next);
      }}>{t(item.label)}</button>)}</nav>}
      {onOpenAssets && <button className="om-nav-item om-studio-library-link" onClick={() => { reportCreativeClick('creative_studio', 'studio_bar', 'open_assets', destinationTarget(destination)); onOpenAssets(); }} aria-label={t('Workspace assets')}><RemixIcon name="folder-open-line" size={16} /><span>{t('Workspace assets')}</span></button>}
    </header>
    <AssetsPage key={draftKey + visit} active={active} hasProject={hasProject} studio={{ destination, catalog, useAsFirstFrame, initialDraft: drafts.current.get(draftKey),
      remember: draft => drafts.current.set(draftKey, draft), chooseModel: model => onNavigate({ ...destination, model }) }} />
  </div>;
}

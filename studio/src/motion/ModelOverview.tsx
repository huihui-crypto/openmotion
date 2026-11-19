import { useI18n } from '../i18n/I18n';
import { Skeleton } from '../components/ui/Skeleton';
import { RemixIcon } from '../icons/RemixIcons';
import { ModelAvatar } from './settingsPrimitives';
import { useMediaCatalog } from './useMediaCatalog';
import { mediaLabels, sceneDestination, studioScenes, supportsScene, type StudioDestination } from './creativeStudios';
import { sceneExamples } from './sceneShowcase';
import { destinationTarget, reportCreativeClick } from './exploreTracking';

export function ModelOverview({ id, onExplore, onProvider, onScene }: {
  id: string; onExplore: () => void; onProvider: (provider?: string) => void; onScene: (scene: StudioDestination) => void;
}) {
  const { t } = useI18n();
  const { catalog, failed, retry } = useMediaCatalog(true);
  const model = catalog?.models.find(item => item.id === id);
  const provider = model && catalog?.status.providers.find(item => item.id === model.provider);
  return <main className="om-explore"><div className="om-discovery-page">
    <div><button className="om-nav-item" onClick={() => { reportCreativeClick('model_overview', 'model_overview', 'back_to_explore', { model: id }); onExplore(); }}><RemixIcon name="arrow-left-line" size={16} />{t('Back to Explore')}</button></div>
    {failed ? <button className="om-button" onClick={retry}>{t('Retry loading models')}</button>
      : !catalog ? <Skeleton className="om-featured-template-skeleton" />
      : !model ? <section><h1 className="om-title">{t('Model unavailable')}</h1><p className="om-muted">{id}</p><button className="om-button" onClick={() => { reportCreativeClick('model_overview', 'model_overview', 'open_providers', { model: id }); onProvider(); }}>{t('Manage providers')}</button></section>
      : <>
        <header className="om-discovery-heading"><div>
          <ModelAvatar name={model.label} modelId={model.modelId} provider={{ id: model.provider, custom: model.source === 'custom' }} />
          <h1 className="om-title">{model.label}</h1>
          <p>{provider?.label || model.provider} · {t(mediaLabels[model.modality])} · {model.modelId}</p>
          {model.description && <p className="om-muted">{model.description}</p>}
        </div><button className="om-button" onClick={() => { reportCreativeClick('model_overview', 'model_overview', 'open_providers', { model: id }); onProvider(model.provider); }}>{t(provider?.available ? 'Model providers' : 'Setup required')}</button></header>
        <section><h2 className="om-subtitle">{t('Scenes')}</h2><div className="om-studio-collection-cards">{studioScenes.filter(scene => supportsScene(model, scene)).map(scene => {
          const example = sceneExamples[scene.id][0];
          return <button key={scene.id} className="om-scene-tile" onClick={() => { const target = sceneDestination(scene, null, model.id); reportCreativeClick('model_overview', 'model_overview', 'select_scene', destinationTarget(target)); onScene(target); }}>
            <span className="om-scene-tile-art"><img alt="" src={example.poster} />{example.credit && <small className="om-scene-credit">{example.credit}</small>}</span>
            <strong>{t(scene.label)}</strong><span className="om-feed-card-description">{t(scene.hint)}</span>
          </button>;
        })}</div></section>
      </>}
  </div></main>;
}

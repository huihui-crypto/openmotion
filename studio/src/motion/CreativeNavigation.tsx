import type { CreativeStudio, TechniqueStudio } from '../../../shared/studio-catalog';
import { useLayoutEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Modality } from '../../../shared/gateway';
import { Popover } from '../components/ui/Popover';
import { useI18n } from '../i18n/I18n';
import { RemixIcon } from '../icons/RemixIcons';
import { workspacePageHref } from './workspacePageRouting';
import { creativeStudios, mediaLabels, sceneDestination, studioScenes, supportsScene, type StudioDestination } from './creativeStudios';
import { mcpClients, type McpClient } from './mcpClients';
import { useMediaCatalog } from './useMediaCatalog';
import { editingPresets } from './skillCatalog';
import { MediaModelChoices } from './MediaModelChoices';
import { destinationTarget, navigationPage, reportCreativeClick, type CreativePage, type CreativeTarget } from './exploreTracking';

export type CreativeNavigationProps = {
  onModel: (id: string) => void;
  onChooseStudio: (studio: CreativeStudio, kind?: Modality) => void;
  specialty: TechniqueStudio | null;
  destination: StudioDestination | null;
  motionActive: boolean;
  onNavigate: (destination: StudioDestination | null) => void;
  openProviders: () => void;
  onSkill: (id: string) => void;
  currentPage: 'explore' | 'api' | 'mcp' | null;
  onOpenPage: (page: 'explore' | 'api' | 'mcp', client?: McpClient) => void;
  /** The page this navigation is shown on, when it is not derived from the current destination (the template library). */
  trackingPage?: CreativePage;
};

function MediaChoices({ kind, onModel, destination, onNavigate, onModelNavigate, onSkill, openProviders, catalog, failed, retry }: Pick<CreativeNavigationProps, 'destination' | 'onModel' | 'onNavigate' | 'openProviders' | 'onSkill'> & ReturnType<typeof useMediaCatalog> & {
  kind: Modality;
  /** A model chosen from the list, which opens its scene with that model. */
  onModelNavigate: CreativeNavigationProps['onNavigate'];
}) {
  const { t } = useI18n();
  const [modelScene, setModelScene] = useState(destination?.scene.modality === kind ? destination.scene : null);
  const modelsHeading = useRef<HTMLHeadingElement>(null);
  const matchingScenes = studioScenes.filter(scene => scene.modality === kind);
  const pinned = catalog?.models.find(model => model.id === destination?.model);
  return <div className="om-creative-menu-columns">
    <section><h2 className="om-eyebrow">{t('Scenes')}</h2>
      {matchingScenes.map(scene => {
        const current = destination?.scene.id === scene.id;
        const filtering = modelScene?.id === scene.id;
        const filterLabel = t('Models for {scene}', { scene: t(scene.label) });
        return <div className="om-nav-row om-creative-scene-row" data-active={current} key={scene.id}>
          <button className="om-nav-item om-nav-row-link om-creative-option" aria-current={current ? 'page' : undefined}
            onClick={() => onNavigate(sceneDestination(scene, destination, pinned && supportsScene(pinned, scene) ? pinned.id : null))}>
            <span className="om-creation-icon" data-tone={kind}><RemixIcon name={scene.icon} size={18} /></span>
            <span><strong>{t(scene.label)}</strong><small className="om-muted">{t(scene.hint)}</small></span>
          </button>
          <button className="om-nav-item om-nav-row-action" title={filterLabel} aria-label={filterLabel} aria-pressed={filtering}
            onClick={() => {
              setModelScene(filtering ? null : scene);
              if (window.matchMedia('(max-width: 560px)').matches) modelsHeading.current?.scrollIntoView({ block: 'nearest' });
            }}><RemixIcon name={filtering ? 'equalizer-fill' : 'equalizer-line'} size={16} /></button>
        </div>;
      })}
    </section>
    <section><h2 className="om-eyebrow" ref={modelsHeading}>{t('Models')}</h2>
      {modelScene && <button className="om-nav-item om-model-scene-chip" aria-label={t('Clear filters')} onClick={() => setModelScene(null)}>{t(modelScene.label)}<RemixIcon name="close-line" size={14} /></button>}
      <MediaModelChoices scene={modelScene} onNavigate={onModelNavigate} {...{ kind, onModel, destination, openProviders, catalog, failed, retry }} />
    </section>
    {kind === 'video' && <section className="om-creative-related-skills"><h2 className="om-eyebrow">{t('Skills')}</h2><div>
      {editingPresets.map(skill => <button className="om-nav-item" key={skill.id} onClick={() => onSkill(skill.id)}><RemixIcon name="movie-line" size={15} /><span>{t(skill.title)}</span></button>)}
    </div></section>}
  </div>;
}

export function CreativeNavigation({ specialty, onModel, onChooseStudio, destination, motionActive, onNavigate, openProviders, onSkill, currentPage, onOpenPage, overflowActions, trackingPage }: CreativeNavigationProps & { overflowActions?: (close: () => void) => ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<Modality | 'mcp' | null>(null);
  const [popupHost, setPopupHost] = useState<HTMLElement>();
  const navId = useId();
  const rail = useRef<HTMLElement>(null);
  const catalog = useMediaCatalog(open !== null && open !== 'mcp');
  const trackPage = trackingPage ?? navigationPage(currentPage, motionActive, Boolean(specialty));
  const track = (element: Parameters<typeof reportCreativeClick>[2], target: CreativeTarget) => reportCreativeClick(trackPage, 'creative_nav', element, target);

  const [visibleCount, setVisibleCount] = useState(Infinity);
  const [moreOpen, setMoreOpen] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = rail.current!;
    const row = strip.current!;
    const trigger = more.current!;
    setPopupHost(viewport.closest<HTMLElement>('dialog, [data-feedback-modal]') ?? undefined);
    const items = Array.from(row.querySelectorAll<HTMLElement>(':scope > [data-nav-slot]'));
    const update = () => {
      const available = viewport.clientWidth;
      if (!available) return;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const widths = items.map(item => item.getBoundingClientRect().width);
      const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
      let count = widths.length;
      if (total > available) {
        const compact = getComputedStyle(row).getPropertyValue('--compact-nav').trim() === '1';
        const limit = compact ? 4 : widths.length;
        let used = trigger.getBoundingClientRect().width;
        count = 0;
        while (count < limit && used + gap + widths[count] <= available) {
          used += gap + widths[count++];
        }
      }
      setVisibleCount(count);
    };
    update();
    const observer = new ResizeObserver(update);
    [viewport, trigger, ...items].forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const choose = (action: () => void) => {
    const navigation = rail.current;
    if (open && navigation && !navigation.contains(document.activeElement)) {
      // A disappearing menu item must not reclaim focus from an input on the destination page.
      navigation.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus({ preventScroll: true });
    }
    setOpen(null);
    setMoreOpen(false);
    action();
  };
  const menuDestinations = [
    ...creativeStudios.filter(studio => studio.surface === 'media').map(studio => {
      const kind = studio.primaryModality;
      const label = t(mediaLabels[kind]);
      return { id: kind, label, current: destination?.scene.modality === kind ? 'location' as const : undefined,
        menuLabel: t('{media} scenes and models', { media: label }), onActivate: () => onChooseStudio(studio, kind) };
    }),
    { id: 'mcp' as const, label: 'MCP', current: currentPage === 'mcp' ? 'page' as const : undefined,
      menuLabel: t('Agent client'), onActivate: () => onOpenPage('mcp') },
  ];
  const splitStart = 1;
  const apiIndex = splitStart + menuDestinations.length;
  const studioStart = apiIndex + 1;
  const count = studioStart + creativeStudios.length;
  const hasMore = visibleCount < count || Boolean(overflowActions);

  useLayoutEffect(() => {
    setOpen(null);
    if (!hasMore) setMoreOpen(false);
  }, [visibleCount, hasMore]);

  function splitItem(index: number, inPanel: boolean) {
    const { id, label, current, menuLabel, onActivate } = menuDestinations[index - splitStart];
    const expanded = open === id && (index >= visibleCount) === inPanel;
    const where = { navTarget: id, inOverflow: inPanel };
    return <div className="om-nav-row om-creative-split" data-active={Boolean(current)}>
          <Popover container={popupHost} modal={false} openOnHover={!inPanel} open={expanded}
            onOpenChange={value => setOpen(previous => value ? id : previous === id ? null : previous)}
            aria-label={menuLabel} align="start" className={id === 'mcp' ? 'om-selection-panel om-creative-client-menu' : 'om-selection-panel om-creative-menu'}
            primaryAction={<button className="om-nav-item om-nav-row-link" aria-current={current} onClick={() => { track(id === 'mcp' ? 'nav_mcp' : 'nav_media', where); choose(onActivate); }}>{label}</button>}
            trigger={<button className="om-nav-item om-nav-row-action" aria-label={menuLabel} aria-expanded={expanded}><RemixIcon name="arrow-down-s-line" size={12} /></button>}>
            {id === 'mcp' ? <>
              <h2 className="om-eyebrow">{t('Agent client')}</h2>
              {mcpClients.map(client => <button className="om-nav-item" key={client.id} onClick={() => { track('select_client', { ...where, client: client.id }); choose(() => onOpenPage('mcp', client.id)); }}>
                {t(client.name)}{client.host === 'chatgpt' && <small className="om-muted">{t('Remote connection unavailable')}</small>}
              </button>)}
            </> : expanded && <MediaChoices {...catalog} kind={id} destination={destination}
              onModel={model => { track('select_model', { ...where, model }); choose(() => onModel(model)); }}
              onNavigate={next => { track('select_scene', { ...where, ...destinationTarget(next) }); choose(() => onNavigate(next)); }}
              onModelNavigate={next => { track('select_model', { ...where, ...destinationTarget(next) }); choose(() => onNavigate(next)); }}
              onSkill={skill => { track('select_skill', { ...where, skill }); choose(() => onSkill(skill)); }}
              openProviders={() => { track('open_providers', where); choose(openProviders); }} />}
          </Popover>
        </div>;
  }

  function item(index: number, inPanel = false) {
    if (index === 0) return <button className="om-nav-item om-explore-link" aria-label={t('Explore')} title={t('Explore')}
      aria-current={currentPage === 'explore' ? 'page' : undefined} onClick={() => { track('nav_explore', { navTarget: 'explore', inOverflow: inPanel }); choose(() => onOpenPage('explore')); }}>
      <RemixIcon name="global-line" size={17} /><span>{t('Explore')}</span>
    </button>;
    if (index < apiIndex) return splitItem(index, inPanel);
    if (index === apiIndex) return (
      <a className="om-nav-item" href={workspacePageHref(location.href, { api: true, tool: null, templates: false })} aria-current={currentPage === 'api' ? 'page' : undefined}
        onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); track('nav_api', { navTarget: 'api', inOverflow: inPanel }); choose(() => onOpenPage('api')); }}>API</a>
    );
    const studio = creativeStudios[index - studioStart];
    const isCurrent = studio.surface === 'editor' ? motionActive
      : (studio.id === destination?.studio.id && !destination?.landing) || studio.id === specialty?.id;
    const badge = 'navBadge' in studio ? studio.navBadge : undefined;
    const badgeId = badge ? navId + '-' + studio.id + (inPanel ? '-more' : '') : undefined;
    return <button className="om-nav-item" aria-current={isCurrent ? 'page' : undefined}
      aria-label={t(studio.title)} aria-describedby={badgeId} onClick={() => { track('nav_studio', { navTarget: studio.id, studio: studio.id, inOverflow: inPanel }); choose(() => onChooseStudio(studio)); }}>
      {inPanel && <RemixIcon name={studio.icon} size={17} />}
      {t(studio.title)}{badge && <span className="om-badge" data-nav-badge={badge} id={badgeId} lang="en">{badge}</span>}
    </button>;
  }

  const indices = Array.from({ length: count }, (_, index) => index);
  const hidden = indices.slice(visibleCount);
  return <nav ref={rail} className="om-creative-navigation" data-compact-actions={overflowActions ? true : undefined} aria-label={t('Creative studio')}>
    <div className="om-creative-strip" ref={strip}>
      {indices.map(index => <div key={index} data-nav-slot="" data-studio-start={index === studioStart || undefined}
        data-stowed={index >= visibleCount || undefined} inert={index >= visibleCount}>{item(index)}</div>)}
      <div ref={more} data-stowed={!hasMore || undefined} inert={!hasMore}>
        <Popover container={popupHost} modal={false} align="end" openOnHover open={moreOpen && hasMore}
          onOpenChange={next => { setOpen(null); setMoreOpen(next); }} aria-label={t('More Studio')} className="om-selection-panel om-nav-more-panel"
          trigger={<button type="button" className="om-nav-item">{t('More Studio')}</button>}>
          {moreOpen && (overflowActions || hidden.some(index => index < studioStart)) && <div className="om-nav-more-tools">
            {overflowActions?.(() => setMoreOpen(false))}
            {hidden.filter(index => index < studioStart).map(index => <div key={index}>{item(index, true)}</div>)}
          </div>}
          {moreOpen && <section aria-label={t('Studios')}><h2 className="om-eyebrow">{t('Studios')}</h2>
            <div className="om-nav-more-studios">{hidden.filter(index => index >= studioStart).map(index => <div key={index}>{item(index, true)}</div>)}</div>
          </section>}
        </Popover>
      </div>
    </div>
  </nav>;
}

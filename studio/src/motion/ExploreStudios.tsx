import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { exploreCommunities, findMediaStudio, findTechniqueStudio, type CreativeStudio, type ExploreCommunity } from '../../../shared/studio-catalog';
import type { GalleryTemplate } from '../../../shared/catalog';
import type { ExploreFilters } from './workspacePageRouting';
import { useI18n } from '../i18n/I18n';
import { Skeleton } from '../components/ui/Skeleton';
import { RemixIcon } from '../icons/RemixIcons';
import { creativeStudios, mediaLabels, motionStudio, sceneDestination, scenesForStudio, studioDestination, studioScenes, type StudioDestination, type StudioScene } from './creativeStudios';
import { sceneExamples, type SceneExample } from './sceneShowcase';
import { AssetHoverVideo } from './AssetHoverVideo';
import { useTemplatePlayback } from './useTemplatePlayback';
import { editingPresets, motionSkills, skillCategories, type SkillCategory, type MotionSkill } from './skillCatalog';
import { useWorkspaceChrome } from './WorkspaceChromeContext';
import { ExploreTemplateCard, TemplatePromptAction, useExploreTemplates } from './ExploreTemplates';
import { ExploreSpotlight, featuredSceneIds } from './ExploreSpotlight';
import { SkillMedia } from './SkillMedia';
import { TemplatePoster } from './TemplateGalleryCard';
import { MediaModelChoices } from './MediaModelChoices';
import { useMediaCatalog } from './useMediaCatalog';
import { destinationTarget, reportCreativeClick, type CreativeTarget } from './exploreTracking';
import { skillCategoryId } from './pageTracking';
import { send } from './reporting';
import './sceneDiscovery.css';

type ExploreArea = Parameters<typeof reportCreativeClick>[1];
const track = (area: ExploreArea, element: Parameters<typeof reportCreativeClick>[2], target: CreativeTarget = {}) => reportCreativeClick('explore', area, element, target);
/** Feed cards in the main feed report as explore_feed; cards inside a Studio section report that section as the collection. */
const cardArea = (section: string): { area: ExploreArea; collection?: string } => section === 'feed' ? { area: 'explore_feed' } : { area: 'explore_collection', collection: section };

const templateVideoDestination = studioDestination(findMediaStudio('cinema')!, 'text-to-video');
const discoveryStudios = [motionStudio, ...creativeStudios.filter(studio => studio.surface !== 'editor')];
const mediaCollectionNames = { image: 'Image design', video: 'Cinematic shots', audio: 'Music and voiceover' } as const;
type ExploreProps = {
  onSkill: (id: string) => void;
  onChooseStudio: (studio: CreativeStudio) => void;
  onNavigate: (target: StudioDestination, prompt?: string) => void;
  onModel: (id: string) => void;
  onCreators: (trigger: HTMLElement) => void;
  onOpenBlackFriday: (trigger: HTMLButtonElement) => void;
  onBrandKit: () => void;
  onMcp: () => void;
  active: boolean;
  filters: ExploreFilters;
  onFilter: (filters: Partial<ExploreFilters>) => void;
};

function FeedCard({ title, label, description, poster, posterPosition, credit, icon, onClick, sceneId, children, playbackId, onPriority }: {
  title: string; label: string; description: string; poster?: string; posterPosition?: string; credit?: string; icon: string; onClick: () => void; sceneId?: string;
  children?: ReactNode; playbackId?: string; onPriority?: (id: string | null) => void;
}) {
  return <button className="om-scene-tile" data-scene={sceneId} data-playback-id={playbackId} onClick={onClick}
    onMouseEnter={playbackId ? () => onPriority?.(playbackId) : undefined} onMouseLeave={playbackId ? () => onPriority?.(null) : undefined}
    onFocus={playbackId ? () => onPriority?.(playbackId) : undefined} onBlur={playbackId ? () => onPriority?.(null) : undefined}>
    <span className="om-scene-tile-art">{poster && <img src={poster} style={{ objectPosition: posterPosition }} loading="lazy" alt="" />}{children}{credit && <small className="om-scene-credit">{credit}</small>}</span>
    <span className="om-feed-card-label"><RemixIcon name={icon} size={14} />{label}</span>
    <strong>{title}<RemixIcon name="arrow-right-up-line" size={16} /></strong>
    <span className="om-feed-card-description">{description}</span>
  </button>;
}

type FeedPlayback = { playing: Set<string>; onPriority: (id: string | null) => void };
function SceneFeedCard({ target, example, section, onNavigate, playing, onPriority, community }: FeedPlayback & {
  target: StudioDestination; example: SceneExample; section: string; onNavigate: ExploreProps['onNavigate']; community?: string;
}) {
  const { t } = useI18n();
  const { scene, studio } = target;
  const id = example.clip ? [section, scene.id, example.title].join('/') : undefined;
  const label = section === 'feed' ? t(studio.title) + ' · ' + t(scene.label) : t(scene.label);
  return <FeedCard sceneId={scene.id} icon={scene.icon} label={label} title={t(example.title)}
    description={t(section === 'feed' ? scene.hint : example.prompt)} poster={example.poster} posterPosition={example.posterPosition} credit={example.credit}
    playbackId={id} onPriority={onPriority} onClick={() => {
      const { area, collection } = cardArea(section);
      track(area, 'open_scene', { ...destinationTarget(target), collection, community });
      onNavigate(target, t(example.prompt));
    }}>
    {example.clip && id && playing.has(id) && <AssetHoverVideo src={example.clip} />}
  </FeedCard>;
}

function SkillFeedCard({ skill, section, icon, label, onSkill, playing, onPriority, community }: FeedPlayback & {
  skill: MotionSkill; section: string; icon: string; label: string; onSkill: ExploreProps['onSkill']; community?: string;
}) {
  const { t } = useI18n();
  const id = section + '/' + skill.id;
  return <FeedCard title={t(skill.title)} label={label} description={t(skill.tagline)} icon={icon}
    playbackId={id} onPriority={onPriority} onClick={() => {
      const { area, collection } = cardArea(section);
      track(area, 'open_skill', { skill: skill.id, collection, community });
      onSkill(skill.id);
    }}>
    <SkillMedia skill={skill} playing={playing.has(id)} />
  </FeedCard>;
}

function CommunitySpotlight({ community, skill, onChooseStudio }: {
  community: ExploreCommunity; skill: MotionSkill | undefined; onChooseStudio: ExploreProps['onChooseStudio'];
}) {
  const { t } = useI18n();
  const lead = creativeStudios.find(studio => studio.id === community.studios[0])!;
  return <section className="om-discovery-hero" aria-label={t(community.label)}>
    {skill?.cover?.poster && <img src={skill.cover.poster} alt="" />}
    <div className="om-discovery-hero-copy"><span>{t('Communities')}</span><h2>{t(community.label)}</h2>
      <p>{t(community.description)}</p><button className="om-button" data-primary="media" onClick={() => { track('explore_spotlight', 'open_studio', { studio: lead.id, community: community.id }); onChooseStudio(lead); }}>{t(lead.title)}<RemixIcon name="arrow-right-line" size={16} /></button>
    </div>
  </section>;
}

function TemplateSpotlight({ item, onTry }: { item: GalleryTemplate; onTry: (prompt: string) => void }) {
  const { t } = useI18n(), { openLibrary } = useWorkspaceChrome();
  return <article className="om-featured-template"><button className="om-featured-open" aria-label={t('Preview template {title}', { title: item.title })}
    onClick={event => { track('explore_featured', 'open_template', { template: item.id }); openLibrary(event.currentTarget, item.id); }}>
    <div className="om-featured-cover"><TemplatePoster key={item.id} template={item} eager /></div>
    <div className="om-featured-caption"><span className="om-feed-card-label">{t('Community template')}</span>
      <strong>{item.title}<RemixIcon name="arrow-right-up-line" size={22} /></strong>
      <small>{item.authorName || item.author || item.brand}</small>
    </div>
  </button><TemplatePromptAction item={item} onTry={prompt => { track('explore_featured', 'try_prompt', { template: item.id }); onTry(prompt); }} /></article>;
}

function StudioCollection({ studio, medium, onChooseStudio, onSkill, onNavigate, ...playback }: FeedPlayback & {
  studio: CreativeStudio; medium: ExploreFilters['medium'];
} & Pick<ExploreProps, 'onChooseStudio' | 'onSkill' | 'onNavigate'>) {
  const { t } = useI18n();
  const community = exploreCommunities.find(item => item.studios[0] === studio.id);
  const description = studio.surface === 'editor' ? 'Animate type and shapes, then edit their timing on the timeline.' : community?.description;
  let cards: ReactNode[];
  let title: string;
  if (studio.surface === 'media') {
    title = mediaCollectionNames[studio.primaryModality];
    cards = scenesForStudio(studio).filter(scene => !medium || medium === scene.modality).flatMap(scene => {
      const target = studioDestination(studio, scene.id);
      const examples = studio.id === 'design' ? sceneExamples[scene.id] : sceneExamples[scene.id].slice(0, 1);
      return examples.map(example => <SceneFeedCard key={scene.id + '/' + example.title} section={studio.id}
        target={target} example={example} onNavigate={onNavigate} {...playback} />);
    });
  } else {
    if (medium && medium !== 'video') return null;
    title = community?.label ?? studio.title;
    const techniques = studio.surface === 'techniques' ? studio.techniques : community?.source === 'templates' ? community.skills : [];
    cards = techniques.slice(0, 5).flatMap(id => {
      const skill = motionSkills.find(item => item.id === id);
      return skill ? [<SkillFeedCard key={id} section={studio.id} skill={skill} label={skill.name} icon={studio.icon} onSkill={onSkill} {...playback} />] : [];
    });
  }
  if (!cards.length) return null;
  return <section className="om-studio-collection" aria-label={t(title)} data-studio={studio.id}>
    <header className="om-discovery-heading"><div><h2>{t(title)}</h2>{description && <p className="om-muted">{t(description)}</p>}</div>
      <button className="om-button" onClick={() => { track('explore_collection', 'open_studio', { studio: studio.id, collection: studio.id }); onChooseStudio(studio); }}>{t(studio.title)}<RemixIcon name="arrow-right-line" size={16} /></button>
    </header>
    <div className="om-studio-collection-cards">{cards}</div>
  </section>;
}

function CapabilityIndex({ active, onModel, onNavigate, onChooseStudio, onBrandKit, onMcp, onSkill }: Pick<ExploreProps, 'active' | 'onModel' | 'onNavigate' | 'onChooseStudio' | 'onBrandKit' | 'onMcp' | 'onSkill'>) {
  const { t } = useI18n(), { openAssets, openModelSettings, openLibrary, openSkills } = useWorkspaceChrome();
  const [skillCategory, setSkillCategory] = useState<SkillCategory | null>(null);
  const [modelsFor, setModelsFor] = useState<StudioScene['modality'] | null>(null);
  const gateway = useMediaCatalog(active && modelsFor !== null);
  return <section className="om-capability-index" aria-labelledby="om-capability-title">
    <h2 id="om-capability-title">{t('Capability index')}</h2>
    <div className="om-capability-columns">
      {(['image', 'video', 'audio'] as const).map(kind => <div key={kind}><h3>{t(mediaLabels[kind])}</h3>
        {studioScenes.filter(scene => scene.modality === kind).map(scene => <button className="om-nav-item" key={scene.id} onClick={() => {
          const target = sceneDestination(scene);
          track('capability_index', 'select_scene', destinationTarget(target));
          onNavigate(target);
        }}>{t(scene.label)}</button>)}
        <button className="om-nav-item" aria-expanded={modelsFor === kind} aria-controls={modelsFor === kind ? 'om-explore-models' : undefined}
          aria-label={t(mediaLabels[kind]) + ' · ' + t('Models')} onClick={() => { track('capability_index', 'models_toggle', { medium: kind, expanded: modelsFor !== kind }); setModelsFor(modelsFor === kind ? null : kind); }}>
          {t('Models')}<RemixIcon name="arrow-down-s-line" size={14} />
        </button>
        {modelsFor === kind && <div className="om-index-models" id="om-explore-models">
          <MediaModelChoices {...gateway} kind={kind} onModel={model => { track('capability_index', 'select_model', { medium: kind, model }); onModel(model); }}
            onNavigate={target => { track('capability_index', 'select_model', { medium: kind, ...destinationTarget(target) }); onNavigate(target); }}
            openProviders={() => { track('capability_index', 'open_providers', { medium: kind }); openModelSettings(); }} />
        </div>}
      </div>)}
      <div><h3>{t('Studios')}</h3>{creativeStudios.map(studio => <button className="om-nav-item" key={studio.id} onClick={() => { track('capability_index', 'open_studio', { studio: studio.id }); onChooseStudio(studio); }}>{t(studio.title)}</button>)}</div>
      <div><h3>{t('Workspace')}</h3>
        <button className="om-nav-item" onClick={event => { track('capability_index', 'template_library'); openLibrary(event.currentTarget); }}>{t('Template library')}</button>
        <button className="om-nav-item" onClick={() => { track('capability_index', 'open_brand_kit'); onBrandKit(); }}>{t('Brand Kit')}</button>
        <button className="om-nav-item" onClick={() => { track('capability_index', 'open_assets'); openAssets(); }}>{t('Workspace assets')}</button>
        <button className="om-nav-item" onClick={() => { track('capability_index', 'open_providers'); openModelSettings(); }}>{t('Model providers')}</button>
        <button className="om-nav-item" onClick={() => { track('capability_index', 'open_mcp'); onMcp(); }}>{t('MCP · Connect Agent')}</button>
      </div>
    </div>
    <div className="om-index-skills">
      <h3 className="om-subtitle"><button className="om-nav-item" onClick={() => { track('capability_index', 'open_skills'); openSkills(); }}>{t('Skills')}<RemixIcon name="arrow-right-line" size={16} /></button></h3>
      <div className="om-index-skill-categories" role="group" aria-label={t('Skill category')}>{skillCategories.map(category =>
        <button className="om-nav-item" key={category} aria-expanded={skillCategory === category} onClick={() => {
          send('ui_click', { page_name: 'explore', area: 'capability_index', element: 'skill_category', skill_category: skillCategoryId(category), expanded: category !== skillCategory });
          setSkillCategory(category === skillCategory ? null : category);
        }}>
          {t(category)}<RemixIcon name="arrow-down-s-line" size={14} />
        </button>)}</div>
      {skillCategory && <div className="om-index-skill-links" aria-label={t(skillCategory)}>{motionSkills.filter(skill => skill.category === skillCategory).map(skill =>
        <button className="om-nav-item om-creative-option" key={skill.id} onClick={() => { track('capability_index', 'select_skill', { skill: skill.id }); onSkill(skill.id); }}>
          <span><strong>{t(skill.title)}</strong><small className="om-muted">{t(skill.tagline)}</small></span>
        </button>)}</div>}
    </div>
  </section>;
}

function ExploreCollection({ community, root, ...props }: ExploreProps & { community?: ExploreCommunity; root: RefObject<HTMLElement | null> }) {
  const { t, locale } = useI18n();
  const { active, onNavigate, onChooseStudio, onSkill, filters, onFilter } = props;
  const { openLibrary } = useWorkspaceChrome();
  const [priority, setPriority] = useState<string | null>(null);
  const specialty = community?.source === 'techniques' ? findTechniqueStudio(community.studio) : undefined;
  const skillIds = specialty?.techniques ?? (community?.source === 'templates' ? community.skills : undefined);
  const skills = skillIds ? skillIds.flatMap(id => motionSkills.filter(skill => skill.id === id)) : editingPresets;
  const medium = community ? null : filters.medium;
  const scenes = studioScenes.filter(scene => (!medium || scene.modality === medium) && (!community ||
    (community.source === 'templates' && community.scenes.some(id => id === scene.id))));
  const showMotion = !medium || medium === 'video';
  const showTemplates = showMotion && !specialty;
  const templates = useExploreTemplates(community?.source === 'techniques' ? undefined : community?.category ?? 'all', locale);
  const groups = templates.pages.map(page => page.items);
  const featuredTemplate = groups[0]?.[0];
  const initialTemplateError = templates.error && !templates.pages.length;
  const catalogKey = [medium, ...groups.map(group => group.map(item => item.id).join(','))].join('|');
  const playing = useTemplatePlayback(root, catalogKey, active && showMotion, true, priority);
  const sceneCards = scenes.filter(scene => community || medium || !featuredSceneIds.includes(scene.id)).map(scene => {
    return <SceneFeedCard key={scene.id} section="feed" target={sceneDestination(scene)} example={sceneExamples[scene.id][0]}
      onNavigate={onNavigate} playing={playing} onPriority={setPriority} community={community?.id} />;
  });
  const skillCards = showMotion ? skills.map(skill => <SkillFeedCard key={skill.id} section="feed" skill={skill} icon={specialty?.icon ?? 'puzzle-line'}
    label={t(specialty?.title ?? 'Skills')} onSkill={onSkill} playing={playing} onPriority={setPriority} community={community?.id} />) : [];
  const tryVideoPrompt = (prompt: string) => onNavigate(templateVideoDestination, prompt);
  const templateCard = (item: GalleryTemplate) => <ExploreTemplateCard key={item.id} item={item} active={playing.has(item.id)} onPriority={setPriority}
    onOpen={() => track('explore_feed', 'open_template', { template: item.id, community: community?.id })}
    onTry={prompt => { track('explore_feed', 'try_prompt', { template: item.id, community: community?.id }); tryVideoPrompt(prompt); }} />;
  const firstTemplates = showTemplates ? (groups[0]?.slice(medium ? 0 : 1) ?? []).map(templateCard) : [];
  const firstGroup: ReactNode[] = [];
  for (let i = 0; i < Math.max(sceneCards.length, firstTemplates.length, skillCards.length); i++) {
    firstGroup.push(firstTemplates[i], sceneCards[i], skillCards[i]);
  }
  return <>
    {!medium && <div className="om-explore-features" data-split={Boolean(featuredTemplate || initialTemplateError || (templates.loading && !templates.pages.length))}>
      {community ? <CommunitySpotlight community={community} skill={skills[0]} onChooseStudio={onChooseStudio} /> :
        <ExploreSpotlight active={active} onOpenBlackFriday={props.onOpenBlackFriday} onNavigate={onNavigate} onOpenMotion={() => onChooseStudio(motionStudio)} />}
      {featuredTemplate && <TemplateSpotlight item={featuredTemplate} onTry={tryVideoPrompt} />}
      {initialTemplateError && <div className="om-featured-template om-discovery-empty"><span>{t('Templates could not be loaded.')}</span><button className="om-button" onClick={templates.retry}>{t('Retry')}</button></div>}
      {templates.loading && !templates.pages.length && <Skeleton className="om-featured-template-skeleton" />}
    </div>}
    <section className="om-explore-feed" aria-labelledby="om-feed-heading">
      <header className="om-discovery-heading">
        <div><h2 id="om-feed-heading">{t(community?.id === '3d-motion' ? '3D techniques' : 'Community & capabilities')}</h2>
          <p className="om-muted">{t(specialty?.briefHint ?? 'Open a template to see how it works, or pick a scene to start creating.')}</p>
        </div>
        {!community && <div className="om-community-tabs om-choice-tabs" role="group" aria-label={t('Media type')}>{(['all', 'image', 'video', 'audio'] as const).map(kind =>
          <button key={kind} className="om-nav-item" aria-pressed={(medium ?? 'all') === kind} onClick={() => { track('explore_feed', 'media_filter', { medium: kind }); onFilter({ medium: kind === 'all' ? null : kind }); }}>{t(kind === 'all' ? 'All' : mediaLabels[kind])}</button>)}</div>}
      </header>
      <div className="om-feed-group">
        {firstGroup}
        {showTemplates && groups.slice(1).flatMap(group => group.map(templateCard))}
      </div>
      {showTemplates && <div className="om-feed-more">
        {medium && initialTemplateError && <button className="om-button" onClick={templates.retry}>{t('Retry')}</button>}
        {templates.loading && (medium || templates.pages.length > 0) && <div className="om-feed-loading" aria-label={t('Loading templates…')} role="status">{[0, 1, 2].map(n => <Skeleton key={n} />)}</div>}
        {templates.error && !initialTemplateError && <div className="om-discovery-empty"><span>{t('Templates could not be loaded.')}</span><button className="om-button" onClick={templates.retry}>{t('Retry')}</button></div>}
        {!templates.error && !templates.loading && (templates.hasMore ? <button className="om-button" onClick={() => { track('explore_feed', 'load_more', { community: community?.id, medium: medium ?? 'all' }); templates.loadMore(); }}>{t('More community templates')}<RemixIcon name="add-line" size={16} /></button> :
          !featuredTemplate && <span className="om-muted">{t('No templates available. Open the library or try again later.')}</span>)}
        <button className="om-nav-item" onClick={event => { track('explore_feed', 'view_all_templates', { community: community?.id }); openLibrary(event.currentTarget); }}>{t('View all templates')}<RemixIcon name="arrow-right-line" size={16} /></button>
      </div>}
    </section>
    {!community && discoveryStudios.map(studio => <StudioCollection key={studio.id} studio={studio} medium={medium}
      onNavigate={onNavigate} onChooseStudio={onChooseStudio} onSkill={onSkill} playing={playing} onPriority={setPriority} />)}
    <CapabilityIndex {...props} />
  </>;
}

export function ExploreStudios(props: ExploreProps) {
  const { t, locale } = useI18n();
  const root = useRef<HTMLElement>(null);
  const community = exploreCommunities.find(item => item.id === props.filters.community);
  return <main ref={root} className="om-explore">
    <div className="om-discovery-page">
      <header className="om-explore-masthead"><h1>{t('Explore')}</h1>
        <nav className="om-community-tabs om-choice-tabs" aria-label={t('Communities')}>
          <button className="om-nav-item" aria-pressed={!community} onClick={() => { track('explore_tabs', 'community_tab', { community: 'discover' }); props.onFilter({ community: null, medium: null }); }}>{t('Discover')}</button>
          {exploreCommunities.map(feed => <button key={feed.id} className="om-nav-item" aria-pressed={community?.id === feed.id}
            onClick={() => { track('explore_tabs', 'community_tab', { community: feed.id }); props.onFilter({ community: feed.id, medium: null }); }}>{t(feed.label)}</button>)}
          <button className="om-nav-item" onClick={event => { track('explore_tabs', 'creators'); props.onCreators(event.currentTarget); }}>{t('Creators')}</button>
        </nav>
      </header>
      <ExploreCollection key={locale + '/' + (community?.id ?? '')} community={community} root={root} {...props} />
    </div>
  </main>;
}

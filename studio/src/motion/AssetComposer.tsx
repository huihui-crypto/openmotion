import { useEffect, useRef, useState, type ComponentProps, type Dispatch, type SetStateAction } from 'react';
import type { AssetReference, LibraryAsset } from '../../../shared/asset-library';
import type { GenerationJob } from '../../../shared/gateway';
import { useI18n } from '../i18n/I18n';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { RemixIcon } from '../icons/RemixIcons';
import { loadGateway, type GatewayStatus, type Model, type Modality } from './gatewayClient';
import { assetRequest } from './assetClient';
import { IconButton } from '../components/ui/IconButton';
import { AssetTaskHistory } from './AssetTaskHistory';
import type { AssetChatSummary, AssetTaskMode } from './assetTasks';
import { AssetConversation } from './AssetConversation';
import { AssetGenerationCard, creationKinds } from './AssetCreationVisuals';
import { ModelAvatar } from './settingsPrimitives';
import { GenerationParameters, emptyParameters, requestParameters, type ParameterDraft } from './GenerationParameters';
import { useWorkspaceChrome } from './WorkspaceFrame';
import { AccountSignInButton, AccountSignInHint } from './AccountSignIn';
export interface AssetDraft { modality: Modality; prompt: string; model?: string; parameters?: Record<string, unknown>; target?: { asset: LibraryAsset; versionId: string }; references: { reference: AssetReference; name: string }[] }
export function AssetComposer({ active, draft, setDraft, agentReferences, setAgentReferences, jobs, mode, onMode, taskIds, history, selectingTask, onNew, onChatChanged, onChatStarted, onCancel, onView, onReference, onCreated, onError, onClose }: {
  active: boolean; draft: AssetDraft; setDraft: Dispatch<SetStateAction<AssetDraft>>; jobs: GenerationJob[];
  agentReferences: AssetDraft['references']; setAgentReferences: (references: AssetDraft['references']) => void;
  mode: AssetTaskMode; onMode: (mode: AssetTaskMode) => void; taskIds: { direct?: string; agent?: string };
  history: Omit<ComponentProps<typeof AssetTaskHistory>, 'trigger'>; selectingTask: boolean; onNew: () => void;
  onChatChanged: (chat: AssetChatSummary) => void; onChatStarted: (id: string) => void;
  onCancel: (job: GenerationJob) => void; onView: (job: GenerationJob) => void; onReference: () => void;
  onCreated: (job: GenerationJob) => void; onError: (message: string) => void; onClose: () => void;
}) {
  const { t } = useI18n(), { openModelSettings, openAccount } = useWorkspaceChrome();
  const [gateway, setGateway] = useState<{ models: Model[]; status: GatewayStatus }>(), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0), [busy, setBusy] = useState(false), [agentSending, setAgentSending] = useState(false);
  const [parameterDrafts, setParameterDrafts] = useState<Record<string, ParameterDraft>>(() => draft.model && draft.parameters ? { [draft.model]: { values: {}, advanced: JSON.stringify(draft.parameters, null, 2) } } : {});
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const selectedTask = history.tasks.find(task => task.key === history.selectedKey);
  const switching = busy || agentSending || selectingTask;
  useEffect(() => {
    if (!active) return; let current = true; setFailed(false);
    void loadGateway().then(data => { if (current) setGateway(data); }).catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [active, retry]);
  const models = gateway?.models.filter(m => m.modality === draft.modality && gateway.status.providers.some(p => p.id === m.provider && p.available)) ?? [];
  const selected = draft.model ? models.find(m => m.id === draft.model) : models.find(m => m.id === gateway?.status.routes[draft.modality]) ?? models[0];
  const parameters = selected ? parameterDrafts[selected.id] ?? emptyParameters : emptyParameters;
  const kind = creationKinds.find(k => k.id === draft.modality)!;
  const latest = jobs.find(job => job.id === taskIds.direct);
  const submit = async () => {
    if (!selected || !draft.prompt.trim() || busy) return; setBusy(true);
    try {
      const parsed = requestParameters(parameters);
      const result = await assetRequest<{ job: GenerationJob }>({ action: 'generate', requestId: crypto.randomUUID(), modality: draft.modality, prompt: draft.prompt, model: selected.id, mode: selected.mode, parameters: parsed,
        ...(draft.target ? { assetId: draft.target.asset.id, parentVersionId: draft.target.versionId } : {}), references: draft.references.map(r => r.reference) });
      if (mounted.current) {
        setDraft(current => current === draft ? { ...current, model: selected.id, parameters: parsed } : current);
        onCreated(result.job);
      }
    } catch (error) { if (mounted.current) onError((error as Error).message); } finally { if (mounted.current) setBusy(false); }
  };
  const referenceControls = (items: AssetDraft['references'], update: (references: AssetDraft['references']) => void) => <div className="om-asset-references"><button className="om-nav-item om-creation-reference" onClick={onReference} disabled={items.length >= 8}><RemixIcon name="add-line" size={16} />{t('Reference asset')}</button>{items.map(item => <button key={`${item.reference.assetId}/${item.reference.versionId}`} className="om-badge om-nav-item" onClick={() => update(items.filter(r => r !== item))} aria-label={t('Remove reference: {name}', { name: item.name })}><RemixIcon name="image-line" size={14} /><span>{item.name}</span><RemixIcon name="close-line" size={14} /></button>)}</div>;
  const references = referenceControls(draft.references, references => setDraft({ ...draft, references }));

  return <aside className="om-asset-composer om-creation-surface" data-active={active} data-mode={mode} aria-label={t('Create asset')}>
    <header className="om-task-toolbar">
      <h2 className="om-sr-only">{t(draft.target ? 'Create a new version' : 'Creative studio')}</h2>
      <div className="om-choice-tabs om-task-modes" role="group" aria-label={t('Task type')}>{(['direct', 'agent'] as const).map(value => <button key={value} className="om-nav-item" aria-pressed={mode === value} aria-label={t(value === 'direct' ? 'Direct generation' : 'Agent conversation')} title={t(value === 'direct' ? 'Direct generation' : 'Agent conversation')} disabled={switching} onClick={() => onMode(value)}><RemixIcon name={value === 'direct' ? 'sparkling-line' : 'chat-1-line'} size={15} /><span>{t(value === 'direct' ? 'Generate' : 'Agent')}</span></button>)}</div>
      <AssetTaskHistory {...history} trigger={<button className="om-nav-item om-task-picker" aria-label={t('Select task')} title={selectedTask?.title ?? t('New task')} disabled={switching}><span>{selectingTask ? t('Loading tasks…') : selectedTask?.title ?? t('New task')}</span><RemixIcon name="arrow-down-s-line" size={14} /></button>} />
      <IconButton aria-label={t('New task')} title={t('New task')} icon={<RemixIcon name="add-line" size={17} />} disabled={switching} onClick={onNew} />
      <IconButton aria-label={t('Close creator')} title={t('Close creator')} icon={<RemixIcon name="close-line" size={17} />} onClick={onClose} />
    </header>
    <div className="om-asset-chat-panel" hidden={mode !== 'agent'}><AssetConversation conversationId={taskIds.agent} onChanged={onChatChanged} onStarted={onChatStarted} onSending={setAgentSending} active={active && mode === 'agent'} references={agentReferences.map(r => r.reference)} referenceControls={referenceControls(agentReferences, setAgentReferences)} jobs={jobs} onCancel={onCancel} onView={onView} onError={onError} /></div>{mode === 'direct' && <>
      {latest && <div className="om-asset-current-job"><AssetGenerationCard job={latest} onCancel={onCancel} onView={onView} /></div>}
      <div className="om-asset-direct">
      {draft.target && <div className="om-card om-asset-edit-target"><span><RemixIcon name="history-line" size={16} />{draft.target.asset.name} · V{draft.target.asset.versions.findIndex(v => v.id === draft.target!.versionId) + 1}</span><button className="om-nav-item" onClick={() => setDraft({ ...draft, target: undefined })}>{t('Create separately')}</button></div>}
      <div className="om-creation-types" role="group" aria-label={t('Media type')}>{creationKinds.map(item => <button key={item.id} className="om-creation-type" data-tone={item.id} aria-pressed={draft.modality === item.id} disabled={Boolean(draft.target) && item.id !== draft.modality} onClick={() => setDraft({ ...draft, modality: item.id, model: undefined })}><span className="om-creation-icon" data-tone={item.id}><RemixIcon name={item.icon} size={20} /></span><span>{t(item.label)}</span>{draft.modality === item.id && <RemixIcon name="check-line" size={13} />}</button>)}</div>
      <div className="om-creation-model"><div className="om-creation-row"><span className="om-eyebrow">{t('Generation model')}</span><button className="om-nav-item" aria-label={t('Model providers')} onClick={openModelSettings}><RemixIcon name="settings-3-line" size={15} /></button></div>
        {failed ? <button className="om-button" onClick={() => setRetry(v => v + 1)}><RemixIcon name="refresh-line" size={16} />{t('Retry loading models')}</button> : !gateway ? <Skeleton className="om-asset-model-skeleton" /> : models.length ? <Select label={t('Generation model')} value={selected?.id ?? ''} onCommit={model => setDraft({ ...draft, model })} options={models.map(m => ({ value: m.id, label: m.label, description: `${m.provider} · ${m.mode}`, icon: <ModelAvatar name={m.label} modelId={m.modelId} provider={{ id: m.provider, custom: false }} /> }))} /> : <div className="om-creation-setup"><RemixIcon name="plug-line" size={20} /><p className="om-muted">{t('Configure a provider or sign in to use media models.')}</p><div className="om-creation-setup-actions"><button className="om-button" onClick={openModelSettings}>{t('Model providers')}</button><AccountSignInButton area="asset_generation" openAccount={openAccount} /></div></div>}
        {gateway && models.length > 0 && <AccountSignInHint openAccount={openAccount} />}
      </div>
      {gateway && draft.model && !selected && <p className="om-muted" role="status">{t('This task’s model is unavailable. Choose a model to continue.')}</p>}
      <div className="om-creation-scene"><span className="om-badge"><RemixIcon name={selected?.mode === 'text-to-speech' ? 'voiceprint-line' : kind.icon} size={14} />{t(selected?.mode === 'text-to-speech' ? 'Text to speech' : draft.modality === 'audio' ? 'Music & sound' : draft.modality === 'video' ? 'Text to video' : draft.references.length && selected?.supportsImageReference ? 'Image editing' : 'Text to image')}</span><span className="om-eyebrow">{t('Settings follow your model')}</span></div>
      <div className="om-creation-prompt"><label className="om-eyebrow" htmlFor="asset-creation-prompt"><RemixIcon name="pen-nib-line" size={14} />{t(selected?.mode === 'text-to-speech' ? 'Speech text' : 'Your idea')}</label><textarea id="asset-creation-prompt" maxLength={20000} aria-label={t('Asset prompt')} placeholder={t(selected?.mode === 'text-to-speech' ? 'Write the words you want spoken.' : kind.hint)} value={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.value })} />{references}<div className="om-creation-prompt-footer"><span className="om-eyebrow">{t(draft.references.length ? 'References stay linked to their versions' : 'Start with a few words. Make it your own.')}</span><span className="om-eyebrow">{draft.prompt.length.toLocaleString()} / 20k</span></div></div>
      {!draft.prompt && selected?.mode !== 'text-to-speech' && <div className="om-creation-ideas" aria-label={t('Try an idea')}>{kind.ideas.map(idea => <button key={idea} className="om-nav-item" onClick={() => setDraft({ ...draft, prompt: t(idea + ' prompt') })}><RemixIcon name="add-line" size={13} />{t(idea)}</button>)}</div>}
      {draft.references.length > 0 && <p className="om-muted">{t(selected?.provider === 'codex' && draft.modality === 'image' ? 'Codex image editing accepts one image reference.' : 'This model cannot use asset references. Choose Codex image editing or remove the references.')}</p>}

    </div><div className="om-creation-submit">{selected && <GenerationParameters key={selected.id} model={selected} draft={parameters} onChange={value => { setParameterDrafts(current => ({ ...current, [selected.id]: value })); try { setDraft({ ...draft, model: selected.id, parameters: requestParameters(value) }); } catch { /* Keep invalid JSON in the local editor until corrected. */ } }} />}<button className="om-button om-creation-submit-button" data-primary disabled={busy || !selected || !draft.prompt.trim() || draft.references.length > 0 && (selected.provider !== 'codex' || draft.modality !== 'image' || draft.references.length !== 1)} onClick={() => void submit()}><RemixIcon name="sparkling-fill" size={19} />{t(busy ? 'Submitting your idea…' : kind.action)}<RemixIcon name="arrow-right-line" size={18} /></button><p className="om-creation-save-note"><RemixIcon name="stack-line" size={13} />{t('Saved automatically to your library')}</p><p className="om-eyebrow om-creation-billing">{t('Model usage is billed to your configured account.')}</p></div>
    </>}
  </aside>;
}

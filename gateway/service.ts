import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, link, lstat, mkdir, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WorkspaceStore } from '../workspace.ts';
import { mediaProviders, modalities, type Agent, type GenerateInput, type GenerationJob, type GatewayStatus, type Model, type Modality, type ProviderId, type ProviderState } from '../shared/gateway.ts';
import { builtinModels, discoverModels, modelKey, providerIds, providerLabels, validModelId } from './catalog.ts';
import { detectAgents, generateCodexImage } from './agents.ts';
import { downloadMedia, mediaType, publicProviderFetch, ProviderError, type Fetcher } from './network.ts';
import { providerAdapters, waveSpeedModels } from './providers.ts';
import { cloudModels } from './opendesign.ts';
import { ProviderConnections, type GatewayConfig } from './connections.ts';
import { isGatewayProvider, isMediaProvider, registeredProvider } from '../shared/provider-registry.ts';
import { compatibleProvider } from './compatible.ts';
import { OpenDesignAccount } from './account.ts';
import { AssetLibrary } from './asset-library.ts';
import { requireLibraryMediaRuntime } from './asset-probe.ts';
import { generationOptions, validateGenerationOptions } from '../shared/generation-options.ts';
import { MAX_ASSET_BYTES } from '../shared/asset-limits.ts';

type Options = { fetcher?: Fetcher; detect?: () => Promise<Agent[]>; codex?: typeof generateCodexImage; download?: typeof downloadMedia; pollMs?: number };
type SavedOutput = { path: string; mimeType: string; bytes: number; sha256: string };
const saveUnavailable = 'SAVE_NOT_AVAILABLE: retained outputs are missing, changed or unreadable; no model request was made';
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const uuid = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
function alive(pid?: number) { try { if (!pid) return false; process.kill(pid, 0); return true; } catch { return false; } }
async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw new Error('Model gateway data is unreadable'); }
}
async function atomic(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + '.' + randomUUID() + '.tmp';
  try { await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 }); await rename(temp, file); }
  finally { await rm(temp, { force: true }); }
}
function providerId(value: unknown): asserts value is ProviderId {
  if (!providerIds.includes(value as ProviderId)) throw new Error('Unknown model provider');
}
function modality(value: unknown): asserts value is Modality {
  if (!modalities.includes(value as Modality)) throw new Error('modality must be image, video or audio');
}
function parameters(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(value).length > 64_000) throw new Error('parameters must be an object under 64 KB');
  if (Object.keys(value).some(key => /^(?:model|prompt|api[_-]?key|authorization|webhook_url|__proto__|constructor|prototype)$/i.test(key))) throw new Error('parameters contains a reserved field');
  return value as Record<string, unknown>;
}

export class ModelGateway {
  store: WorkspaceStore;
  options: Options;
  root: string;
  connections: ProviderConnections;
  account: OpenDesignAccount;
  active = new Map<string, { controller: AbortController; done: Promise<void> }>();
  private detecting?: Promise<Agent[]>;
  private agentCache?: { time: number; agents: Agent[] };
  private ticking = false;
  private closed = false;
  constructor(store: WorkspaceStore, options: Options = {}) {
    this.store = store; this.options = options; this.root = path.join(store.directory, 'model-gateway');
    this.connections = new ProviderConnections(store, options.fetcher ?? publicProviderFetch);
    this.account = new OpenDesignAccount(store.directory);
  }
  config(): Promise<GatewayConfig> { return this.connections.gatewayConfig(); }
  private credential(id: ProviderId) { return this.connections.resolveCredential(id); }
  async configureProvider(id: unknown, input: Record<string, unknown>) {
    if (typeof id !== 'string') throw new Error('Unknown model provider');
    await this.connections.configure(id, input);
    return this.status();
  }
  private cloudOrigin() { return this.connections.baseUrl('opendesign'); }
  async agents(refresh = false) {
    if (!refresh && this.agentCache && Date.now() - this.agentCache.time < 30_000) return this.agentCache.agents;
    if (!this.detecting) this.detecting = (this.options.detect ?? detectAgents)().then(agents => { this.agentCache = { time: Date.now(), agents }; return agents; }).finally(() => { this.detecting = undefined; });
    return this.detecting;
  }
  private async models(): Promise<Model[]> {
    const cached = await readJson<Model[]>(path.join(this.root, 'catalog.json'), []);
    const overrides = await this.connections.modelOverrides();
    return [...new Map([...builtinModels, ...cached, ...(await this.config()).customModels, ...await this.connections.mediaModels(), ...await this.account.mediaModels()].map(model => [model.id, model])).values()].map(model => {
      const merged = { ...model, ...overrides[model.id] };
      return { ...merged, generationOptions: generationOptions(merged) };
    });
  }
  async listModels(input: { provider?: unknown; modality?: unknown; query?: unknown; refresh?: unknown; offset?: unknown; limit?: unknown } = {}) {
    if (input.provider !== undefined && input.provider !== 'account' && !providerIds.includes(input.provider as string) && !(await this.connections.list()).some(p => p.id === input.provider)) throw new Error('Unknown model provider');
    if (input.modality !== undefined) modality(input.modality);
    if (input.query !== undefined && (typeof input.query !== 'string' || input.query.length > 200)) throw new Error('Invalid model search');
    if (input.refresh !== undefined && typeof input.refresh !== 'boolean') throw new Error('refresh must be boolean');
    const warnings: string[] = [];
    if (input.refresh && input.provider === 'account') await this.account.models(true);
    if (input.refresh && typeof input.provider === 'string' && input.provider !== 'account' && !providerIds.includes(input.provider)) await this.connections.sync(input.provider);
    if (input.refresh) {
      const selected = mediaProviders.filter(id => !input.provider || input.provider === id);
      const discovered = await Promise.all(selected.map(async id => {
        try {
          if (id === 'opendesign') {
            const key = (await this.credential(id)).key, baseUrl = await this.cloudOrigin();
            if (!key || !baseUrl) return [];
            return await cloudModels(baseUrl, key, this.options.fetcher ?? publicProviderFetch);
          }
          if (id === 'wavespeed') {
            const key = (await this.credential(id)).key;
            return key ? await waveSpeedModels(key, this.options.fetcher ?? fetch) : [];
          }
          return await discoverModels(id, String(input.query ?? ''), this.options.fetcher ?? fetch);
        }
        catch { warnings.push(`${providerLabels[id]} catalogue unavailable; showing cached and built-in models`); return []; }
      }));
      await this.store.lock(async () => {
        const cached = await readJson<Model[]>(path.join(this.root, 'catalog.json'), []);
        const merged = [...new Map([...cached, ...discovered.flat()].map(model => [model.id, model])).values()].slice(-5000);
        await atomic(path.join(this.root, 'catalog.json'), merged);
      });
    }
    const query = String(input.query ?? '').toLowerCase();
    const all = (await this.models()).filter(model => (!input.provider || model.provider === input.provider) && (!input.modality || model.modality === input.modality)
      && (!query || `${model.id} ${model.label} ${model.mode} ${model.description ?? ''}`.toLowerCase().includes(query)));
    const offset = input.offset ?? 0, limit = input.limit ?? 100;
    if (!Number.isInteger(offset) || Number(offset) < 0 || !Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 100) throw new Error('Invalid model pagination');
    return { models: all.slice(Number(offset), Number(offset) + Number(limit)), total: all.length,
      nextOffset: Number(offset) + Number(limit) < all.length ? Number(offset) + Number(limit) : null, warnings };
  }
  async registerModel(input: { provider?: unknown; modelId?: unknown; label?: unknown; modality?: unknown; mode?: unknown; defaults?: unknown }) {
    providerId(input.provider); validModelId(input.modelId); modality(input.modality);
    if (input.provider === 'codex') throw new Error('Codex exposes its built-in image model only');
    if (typeof input.label !== 'string' || !input.label.trim() || input.label.length > 180) throw new Error('A model label is required');
    if (typeof input.mode !== 'string' || !/^[a-z-]{3,60}$/.test(input.mode)) throw new Error('A generation mode is required');
    const model: Model = { id: modelKey(input.provider, input.modelId), provider: input.provider, modelId: input.modelId, label: input.label.trim(),
      modality: input.modality, mode: input.mode, source: 'custom', defaults: parameters(input.defaults) };
    await this.connections.saveMediaModel(model);
    return { model };
  }
  async setRoute(kind: unknown, modelId: unknown) {
    modality(kind);
    if (modelId !== null && !(await this.models()).some(m => m.id === modelId && m.modality === kind)) throw new Error('Route must select a model of the same modality');
    await this.connections.setDefault(kind, modelId as string | null);
    return this.status();
  }
  async status(refreshAgents = false): Promise<GatewayStatus> {
    const [config, agents, models] = await Promise.all([this.config(), this.agents(refreshAgents), this.models()]);
    const providers: ProviderState[] = await Promise.all(providerIds.map(async id => {
      const saved = config.providers[id] ?? {};
      const enabled = saved.enabled !== false;
      if (id === 'codex') {
        const agent = agents.find(a => a.id === id);
        return { id, label: providerLabels[id], enabled, configured: !!agent?.authenticated, available: enabled && !!agent?.available,
          credentialSource: 'local-agent', verification: 'unverified', reason: !enabled ? 'Disabled' : agent?.reason ?? 'Not detected' };
      }
      const credentials = await this.credential(id);
      const definition = registeredProvider(id)!;
      const baseUrl = definition.baseUrlEditable ? await this.connections.baseUrl(id) : undefined;
      const active = !!credentials.key;
      const verification = credentials.key && saved.keyHash === hash(credentials.key) ? saved.verification ?? 'unverified' : 'unverified';
      return { id, label: providerLabels[id], enabled: active && enabled, configured: !!credentials.key, available: active && enabled && (!definition.baseUrlEditable || !!baseUrl) && verification !== 'rejected',
        ...(definition.baseUrlEditable ? { baseUrl: baseUrl ?? '' } : {}),
        credentialSource: credentials.source, verification, checkedAt: saved.checkedAt,
        reason: !active ? 'API key required' : !enabled ? 'Disabled' : definition.baseUrlEditable && !baseUrl ? `${definition.label} API origin required` : verification === 'rejected' ? 'Credentials or permissions rejected; update the key' : verification === 'verified' ? 'A generation request succeeded with this key' : 'Configured; availability and quota are checked when generating' };
    }));
    providers.push(...await this.connections.states());
    const account = await this.account.summary();
    providers.push({ id: 'account', label: registeredProvider('account')!.label, enabled: account.state === 'signed-in', configured: account.state === 'signed-in', available: account.state === 'signed-in', credentialSource: 'account', verification: 'unverified', reason: account.state === 'signed-in' ? 'Included with your account' : account.state === 'reauth-required' ? 'OpenDesign sign-in expired; sign in again to use your account models' : 'Sign in to use your account models' });
    const capabilities = modalities.map(kind => {
      const available = models.filter(model => model.modality === kind && providers.find(p => p.id === model.provider)?.available);
      const selected = config.routes[kind] ? available.find(m => m.id === config.routes[kind]) : available.find(m => m.mode.startsWith('text-to-'));
      return { modality: kind, available: available.length > 0, modelIds: available.map(m => m.id), selectedModelId: selected?.id };
    });
    return { providers, agents, routes: config.routes, capabilities };
  }
  async getJob(id: unknown) {
    if (!uuid(id)) throw new Error('Invalid generation job ID');
    const job = await readJson<GenerationJob | null>(path.join(this.root, 'jobs', id + '.json'), null);
    if (!job) throw new Error('Generation job not found');
    // Jobs preserve their original output paths. Studio can subsequently rename/delete files.
    for (const asset of job.assets) {
      const target = job.library ? await this.store.safePath(asset.path, new AssetLibrary(this.store).root)
        : await this.store.safePath(asset.path, this.store.projectDirectoryFor(job.projectId!));
      asset.available = await lstat(target).then(info => info.isFile() && !info.isSymbolicLink(), () => false);
    }
    return job;
  }
  async listJobs(projectId?: string) {
    const names = await readdir(path.join(this.root, 'jobs')).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error; });
    const jobs = await Promise.all(names.filter(name => uuid(name.slice(0, -5)) && name.endsWith('.json')).map(name => this.getJob(name.slice(0, -5))));
    return jobs.filter(job => !projectId || job.projectId === projectId).sort((a, b) => b.createdAt - a.createdAt);
  }
  private saveJob(job: GenerationJob) { return atomic(path.join(this.root, 'jobs', job.id + '.json'), job); }
  async submit(input: GenerateInput): Promise<GenerationJob> {
    if (!input || typeof input !== 'object') throw new Error('Generation input required');
    modality(input.modality);
    if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 20_000) throw new Error('Prompt must contain 1–20000 characters');
    const params = parameters(input.parameters);
    if (input.library && input.projectId) throw new Error('Choose either an asset library or a project destination');
    const library = new AssetLibrary(this.store);
    if (input.library) await library.validateGeneration(input.library);
    if (input.referenceAsset !== undefined && (typeof input.referenceAsset !== 'string' || !input.referenceAsset || input.referenceAsset.length > 1024)) throw new Error('Invalid reference image path');
    if (input.idempotencyKey !== undefined && (typeof input.idempotencyKey !== 'string' || !/^[\w-]{1,100}$/.test(input.idempotencyKey))) throw new Error('Invalid idempotency key');
    if (input.usage && (typeof input.usage !== 'object' || Object.entries(input.usage).some(([key, value]) => !['compositionId', 'elementId', 'property'].includes(key) || typeof value !== 'string' || value.length > 240))) throw new Error('Invalid editor usage context');
    const status = await this.status();
    const selected = input.model ?? status.routes[input.modality] ?? status.capabilities.find(c => c.modality === input.modality)?.selectedModelId;
    let model = (await this.models()).find(m => m.id === selected && m.modality === input.modality);
    if (!model && typeof selected === 'string') {
      const colon = selected.indexOf(':'), provider = mediaProviders.find(id => id === selected.slice(0, colon)), modelId = selected.slice(colon + 1);
      if (provider) {
        validModelId(modelId);
        model = { id: selected, provider, modelId, label: modelId, modality: input.modality, mode: input.mode ?? `text-to-${input.modality}`, source: 'custom' };
      }
    }
    if (input.mode !== undefined && !['text-to-image', 'text-to-video', 'text-to-audio', 'text-to-speech'].includes(input.mode)) throw new Error('Unsupported generation mode');
    if (input.mode && input.mode !== `text-to-${input.modality}` && !(input.modality === 'audio' && input.mode === 'text-to-speech')) throw new Error('Generation mode does not match modality');
    // An account model runs one connector command, so its catalogue mode is fixed (speech and music share `audio`).
    if (model?.provider === 'account' && input.mode && input.mode !== model.mode) throw new Error('Generation mode does not match the selected account model');
    if (model && input.mode) model = { ...model, mode: input.mode };
    if (model?.provider === 'opendesign' && input.modality === 'audio' && model.mode !== 'text-to-speech') throw new Error('OpenDesign Cloud currently supports speech audio only');
    const projectId = input.library ? undefined : input.projectId ?? this.store.projectCatalog().activeId;
    const requestHash = hash(JSON.stringify({ projectId, library: input.library, model: input.model ?? null, modality: input.modality, prompt: input.prompt, parameters: params, mode: input.mode, usage: input.usage, ...(input.referenceAsset ? { referenceAsset: input.referenceAsset } : {}) }));
    return this.store.lock(async () => {
      if (!input.library) {
        if (!this.store.projectCatalog().projects.some(p => p.id === projectId)) throw new Error('Project not found');
        const entry = await this.store.safePath('index.html', this.store.projectDirectoryFor(projectId!));
        await lstat(entry).catch(() => { throw new Error('Open a project before generating media'); });
      }
      const jobs = await this.listJobs();
      const previous = input.idempotencyKey ? jobs.find(j => j.idempotencyKey === input.idempotencyKey && j.projectId === projectId) : undefined;
      if (previous) { if (previous.requestHash !== requestHash) throw new Error('Idempotency key was already used for another request'); return previous; }
      if (!model || !status.providers.find(p => p.id === model.provider)?.available) throw new Error('Selected model is unavailable; configure an available provider or choose a different model');
      validateGenerationOptions(model, { ...model.defaults, ...params });
      if (input.library?.assetId && (await library.get(input.library.assetId)).modality !== input.modality) throw new Error('Asset versions must have the same media type');
      if (input.library?.references?.length && (!model.supportsImageReference || input.modality !== 'image' || input.library.references.length !== 1)) throw new Error('This model does not support asset references. Choose an image model that supports editing, or remove the reference.');
      if (input.referenceAsset && (!model.supportsImageReference || input.modality !== 'image')) throw new Error('Selected model does not support reference image editing');
      if (jobs.filter(j => j.state === 'queued' || j.state === 'running').length >= 20) throw new Error('Generation queue is full (20 jobs)');
      const job: GenerationJob = { id: randomUUID(), saveToLibrary: true, ...(input.library ? { library: { ...input.library, createNew: !input.library.assetId, assetId: input.library.assetId ?? randomUUID() } } : { projectId }), state: 'queued', modality: input.modality, prompt: input.prompt.trim(), model,
        ...(model.provider === 'account' ? { providerOrigin: await this.account.identity() } : model.provider === 'opendesign' ? { providerOrigin: await this.cloudOrigin() }
          : !isGatewayProvider(model.provider) ? { providerOrigin: await this.connections.baseUrl(model.provider) } : {}),
        ...(!isGatewayProvider(model.provider) && model.provider !== 'account' ? { providerRevision: await this.connections.identity(model.provider) } : {}),
        parameters: params, usage: input.usage, idempotencyKey: input.idempotencyKey, requestHash,
        createdAt: Date.now(), updatedAt: Date.now(), phase: 'queued', assets: [] };
      const work = path.join(this.root, 'work', job.id);
      try {
        const libraryReference = input.library?.references?.[0];
        if (input.referenceAsset || libraryReference) {
          const reference = libraryReference ? await library.resolve(libraryReference) : undefined;
          const source = reference?.filename ?? await this.store.safePath(input.referenceAsset!, this.store.projectDirectoryFor(projectId!));
          const info = await lstat(source);
          if (!info.isFile() || info.isSymbolicLink() || info.size > 20 * 1024 * 1024) throw new Error('Reference image must be a local file under 20 MB');
          const bytes = await readFile(source), media = mediaType(bytes, 'image');
          if (bytes.length > 20 * 1024 * 1024) throw new Error('Reference image exceeds 20 MB');
          if (!['png', 'jpg', 'webp'].includes(media.extension)) throw new Error('Use a PNG, JPEG or WebP reference image');
          if (reference && hash(bytes) !== reference.version.sha256) throw new Error('Reference asset bytes have changed');
          job.reference = { path: input.referenceAsset ?? `asset:${libraryReference!.assetId}/${libraryReference!.versionId}`, sha256: hash(bytes), mimeType: media.mimeType, bytes: bytes.length };
          await mkdir(work, { recursive: true, mode: 0o700 });
          await writeFile(path.join(work, 'reference.' + media.extension), bytes, { flag: 'wx', mode: 0o600 });
        }
        await this.saveJob(job); return job;
      } catch (error) { await rm(work, { recursive: true, force: true }); throw error; }
    });
  }
  async cancel(id: unknown) {
    const job = await this.store.lock(async () => {
      const job = await this.getJob(id);
      if (job.state === 'queued' || job.state === 'running') { job.state = 'cancelled'; job.phase = 'cancelled'; job.updatedAt = Date.now(); await this.saveJob(job); }
      return job;
    });
    this.active.get(job.id)?.controller.abort();
    if (job.state === 'cancelled' && !job.startedAt) await rm(path.join(this.root, 'work', job.id), { recursive: true, force: true });
    return job;
  }
  private async savedOutputs(job: GenerationJob): Promise<SavedOutput[]> {
    try {
      const files = JSON.parse(await readFile(path.join(this.root, 'work', job.id, 'outputs.json'), 'utf8'));
      if (!Array.isArray(files) || !files.length || files.some((file, index) => !file
        || !new RegExp(`^assets/generated/${job.id}-${index + 1}\\.[a-z0-9]+$`).test(file.path)
        || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || file.bytes > MAX_ASSET_BYTES
        || typeof file.mimeType !== 'string' || !file.mimeType.startsWith(job.modality + '/'))) throw new Error(saveUnavailable);
      return files;
    } catch (error) {
      if (error instanceof SyntaxError || ['ENOENT', 'ENOTDIR', 'ELOOP'].includes((error as NodeJS.ErrnoException).code!)) throw new Error(saveUnavailable);
      throw error;
    }
  }
  private async prepareOutput(library: AssetLibrary, file: SavedOutput, dir: string) {
    let snapshot: Awaited<ReturnType<AssetLibrary['prepare']>> | undefined;
    const source = path.join(dir, path.basename(file.path));
    try {
      snapshot = await library.prepare(await this.store.safePath(path.basename(file.path), dir));
      if (snapshot.sha256 !== file.sha256 || snapshot.bytes !== file.bytes || snapshot.media.mimeType !== file.mimeType) throw new Error(saveUnavailable);
      return snapshot;
    } catch (error) {
      if (snapshot) await rm(snapshot.file, { force: true });
      if (['ENOENT', 'ENOTDIR', 'ELOOP'].includes((error as NodeJS.ErrnoException).code!) && (error as NodeJS.ErrnoException & { path?: string }).path === source
        || error instanceof Error && /not readable|could not be decoded|Unsupported media type|Asset must be a file|符号链接/.test(error.message)) throw new Error(saveUnavailable);
      throw error;
    }
  }
  async retrySave(id: unknown) {
    const original = await this.getJob(id);
    if (['completed', 'queued', 'running'].includes(original.state)) return original;
    try {
      const library = new AssetLibrary(this.store);
      for (const file of await this.savedOutputs(original)) {
        const snapshot = await this.prepareOutput(library, file, path.join(this.root, 'work', original.id));
        await rm(snapshot.file, { force: true });
      }
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('SAVE_NOT_AVAILABLE:')) throw error;
      return this.store.lock(async () => {
        const job = await this.getJob(id);
        if (['completed', 'queued', 'running'].includes(job.state)) return job;
        job.state = 'failed'; job.phase = 'save_unavailable'; job.savePending = false; job.error = error.message; job.updatedAt = Date.now();
        await this.saveJob(job); throw error;
      });
    }
    return this.store.lock(async () => {
      const job = await this.getJob(id);
      if (['completed', 'queued', 'running'].includes(job.state)) return job;
      job.savePending = true; job.state = 'queued'; job.phase = 'saving'; job.updatedAt = Date.now(); delete job.error;
      await this.saveJob(job); return job;
    });
  }
  async tick() {
    if (this.ticking || this.closed) return;
    this.ticking = true;
    try {
      if (!(await this.listJobs()).some(job => job.state === 'queued' || job.state === 'running' && !alive(job.workerPid))) return;
      const claimed = await this.store.lock(async () => {
        const jobs = await this.listJobs();
        for (const job of jobs.filter(j => j.state === 'running' && !alive(j.workerPid))) {
          job.savePending = !!job.savePending || await lstat(path.join(this.root, 'work', job.id, 'outputs.json')).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
          job.state = 'failed'; job.phase = job.savePending ? 'save_failed' : 'interrupted'; job.error = job.savePending ? 'Saving was interrupted. Local outputs are retained; retry_save saves them without another model request.' : 'Worker stopped; request was not automatically resubmitted. Check provider history before retrying.'; job.updatedAt = Date.now(); await this.saveJob(job);
          if (!job.savePending) await rm(path.join(this.root, 'work', job.id), { recursive: true, force: true });
        }
        const capacity = Math.max(0, 2 - jobs.filter(j => j.state === 'running').length);
        const next = jobs.filter(j => j.state === 'queued' && !this.active.has(j.id)).reverse().slice(0, capacity);
        for (const job of next) { job.state = 'running'; job.phase = 'starting'; job.startedAt = Date.now(); job.updatedAt = Date.now(); job.workerPid = process.pid; await this.saveJob(job); }
        return next;
      });
      for (const job of claimed) {
        const controller = new AbortController();
        const done = this.run(job, controller).catch(() => {
          // A storage failure must not become an unhandled rejection or retry a paid request.
          console.error(`Model gateway could not persist job ${job.id}; check local data storage`);
        }).finally(() => this.active.delete(job.id));
        this.active.set(job.id, { controller, done });
      }
    } finally { this.ticking = false; }
  }
  private async run(job: GenerationJob, controller: AbortController) {
    const dir = path.join(this.root, 'work', job.id);
    let key = '';
    let retained = !!job.savePending;
    const timeout = setTimeout(() => controller.abort(new Error('Generation timed out')), 15 * 60_000);
    let checking = false;
    const cancelPoll = setInterval(() => {
      if (checking) return; checking = true;
      void this.getJob(job.id).then(latest => { if (latest.state === 'cancelled') controller.abort(); }).catch(() => controller.abort()).finally(() => { checking = false; });
    }, 500);
    const progress = async (phase: string, remoteId?: string) => {
      await this.store.lock(async () => { const current = await this.getJob(job.id); if (current.state !== 'running') { controller.abort(); return; }
        current.phase = phase; if (remoteId) current.remoteId = remoteId; current.updatedAt = Date.now(); await this.saveJob(current); });
    };
    try {
      retained ||= await lstat(path.join(dir, 'outputs.json')).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
      let files = retained ? await this.savedOutputs(job) : null;
      if (!files) {
        key = (await this.credential(job.model.provider)).key;
        const provider = (await this.status()).providers.find(p => p.id === job.model.provider);
        if (!provider?.available) throw new Error('Provider is no longer available');
        if (job.model.provider === 'opendesign' && job.providerOrigin !== await this.cloudOrigin()) throw new Error('Provider API origin changed; the queued task was not submitted');
        if (job.model.provider !== 'account' && !isGatewayProvider(job.model.provider) && job.providerOrigin !== await this.connections.baseUrl(job.model.provider)) throw new Error('Provider API origin changed; the queued task was not submitted');
        if (job.model.provider !== 'account' && !isGatewayProvider(job.model.provider) && (job.providerRevision !== await this.connections.identity(job.model.provider) || !(await this.connections.mediaModels()).some(model => model.id === job.model.id))) throw new Error('Provider or model configuration changed; the queued task was not submitted');
        await requireLibraryMediaRuntime();
        await mkdir(dir, { recursive: true, mode: 0o700 });
        let buffers: Buffer[];
        const reference = job.reference ? path.join(dir, 'reference.' + (job.reference.mimeType === 'image/jpeg' ? 'jpg' : job.reference.mimeType.split('/')[1])) : undefined;
        if (job.model.provider === 'account') {
          buffers = await this.account.generate(job, dir, controller.signal, progress, reference);
        } else if (job.model.provider === 'codex') {
          await progress('generating');
          const imageOptions = { ...job.model.defaults, ...job.parameters };
          buffers = [await (this.options.codex ?? generateCodexImage)(job.prompt + (Object.keys(imageOptions).length ? '\nImage options: ' + JSON.stringify(imageOptions) : ''), dir, controller.signal, reference)];
        } else {
          const adapter = isMediaProvider(job.model.provider) ? providerAdapters[job.model.provider] : compatibleProvider;
          const urls = await adapter.generate(job, { key, baseUrl: job.providerOrigin, fetcher: this.options.fetcher ?? fetch, signal: controller.signal, progress, pollMs: this.options.pollMs });
          await this.connections.verifyKey(job.model.provider, key, 'verified', job.providerOrigin);
          await progress('downloading');
          buffers = [];
          for (const url of urls) buffers.push(Buffer.isBuffer(url) ? url : await (this.options.download ?? downloadMedia)(url, controller.signal));
        }
        await progress('downloading');
        files = [];
        if (!buffers.length) throw new Error('Provider returned no media');
        for (const [i, bytes] of buffers.entries()) {
          const media = mediaType(bytes, job.modality), filename = `${job.id}-${i + 1}.${media.extension}`;
          await writeFile(path.join(dir, filename), bytes, { flag: 'wx', mode: 0o600 });
          files.push({ path: `assets/generated/${filename}`, mimeType: media.mimeType, bytes: bytes.length, sha256: hash(bytes) });
        }
        await atomic(path.join(dir, 'outputs.json'), files);
        retained = true;
      }
      await this.store.lock(async () => {
        const current = await this.getJob(job.id); current.savePending = true;
        if (current.state === 'running') current.phase = 'saving';
        current.updatedAt = Date.now(); await this.saveJob(current);
      });
      controller.signal.throwIfAborted();
      const library = new AssetLibrary(this.store);
      const prepared: Awaited<ReturnType<AssetLibrary['prepare']>>[] = [];
      try {
        for (const file of files) prepared.push(await this.prepareOutput(library, file, dir));
        await this.store.lock(async () => {
          const current = await this.getJob(job.id); if (current.state !== 'running') return;
          current.libraryAssets = [];
          for (const [index, file] of files.entries()) {
            controller.signal.throwIfAborted();
            const digest = hash(`${job.id}:${index}`);
            const targetId = job.library && (!index || !job.library.createNew) ? job.library.assetId : `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
            const existing = await library.get(targetId).catch(error => { if (error.message !== 'ASSET_NOT_FOUND') throw error; return undefined; });
            const asset = await library.addLocked(prepared[index], { assetId: existing?.id, createId: targetId,
              name: job.library?.title || job.prompt.replace(/\s+/g, ' ').trim().slice(0, 80), expectedModality: job.modality,
              version: { source: 'generated', prompt: job.prompt, model: job.model.id, parameters: job.parameters, references: job.library?.references ?? [],
                parentVersionId: job.library?.parentVersionId, jobId: job.id, requestId: `${job.id}-${index}`, requestHash: file.sha256, conversationId: job.library?.conversationId } });
            const version = asset.versions.find(v => v.requestId === `${job.id}-${index}`)!;
            current.libraryAssets.push({ assetId: asset.id, versionId: version.id });
            current.updatedAt = Date.now(); await this.saveJob(current);
          }
          if (job.projectId) {
            if (!this.store.projectCatalog().projects.some(p => p.id === job.projectId)) throw new Error('Target project no longer exists; outputs remain in the asset library');
            for (const [index, file] of files.entries()) {
              controller.signal.throwIfAborted();
              const target = await this.store.safePath(file.path, this.store.projectDirectoryFor(job.projectId));
              await mkdir(path.dirname(target), { recursive: true });
              const snapshot = path.join(dir, `project-${randomUUID()}`);
              try {
                const { filename } = await library.resolve(current.libraryAssets[index], true);
                await copyFile(filename, snapshot);
                try { await link(snapshot, target); }
                catch (error) {
                  if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
                  const existing = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
                  try {
                    const info = await existing.stat();
                    if (!info.isFile() || info.size !== file.bytes || hash(await existing.readFile()) !== file.sha256) throw new Error('Project output changed; refusing to overwrite it');
                  } finally { await existing.close(); }
                }
              } finally { await rm(snapshot, { force: true }); }
              current.assets[index] = { path: file.path, mimeType: file.mimeType, bytes: file.bytes };
            }
          }
          current.state = 'completed'; current.phase = 'completed'; current.savePending = false; delete current.error; current.updatedAt = Date.now();
          await this.saveJob(current);
          retained = false;
        });
      } finally { await Promise.all(prepared.map(file => rm(file.file, { force: true }))); }
    } catch (error) {
      if (error instanceof ProviderError && (error.status === 401 || error.status === 403)) await this.connections.verifyKey(job.model.provider, key, 'rejected', job.providerOrigin);
      await this.store.lock(async () => {
        const current = await this.getJob(job.id); if (current.state !== 'running') return;
        const unavailable = error instanceof Error && error.message.startsWith('SAVE_NOT_AVAILABLE:');
        current.state = 'failed'; current.phase = unavailable ? 'save_unavailable' : retained ? 'save_failed' : 'failed'; current.savePending = retained && !unavailable; current.updatedAt = Date.now();
        let message = controller.signal.aborted ? 'Generation stopped or timed out; no automatic retry was made' : error instanceof Error ? error.message : 'Generation failed';
        if (key) message = message.replaceAll(key, '[redacted]');
        current.error = message.slice(0, 500); await this.saveJob(current);
      });
    } finally { clearTimeout(timeout); clearInterval(cancelPoll); if (!retained) await rm(dir, { recursive: true, force: true }); }
  }
  async close() { this.closed = true; this.account.close(); for (const task of this.active.values()) task.controller.abort(); await Promise.allSettled([...this.active.values()].map(task => task.done)); }
}
const gateways = new WeakMap<WorkspaceStore, ModelGateway>();
export function gatewayFor(store: WorkspaceStore) {
  store = store.workspaceStore ?? store;
  let gateway = gateways.get(store); if (!gateway) { gateway = new ModelGateway(store); gateways.set(store, gateway); } return gateway;
}

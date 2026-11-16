import type { LibraryGeneration } from './asset-library.ts';
import type { GenerationOptions } from './generation-options.ts';
/** Public contract shared by the model gateway, MCP and Studio. Never contains credentials. */
export const modalities = ['image', 'video', 'audio'] as const;
export type Modality = typeof modalities[number];
export { mediaProviders } from './provider-registry.ts';
/** Built-in media IDs and service-registered compatible connections share one route identity. */
export type ProviderId = string;
export type Model = {
  id: string; provider: ProviderId; modelId: string; label: string; modality: Modality;
  source: 'builtin' | 'live' | 'custom'; mode: string;
  defaults?: Record<string, unknown>; description?: string;
  supportsImageReference?: boolean;
  /** Maintained, provider-native controls, shared by Studio and MCP discovery. */
  generationOptions?: GenerationOptions;
};
export type Agent = { id: string; label: string; installed: boolean; authenticated: boolean;
  imageGeneration: boolean; available: boolean; reason: string };
export type ProviderState = { id: ProviderId; label: string; enabled: boolean; configured: boolean;
  available: boolean; credentialSource: 'stored' | 'environment' | 'local-agent' | 'account' | 'none';
  verification: 'unverified' | 'verified' | 'rejected'; reason: string; checkedAt?: number; baseUrl?: string };
export type GatewayStatus = { providers: ProviderState[]; agents: Agent[];
  routes: Partial<Record<Modality, string>>;
  capabilities: { modality: Modality; available: boolean; modelIds: string[]; selectedModelId?: string }[] };
export type GenerateInput = { modality: Modality; prompt: string; model?: string;
  mode?: string;
  projectId?: string; parameters?: Record<string, unknown>; idempotencyKey?: string;
  /** Workspace assets can be generated without creating or selecting a film project. */
  library?: LibraryGeneration;
  /** Project-relative input image. Supported only by explicitly capable adapters. */
  referenceAsset?: string;
  /** Reserved for editor consumers. Recorded only; does not silently edit a composition. */
  usage?: { compositionId?: string; elementId?: string; property?: string } };
export type GeneratedAsset = { path: string; mimeType: string; bytes: number; available?: boolean };
export type GenerationJob = { id: string; projectId?: string; library?: LibraryGeneration & { assetId: string; createNew?: boolean }; libraryAssets?: { assetId: string; versionId: string }[]; state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** New generation results also belong to the local workspace library. */
  saveToLibrary?: boolean;
  /** Durable local outputs remain; retry_save never invokes a model. */
  savePending?: boolean;
  providerOrigin?: string;
  providerRevision?: string;
  modality: Modality; prompt: string; model: Model; parameters: Record<string, unknown>;
  usage?: GenerateInput['usage']; idempotencyKey?: string; requestHash: string;
  reference?: { path: string; sha256: string; mimeType: string; bytes: number };
  createdAt: number; updatedAt: number; startedAt?: number; workerPid?: number;
  phase: string; error?: string; remoteId?: string; assets: GeneratedAsset[] };

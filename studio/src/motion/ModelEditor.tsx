import { useEffect, useId, useRef, useState } from 'react';
import { inputModalities, modelCapabilities, modelKinds, type DirectoryModel, type ModelKind, type ProviderConnection } from '../../../shared/provider-directory';
import { useI18n } from '../i18n/I18n';
import { RemixIcon } from '../icons/RemixIcons';
import { SettingsDialog } from './settingsPrimitives';
import { defaultParameters, modelIdError } from './settingsValidation';
import { Select } from '../components/ui/Select';

export const kindLabels: Record<ModelKind, string> = { text: 'Language', image: 'Image', video: 'Video', audio: 'Audio', transcription: 'Transcription', embedding: 'Embedding', reranker: 'Reranker' };
export const typeIcons: Record<ModelKind, string> = { text: 'text', image: 'image-line', video: 'film-line', audio: 'music-2-line', transcription: 'text', embedding: 'stack-line', reranker: 'equalizer-line' };
const capabilityIcons = { reasoning: 'flashlight-line', tools: 'plug-line', vision: 'eye-line', audio: 'music-2-line', video: 'film-line' };
export const capabilityLabels = { reasoning: 'Reasoning', tools: 'Tools', vision: 'Vision', audio: 'Audio', video: 'Video' };
const limits = [
  { key: 'contextWindow', label: 'Context window', presets: [128000, 200000, 262144, 400000, 524288, 1000000] },
  { key: 'maxInputTokens', label: 'Max input tokens', presets: [128000, 200000, 256000, 512000, 1000000] },
  { key: 'maxOutputTokens', label: 'Max output tokens', presets: [16384, 32768, 65536, 128000, 256000] },
] as const;

type TokenKey = typeof limits[number]['key'];
type TokenError = 'integer' | 'maximum' | 'context';
function validateTokenLimits(values: Record<TokenKey, string>): Partial<Record<TokenKey, TokenError>> {
  const errors: Partial<Record<TokenKey, TokenError>> = {};
  for (const { key } of limits) {
    const value = values[key].trim();
    if (!value) continue;
    const number = Number(value);
    if (!/^[\d.eE+-]+$/.test(value) || !Number.isFinite(number) || !Number.isInteger(number) || number < 1) errors[key] = 'integer';
    else if (number > 100_000_000) errors[key] = 'maximum';
  }
  const context = Number(values.contextWindow);
  if (context > 0 && !errors.contextWindow) {
    for (const key of ['maxInputTokens', 'maxOutputTokens'] as const) {
      if (!errors[key] && Number(values[key]) > context) errors[key] = 'context';
    }
  }
  return errors;
}

export function ModelEditor({ provider, model, onClose, save }: { provider: ProviderConnection; model?: DirectoryModel; onClose: () => void; save: (input: unknown) => Promise<boolean> }) {
  const { t, formatNumber } = useI18n();
  const [id, setId] = useState(model?.modelId ?? ''), [label, setLabel] = useState(model?.label ?? ''), [group, setGroup] = useState(model?.group ?? '');
  const [kind, setKind] = useState<ModelKind>(model?.kind ?? (provider.protocol === 'media' ? 'image' : 'text'));
  const [capabilities, setCapabilities] = useState(model?.capabilities ?? []), [inputs, setInputs] = useState(model?.inputs ?? []);
  const [tokens, setTokens] = useState(Object.fromEntries(limits.map(({ key }) => [key, model?.[key]?.toString() ?? ''])) as Record<TokenKey, string>);
  const [defaults, setDefaults] = useState(JSON.stringify(model?.defaults ?? {}, null, 2)), [advanced, setAdvanced] = useState(Boolean(model)), [busy, setBusy] = useState(false);
  const [validated, setValidated] = useState(false);
  const basicErrors = { id: model ? undefined : modelIdError(id), label: label.trim().length > 180 ? 'Display name cannot exceed 180 characters.' : undefined, group: group.length > 80 ? 'Group name cannot exceed 80 characters.' : undefined };
  const parsedDefaults = defaultParameters(defaults);
  const defaultsInvalid = validated && Boolean(parsedDefaults.error);
  const tokenErrors = validateTokenLimits(tokens);
  const tokenRefs = useRef<Partial<Record<TokenKey | 'id' | 'label' | 'group', HTMLInputElement | null>>>({});
  const focusTarget = useRef<TokenKey | 'id' | 'label' | 'group' | 'defaults'>('defaults');
  const [focusRequest, setFocusRequest] = useState(0);
  const defaultsRef = useRef<HTMLTextAreaElement>(null);
  const defaultsId = useId();
  useEffect(() => {
    if (!focusRequest) return;
    const input = focusTarget.current === 'defaults' ? defaultsRef.current : tokenRefs.current[focusTarget.current];
    input?.focus();
    input?.scrollIntoView({ block: 'nearest' });
  }, [focusRequest]);
  const field = (key: 'id' | 'label' | 'group', title: string, value: string, change: (value: string) => void, required = false, disabled = false) => {
    const error = validated ? basicErrors[key] : undefined;
    const errorId = `${defaultsId}-${key}-error`;
    return <label className="om-label">{t(title)}<span className="om-field"><input ref={input => { tokenRefs.current[key] = input; }} aria-label={t(title)} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} value={value} onChange={e => change(e.target.value)} required={required} disabled={disabled} autoComplete="off" spellCheck={false} /></span><small id={errorId} className="om-field-error" role={error ? 'alert' : undefined}>{error ? t(error) : null}</small></label>;
  };
  return <SettingsDialog title={t(model ? 'Edit model' : 'Add model')} onClose={onClose}><form noValidate className="om-provider-form" onSubmit={async event => {
    event.preventDefault();
    const { parameters } = parsedDefaults;
    setValidated(true);
    const firstBasicError = (['id', 'label', 'group'] as const).find(key => basicErrors[key]);
    const firstTokenError = limits.find(({ key }) => tokenErrors[key])?.key;
    if (firstBasicError || firstTokenError || parsedDefaults.error) {
      focusTarget.current = firstBasicError ?? firstTokenError ?? 'defaults';
      if (firstTokenError || parsedDefaults.error) setAdvanced(true);
      setFocusRequest(value => value + 1);
      return;
    }
    setBusy(true);
    try { if (await save({ id: model?.id, modelId: id.trim(), label: label.trim() || id.trim(), kind, group, capabilities, inputs, ...Object.fromEntries(limits.map(({ key }) => [key, tokens[key].trim() ? Number(tokens[key]) : null])), defaults: parameters })) onClose(); }
    finally { setBusy(false); }
  }}>
    {field('id', 'Model ID', id, setId, true, Boolean(model))}
    {field('label', 'Display name', label, setLabel)}
    {field('group', 'Group name', group, setGroup)}
    {kind === 'transcription' && <><p className="om-muted">{t('Choose a response supported by your model. Timed captions require timestamps; text-only results can still be reviewed and copied.')}</p>
      <Select label={t('Transcription response')} value={(() => { try { return JSON.parse(defaults).response_format ?? 'auto'; } catch { return 'auto'; } })()} options={[
        { value: 'auto', label: t('Model default') }, { value: 'verbose_json', label: t('Timed segments and words') }, { value: 'json', label: t('Plain transcript') }, { value: 'diarized_json', label: t('Speakers and timed segments') },
      ]} onCommit={value => { try { const next = JSON.parse(defaults); if (value === 'auto') delete next.response_format; else next.response_format = value; if (value !== 'verbose_json') delete next.timestamp_granularities; if (value !== 'diarized_json') delete next.chunking_strategy; setDefaults(JSON.stringify(next, null, 2)); } catch { setValidated(true); setAdvanced(true); focusTarget.current = 'defaults'; setFocusRequest(value => value + 1); } }} />
    </>}
    <button className="om-button om-disclosure" type="button" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>{t('More settings')}<RemixIcon name={advanced ? 'arrow-up-line' : 'arrow-down-s-line'} size={15} /></button>
    {advanced && <div className="om-card-stack">
      <div className="om-card om-card-stack">
        <div className="om-label">{t('Model type')}<div className="om-settings-tags">{modelKinds.filter(value => (value !== 'transcription' || provider.protocol === 'openai') && (provider.protocol !== 'media' || ['image', 'video', 'audio'].includes(value))).map(value => <button type="button" className="om-button" key={value} aria-pressed={kind === value} disabled={Boolean(model) && ['media', 'agent', 'account'].includes(provider.protocol) && kind !== value} onClick={() => setKind(value)}><RemixIcon name={typeIcons[value]} size={14} />{t(kindLabels[value])}</button>)}</div></div>
        <div className="om-label">{t('Model capabilities')}<div className="om-settings-tags">{modelCapabilities.map(value => <button type="button" className="om-button" key={value} aria-pressed={capabilities.includes(value)} onClick={() => setCapabilities(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])}><RemixIcon name={capabilityIcons[value]} size={14} />{t(capabilityLabels[value])}</button>)}</div></div>
        <div className="om-label">{t('Input modalities')}<div className="om-settings-tags">{inputModalities.map(value => <button type="button" className="om-button" key={value} aria-pressed={inputs.includes(value)} onClick={() => setInputs(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])}><RemixIcon name={capabilityIcons[value]} size={14} />{t(capabilityLabels[value])}</button>)}</div></div>
      </div>
      <div className="om-card om-card-stack">{limits.map(({ key, label: title, presets }) => {
        const error = validated ? tokenErrors[key] : undefined;
        const errorId = `${defaultsId}-${key}-error`;
        const message = error === 'integer' ? t('Enter an integer between 1 and 100,000,000.')
          : error === 'maximum' ? t('The value cannot exceed 100,000,000.')
          : error === 'context' ? t(key === 'maxInputTokens' ? 'Max input tokens cannot exceed the context window (currently {limit}).' : 'Max output tokens cannot exceed the context window (currently {limit}).', { limit: formatNumber(Number(tokens.contextWindow)) }) : '';
        return <label className="om-label" key={key}>{t(title)}
          <span className="om-settings-tags">{presets.map(value => <button key={value} type="button" className="om-button" aria-label={`${t(title)}: ${value}`} aria-pressed={tokens[key] === String(value)} onClick={() => setTokens(current => ({ ...current, [key]: String(value) }))}>{value >= 1000000 ? `${value / 1000000}M` : `${[262144, 524288, 16384, 32768, 65536].includes(value) ? value / 1024 : value / 1000}K`}</button>)}</span>
          <span className="om-field"><input ref={input => { tokenRefs.current[key] = input; }} aria-label={t(title)} type="text" inputMode="numeric" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} value={tokens[key]} onChange={event => setTokens(current => ({ ...current, [key]: event.target.value }))} /></span>
          <small id={errorId} className="om-field-error" role={error ? 'alert' : undefined}>{message}</small>
        </label>;
      })}<p className="om-muted">{t('Token limits describe this model. They do not change the provider’s actual limits.')}</p></div>
      <label className="om-label">{t('Default request parameters (JSON)')}<span className="om-field om-code-field"><textarea ref={defaultsRef} aria-label={t('Default request parameters (JSON)')} aria-invalid={defaultsInvalid || undefined} aria-describedby={`${defaultsId}-help${defaultsInvalid ? ` ${defaultsId}-error` : ''}`} rows={5} spellCheck={false} value={defaults} onChange={event => {
        const value = event.target.value;
        setDefaults(value);
      }} /></span><small id={`${defaultsId}-error`} className="om-field-error" role={defaultsInvalid ? 'alert' : undefined}>{defaultsInvalid ? t(parsedDefaults.error!, { field: parsedDefaults.field ?? '' }) : null}</small><small id={`${defaultsId}-help`} className="om-muted">{t('Use the provider’s parameter names. Per-request values override these defaults. Language model settings are saved for integrations; local Agents manage their own parameters.')}</small></label>
    </div>}
    <div className="om-dialog-actions"><button className="om-button" type="button" disabled={busy} onClick={onClose}>{t('Cancel')}</button><button className="om-button" data-primary disabled={busy}>{t(busy ? 'Saving…' : model ? 'Save model' : 'Add model')}</button></div>
  </form></SettingsDialog>;
}

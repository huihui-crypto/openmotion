import { toastErrorMessage } from "./ui/toastErrorMessage";
import { RemixIcon } from "../icons/RemixIcons";
import { useI18n } from "../i18n/I18n";
import { systemMessage } from "../i18n/systemMessages";
import type { AppToast } from '../utils/studioHelpers';
interface StudioToastProps {
  action?: AppToast['action'];
  pending?: boolean;
  message: string;
  tone?: "error" | "info";
  presentation?: "feedback";
  /** Plays the exit animation when true (owner removes the node after ~160ms). */
  leaving?: boolean;
  onDismiss?: () => void;
  singleLine?: boolean;
  status?: string;
}

export function StudioToast({ message, tone, presentation, leaving, onDismiss, singleLine, status, action, pending }: StudioToastProps) {
  const { t } = useI18n();
  const isError = tone === "error";
  const actions = action && <>
    <button type="button" className="hf-toast-action" disabled={pending || leaving} aria-busy={pending} onClick={() => void action.onClick()}><RemixIcon name="arrow-go-back-line" size={14} />{action.label}</button>
    {onDismiss && <button type="button" className="hf-toast-action" disabled={pending || leaving} aria-label={t('Dismiss notification')} onClick={onDismiss}><RemixIcon name="close-line" size={14} /></button>}
  </>;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`pointer-events-none max-w-full motion-reduce:animate-none ${leaving ? "hf-toast-exit" : "hf-toast-enter"}`}
    >
      {isError && presentation !== "feedback" ? <div className="hf-toast-surface flex max-w-[min(420px,calc(100vw-48px))] items-center gap-3">
        <span className="min-w-0 leading-5 [overflow-wrap:anywhere]">{systemMessage(toastErrorMessage(message), t)}</span>
        {actions || (onDismiss && <button type="button" className="hf-toast-action" aria-label={t('Dismiss error')} onClick={onDismiss}><RemixIcon name="close-line" size={14} /></button>)}
      </div> : <div className="hf-toast-surface max-w-[min(420px,calc(100vw-48px))] overflow-hidden">
        <div className={status || action ? "flex min-w-0 items-center gap-3" : undefined}>
          <span className={singleLine ? "block min-w-0 truncate leading-5" : "line-clamp-3 leading-5 [overflow-wrap:anywhere]"} title={systemMessage(message, t)}>{systemMessage(message, t)}</span>
          {status && <span className="shrink-0 leading-5 opacity-70">
            {status === 'Reconnecting…' ? <>
              <span className="sr-only">{t(status)}</span>
              <span aria-hidden="true">{t(status).replace(/(?:…|\.{3})$/, '')}<span className="hf-toast-progress-dots"><span>.</span><span>.</span><span>.</span></span></span>
            </> : t(status)}
          </span>}
          {actions}
        </div>
      </div>}
    </div>
  );
}

export function toastSurface(isError: boolean): string {
  return `border shadow-popover bg-raised ${isError ? "border-danger/40" : "border-border"}`;
}

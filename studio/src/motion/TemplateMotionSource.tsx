import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18n';
import { MotionIcon } from './icons';
import { Skeleton } from '../components/ui/Skeleton';
import styles from './TemplateLibraryDialog.module.css';

type Props = { url: string; onCopy: (copied: boolean) => void };

/** Reads the template's motion.md in place, so it can be checked and copied without downloading a file. */
export function TemplateMotionSource({ url, onCopy }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState<string | null>(null), [failed, setFailed] = useState(false), [attempt, retry] = useState(0), [copied, setCopied] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setText(null); setFailed(false); setCopied(false);
    fetch(url, { credentials: 'omit', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.text(); })
      .then(setText, () => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [url, attempt]);
  async function copy() {
    try { await navigator.clipboard.writeText(text ?? ''); setCopied(true); onCopy(true); }
    catch { onCopy(false); }
  }
  if (failed) return <div className={styles.promptFailure} role="status">{t('Could not load motion.md.')}<button onClick={() => retry(value => value + 1)}>{t('Retry')}</button></div>;
  if (text === null) return <div className={styles.promptSkeleton} role="status" aria-label={t('Loading motion.md…')}>{[100, 92, 100, 84, 60].map((width, index) => <Skeleton key={index} style={{ width: `${width}%`, height: 10 }} />)}</div>;
  return <div className={styles.motionSource}>
    <button onClick={() => void copy()}><MotionIcon name="copy" size={14} />{t(copied ? 'Copied' : 'Copy')}</button>
    <pre tabIndex={0} aria-label="motion.md">{text}</pre>
  </div>;
}

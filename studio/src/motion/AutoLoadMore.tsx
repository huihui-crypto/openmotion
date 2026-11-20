import { useEffect, useRef, type ReactNode } from 'react';

const preloadDistance = '0px 0px 640px 0px';

function scrollRoot(node: HTMLElement): HTMLElement | null {
  for (let element = node.parentElement; element; element = element.parentElement) {
    if (/(auto|scroll|overlay)/.test(getComputedStyle(element).overflowY)) return element;
  }
  return null;
}

/**
 * Loads the next page when the end of a list scrolls near the viewport, so people keep browsing
 * without pressing a button. Render it only while another page exists and nothing is loading:
 * every mount observes once, and a sentinel that is still visible after a page arrives loads again.
 * Without IntersectionObserver the fallback (usually the manual button) is shown instead.
 */
export function AutoLoadMore({ onLoad, fallback }: { onLoad: () => void; fallback: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const load = useRef(onLoad);
  useEffect(() => { load.current = onLoad; });
  const supported = typeof IntersectionObserver !== 'undefined';
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !supported) return;
    let done = false;
    const observer = new IntersectionObserver(entries => {
      if (done || !entries.some(entry => entry.isIntersecting)) return;
      done = true;
      observer.disconnect();
      load.current();
    }, { root: scrollRoot(node), rootMargin: preloadDistance });
    observer.observe(node);
    return () => observer.disconnect();
  }, [supported]);
  if (!supported) return <>{fallback}</>;
  return <div ref={sentinel} className="om-auto-load-more" data-auto-load-more="" aria-hidden="true" />;
}

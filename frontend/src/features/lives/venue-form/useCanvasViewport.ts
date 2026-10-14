/** 書式エディタの表示（拡大率とスクロール位置）。
 *  Ctrl/⌘+ホイール・ピンチ: マウス位置を中心に拡大縮小 / Ctrl+＋・－・0: 拡大・縮小・ページ全体
 *  スペース+ドラッグ・中ボタンドラッグ: 表示位置を動かす */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

/** 表示上の 100%（ツールバーの % 表示と合わせる）。 */
export const BASE_PX_PER_MM = 3;
export const MIN_PX_PER_MM = BASE_PX_PER_MM * 0.25;
export const MAX_PX_PER_MM = BASE_PX_PER_MM * 8;
const BUTTON_STEP = 1.25;
/** スクロール領域の内側の余白（p-6 の左右合計）。 */
const GUTTER_PX = 48;

interface Anchor {
  clientX: number;
  clientY: number;
  mmX: number;
  mmY: number;
}

export function clampZoom(pxPerMm: number) {
  return Math.min(MAX_PX_PER_MM, Math.max(MIN_PX_PER_MM, pxPerMm));
}

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)));
}

export function useCanvasViewport(page: { widthMm: number; heightMm: number } | null) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [pxPerMm, setPxPerMm] = useState(2.5);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const anchorRef = useRef<Anchor | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const fittedRef = useRef(false);

  /** 画面上の点（既定は表示領域の中央）を動かさずに拡大率を変える。 */
  const zoomTo = useCallback((next: number, clientX?: number, clientY?: number) => {
    const scroller = scrollerRef.current;
    const canvas = canvasRef.current;
    setPxPerMm((prev) => {
      const target = clampZoom(next);
      if (scroller && canvas && target !== prev) {
        const view = scroller.getBoundingClientRect();
        const rect = canvas.getBoundingClientRect();
        const x = clientX ?? view.left + view.width / 2;
        const y = clientY ?? view.top + view.height / 2;
        anchorRef.current = { clientX: x, clientY: y, mmX: (x - rect.left) / prev, mmY: (y - rect.top) / prev };
      }
      return target;
    });
  }, []);

  // 拡大後に、基準にした点が同じ画面位置に来るようスクロールを合わせる
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const scroller = scrollerRef.current;
    const canvas = canvasRef.current;
    anchorRef.current = null;
    if (!anchor || !scroller || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    scroller.scrollLeft += rect.left + anchor.mmX * pxPerMm - anchor.clientX;
    scroller.scrollTop += rect.top + anchor.mmY * pxPerMm - anchor.clientY;
  }, [pxPerMm]);

  const fit = useCallback((mode: 'page' | 'width') => {
    const scroller = scrollerRef.current;
    if (!scroller || !page) return;
    const byWidth = (scroller.clientWidth - GUTTER_PX) / page.widthMm;
    const byHeight = (scroller.clientHeight - GUTTER_PX) / page.heightMm;
    setPxPerMm(clampZoom(mode === 'width' ? byWidth : Math.min(byWidth, byHeight)));
    scroller.scrollTo({ left: 0, top: 0 });
  }, [page]);

  // 最初にページが出たときは幅に合わせる
  useEffect(() => {
    if (!page || fittedRef.current || !scrollerRef.current) return;
    // 描画が済んで表示領域の大きさが確定してから合わせる
    const frame = requestAnimationFrame(() => {
      fittedRef.current = true;
      fit('width');
    });
    return () => cancelAnimationFrame(frame);
  }, [page, fit]);

  // ホイールは passive にできない（ブラウザの拡大を止めるため）ので直接登録する
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0025));
      setPxPerMm((prev) => {
        const canvas = canvasRef.current;
        const target = clampZoom(prev * factor);
        if (canvas && target !== prev) {
          const rect = canvas.getBoundingClientRect();
          anchorRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
            mmX: (event.clientX - rect.left) / prev,
            mmY: (event.clientY - rect.top) / prev,
          };
        }
        return target;
      });
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, [page]);

  // スペースで移動モード、Ctrl+＋・－・0 はブラウザの拡大の代わりにエディタを拡大する
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || document.querySelector('[role="dialog"]')) return;
      if (event.code === 'Space') {
        // ボタン等にフォーカスがあるときのスペースは、そのボタンを押す操作として残す
        if ((event.target as HTMLElement | null)?.closest?.('button, [role="button"], [role="checkbox"], a')) return;
        event.preventDefault();
        setSpaceHeld(true);
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === '+' || event.key === '=' || event.key === ';') {
        event.preventDefault();
        zoomTo(pxPerMm * BUTTON_STEP);
      } else if (event.key === '-') {
        event.preventDefault();
        zoomTo(pxPerMm / BUTTON_STEP);
      } else if (event.key === '0') {
        event.preventDefault();
        fit('page');
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceHeld(false);
    };
    const onBlur = () => setSpaceHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [fit, pxPerMm, zoomTo]);

  // 要素の選択・ドラッグより先に拾うため、キャプチャで受ける
  const onPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!(spaceHeld && event.button === 0) && event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { x: event.clientX, y: event.clientY };
    setPanning(true);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = panRef.current;
    if (!start) return;
    event.currentTarget.scrollLeft -= event.clientX - start.x;
    event.currentTarget.scrollTop -= event.clientY - start.y;
    panRef.current = { x: event.clientX, y: event.clientY };
  };
  const endPan = () => {
    panRef.current = null;
    setPanning(false);
  };

  return {
    pxPerMm,
    scrollerRef,
    canvasRef,
    zoomIn: () => zoomTo(pxPerMm * BUTTON_STEP),
    zoomOut: () => zoomTo(pxPerMm / BUTTON_STEP),
    fitPage: () => fit('page'),
    fitWidth: () => fit('width'),
    resetZoom: () => zoomTo(BASE_PX_PER_MM),
    scrollerProps: {
      onPointerDownCapture,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
      // 中ボタンの自動スクロールを出さない
      onMouseDown: (event: ReactMouseEvent) => { if (event.button === 1) event.preventDefault(); },
      style: { cursor: panning ? 'grabbing' : spaceHeld ? 'grab' : undefined },
    },
    /** 移動モード中は要素をつかめないようにする */
    isPanMode: spaceHeld || panning,
  };
}

/** 1 行に縮めて収める文字の見た目。折り返さずに並べ、枠の幅に入らなければ入る大きさまで縮めて見せる（出力と同じく下限あり）。 */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  /** 縮める前の文字の大きさ（px） */
  fontPx: number;
  /** これより小さくはしない（px）。それでも入らなければはみ出したまま見せる */
  minFontPx: number;
  align?: string;
  children: ReactNode;
}

/** 出力（PDF）で枠の左右に空ける幅に合わせた余白（px）。 */
const INSET_PX = 2;

export function ShrinkToFitLine({ fontPx, minFontPx, align, children }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const measure = () => {
      // 縮める前の幅で測る（transform は offsetWidth に影響しない）
      const natural = text.offsetWidth;
      const available = box.clientWidth - INSET_PX;
      const fit = natural > 0 && available > 0 ? Math.min(1, available / natural) : 1;
      setScale(Math.max(minFontPx / fontPx, fit));
    };
    measure();
    // 回答の読み込みや枠の大きさの変更で幅が変わったら測り直す
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(text);
    return () => observer.disconnect();
  }, [fontPx, minFontPx]);

  const origin = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  return (
    <div ref={boxRef} className="w-full min-w-0" style={{ textAlign: (align as 'left' | 'center' | 'right') ?? 'left' }}>
      <span
        ref={textRef}
        style={{ display: 'inline-block', whiteSpace: 'pre', fontSize: fontPx, transform: `scale(${scale})`, transformOrigin: `${origin} center` }}
      >
        {children}
      </span>
    </div>
  );
}

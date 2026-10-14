/** 保存しておいた lucide アイコンの図形データを SVG として描く。
 *  管理者が保存したデータなので、使う要素と属性を絞ってから描く。 */
import { createElement } from 'react';

import type { IconNode } from './stage-plot-types';

const ALLOWED_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const ALLOWED_ATTRS = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points', 'fill', 'fill-rule', 'clip-rule']);
const REACT_ATTR_NAMES: Record<string, string> = { 'fill-rule': 'fillRule', 'clip-rule': 'clipRule' };

interface Props {
  nodes: IconNode[];
  color?: string;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
}

export function SvgIconNodes({ nodes, color = 'currentColor', size = 24, strokeWidth = 2, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {nodes.map(([tag, attrs], index) => {
        if (!ALLOWED_TAGS.has(tag)) return null;
        const safeAttrs: Record<string, string> = {};
        for (const [name, value] of Object.entries(attrs ?? {})) {
          if (ALLOWED_ATTRS.has(name)) safeAttrs[REACT_ATTR_NAMES[name] ?? name] = String(value);
        }
        if (safeAttrs.fill && safeAttrs.fill !== 'none') safeAttrs.fill = color;
        // 楽器アイコンのような塗りの図形は線を引かない（線で描く lucide と混在する）
        if (attrs?.stroke === 'none') safeAttrs.stroke = 'none';
        return createElement(tag, { key: index, ...safeAttrs });
      })}
    </svg>
  );
}

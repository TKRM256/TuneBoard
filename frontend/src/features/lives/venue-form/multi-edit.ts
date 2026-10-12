/** 複数選んだ要素の一括変更で、どの設定を出すか・今の値が揃っているかを決める。 */
import {
  DEFAULT_MARK_COLOR,
  DEFAULT_TEXT_COLOR,
  type VenueElement,
  type VenueElementKind,
} from './venue-form-schema';

export type ElementOfKind<K extends VenueElementKind> = Extract<VenueElement, { kind: K }>;

/** 文字の大きさを持つ要素 */
export const FONT_KINDS = ['text', 'field', 'table'] as const;
/** 太字・寄せを持つ要素 */
export const TEXT_KINDS = ['text', 'field'] as const;
/** 色を 1 つ持つ要素 */
export const COLOR_KINDS = ['text', 'field', 'table', 'icon'] as const;

/** どの要素も kinds のどれかなら true。 */
export function allOfKind<K extends VenueElementKind>(elements: VenueElement[], kinds: readonly K[]): elements is ElementOfKind<K>[] {
  return elements.length > 0 && elements.every((element) => (kinds as readonly string[]).includes(element.kind));
}

/** どの要素も同じ値ならその値、ばらばらなら undefined。 */
export function commonValue<E, T>(elements: E[], get: (element: E) => T): T | undefined {
  if (elements.length === 0) return undefined;
  const first = get(elements[0]);
  return elements.every((element) => get(element) === first) ? first : undefined;
}

/** 色を指定していない要素は、描くときの色とみなす。 */
export function colorOf(element: ElementOfKind<(typeof COLOR_KINDS)[number]>): string {
  return element.color ?? (element.kind === 'icon' ? DEFAULT_MARK_COLOR : DEFAULT_TEXT_COLOR);
}

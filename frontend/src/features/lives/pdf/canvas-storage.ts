/** Persists the canvas document and panel layout in localStorage so the editor
 *  state survives page reloads and SPA navigations. The saved layout itself
 *  lives on the server per live — this is only a local cache of unsaved work. */
import type { CanvasDocument } from './canvas-schema';
import type { PanelKey } from './canvas/PanelVisibilityToggles';

/** レイアウトをライブ単位で持つ前の、全ライブ共通だったキー。移行のために読むだけ。 */
const LEGACY_CANVAS_KEY = 'tuneboard:pdf-canvas-v2';
const CANVAS_KEY_PREFIX = 'tuneboard:pdf-canvas-v2:';
const PANEL_VISIBILITY_KEY = 'tuneboard:pdf-canvas-panels';

const DEFAULT_VISIBILITY: Record<PanelKey, boolean> = {
  palette: true,
  properties: true,
  preview: true,
};

/** そのライブのローカルキャッシュ。無ければ移行元の共通キーを読む。 */
export function loadStoredCanvas(liveId: string | undefined): CanvasDocument | null {
  if (!liveId) return null;
  return readCanvas(CANVAS_KEY_PREFIX + liveId) ?? readCanvas(LEGACY_CANVAS_KEY);
}

export function persistCanvas(liveId: string | undefined, doc: CanvasDocument): void {
  if (!liveId) return;
  try {
    localStorage.setItem(CANVAS_KEY_PREFIX + liveId, JSON.stringify(doc));
  } catch {
    // ignore quota / privacy errors
  }
}

function readCanvas(key: string): CanvasDocument | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CanvasDocument;
    if (!parsed.page || !Array.isArray(parsed.elements)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadPanelVisibility(): Record<PanelKey, boolean> {
  try {
    const raw = localStorage.getItem(PANEL_VISIBILITY_KEY);
    if (!raw) return { ...DEFAULT_VISIBILITY };
    const parsed = JSON.parse(raw) as Partial<Record<PanelKey, boolean>>;
    return {
      palette: parsed.palette ?? DEFAULT_VISIBILITY.palette,
      properties: parsed.properties ?? DEFAULT_VISIBILITY.properties,
      preview: parsed.preview ?? DEFAULT_VISIBILITY.preview,
    };
  } catch {
    return { ...DEFAULT_VISIBILITY };
  }
}

export function persistPanelVisibility(visibility: Record<PanelKey, boolean>): void {
  try {
    localStorage.setItem(PANEL_VISIBILITY_KEY, JSON.stringify(visibility));
  } catch {
    // ignore
  }
}

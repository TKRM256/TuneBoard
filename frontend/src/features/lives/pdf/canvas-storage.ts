/** Persists the canvas document and panel layout in localStorage so the editor
 *  state survives page reloads and SPA navigations. */
import type { CanvasDocument } from './canvas-schema';
import type { PanelKey } from './canvas/PanelVisibilityToggles';

const CANVAS_KEY = 'tuneboard:pdf-canvas-v2';
const PANEL_VISIBILITY_KEY = 'tuneboard:pdf-canvas-panels';

const DEFAULT_VISIBILITY: Record<PanelKey, boolean> = {
  palette: true,
  properties: true,
  preview: true,
};

export function loadStoredCanvas(): CanvasDocument | null {
  try {
    const raw = localStorage.getItem(CANVAS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CanvasDocument;
    if (!parsed.page || !Array.isArray(parsed.elements)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistCanvas(doc: CanvasDocument): void {
  try {
    localStorage.setItem(CANVAS_KEY, JSON.stringify(doc));
  } catch {
    // ignore quota / privacy errors
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

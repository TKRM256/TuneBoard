/** CodeMirror extension that overlays `fields['UUID']` / `groups['UUID']`
 *  tokens with a human-readable label chip. When the cursor is inside the
 *  matched range the raw UUID is revealed for editing. */
import { Decoration, type DecorationSet, EditorView, MatchDecorator, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import type { FieldCatalog } from '../field-catalog';

const UUID_RE = /(fields|groups)\['([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})'\]/g;

class LabelWidget extends WidgetType {
  private readonly _label: string;

  constructor(label: string) {
    super();
    this._label = label;
  }

  eq(other: LabelWidget) { return this._label === other._label; }

  toDOM(): HTMLElement {
    const el = document.createElement('span');
    el.className = 'cm-uuid-chip';
    el.textContent = `[${this._label}]`;
    return el;
  }

  ignoreEvent() { return false; }
}

export function uuidLabelDecoration(catalog: FieldCatalog) {
  const decorator = new MatchDecorator({
    regexp: UUID_RE,
    decorate(add, from, to, match, view) {
      const uuid = match[2];
      const info = catalog.labelById.get(uuid);
      if (!info) return;
      const { from: sFrom, to: sTo } = view.state.selection.main;
      if (sFrom <= to && sTo >= from) return;
      add(from, to, Decoration.replace({ widget: new LabelWidget(info.label) }));
    },
  });

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = decorator.createDeco(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}

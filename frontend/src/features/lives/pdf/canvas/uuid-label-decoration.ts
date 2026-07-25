/** CodeMirror extension that overlays項目 ID を参照しているトークンを
 *  人が読めるラベルのチップに置き換える。カーソルがその範囲に入ると
 *  編集できるよう生の ID を表示に戻す。
 *
 *  対象は `fields['id']` / `groups['id']` / `.field('id')` / `.group('id')` と、
 *  `joinField(group, 'id', sep)` のように引数として渡される裸の ID 文字列。
 *  ユーザーが追加した項目は ID が UUID になるため、ID の形は問わず
 *  カタログに載っているものをすべて対象にする。 */
import { Decoration, type DecorationSet, EditorView, MatchDecorator, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import type { FieldCatalog } from '../field-catalog';

const ID_REFERENCE_RE = /(?:fields|groups)\['([^']+)'\]|\.(?:field|group)\('([^']+)'\)|'([^']+)'/g;

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
    regexp: ID_REFERENCE_RE,
    decorate(add, from, to, match, view) {
      const id = match[1] ?? match[2] ?? match[3];
      const info = id ? catalog.labelById.get(id) : undefined;
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

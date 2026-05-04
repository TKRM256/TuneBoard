/** Left-side palette of insertable elements. Click to insert at the current
 *  default position; the parent decides where the element lands. */
import { useState } from 'react';
import { ChevronDown, ChevronRight, Hash, Heading1, Music, Plus, Square, Table2, Type } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CatalogGroup, FieldCatalog } from '../field-catalog';

export type PaletteInsert =
  | { kind: 'text'; content: string; title: string }
  | { kind: 'field'; fieldId: string; fallbackLabel: string }
  | { kind: 'divider' }
  | { kind: 'spacer' }
  | { kind: 'table-empty' }
  | { kind: 'table-group'; groupId: string; fallbackLabel: string };

interface Props {
  catalog: FieldCatalog;
  onInsert: (insert: PaletteInsert) => void;
}

export function ElementPalette({ catalog, onInsert }: Props) {
  return (
    <aside className="flex h-full w-full flex-col border-r bg-background">
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        部品を挿入
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          <Section title="基本パーツ" icon={<Square className="size-3.5" />} defaultOpen>
            <PaletteButton icon={<Type className="size-3.5" />} label="テキストボックス" hint="自由文" onClick={() => onInsert({ kind: 'text', content: 'テキスト', title: 'テキスト' })} />
            <PaletteButton icon={<Heading1 className="size-3.5" />} label="見出しテキスト" hint="サイズ大" onClick={() => onInsert({ kind: 'text', content: 'タイトル', title: '見出し' })} />
            <PaletteButton icon={<Hash className="size-3.5" />} label="区切り線" hint="水平線" onClick={() => onInsert({ kind: 'divider' })} />
            <PaletteButton icon={<Square className="size-3.5" />} label="スペーサー" hint="可視のみ" onClick={() => onInsert({ kind: 'spacer' })} />
            <PaletteButton icon={<Table2 className="size-3.5" />} label="空のテーブル" hint="後で列を追加" onClick={() => onInsert({ kind: 'table-empty' })} />
          </Section>

          <Section title="ライブ・提出情報" icon={<Music className="size-3.5" />} defaultOpen>
            <PaletteButton label="ライブ名" hint="${live.name}" onClick={() => onInsert({ kind: 'text', content: '${live.name}', title: 'ライブ名' })} />
            <PaletteButton label="開催日" hint="live.date" onClick={() => onInsert({ kind: 'text', content: "${formatDate(live.date, 'yyyy/M/d')}", title: '開催日' })} />
            <PaletteButton label="会場" hint="live.location" onClick={() => onInsert({ kind: 'text', content: '${live.location}', title: '会場' })} />
            <PaletteButton label="テナント名" hint="live.tenantName" onClick={() => onInsert({ kind: 'text', content: '${live.tenantName}', title: 'テナント名' })} />
            <PaletteButton label="提出日時" hint="submission.submittedAt" onClick={() => onInsert({ kind: 'text', content: "提出: ${formatDate(submission.submittedAt, 'yyyy/M/d HH:mm')}", title: '提出日時' })} />
          </Section>

          {catalog.fields.length > 0 && (
            <Section title="フォーム項目" icon={<Plus className="size-3.5" />} defaultOpen>
              {catalog.fields.map((f) => (
                <PaletteButton
                  key={f.id}
                  label={f.label}
                  hint={`${f.typeLabel}${f.pathLabel.includes(' > ') ? ' / ' + f.pathLabel : ''}`}
                  onClick={() => onInsert({ kind: 'field', fieldId: f.id, fallbackLabel: f.label })}
                />
              ))}
            </Section>
          )}

          {catalog.groups.length > 0 && (
            <Section title="繰り返しグループ" icon={<Table2 className="size-3.5" />} defaultOpen>
              {catalog.groups.map((g) => (
                <GroupSection key={g.id} group={g} onInsert={onInsert} />
              ))}
            </Section>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function GroupSection({ group, onInsert }: { group: CatalogGroup; onInsert: (insert: PaletteInsert) => void }) {
  return (
    <div className="space-y-0.5 rounded border bg-muted/20 p-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold">{group.label}</span>
        <span className="text-[10px] text-muted-foreground">
          {group.fields.length}項目{group.variants.length > 0 ? ` / ${group.variants.length}種` : ''}
        </span>
      </div>
      <PaletteButton
        label="表として挿入"
        hint={`${group.fields.length} 列のテーブル`}
        onClick={() => onInsert({ kind: 'table-group', groupId: group.id, fallbackLabel: group.label })}
      />
      <PaletteButton
        label="全件 join のテキスト"
        hint={group.fields[0] ? `${group.fields[0].label} を ' / ' で連結` : '式を編集してください'}
        onClick={() =>
          onInsert({
            kind: 'text',
            content: group.fields[0]
              ? `\${joinField(groups['${group.id}'], '${group.fields[0].id}', ' / ')}`
              : `\${count(groups['${group.id}'])} 件`,
            title: `${group.label} まとめ`,
          })
        }
      />
      <PaletteButton
        label="件数テキスト"
        hint={`${group.label}.count`}
        onClick={() =>
          onInsert({ kind: 'text', content: `\${count(groups['${group.id}'])}`, title: `${group.label} 件数` })
        }
      />
      {group.childGroups.length > 0 && (
        <div className="ml-2 mt-1 space-y-0.5 border-l pl-2">
          <div className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">ネスト</div>
          {group.childGroups.map((child) => (
            <GroupSection key={child.id} group={child} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {icon}
        <span>{title}</span>
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

function PaletteButton({ icon, label, hint, onClick }: { icon?: React.ReactNode; label: string; hint?: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-auto w-full justify-start gap-1.5 px-2 py-1.5 text-left"
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="flex flex-col items-start gap-0">
        <span className="text-xs font-medium">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </span>
    </Button>
  );
}

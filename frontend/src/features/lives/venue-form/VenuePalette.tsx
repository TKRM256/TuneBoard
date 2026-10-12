/** 書式に置く要素を選ぶ。置いた要素は表示中のページの左上に出るので、ドラッグで書式に合わせる。 */
import { useState } from 'react';
import { Circle, Image, LayoutGrid, Minus, Square, Table, Type } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconPicker } from '@/features/stage-plot/IconPicker';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import type { ElementInsert } from './venue-element-factory';

interface Props {
  catalog: FieldCatalog;
  disabled: boolean;
  onInsert: (insert: ElementInsert) => void;
}

const FIELDS_ROWS = '__fields__';

export function VenuePalette({ catalog, disabled, onInsert }: Props) {
  const [iconOpen, setIconOpen] = useState(false);
  const textFields = catalog.fields.filter((field) => field.type !== 'STAGE_PLOT');
  const stagePlots = [
    ...catalog.fields.filter((field) => field.type === 'STAGE_PLOT').map((field) => ({ field, groupId: null as string | null })),
    ...catalog.groups.flatMap((group) => group.fields
      .filter((field) => field.type === 'STAGE_PLOT')
      .map((field) => ({ field, groupId: group.id }))),
  ];

  return (
    <section className="space-y-3" data-tour="venue-palette">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">要素を置く</h2>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="gap-1" disabled={disabled} onClick={() => onInsert({ kind: 'text' })}>
          <Type className="size-4" />テキスト
        </Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={disabled} onClick={() => setIconOpen(true)}>
          <Image className="size-4" />アイコン
        </Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={disabled} onClick={() => onInsert({ kind: 'shape', shape: 'ellipse' })}>
          <Circle className="size-4" />丸囲み
        </Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={disabled} onClick={() => onInsert({ kind: 'shape', shape: 'rect' })}>
          <Square className="size-4" />四角
        </Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={disabled} onClick={() => onInsert({ kind: 'shape', shape: 'line' })}>
          <Minus className="size-4" />横線
        </Button>
      </div>

      <PickToInsert
        label="項目の値"
        icon={<Type className="size-3.5" />}
        disabled={disabled || textFields.length === 0}
        options={textFields.map((field) => ({ value: field.id, label: field.pathLabel }))}
        onPick={(fieldId) => onInsert({ kind: 'field', fieldId })}
      />
      <PickToInsert
        label="表"
        icon={<Table className="size-3.5" />}
        disabled={disabled}
        options={[
          { value: FIELDS_ROWS, label: '項目を 1 行ずつ並べる' },
          ...catalog.groups.map((group) => ({ value: group.id, label: `${group.pathLabel || group.label}を 1 件ずつ並べる` })),
        ]}
        onPick={(value) => {
          const group = catalog.groups.find((g) => g.id === value);
          onInsert({ kind: 'grid', groupId: group?.id ?? null, groupLabel: group?.label });
        }}
      />
      <PickToInsert
        label="ステージ配置図"
        icon={<LayoutGrid className="size-3.5" />}
        disabled={disabled || stagePlots.length === 0}
        options={stagePlots.map(({ field, groupId }) => ({ value: `${groupId ?? ''}|${field.id}`, label: field.pathLabel }))}
        onPick={(value) => {
          const [groupId, fieldId] = value.split('|');
          onInsert({ kind: 'stagePlot', fieldId, groupId: groupId || null });
        }}
      />

      <IconPicker
        open={iconOpen}
        onOpenChange={setIconOpen}
        onSelect={(icon) => onInsert({ kind: 'icon', iconName: icon.iconName, nodes: icon.nodes })}
      />
    </section>
  );
}

function PickToInsert({
  label,
  icon,
  disabled,
  options,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  options: Array<{ value: string; label: string }>;
  onPick: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">{icon}{label}</p>
      {/* 選んだらすぐ置くので、選択状態は持たない（value を空のままにして同じ項目を何度でも置けるようにする） */}
      <Select value="" onValueChange={onPick} disabled={disabled}>
        <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder={options.length === 0 ? '対象がありません' : '選んで置く'} /></SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

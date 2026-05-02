/** Tree-style checklist for toggling block visibility in the PDF. */
import { Checkbox } from '@/components/ui/checkbox';
import type { SettingSheetBlock, SettingSheetConfigResponse } from '../types/live-types';

interface Props {
  config: SettingSheetConfigResponse;
  hiddenBlockIds: Set<string>;
  onToggle: (id: string, hidden: boolean) => void;
}

interface Row {
  id: string;
  label: string;
  depth: number;
  typeLabel?: string;
  /** Variant labels are headers — they have no toggle. */
  isHeading?: boolean;
}

export function BlockVisibilityList({ config, hiddenBlockIds, onToggle }: Props) {
  const rows = collectRows(config.blocks, 0);
  return (
    <div className="space-y-0.5">
      {rows.map((row) => {
        if (row.isHeading) {
          return (
            <div
              key={row.id}
              className="px-2 pt-1 text-[11px] font-medium text-muted-foreground"
              style={{ paddingLeft: 8 + row.depth * 12 }}
            >
              {row.label}
            </div>
          );
        }
        const isHidden = hiddenBlockIds.has(row.id);
        return (
          <label
            key={row.id}
            className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-muted/50"
            style={{ paddingLeft: 8 + row.depth * 12 }}
          >
            <Checkbox
              checked={!isHidden}
              onCheckedChange={(checked) => onToggle(row.id, checked === false)}
              className="mt-0.5 size-3.5"
            />
            <span className="flex-1 truncate">
              <span className={isHidden ? 'text-muted-foreground line-through' : ''}>
                {row.label || '(無題)'}
              </span>
              {row.typeLabel ? <span className="ml-1 text-[10px] text-muted-foreground">[{row.typeLabel}]</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function collectRows(blocks: SettingSheetBlock[], depth: number): Row[] {
  const rows: Row[] = [];
  for (const block of blocks) {
    rows.push({
      id: block.id,
      label: block.label,
      depth,
      typeLabel: labelForType(block.type),
    });
    if (block.fields && block.fields.length > 0) {
      rows.push(...collectRows(block.fields, depth + 1));
    }
    if (block.variants && block.variants.length > 0) {
      for (const variant of block.variants) {
        rows.push({
          id: `${block.id}__variant__${variant.id}`,
          label: `▸ ${variant.label}`,
          depth: depth + 1,
          isHeading: true,
        });
        rows.push(...collectRows(variant.fields, depth + 2));
      }
    }
  }
  return rows;
}

function labelForType(type: string): string {
  switch (type) {
    case 'SECTION':
      return 'セクション';
    case 'REPEATABLE_GROUP':
      return '繰返し';
    case 'SHORT_TEXT':
    case 'LONG_TEXT':
      return 'テキスト';
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
      return '選択';
    case 'CHECKBOX':
      return 'チェック';
    case 'BOOLEAN':
      return '真偽';
    case 'SONG':
      return '楽曲';
    default:
      return '';
  }
}

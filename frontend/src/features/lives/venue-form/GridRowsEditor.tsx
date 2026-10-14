/** 項目を 1 行ずつ並べる表の、並べる項目の一覧。 */
import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { FieldCatalog } from '../canvas-shared/field-catalog';

type Row = { fieldId: string; fallbackLabel?: string };

interface Props {
  rows: Row[];
  catalog: FieldCatalog;
  onChange: (rows: Row[]) => void;
}

export function GridRowsEditor({ rows, catalog, onChange }: Props) {
  const allFields = useMemo(() => [
    ...catalog.fields.map((f) => ({ id: f.id, label: f.pathLabel || f.label })),
    ...catalog.groups.flatMap((g) => g.fields.map((f) => ({ id: f.id, label: f.pathLabel || f.label }))),
  ], [catalog]);

  return (
    <div className="space-y-1">
      {rows.map((row, index) => (
        <div key={`${row.fieldId}-${index}`} className="flex min-w-0 items-center gap-1">
          <Select
            value={row.fieldId}
            onValueChange={(fieldId) => onChange(rows.map((r, i) => (i === index ? { fieldId, fallbackLabel: allFields.find((f) => f.id === fieldId)?.label } : r)))}
          >
            <SelectTrigger className="h-7 min-w-0 flex-1 text-xs"><SelectValue placeholder="項目を選ぶ" /></SelectTrigger>
            <SelectContent>
              {allFields.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="size-7" aria-label="行を消す" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1 text-xs"
        disabled={allFields.length === 0}
        onClick={() => onChange([...rows, { fieldId: allFields[0].id, fallbackLabel: allFields[0].label }])}
      >
        <Plus className="size-3.5" />行を追加
      </Button>
    </div>
  );
}

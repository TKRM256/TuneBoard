/** 囲んだ範囲から読み取った行・列のマスに項目を並べる。グループ・見出しの行数・何件目から・列ごとの項目を選ぶ。 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { CatalogGroup, FieldCatalog } from '../../canvas-shared/field-catalog';
import { NumberField } from '../../canvas-shared/property-fields';
import { INDEX_FIELD, type TableGrid, type TableOptions } from './table-grid';

interface Props {
  grid: TableGrid | null;
  catalog: FieldCatalog;
  onCreate: (options: TableOptions) => void;
  onClose: () => void;
}

const EMPTY = '__empty__';

export function TableFromRegionDialog({ grid, catalog, onCreate, onClose }: Props) {
  return (
    <Dialog open={grid !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>表の欄に項目を並べる</DialogTitle>
        </DialogHeader>
        {grid ? <TableForm key={`${grid.rows.join()}|${grid.cols.join()}`} grid={grid} catalog={catalog} onCreate={onCreate} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function usableFields(group: CatalogGroup | undefined) {
  return (group?.fields ?? []).filter((field) => field.type !== 'STAGE_PLOT');
}

function TableForm({ grid, catalog, onCreate, onClose }: Required<Pick<Props, 'catalog' | 'onCreate' | 'onClose'>> & { grid: TableGrid }) {
  const columnCount = grid.cols.length - 1;
  const rowCount = grid.rows.length - 1;
  const [groupId, setGroupId] = useState(catalog.groups[0]?.id ?? '');
  const [headerRows, setHeaderRows] = useState(0);
  const [startIndex, setStartIndex] = useState(1);
  const group = catalog.groups.find((candidate) => candidate.id === groupId);
  const fields = usableFields(group);
  // グループを選び直したら、列には項目を上から順に入れ直す
  const [fieldIds, setFieldIds] = useState<{ groupId: string; ids: string[] }>({ groupId, ids: defaultFieldIds(fields, columnCount) });
  const ids = fieldIds.groupId === groupId ? fieldIds.ids : defaultFieldIds(fields, columnCount);
  const width = grid.cols[columnCount] - grid.cols[0];
  const dataRows = Math.max(1, rowCount - headerRows);

  const setColumn = (index: number, value: string) => {
    const next = [...ids];
    next[index] = value === EMPTY ? '' : value;
    setFieldIds({ groupId, ids: next });
  };

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm">{rowCount}行 × {columnCount}列</p>
        <div className="space-y-1.5">
          <Label className="text-xs">グループ</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="グループを選ぶ" /></SelectTrigger>
            <SelectContent>
              {catalog.groups.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>{candidate.pathLabel || candidate.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="見出しの行数" value={headerRows} onChange={(v) => setHeaderRows(clampInt(v, 0, rowCount - 1))} />
          <NumberField label="何件目から" value={startIndex} onChange={(v) => setStartIndex(clampInt(v, 1, 999))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">左から順の列</Label>
          {/* 細い列でも項目名が読めるよう最低限の幅を持たせ、入りきらなければ横にずらして見る */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {grid.cols.slice(1).map((x, i) => (
              <div key={i} className="min-w-20 shrink-0 grow" style={{ flexBasis: `${((x - grid.cols[i]) / width) * 100}%` }}>
                <Select value={ids[i] || EMPTY} onValueChange={(value) => setColumn(i, value)}>
                  <SelectTrigger className="h-8 w-full px-1.5 text-xs [&>span]:truncate"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY}>なし</SelectItem>
                    <SelectItem value={INDEX_FIELD}>番号</SelectItem>
                    {fields.map((field) => <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{startIndex}〜{startIndex + dataRows - 1}件目を書きます</p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>やめる</Button>
        <Button disabled={!groupId} onClick={() => onCreate({ groupId, headerRows, startIndex, fieldIds: ids })}>並べる</Button>
      </DialogFooter>
    </>
  );
}

function defaultFieldIds(fields: { id: string }[], count: number) {
  return Array.from({ length: count }, (_, i) => fields[i]?.id ?? '');
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : min)));
}

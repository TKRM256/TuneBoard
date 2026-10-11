/** 選択肢の印を置き始める前に、項目・何件目か・印の種類を選ぶ。 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { NumberField } from '../../canvas-shared/property-fields';
import { MARKER_KIND_LABELS, type MarkerConfig, type MarkerKind, type MarkerTarget } from './choice-markers';

interface Props {
  open: boolean;
  targets: MarkerTarget[];
  onStart: (config: MarkerConfig) => void;
  onClose: () => void;
}

const ANY_ITEM = 'any';
const NTH_ITEM = 'nth';

export function MarkerSetupDialog({ open, targets, onStart, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>選択肢の印を置く</DialogTitle>
        </DialogHeader>
        {open ? <SetupForm targets={targets} onStart={onStart} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SetupForm({ targets, onStart, onClose }: Omit<Props, 'open'>) {
  const [key, setKey] = useState(targets[0]?.key ?? '');
  const [scope, setScope] = useState(ANY_ITEM);
  const [itemIndex, setItemIndex] = useState(1);
  const [kind, setKind] = useState<MarkerKind>('check');
  const [text, setText] = useState('○');
  const target = targets.find((candidate) => candidate.key === key);

  if (targets.length === 0) {
    return (
      <>
        <p className="text-sm text-muted-foreground">選択肢の決まっている項目がありません。</p>
        <DialogFooter><Button variant="outline" onClick={onClose}>閉じる</Button></DialogFooter>
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">項目</Label>
          <Select value={key} onValueChange={setKey}>
            <SelectTrigger className="h-8 w-full min-w-0 text-xs [&>span]:truncate"><SelectValue /></SelectTrigger>
            <SelectContent>
              {targets.map((candidate) => <SelectItem key={candidate.key} value={candidate.key}>{candidate.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {target?.groupId ? (
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">どの件で判定するか</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_ITEM}>いずれかの件</SelectItem>
                  <SelectItem value={NTH_ITEM}>何件目</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === NTH_ITEM ? (
              <NumberField label="件目" value={itemIndex} onChange={(v) => setItemIndex(Math.max(1, Math.round(v) || 1))} />
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">印</Label>
            <Select value={kind} onValueChange={(next) => setKind(next as MarkerKind)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(MARKER_KIND_LABELS) as MarkerKind[]).map((option) => (
                  <SelectItem key={option} value={option}>{MARKER_KIND_LABELS[option]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {kind === 'text' ? (
            <div className="space-y-1.5">
              <Label className="text-xs">文字</Label>
              <Input value={text} onChange={(event) => setText(event.target.value)} className="h-8 text-xs" />
            </div>
          ) : null}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>やめる</Button>
        <Button
          disabled={!target}
          onClick={() => target && onStart({ target, itemIndex: scope === NTH_ITEM ? itemIndex : null, kind, text })}
        >
          始める
        </Button>
      </DialogFooter>
    </>
  );
}

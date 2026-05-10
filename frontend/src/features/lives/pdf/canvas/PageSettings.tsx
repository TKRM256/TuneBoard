/** Header control for paper size and orientation. */
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ORIENTATION_OPTIONS,
  PAPER_SIZE_OPTIONS,
  type Orientation,
  type PaperSize,
} from '../canvas-schema';

interface Props {
  size: PaperSize;
  orientation: Orientation;
  onChange: (patch: { size?: PaperSize; orientation?: Orientation }) => void;
}

export function PageSettings({ size, orientation, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs text-muted-foreground">用紙</Label>
      <Select value={size} onValueChange={(v) => onChange({ size: v as PaperSize })}>
        <SelectTrigger className="h-8 w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAPER_SIZE_OPTIONS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        value={orientation}
        onValueChange={(v) => v && onChange({ orientation: v as Orientation })}
      >
        {ORIENTATION_OPTIONS.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

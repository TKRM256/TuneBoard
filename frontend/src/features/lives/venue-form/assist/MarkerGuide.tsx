/** 選択肢の印を置いている間、次にどの選択肢の場所をクリックするかを出す。 */
import { Button } from '@/components/ui/button';

interface Props {
  label: string;
  index: number;
  total: number;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

export function MarkerGuide({ label, index, total, onBack, onSkip, onFinish }: Props) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <span className="text-xs text-muted-foreground">{index + 1}/{total}</span>
      <span>次は <strong className="font-semibold">{label}</strong> の場所</span>
      <Button variant="ghost" size="sm" className="h-7" disabled={index === 0} onClick={onBack}>戻る</Button>
      <Button variant="ghost" size="sm" className="h-7" onClick={onSkip}>飛ばす</Button>
      <Button variant="outline" size="sm" className="h-7" onClick={onFinish}>終わる</Button>
    </div>
  );
}

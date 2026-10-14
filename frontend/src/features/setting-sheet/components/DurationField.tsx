/** 演奏時間（分:秒）の入力欄。スマホでは数字のキーボードが出るようにする。 */
import { Input } from '@/components/ui/input';

import { composeDuration, splitDuration } from '../helpers/duration';

interface Props {
  inputId: string;
  value: string;
  onChange: (next: string) => void;
}

export function DurationField({ inputId, value, onChange }: Props) {
  const { minutes, seconds } = splitDuration(value);

  return (
    <div className="mt-3 flex items-center gap-2">
      <Input
        id={inputId}
        inputMode="numeric"
        value={minutes}
        onChange={(event) => onChange(composeDuration(event.target.value, seconds))}
        aria-label="分"
        className="w-20 text-right"
        maxLength={3}
      />
      <span className="text-sm text-muted-foreground">分</span>
      <Input
        inputMode="numeric"
        value={seconds}
        onChange={(event) => onChange(composeDuration(minutes, event.target.value))}
        aria-label="秒"
        className="w-20 text-right"
        maxLength={2}
      />
      <span className="text-sm text-muted-foreground">秒</span>
    </div>
  );
}

/** 押すと、その画面の使い方を 1 手ずつ案内する。勝手には始めない。 */
import { GraduationCap } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { startTour, type TourStep } from './tour';

interface Props {
  steps: TourStep[];
  className?: string;
}

export function TourButton({ steps, className }: Props) {
  return (
    <Button type="button" variant="ghost" size="sm" className={`gap-1 ${className ?? ''}`} onClick={() => startTour(steps)}>
      <GraduationCap className="size-4" />
      使い方
    </Button>
  );
}

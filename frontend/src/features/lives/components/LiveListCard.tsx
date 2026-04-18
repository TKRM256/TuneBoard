import { CalendarRange } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

import type { LiveResponse } from '../types/live-types';
import { LiveCard } from './LiveCard';

interface LiveListCardProps {
  lives: LiveResponse[];
  tenantName: string;
  tenantId: string;
  isAdmin?: boolean;
  onUpdateSuccess: (live: LiveResponse) => void;
  onDelete: (id: string) => void;
  onRestore?: (live: LiveResponse) => void;
  trashTrigger?: React.ReactNode;
}

export const LiveListCard = ({ lives, tenantName, tenantId, isAdmin, onUpdateSuccess, onDelete, onRestore, trashTrigger }: LiveListCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{tenantName} のライブ一覧</h2>
          {trashTrigger}
        </div>
      </CardHeader>
      <CardContent>
        {lives.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarRange />
              </EmptyMedia>
              <EmptyTitle>ライブがまだありません</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-4">
            {lives.map((live) => (
              <LiveCard
                key={live.id}
                live={live}
                tenantId={tenantId}
                isAdmin={isAdmin}
                onUpdateSuccess={onUpdateSuccess}
                onDelete={onDelete}
                onRestore={onRestore}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import { useState } from 'react';
import {  ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { ConfirmButton } from '@/components/original/ConfirmButton';
import { InlineEditPanel } from '@/components/original/InlineEditPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useSingleFlight } from '@/hooks/use-single-flight';

import { LiveEditFields } from './LiveEditFields';
import { useLiveEditForm } from '../hooks/use-live-edit-form';
import {
  formatLiveDate,
  formatOptionalText,
  LIVE_STATUS_LABELS,
  type LiveResponse,
} from '../types/live-types';

interface LiveCardProps {
  live: LiveResponse;
  tenantId: string;
  isAdmin?: boolean;
  onUpdateSuccess: (live: LiveResponse) => void;
  onDelete: (id: string) => void;
  onRestore?: (live: LiveResponse) => void;
}

export const LiveCard = ({ live, tenantId, isAdmin, onUpdateSuccess, onDelete, onRestore }: LiveCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { formValues, setFieldValue, submit, validate } = useLiveEditForm(live, onUpdateSuccess);
  const { run: runRestoreLive } = useSingleFlight();

  const onSubmit = async () => {
    if (await submit()) {
      setIsEditing(false);
    }
  };

  const restoreLive = () => runRestoreLive(async () => {
    await apiClient.post<void>('/lives/restore', { id: live.id });
    if (onRestore) onRestore(live);
    toast.success('ライブを復元しました', { position: 'top-center' });
  });

  const handleDelete = async () => {
    try {
      await apiClient.post<void>('/lives/delete', { id: live.id });
      onDelete(live.id);
      toast.success('ライブを削除しました', {
        position: 'top-center',
        action: {
          label: '取り消す',
          onClick: () => {
            void restoreLive().catch(() => {
              toast.error('復元に失敗しました', { position: 'top-center' });
            });
          },
        },
      });
    } catch {
      toast.error('ライブの削除に失敗しました', { position: 'top-center' });
    }
  };

  const badgeVariant = live.status === 'CLOSED' ? 'destructive' : live.status === 'PUBLISHED' ? 'default' : 'secondary';

  return (
    <motion.div layout>
    <Card className={isEditing ? 'border-primary/30 shadow-md shadow-primary/5' : undefined}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="wrap-break-word text-base font-semibold sm:text-lg">{live.name}</h3>
              <Badge variant={badgeVariant}>{LIVE_STATUS_LABELS[live.status]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {formatLiveDate(live.date)} · {formatOptionalText(live.location)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild size="sm">
              <Link to={`/tenants/${tenantId}/lives/${live.id}`}>
                {isAdmin ? '管理' : '詳細'}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing((prev) => !prev)}>
                {isEditing ? "キャンセル" : "編集"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <InlineEditPanel open={isEditing} >
          <motion.div layout className="space-y-4">
            <LiveEditFields idPrefix={live.id} formValues={formValues} onChange={setFieldValue} />

            <div className="flex border-t pt-2 gap-2 justify-end">
              <ConfirmButton onClick={onSubmit} validate={validate}>更新</ConfirmButton>
              <ConfirmButton onClick={handleDelete} defaultVariant="outline" confirmVariant="destructive">
                削除
              </ConfirmButton>
            </div>
          </motion.div>
      </InlineEditPanel>
    </Card>
    </motion.div>
  );
};
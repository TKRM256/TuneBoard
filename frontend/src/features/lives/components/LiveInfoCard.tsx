/** ダッシュボードのライブ情報カード（表示 + その場での編集）。 */
import { useState } from 'react';
import { CalendarDays, Clock, MapPin, Pencil, X } from 'lucide-react';

import { ConfirmButton } from '@/components/original/ConfirmButton';
import { InlineEditPanel } from '@/components/original/InlineEditPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { LiveEditFields } from './LiveEditFields';
import { useLiveEditForm } from '../hooks/use-live-edit-form';
import { formatDeadline, formatLiveDate, formatOptionalText, type LiveResponse } from '../types/live-types';

interface LiveInfoCardProps {
  live: LiveResponse;
  isAdmin: boolean;
  onUpdated: (live: LiveResponse) => void;
}

export const LiveInfoCard = ({ live, isAdmin, onUpdated }: LiveInfoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { formValues, setFieldValue, resetForm, submit, validate } = useLiveEditForm(live, onUpdated);

  const onSubmit = async () => {
    if (await submit()) {
      setIsEditing(false);
    }
  };

  const onCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">ライブ情報</h2>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (isEditing ? onCancel() : setIsEditing(true))}
            >
              {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
              {isEditing ? 'キャンセル' : '編集'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoRow icon={CalendarDays} label="開催日" value={formatLiveDate(live.date)} />
          <InfoRow icon={MapPin} label="会場" value={formatOptionalText(live.location)} />
          <InfoRow icon={Clock} label="回答締切" value={formatDeadline(live.deadlineAt)} />
        </div>

        <InlineEditPanel open={isEditing}>
          <div className="space-y-4 border-t pt-4">
            <LiveEditFields idPrefix={`info-${live.id}`} formValues={formValues} onChange={setFieldValue} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>キャンセル</Button>
              <ConfirmButton onClick={onSubmit} validate={validate}>更新</ConfirmButton>
            </div>
          </div>
        </InlineEditPanel>
      </CardContent>
    </Card>
  );
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-lg bg-muted/40 px-4 py-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

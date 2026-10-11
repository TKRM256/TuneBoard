/** ステージの下絵（画像のアップロード・会場書式からの切り出し・外す）。変更はすぐに保存される。 */
import { useRef, useState } from 'react';
import { Crop, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAuthedObjectUrl } from '@/hooks/use-authed-object-url';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';
import type { VenueAsset } from '@/features/lives/venue-form/venue-form-schema';

import { VenueCropDialog } from './VenueCropDialog';
import {
  adminStageBasePath,
  deleteStageBase,
  stageBaseFromVenueForm,
  uploadStageBase,
  type StageBaseCrop,
  type StagePlotResponse,
} from './stage-plot-api';

interface Props {
  liveId: string;
  stagePlot: StagePlotResponse;
  venueAssets: VenueAsset[];
  canEdit: boolean;
  onChanged: (response: StagePlotResponse) => void;
}

export function StageBaseSection({ liveId, stagePlot, venueAssets, canEdit, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const { run, isRunning } = useSingleFlight();
  const base = stagePlot.base;
  const { url } = useAuthedObjectUrl(base ? adminStageBasePath(liveId, base.id) : null);

  const perform = (action: () => Promise<StagePlotResponse | null>, success: string) => void run(async () => {
    try {
      const response = await action();
      if (response) onChanged(response);
      toast.success(success, { position: 'top-center' });
      setCropOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : '下絵を変更できませんでした', { position: 'top-center' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {url ? <img src={url} alt="ステージの下絵" className="max-h-64 w-full object-contain" /> : (
          <p className="p-4 text-center text-sm text-muted-foreground">{base ? '読み込み中...' : '下絵なし'}</p>
        )}
      </div>
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) perform(() => uploadStageBase(liveId, file), '下絵を設定しました');
            }}
          />
          <Button variant="outline" size="sm" className="gap-1" disabled={isRunning} onClick={() => fileRef.current?.click()}>
            {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}画像をアップロード
          </Button>
          <Button variant="outline" size="sm" className="gap-1" disabled={isRunning} onClick={() => setCropOpen(true)}>
            <Crop className="size-4" />会場書式から切り出す
          </Button>
          {base ? (
            <Button variant="ghost" size="sm" className="gap-1" disabled={isRunning} onClick={() => perform(() => deleteStageBase(liveId), '下絵を外しました')}>
              <Trash2 className="size-4 text-destructive" />下絵を外す
            </Button>
          ) : null}
        </div>
      ) : null}
      <VenueCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        liveId={liveId}
        assets={venueAssets}
        isSaving={isRunning}
        onConfirm={(crop: StageBaseCrop) => perform(() => stageBaseFromVenueForm(liveId, crop), '会場書式から下絵を作りました')}
      />
    </div>
  );
}

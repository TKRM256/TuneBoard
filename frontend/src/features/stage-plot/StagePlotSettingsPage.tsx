/** ステージ設定（管理者）。下絵と、出演者が置けるアイコンの一覧・大きさを決める。 */
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CopyPlus } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/original/PageHeader';
import { SaveBar } from '@/components/original/SaveBar';
import { UnsavedChangesDialog } from '@/components/original/UnsavedChangesDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumberInput } from '@/components/original/NumberInput';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';
import { useAuthedObjectUrl } from '@/hooks/use-authed-object-url';
import { LiveCopyFromDialog } from '@/features/lives/copy/LiveCopyFromDialog';
import type { LiveResponse } from '@/features/lives/types/live-types';
import { fetchVenueAssets } from '@/features/lives/venue-form/venue-form-api';
import type { VenueAsset } from '@/features/lives/venue-form/venue-form-schema';

import { PaletteEditor } from './PaletteEditor';
import { StageBaseSection } from './StageBaseSection';
import { StagePlotCanvas } from './StagePlotCanvas';
import { adminStageBasePath, copyStagePlotFrom, fetchStagePlot, saveStagePlot, type StagePlotResponse } from './stage-plot-api';
import { DEFAULT_ASPECT_RATIO, DEFAULT_ICON_SCALE, type PaletteItem } from './stage-plot-types';

interface Draft { palette: PaletteItem[]; iconScale: number; aspectRatio: number }

function toDraft(response: StagePlotResponse): Draft {
  return {
    palette: response.settings.palette ?? [],
    iconScale: response.settings.iconScale ?? DEFAULT_ICON_SCALE,
    aspectRatio: response.settings.aspectRatio ?? DEFAULT_ASPECT_RATIO,
  };
}

export const StagePlotSettingsPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [stagePlot, setStagePlot] = useState<StagePlotResponse | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [venueAssets, setVenueAssets] = useState<VenueAsset[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copyOpen, setCopyOpen] = useState(false);
  const save = useSingleFlight();
  const { url: baseUrl } = useAuthedObjectUrl(stagePlot?.base && liveId ? adminStageBasePath(liveId, stagePlot.base.id) : null);
  const isDirty = stagePlot !== null && draft !== null && JSON.stringify(draft) !== JSON.stringify(toDraft(stagePlot));
  const leaveGuard = useUnsavedChangesWarning(isDirty);

  useEffect(() => {
    if (!tenantId || !liveId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [liveRes, plotRes, venueRes, tenantRes] = await Promise.all([
          apiClient.get<LiveResponse>(`/lives/${liveId}`),
          fetchStagePlot(liveId),
          fetchVenueAssets(liveId),
          apiClient.get<{ role: string }>(`/tenants/get/${tenantId}`),
        ]);
        if (cancelled || !liveRes || !plotRes) return;
        setLive(liveRes);
        setStagePlot(plotRes);
        setDraft(toDraft(plotRes));
        setVenueAssets(venueRes);
        setIsAdmin(tenantRes?.role === 'ADMIN' || tenantRes?.role === 'OWNER');
      } catch {
        if (!cancelled) toast.error('ステージ設定を読み込めませんでした', { position: 'top-center' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, liveId]);

  if (!tenantId || !liveId) return <Navigate to="/tenants" replace />;
  if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">読み込み中...</div>;
  if (!live || !stagePlot || !draft) return <Navigate to={`/tenants/${tenantId}/lives/${liveId}`} replace />;

  const handleSave = () => void save.run(async () => {
    try {
      const response = await saveStagePlot(liveId, { ...draft, baseRevision: stagePlot.revision });
      if (response) {
        setStagePlot(response);
        setDraft(toDraft(response));
      }
      toast.success('ステージ設定を保存しました', { position: 'top-center' });
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : '保存に失敗しました', { position: 'top-center' });
    }
  });

  const handleCopy = async (sourceLiveId: string) => {
    try {
      const response = await copyStagePlotFrom(liveId, sourceLiveId);
      if (response) {
        setStagePlot(response);
        setDraft(toDraft(response));
      }
      toast.success('ステージ設定を取り込みました', { position: 'top-center' });
      return true;
    } catch {
      toast.error('取り込みに失敗しました', { position: 'top-center' });
      return false;
    }
  };

  const aspectRatio = stagePlot.base ? stagePlot.settings.aspectRatio ?? DEFAULT_ASPECT_RATIO : draft.aspectRatio;
  // プレビューでは、各アイコンを 1 つずつ横に並べて大きさの見当をつける
  const sampleItems = draft.palette.map((item, index) => ({
    id: item.id,
    paletteId: item.id,
    label: item.label,
    x: (index + 1) / (draft.palette.length + 1),
    y: 0.5,
  }));

  return (
    <div className="space-y-4">
      <UnsavedChangesDialog guard={leaveGuard} />
      <PageHeader
        crumbs={[
          { label: 'テナント一覧', to: '/tenants' },
          { label: live.tenantName, to: `/tenants/${tenantId}/lives` },
          { label: live.name, to: `/tenants/${tenantId}/lives/${liveId}` },
          { label: 'ステージ設定' },
        ]}
        backTo={`/tenants/${tenantId}/lives/${liveId}`}
        title="ステージ設定"
        description={live.name}
        actions={isAdmin ? (
          <Button variant="outline" size="sm" onClick={() => setCopyOpen(true)}>
            <CopyPlus className="size-4" />他のライブから取り込む
          </Button>
        ) : null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">下絵</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StageBaseSection liveId={liveId} stagePlot={stagePlot} venueAssets={venueAssets} canEdit={isAdmin} onChanged={setStagePlot} />
          {!stagePlot.base ? (
            <div className="flex items-center gap-2">
              <Label htmlFor="stage-aspect" className="text-xs">ステージの横縦比（幅 ÷ 高さ）</Label>
              <NumberInput id="stage-aspect" step={0.1} min={0.2} max={5} value={draft.aspectRatio} disabled={!isAdmin}
                onValueChange={(aspectRatio) => setDraft({ ...draft, aspectRatio })} className="h-8 w-24" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">置けるアイコン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? <PaletteEditor palette={draft.palette} onChange={(palette) => setDraft({ ...draft, palette })} /> : null}
          <div className="space-y-2">
            <Label className="text-xs">アイコンの大きさ</Label>
            <Slider min={2} max={30} step={1} value={[Math.round(draft.iconScale * 100)]} disabled={!isAdmin}
              onValueChange={([value]) => setDraft({ ...draft, iconScale: value / 100 })} />
          </div>
          <div className="mx-auto w-full max-w-2xl">
            <StagePlotCanvas palette={draft.palette} iconScale={draft.iconScale} aspectRatio={aspectRatio} baseUrl={baseUrl} items={sampleItems} />
          </div>
        </CardContent>
      </Card>

      {isAdmin ? <SaveBar isDirty={isDirty} isSaving={save.isRunning} onSave={handleSave} /> : null}

      <LiveCopyFromDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        currentLiveId={liveId}
        title="他のライブのステージ設定を取り込む"
        description="下絵とアイコンの一覧を複製して、今の設定を置き換えます。"
        isAvailable={(source) => source.hasStagePlot}
        unavailableLabel="ステージ設定なし"
        onConfirm={handleCopy}
      />
    </div>
  );
};

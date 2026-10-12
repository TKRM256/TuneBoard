/** ステージ設定（管理者）。下絵と、出演者が置けるアイコンの一覧・大きさを決める。 */
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, CopyPlus, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';
import { useAuthedObjectUrl } from '@/hooks/use-authed-object-url';
import { LiveCopyFromDialog } from '@/features/lives/copy/LiveCopyFromDialog';
import type { LiveResponse } from '@/features/lives/types/live-types';
import { fetchVenueForm } from '@/features/lives/venue-form/venue-form-api';
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

  useEffect(() => {
    if (!tenantId || !liveId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [liveRes, plotRes, venueRes, tenantRes] = await Promise.all([
          apiClient.get<LiveResponse>(`/lives/${liveId}`),
          fetchStagePlot(liveId),
          fetchVenueForm(liveId),
          apiClient.get<{ role: string }>(`/tenants/get/${tenantId}`),
        ]);
        if (cancelled || !liveRes || !plotRes) return;
        setLive(liveRes);
        setStagePlot(plotRes);
        setDraft(toDraft(plotRes));
        setVenueAssets(venueRes.assets);
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
      const response = await saveStagePlot(liveId, draft);
      if (response) setStagePlot(response);
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
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to={`/tenants/${tenantId}/lives/${liveId}`}><ChevronLeft className="size-4" />戻る</Link></Button>
          <div>
            <h1 className="text-lg font-semibold">ステージ設定</h1>
            <p className="text-xs text-muted-foreground">{live.name}</p>
          </div>
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setCopyOpen(true)}><CopyPlus className="size-4" />他のライブから取り込む</Button>
            <Button size="sm" className="gap-1" onClick={handleSave} disabled={save.isRunning}>
              {save.isRunning ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}保存
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">下絵</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StageBaseSection liveId={liveId} stagePlot={stagePlot} venueAssets={venueAssets} canEdit={isAdmin} onChanged={setStagePlot} />
          {!stagePlot.base ? (
            <div className="flex items-center gap-2">
              <Label htmlFor="stage-aspect" className="text-xs">ステージの横縦比（幅 ÷ 高さ）</Label>
              <Input id="stage-aspect" type="number" step={0.1} min={0.2} max={5} value={draft.aspectRatio} disabled={!isAdmin}
                onChange={(event) => setDraft({ ...draft, aspectRatio: Number(event.target.value) || DEFAULT_ASPECT_RATIO })} className="h-8 w-24" />
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
          <StagePlotCanvas palette={draft.palette} iconScale={draft.iconScale} aspectRatio={aspectRatio} baseUrl={baseUrl} items={sampleItems} />
        </CardContent>
      </Card>

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

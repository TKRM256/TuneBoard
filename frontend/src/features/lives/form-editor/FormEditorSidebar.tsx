import { useState } from 'react';
import { CopyPlus, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { FormConfigCopyDialog } from '../copy/FormConfigCopyDialog';
import { createEmptySettingSheetConfig, type SettingSheetConfigResponse } from '../types/live-types';

/** フォーム全体の設定（タイトル・送信ボタン・説明・取り込み）。保存はページ下の保存バーで行う。 */
interface FormEditorSidebarProps {
  liveId: string;
  config: SettingSheetConfigResponse;
  setConfig: React.Dispatch<React.SetStateAction<SettingSheetConfigResponse | null>>;
  onResetToDefault: () => void;
}

export const FormEditorSidebar = ({
  liveId,
  config,
  setConfig,
  onResetToDefault,
}: FormEditorSidebarProps) => {
  const [isCopyOpen, setIsCopyOpen] = useState(false);

  return (
    <Card data-tour="form-settings">
      <CardHeader>
        <h2 className="text-lg font-semibold">フォーム全体の設定</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setIsCopyOpen(true)} data-tour="form-copy">
          <CopyPlus className="size-4" />
          他のライブから取り込む
        </Button>
        <div>
          <p className="text-sm font-medium">フォームタイトル</p>
          <Input value={config.title} onChange={(event) => setConfig((current) => current ? { ...current, title: event.target.value } : current)} className="mt-2" />
        </div>
        <div>
          <p className="text-sm font-medium">送信ボタン文言</p>
          <Input value={config.submitButtonLabel} onChange={(event) => setConfig((current) => current ? { ...current, submitButtonLabel: event.target.value } : current)} className="mt-2" />
        </div>
        <div>
          <p className="text-sm font-medium">フォーム説明</p>
          <Textarea value={config.description} onChange={(event) => setConfig((current) => current ? { ...current, description: event.target.value } : current)} rows={4} className="mt-2" />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onResetToDefault}>
            <RotateCcw className="size-4" />
            初期値に戻す
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfig((current) => current
              ? { ...createEmptySettingSheetConfig(), title: current.title, description: current.description, submitButtonLabel: current.submitButtonLabel }
              : createEmptySettingSheetConfig())}
          >
            <RotateCcw className="size-4" />
            空から作る
          </Button>
        </div>
      </CardContent>

      <FormConfigCopyDialog
        open={isCopyOpen}
        onOpenChange={setIsCopyOpen}
        currentLiveId={liveId}
        currentConfig={config}
        onApply={(nextConfig) => setConfig(nextConfig)}
      />
    </Card>
  );
};

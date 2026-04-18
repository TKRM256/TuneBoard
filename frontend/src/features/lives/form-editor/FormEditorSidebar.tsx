import { ChevronLeft, RotateCcw, Save, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { createEmptySettingSheetConfig, type SettingSheetConfigResponse } from '../types/live-types';

interface FormEditorSidebarProps {
  tenantId: string;
  liveId: string;
  config: SettingSheetConfigResponse;
  isSaving: boolean;
  setConfig: React.Dispatch<React.SetStateAction<SettingSheetConfigResponse | null>>;
  onResetToDefault: () => void;
  onSave: () => void;
}

export const FormEditorSidebar = ({
  tenantId,
  liveId,
  config,
  isSaving,
  setConfig,
  onResetToDefault,
  onSave,
}: FormEditorSidebarProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="size-5" />
            <div>
              <h1 className="text-xl font-semibold">ライブフォーム作成</h1>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to={`/tenants/${tenantId}/lives/${liveId}`}>
              <ChevronLeft className="size-4" />
              ライブ管理へ戻る
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Card>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onResetToDefault}>
                <RotateCcw className="size-4" />
                初期値に戻す
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfig((current) => current
                  ? { ...createEmptySettingSheetConfig(), title: current.title, description: current.description, submitButtonLabel: current.submitButtonLabel }
                  : createEmptySettingSheetConfig())}
              >
                <RotateCcw className="size-4" />
                空から作る
              </Button>
            </div>
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
          </CardContent>
        </Card>

        <Button type="button" onClick={onSave} disabled={isSaving} className="w-full">
          <Save className="size-4" />
          {isSaving ? '保存中...' : 'フォーム設定を保存'}
        </Button>
      </CardContent>
    </Card>
  );
};

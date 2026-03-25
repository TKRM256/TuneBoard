import { ChevronLeft, RotateCcw, Save, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { AddBlockMenu } from './AddBlockMenu';
import { collectRecordLabelCandidates, createBlockTemplate, createEmptySettingSheetConfig, normalizeSettingSheetConfig, type SettingSheetConfigResponse } from '../types/type';

interface FormEditorSidebarProps {
  tenantId: string;
  liveId: string;
  config: SettingSheetConfigResponse;
  isSaving: boolean;
  addableBlocks: Array<{ value: 'SECTION' | 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'CHECKBOX' | 'BOOLEAN' | 'REPEATABLE_GROUP'; label: string }>;
  setConfig: React.Dispatch<React.SetStateAction<SettingSheetConfigResponse | null>>;
  onResetToDefault: () => void;
  onSave: () => void;
}

export const FormEditorSidebar = ({
  tenantId,
  liveId,
  config,
  isSaving,
  addableBlocks,
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
        <Accordion type="multiple" defaultValue={['form']} className="w-full space-y-3">
          <AccordionItem value="form" className="rounded-2xl border px-4">
            <AccordionTrigger className="py-3 text-sm hover:no-underline">フォーム全体設定</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex flex-wrap gap-2">
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
              <div>
                <p className="text-sm font-medium">レコード表示項目</p>
                <p className="mt-1 text-xs text-muted-foreground">提出一覧や共有ページで各レコードの見出しとして表示する項目を選択します。</p>
                <Select
                  value={config.recordLabelFieldId || '__none__'}
                  onValueChange={(value) => setConfig((current) => current ? { ...current, recordLabelFieldId: value === '__none__' ? '' : value } : current)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="未設定（最初の回答値を使用）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">未設定（最初の回答値を使用）</SelectItem>
                    {collectRecordLabelCandidates(config.blocks).map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>{candidate.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {addableBlocks.length > 0 ? (
            <AccordionItem value="add" className="rounded-2xl border px-4">
              <AccordionTrigger className="py-3 text-sm hover:no-underline">ブロックを追加</AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <AddBlockMenu
                  options={addableBlocks}
                  onSelect={(type) => setConfig((current) => current ? normalizeSettingSheetConfig({ ...current, blocks: [...current.blocks, createBlockTemplate(type)] }) : current)}
                  buttonLabel="追加する種類を選ぶ"
                  fullWidth
                />
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>

        <Button type="button" onClick={onSave} disabled={isSaving} className="w-full">
          <Save className="size-4" />
          {isSaving ? '保存中...' : 'フォーム設定を保存'}
        </Button>
      </CardContent>
    </Card>
  );
};

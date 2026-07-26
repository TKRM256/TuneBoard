/** 他ライブのフォーム設定を確認しながら取り込むダイアログ。 */
import { useMemo, useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { LiveCopySourceResponse, SettingSheetConfigResponse } from '../types/live-types';
import { CopyChecklist, type CopyChecklistItem } from './CopyChecklist';
import { CopySourcePicker } from './CopySourcePicker';
import { fetchLiveSettingSheetConfig } from './copy-api';
import {
  applyFormConfigCopy,
  buildFormConfigCopyPlan,
  defaultSelectedBlockIds,
  type FormConfigCopyPlan,
  type FormMetaKey,
} from './form-config-copy';
import { useCopySources } from './useCopySources';

interface FormConfigCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLiveId: string;
  currentConfig: SettingSheetConfigResponse;
  onApply: (config: SettingSheetConfigResponse) => void;
}

const STATUS_BADGES = {
  new: { label: '追加', variant: 'default' as const },
  overwrite: { label: '上書き', variant: 'secondary' as const },
  conflict: { label: 'ID重複', variant: 'destructive' as const },
};

export const FormConfigCopyDialog = ({
  open,
  onOpenChange,
  currentLiveId,
  currentConfig,
  onApply,
}: FormConfigCopyDialogProps) => {
  const { sources, isLoading } = useCopySources(open, currentLiveId);
  const [source, setSource] = useState<LiveCopySourceResponse | null>(null);
  const [sourceConfig, setSourceConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [plan, setPlan] = useState<FormConfigCopyPlan | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [selectedMetaKeys, setSelectedMetaKeys] = useState<Set<FormMetaKey>>(new Set());
  const [isFetching, setIsFetching] = useState(false);

  const reset = () => {
    setSource(null);
    setSourceConfig(null);
    setPlan(null);
    setSelectedBlockIds(new Set());
    setSelectedMetaKeys(new Set());
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const handleSelectSource = (next: LiveCopySourceResponse) => {
    setIsFetching(true);
    fetchLiveSettingSheetConfig(next.id)
      .then((config) => {
        const nextPlan = buildFormConfigCopyPlan(currentConfig, config);
        setSource(next);
        setSourceConfig(config);
        setPlan(nextPlan);
        setSelectedBlockIds(defaultSelectedBlockIds(nextPlan));
        setSelectedMetaKeys(new Set());
      })
      .catch(() => {
        toast.error('取り込み元のフォーム設定を取得できませんでした', { position: 'top-center' });
      })
      .finally(() => {
        setIsFetching(false);
      });
  };

  const blockItems = useMemo<CopyChecklistItem[]>(
    () =>
      (plan?.blocks ?? []).map((entry) => ({
        key: entry.blockId,
        title: entry.label,
        subtitle: entry.typeLabel,
        badge: STATUS_BADGES[entry.status],
        detail: entry.childLabels.length > 0 ? `含まれる項目: ${entry.childLabels.join(' / ')}` : undefined,
        selectable: entry.selectable,
        note: entry.status === 'conflict'
          ? '同じIDの項目が現在のフォームの入れ子内にあるため取り込めません。'
          : undefined,
      })),
    [plan],
  );

  const metaItems = useMemo<CopyChecklistItem[]>(
    () =>
      (plan?.meta ?? [])
        .filter((entry) => entry.changed)
        .map((entry) => ({
          key: entry.key,
          title: entry.label,
          diff: { before: entry.currentValue, after: entry.sourceValue },
          selectable: true,
        })),
    [plan],
  );

  const toggleBlock = (key: string) => {
    setSelectedBlockIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleMeta = (key: string) => {
    setSelectedMetaKeys((current) => {
      const next = new Set(current);
      if (next.has(key as FormMetaKey)) {
        next.delete(key as FormMetaKey);
      } else {
        next.add(key as FormMetaKey);
      }
      return next;
    });
  };

  const selectedCount = selectedBlockIds.size + selectedMetaKeys.size;

  const handleApply = () => {
    if (!sourceConfig) {
      return;
    }
    onApply(applyFormConfigCopy(currentConfig, sourceConfig, selectedBlockIds, selectedMetaKeys));
    toast.success('取り込みました。内容を確認して保存してください。', { position: 'top-center' });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>他のライブからフォーム設定を取り込む</DialogTitle>
          <DialogDescription>
            {plan
              ? `${source?.name} の設定です。取り込む項目を選んでください。反映後はまだ保存されていません。`
              : '取り込み元のライブを選んでください。'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto">
          {plan ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">ブロック</p>
                <CopyChecklist
                  items={blockItems}
                  selected={selectedBlockIds}
                  onToggle={toggleBlock}
                  emptyMessage="取り込めるブロックがありません。"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">フォーム全体の設定</p>
                <CopyChecklist
                  items={metaItems}
                  selected={selectedMetaKeys as Set<string>}
                  onToggle={toggleMeta}
                  emptyMessage="現在の設定と違いはありません。"
                />
              </div>
            </div>
          ) : (
            <CopySourcePicker
              sources={sources}
              isLoading={isLoading || isFetching}
              selectedId={null}
              onSelect={handleSelectSource}
              isAvailable={(candidate) => candidate.hasSettingSheetConfig}
              unavailableLabel="フォーム設定なし"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {plan ? (
            <Button type="button" variant="ghost" onClick={reset}>
              <ChevronLeft className="size-4" />
              ライブを選び直す
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              キャンセル
            </Button>
            {plan ? (
              <Button type="button" onClick={handleApply} disabled={selectedCount === 0}>
                {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
                {selectedCount}件を反映
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

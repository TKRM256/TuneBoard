import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

import { BlockEditorTree } from './form-editor/BlockEditorTree';
import { FormEditorSidebar } from './form-editor/FormEditorSidebar';
import {
  collectOptionSourceCandidates,
  convertBlockForType,
  insertChildBlock,
  moveBlockTree,
  removeBlockTree,
  updateBlockTree,
} from './form-editor/utils';
import {
  canAddBlock,
  canContainBlocks,
  createBlockTemplate,
  isOptionBlock,
  isTextBlock,
  normalizeSettingSheetConfig,
  SETTING_SHEET_BLOCK_OPTIONS,
  type LiveResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetOptionSource,
} from './types/type';

export const LiveFormEditorPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!liveId) {
      return;
    }

    Promise.all([
      apiClient.get<LiveResponse>(`/lives/${liveId}`),
      apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
    ])
      .then(([liveResponse, configResponse]) => {
        if (liveResponse) {
          setLive(liveResponse);
        }
        setConfig(normalizeSettingSheetConfig(configResponse ?? null));
      })
      .catch(() => {
        toast.error('フォーム設定の読み込みに失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [liveId]);

  const addableBlocks = useMemo(
    () => (config ? SETTING_SHEET_BLOCK_OPTIONS.filter((option) => canAddBlock(config, option.value)) : []),
    [config],
  );
  const optionSourceCandidates = useMemo(
    () => collectOptionSourceCandidates(config?.blocks ?? []),
    [config?.blocks],
  );

  if (!tenantId || !liveId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">フォーム設定を読み込み中です...</div>;
  }

  if (!live || !config) {
    return <Navigate to={`/tenants/${tenantId}/lives`} replace />;
  }

  const updateBlock = (blockId: string, patch: Partial<SettingSheetBlock>) => {
    setConfig((current) => current ? {
      ...current,
      blocks: updateBlockTree(current.blocks, blockId, (block) => {
        const nextBlock = { ...block, ...patch };
        if (nextBlock.type === 'SECTION') {
          return {
            ...nextBlock,
            required: false,
            collapsible: false,
            itemAppearance: 'plain',
            options: [],
            minItems: 0,
            addButtonLabel: '',
            entryTitle: '',
            titleSourceFieldId: '',
            optionSource: null,
          };
        }
        if (isTextBlock(nextBlock.type)) {
          return {
            ...nextBlock,
            collapsible: false,
            itemAppearance: 'plain',
            options: [],
            minItems: 0,
            addButtonLabel: '',
            entryTitle: '',
            titleSourceFieldId: '',
            fields: [],
            optionSource: null,
          };
        }
        if (isOptionBlock(nextBlock.type)) {
          return {
            ...nextBlock,
            collapsible: false,
            itemAppearance: 'plain',
            minItems: 0,
            addButtonLabel: '',
            entryTitle: '',
            titleSourceFieldId: '',
            fields: [],
          };
        }
        if (nextBlock.type === 'BOOLEAN') {
          return {
            ...nextBlock,
            collapsible: false,
            itemAppearance: 'plain',
            options: [],
            minItems: 0,
            addButtonLabel: '',
            entryTitle: '',
            titleSourceFieldId: '',
            fields: [],
            optionSource: null,
          };
        }
        return { ...nextBlock, options: [], optionSource: null };
      }),
    } : current);
  };

  const applyAppearanceToGroupFields = (blockId: string, appearance: SettingSheetBlock['appearance']) => {
    setConfig((current) => current ? {
      ...current,
      blocks: updateBlockTree(current.blocks, blockId, (block) => {
        if (!canContainBlocks(block.type)) {
          return block;
        }
        return {
          ...block,
          fields: block.fields.map((field) => ({ ...field, appearance })),
        };
      }),
    } : current);
  };

  const saveConfig = () => {
    setIsSaving(true);
    apiClient
      .post<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`, config)
      .then((response) => {
        if (!response) {
          return;
        }
        setConfig(normalizeSettingSheetConfig(response));
        toast.success('フォーム設定を保存しました', { position: 'top-center' });
      })
      .catch(() => {
        toast.error('フォーム設定の保存に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const resetToDefault = () => {
    apiClient.get<SettingSheetConfigResponse>('/lives/setting-sheet/config/default')
      .then((response) => {
        if (!response) {
          return;
        }
        setConfig(normalizeSettingSheetConfig(response));
        toast.success('初期値に戻しました', { position: 'top-center' });
      })
      .catch(() => {
        toast.error('初期値の取得に失敗しました', { position: 'top-center' });
      });
  };

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tenants">テナント一覧</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/tenants/${tenantId}/lives`}>{live.tenantName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/tenants/${tenantId}/lives/${liveId}`}>{live.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>ライブフォーム作成</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <FormEditorSidebar
            tenantId={tenantId}
            liveId={liveId}
            config={config}
            isSaving={isSaving}
            addableBlocks={addableBlocks}
            setConfig={setConfig}
            onResetToDefault={resetToDefault}
            onSave={saveConfig}
          />
        </aside>

        <Card>
          <CardHeader>
            <div>
              <h2 className="text-lg font-semibold">ブロック構成</h2>
              <p className="text-sm text-muted-foreground">並び順、見た目、必須設定、入れ子構造をここで調整します。</p>
            </div>
          </CardHeader>
          <CardContent>
            <BlockEditorTree
              blocks={config.blocks}
              rootBlocks={config.blocks}
              optionSourceCandidates={optionSourceCandidates}
              mainDisplayFieldId={config.recordLabelFieldId}
              onMove={(parentId, blockIndex, direction) => setConfig((current) => current ? { ...current, blocks: moveBlockTree(current.blocks, parentId, blockIndex, direction) } : current)}
              onRemove={(blockId) => setConfig((current) => current ? { ...current, blocks: removeBlockTree(current.blocks, blockId) } : current)}
              onInsert={(parentId, insertIndex, type) => setConfig((current) => current ? normalizeSettingSheetConfig({ ...current, blocks: insertChildBlock(current.blocks, parentId, insertIndex, createBlockTemplate(type)) }) : current)}
              onUpdateBlock={updateBlock}
              onChangeType={(blockId, nextType) => setConfig((current) => current ? normalizeSettingSheetConfig({ ...current, blocks: updateBlockTree(current.blocks, blockId, (block) => convertBlockForType(block, nextType)) }) : current)}
              onApplyGroupAppearance={applyAppearanceToGroupFields}
              onUpdateOptionSource={(blockId, source) => updateBlock(blockId, { optionSource: source as SettingSheetOptionSource | null })}
              onSetMainDisplayFieldId={(fieldId) => setConfig((current) => current ? { ...current, recordLabelFieldId: fieldId } : current)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

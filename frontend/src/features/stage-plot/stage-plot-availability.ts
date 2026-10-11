/** ステージ設定（アイコンの一覧）が無いライブでは、配置図の欄を出しても入力できないので隠す。 */
import type { SettingSheetBlock, SettingSheetConfigResponse } from '@/features/lives/types/live-types';

import type { PublicStagePlot } from './stage-plot-types';

export function hideUnavailableStagePlots(
  config: SettingSheetConfigResponse,
  stagePlot: PublicStagePlot | null | undefined,
): SettingSheetConfigResponse {
  if (stagePlot && stagePlot.palette.length > 0) {
    return config;
  }
  return { ...config, blocks: config.blocks.map(hideInBlock) };
}

function hideInBlock(block: SettingSheetBlock): SettingSheetBlock {
  if (block.type === 'STAGE_PLOT') {
    return { ...block, hidden: true };
  }
  return {
    ...block,
    fields: block.fields.map(hideInBlock),
    variants: block.variants?.map((variant) => ({ ...variant, fields: variant.fields.map(hideInBlock) })),
  };
}

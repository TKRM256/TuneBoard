/** 配置図の入力欄に、ライブのステージ設定（アイコンの一覧と下絵）を渡す。
 *  フォームの描画はブロックごとに再帰するので、props で渡す代わりに Context を使う。 */
import { createContext, useContext } from 'react';

import type { PublicStagePlot } from './stage-plot-types';

interface StagePlotContextValue {
  settings: PublicStagePlot | null;
  /** 下絵の画像の URL。下絵が無ければ null */
  baseUrl: string | null;
}

const StagePlotContext = createContext<StagePlotContextValue>({ settings: null, baseUrl: null });

export function StagePlotProvider({ settings, baseUrl, children }: StagePlotContextValue & { children: React.ReactNode }) {
  return <StagePlotContext.Provider value={{ settings, baseUrl }}>{children}</StagePlotContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStagePlotSettings() {
  return useContext(StagePlotContext);
}

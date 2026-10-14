/** 選択肢の印を、選択肢ごとに順にクリックして置いていく流れ。1 つ置くごとに元に戻すの 1 回分になる。 */
import { useState } from 'react';
import { toast } from 'sonner';

import type { SnapBox } from '../../canvas-shared/snapping';
import type { VenueFormEditor } from '../useVenueFormEditor';
import { createMarker, markerSteps, type MarkerConfig, type MarkerStep } from './choice-markers';

interface Session {
  config: MarkerConfig;
  steps: MarkerStep[];
  index: number;
  /** 選択肢ごとに置いた要素の ID（飛ばしたものは null） */
  placed: (string | null)[];
}

export function useChoiceMarkers(editor: VenueFormEditor, onEnd: () => void) {
  const [session, setSession] = useState<Session | null>(null);

  const finish = (current: Session | null) => {
    const count = current?.placed.filter(Boolean).length ?? 0;
    if (count > 0) toast.success(`${count}個の印を置きました`, { position: 'bottom-center', duration: 1500 });
    setSession(null);
    onEnd();
  };

  const advance = (current: Session, placedId: string | null) => {
    const next = { ...current, index: current.index + 1, placed: [...current.placed, placedId] };
    if (next.index >= next.steps.length) finish(next);
    else setSession(next);
  };

  return {
    session,
    step: session ? session.steps[session.index] : null,
    start: (config: MarkerConfig) => setSession({ config, steps: markerSteps(config), index: 0, placed: [] }),
    place: (box: SnapBox) => {
      const page = editor.currentPage;
      if (!session || !page) return;
      const marker = createMarker(session.config, box, page.id, session.steps[session.index].condition);
      editor.addElements([marker]);
      advance(session, marker.id);
    },
    skip: () => {
      if (session) advance(session, null);
    },
    /** 1 つ前の選択肢に戻る。そこで置いた印は消す */
    back: () => {
      if (!session || session.index === 0) return;
      const lastId = session.placed[session.placed.length - 1];
      if (lastId) editor.removeElements([lastId]);
      setSession({ ...session, index: session.index - 1, placed: session.placed.slice(0, -1) });
    },
    finish: () => finish(session),
  };
}

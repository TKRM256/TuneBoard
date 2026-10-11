/** あてふり補助のうち、エディタに置く部品（書式の上に重ねるレイヤー・案内バー・ダイアログ）。 */
import type { FieldCatalog } from '../../canvas-shared/field-catalog';
import { MarkerGuide } from './MarkerGuide';
import { MarkerPlaceLayer } from './MarkerPlaceLayer';
import { MarkerSetupDialog } from './MarkerSetupDialog';
import { RegionSelectLayer } from './RegionSelectLayer';
import { TableFromRegionDialog } from './TableFromRegionDialog';
import type { useVenueAssist } from './useVenueAssist';

type Assist = ReturnType<typeof useVenueAssist>;

/** 書式の上に重ねて、範囲や印の場所を受け取るレイヤー。道具を使っていなければ何も出さない。 */
export function AssistCanvasLayer({ assist, pxPerMm }: { assist: Assist; pxPerMm: number }) {
  if (assist.tool === 'table') {
    return <RegionSelectLayer pxPerMm={pxPerMm} onSelect={assist.selectTableRegion} onCancel={() => assist.setTool('none')} />;
  }
  const session = assist.markers.session;
  if (assist.tool === 'marker' && session) {
    return <MarkerPlaceLayer pxPerMm={pxPerMm} kind={session.config.kind} lines={assist.lines} onPlace={assist.markers.place} />;
  }
  return null;
}

/** 印を置いている間、書式の上部に出す案内。 */
export function AssistGuide({ assist }: { assist: Assist }) {
  const { session, step } = assist.markers;
  if (!session || !step) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
      <MarkerGuide
        label={step.label}
        index={session.index}
        total={session.steps.length}
        onBack={assist.markers.back}
        onSkip={assist.markers.skip}
        onFinish={assist.markers.finish}
      />
    </div>
  );
}

export function AssistDialogs({ assist, catalog }: { assist: Assist; catalog: FieldCatalog }) {
  return (
    <>
      <TableFromRegionDialog grid={assist.pendingGrid} catalog={catalog} onCreate={assist.createTable} onClose={assist.closeTableDialog} />
      <MarkerSetupDialog open={assist.markerSetupOpen} targets={assist.markerTargets} onStart={assist.startMarkers} onClose={assist.closeMarkerSetup} />
    </>
  );
}

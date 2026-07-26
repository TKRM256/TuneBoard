/**
 * 既定フォーム向けの表の列構成。
 *
 * 出演者は「氏名（代表者なら注記付き）／担当パート」、セットリストは
 * 「曲名 or MC／使うパート／使うマイク／各備考」で読めるようにする。
 * これらは既定フォームのブロックIDを手掛かりに組み立て、
 * 見つからない項目は列から落とすので、作り替えたフォームでも壊れない。
 */
import type { TableColumn } from './canvas-schema';
import type { CatalogEntry, CatalogGroup } from './field-catalog';

// default-canvas.ts と相互参照になるのを避けるため、ここでも同じ生成規則を持つ。
function newId(): string {
  return crypto.randomUUID();
}

/** 既定フォーム（SettingSheetConfigService.defaultSettingSheetConfig）のブロックID。 */
const STANDARD = {
  members: 'members',
  memberName: 'member-name',
  memberRepresentative: 'member-representative',
  memberParts: 'member-parts',
  setlist: 'setlist',
  song: 'song',
  songParts: 'song-parts',
  songMics: 'song-mics',
  mcMics: 'mc-mics',
  songNotePa: 'song-note-pa',
  songNoteLight: 'song-note-light',
  songNoteOther: 'song-note-other',
  mcVariant: 'mc-entry',
} as const;

export function indexColumn(widthRatio: number): TableColumn {
  return { id: newId(), header: 'No', fieldId: '__index__', widthRatio, align: 'center' };
}

/** 既定フォームの構成に当てはまるときだけ、専用の列構成を返す。 */
export function buildStandardGroupColumns(group: CatalogGroup): TableColumn[] | null {
  if (group.id === STANDARD.members) {
    return buildMemberColumns(group);
  }
  if (group.id === STANDARD.setlist) {
    return buildSetlistColumns(group);
  }
  return null;
}

function buildMemberColumns(group: CatalogGroup): TableColumn[] | null {
  const name = findField(group, STANDARD.memberName);
  const parts = findField(group, STANDARD.memberParts);
  if (!name || !parts) {
    return null;
  }

  const representative = findField(group, STANDARD.memberRepresentative);
  const nameFormat = representative
    ? `\${item.field('${name.id}').value}\${item.field('${representative.id}').value == 'true' ? '(代表者)' : ''}`
    : undefined;

  return [
    indexColumn(0.1),
    { id: newId(), header: name.label, fieldId: name.id, widthRatio: 0.4, align: 'left', format: nameFormat },
    { id: newId(), header: parts.label, fieldId: parts.id, widthRatio: 0.5, align: 'left' },
  ];
}

function buildSetlistColumns(group: CatalogGroup): TableColumn[] | null {
  const song = findField(group, STANDARD.song);
  if (!song) {
    return null;
  }

  const columns: TableColumn[] = [indexColumn(0.05)];
  columns.push({
    id: newId(),
    header: '曲 / MC',
    fieldId: song.id,
    widthRatio: 0.2,
    align: 'left',
    format: songOrMcExpression(group, song),
  });

  const parts = findField(group, STANDARD.songParts);
  if (parts) {
    columns.push({ id: newId(), header: parts.label, fieldId: parts.id, widthRatio: 0.17, align: 'left' });
  }

  const micFormat = micExpression(group);
  if (micFormat) {
    columns.push({ id: newId(), header: '使うマイク', fieldId: '', widthRatio: 0.16, align: 'left', format: micFormat });
  }

  for (const noteId of [STANDARD.songNotePa, STANDARD.songNoteLight, STANDARD.songNoteOther]) {
    const note = findField(group, noteId);
    if (note) {
      columns.push({ id: newId(), header: note.label, fieldId: note.id, widthRatio: 0.14, align: 'left' });
    }
  }

  return normalizeWidths(columns);
}

/** 曲の項目は曲名を、MCの項目は「MC」と出す。 */
function songOrMcExpression(group: CatalogGroup, song: CatalogEntry): string {
  const songTitle = `item.field('${song.id}').values[0]`;
  const mcVariant = group.variants.find((variant) => variant.id === STANDARD.mcVariant);
  return mcVariant
    ? `\${item.variant == '${mcVariant.id}' ? 'MC' : ${songTitle}}`
    : `\${${songTitle}}`;
}

/**
 * 曲とMCで別のマイク欄を使うので、項目の種類で切り替えて 1 列にまとめる。
 * メインボーカルの担当者には (メイン) を付け、担当者ごとに改行する。
 */
function micExpression(group: CatalogGroup): string | null {
  const songMics = joinMicMembers(group.childGroups.find((child) => child.id === STANDARD.songMics));
  const mcMics = joinMicMembers(group.childGroups.find((child) => child.id === STANDARD.mcMics));
  const mcVariant = group.variants.find((variant) => variant.id === STANDARD.mcVariant);

  if (songMics && mcMics && mcVariant) {
    return `\${item.variant == '${mcVariant.id}' ? ${mcMics} : ${songMics}}`;
  }
  const only = songMics ?? mcMics;
  return only ? `\${${only}}` : null;
}

function joinMicMembers(micGroup: CatalogGroup | undefined): string | null {
  if (!micGroup) {
    return null;
  }
  const member = micGroup.fields.find((field) => field.type !== 'BOOLEAN');
  if (!member) {
    return null;
  }
  const mainVocal = micGroup.fields.find((field) => field.type === 'BOOLEAN');
  const mark = mainVocal ? ` + (m.field('${mainVocal.id}').value == 'true' ? '(メイン)' : '')` : '';
  return `mapJoin(item.group('${micGroup.id}').items, (m) -> m.field('${member.id}').value${mark}, '\\n')`;
}

function findField(group: CatalogGroup, fieldId: string): CatalogEntry | undefined {
  return group.fields.find((field) => field.id === fieldId);
}

/** 列を落とした分だけ幅が余るので、合計が 1 になるようにならす。 */
function normalizeWidths(columns: TableColumn[]): TableColumn[] {
  const total = columns.reduce((sum, column) => sum + column.widthRatio, 0);
  if (total <= 0) {
    return columns;
  }
  return columns.map((column) => ({ ...column, widthRatio: column.widthRatio / total }));
}

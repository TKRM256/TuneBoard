/** 提出内容を表示するときの日時・回答の書き方。 */
import { summarizeStagePlot } from '@/features/stage-plot/stage-plot-types';
import type { ItunesLinkSelection, SettingSheetBlock, SettingSheetSubmissionAnswerResponse } from '../types/live-types';

export function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatAnswerValue(values: string[], blockType: SettingSheetBlock['type']) {
  if (values.length === 0) {
    return '未入力';
  }
  if (blockType === 'BOOLEAN') {
    return values[0] === 'true' ? 'はい' : values[0] === 'false' ? 'いいえ' : values.join(' / ');
  }
  if (blockType === 'STAGE_PLOT') {
    return summarizeStagePlot(values[0]) || '未入力';
  }
  return values.join(' / ');
}

export function resolveItemTitle(block: SettingSheetBlock, itemAnswers: SettingSheetSubmissionAnswerResponse[], itemIndex: number) {
  if (block.titleSourceFieldId) {
    const source = itemAnswers.find((a) => a.fieldId === block.titleSourceFieldId);
    if (source && source.values.length > 0 && source.values[0].trim()) {
      return source.values[0].trim();
    }
  }
  return `${block.entryTitle || block.label} ${itemIndex + 1}`;
}


const songKey = (title: string | undefined, artist: string | undefined) =>
  `${(title ?? '').trim().toLowerCase()}\u0000${(artist ?? '').trim().toLowerCase()}`;

/** 楽曲の回答（曲名・アーティスト名）に対応する、提出時に iTunes で選んだ曲。 */
export function findSongLink(links: ItunesLinkSelection[], values: string[]) {
  const key = songKey(values[0], values[1]);
  return links.find((link) => songKey(link.songTitle, link.songArtist) === key) ?? null;
}

/** 回答のどの楽曲にも結び付かない iTunes の曲（回答を後から書き換えた場合など）。 */
export function unmatchedSongLinks(links: ItunesLinkSelection[], answers: SettingSheetSubmissionAnswerResponse[]) {
  const answered = new Set<string>();
  const visit = (list: SettingSheetSubmissionAnswerResponse[]) => {
    for (const answer of list) {
      if (answer.values.length > 0) answered.add(songKey(answer.values[0], answer.values[1]));
      for (const item of answer.items ?? []) visit(item.answers);
    }
  };
  visit(answers);
  return links.filter((link) => !answered.has(songKey(link.songTitle, link.songArtist)));
}

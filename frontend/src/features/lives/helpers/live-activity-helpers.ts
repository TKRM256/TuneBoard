/** ライブサマリの「最近のアクティビティ」用の集計とフォーマット。 */
import type { PublicSettingSheetSubmissionDetailResponse } from '../types/live-types';

/** サマリカードに並べるアクティビティの最大件数。 */
export const RECENT_ACTIVITY_LIMIT = 5;

export interface RecentActivity {
  submissionId: string;
  recordLabel: string;
  /** 一度も編集されていなければ新規登録、編集済みなら更新。 */
  kind: 'created' | 'updated';
  /** 並び替えと表示に使う日時。新規なら提出日時、更新済みなら更新日時。 */
  occurredAt: string;
}

/** 更新が古い順に並んだ提出を、新しい順の上位 limit 件に絞る。 */
export function collectRecentActivities(
  details: PublicSettingSheetSubmissionDetailResponse[],
  limit = RECENT_ACTIVITY_LIMIT,
): RecentActivity[] {
  return details
    .map<RecentActivity>((detail) => {
      // version は初回保存時が 0。1 以上なら提出後に編集されている。
      const isUpdated = detail.version > 0;
      return {
        submissionId: detail.id,
        recordLabel: detail.recordLabel,
        kind: isUpdated ? 'updated' : 'created',
        occurredAt: (isUpdated ? detail.updatedAt : detail.submittedAt) || detail.submittedAt,
      };
    })
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relativeFormatter = new Intl.RelativeTimeFormat('ja-JP', { numeric: 'auto' });
const absoluteFormatter = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * 1週間以内は「3時間前」のような相対表記、それより古ければ絶対日時を返す。
 * 古い提出まで相対表記にすると「37日前」のように読み取りづらくなるため。
 */
export function formatActivityTime(value: string, now: Date = new Date()): string {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return '不明';
  }

  const diff = now.getTime() - target.getTime();
  if (diff < MINUTE) {
    return 'たった今';
  }
  if (diff < HOUR) {
    return relativeFormatter.format(-Math.floor(diff / MINUTE), 'minute');
  }
  if (diff < DAY) {
    return relativeFormatter.format(-Math.floor(diff / HOUR), 'hour');
  }
  if (diff < 7 * DAY) {
    return relativeFormatter.format(-Math.floor(diff / DAY), 'day');
  }

  return absoluteFormatter.format(target);
}

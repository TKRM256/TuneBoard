/** 提出確認の画面の中で、1 件の提出内容を読む。一覧の代わりに表示し、前後の提出へ送れる。 */
import { Music } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { approxMinutes } from '@/features/setting-sheet/helpers/itunes-duration';

import {
  type ItunesLinkSelection,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionAnswerResponse,
} from '../types/live-types';
import { AdminAnswersEditor } from '../admin-answers/AdminAnswersEditor';
import { unmatchedSongLinks } from '../helpers/submission-detail-helpers';
import { SubmissionAnswers } from './SubmissionAnswers';

interface Props {
  detail: PublicSettingSheetSubmissionDetailResponse;
  config: SettingSheetConfigResponse | null;
  /** 管理者入力の欄を出すときに渡す（管理者でなければ渡さない） */
  adminAnswers?: {
    liveId: string;
    blocks: SettingSheetBlock[];
    onSaved: (submissionId: string, answers: SettingSheetSubmissionAnswerResponse[]) => void;
  };
}

export function SubmissionDetailView({ detail, config, adminAnswers }: Props) {
  // 楽曲の回答に結び付いた曲は、その行にジャケットごと出す。ここには残りだけ並べる
  const otherLinks = config ? unmatchedSongLinks(detail.itunesLinks, detail.answers) : detail.itunesLinks;
  return (
    <div className="space-y-4">
      {adminAnswers && adminAnswers.blocks.length > 0 ? (
        <Card className="px-4 py-4 sm:px-6">
          <AdminAnswersEditor
            key={detail.id}
            liveId={adminAnswers.liveId}
            detail={detail}
            blocks={adminAnswers.blocks}
            onSaved={adminAnswers.onSaved}
          />
        </Card>
      ) : null}
      <Card className="px-4 py-5 sm:px-6 sm:py-6" data-testid="submission-detail">
        {config ? <SubmissionAnswers blocks={config.blocks} answers={detail.answers} path={detail.id} links={detail.itunesLinks} /> : null}
      </Card>
      {otherLinks.length > 0 ? (
        <Card className="space-y-3 px-4 py-5 sm:px-6">
          <h3 className="text-base font-semibold">曲の情報</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {otherLinks.map((link) => (
              <ItunesLinkRow key={`${link.songTitle}-${link.songArtist}`} link={link} />
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function ItunesLinkRow({ link }: { link: ItunesLinkSelection }) {
  const minutes = approxMinutes(link.itunesDurationMs);
  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      {link.itunesAlbumArtUrl ? (
        <img src={link.itunesAlbumArtUrl} alt="" className="size-12 shrink-0 rounded" />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
          <Music className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{link.songTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{link.songArtist}</p>
        {link.itunesTitle && link.itunesTitle !== link.songTitle ? (
          <p className="truncate text-xs text-muted-foreground">iTunes: {link.itunesTitle} — {link.itunesArtist}</p>
        ) : null}
        {minutes != null ? <p className="text-xs text-muted-foreground">演奏時間の目安 {minutes}分</p> : null}
      </div>
    </li>
  );
}

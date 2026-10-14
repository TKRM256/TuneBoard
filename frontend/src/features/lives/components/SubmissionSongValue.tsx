/** 提出内容の楽曲の回答。iTunes で選んだ曲があれば、ジャケットと演奏時間の目安を添える。 */
import { approxMinutes } from '@/features/setting-sheet/helpers/itunes-duration';

import type { ItunesLinkSelection } from '../types/live-types';

export function SubmissionSongValue({ values, link }: { values: string[]; link: ItunesLinkSelection | null }) {
  const [title, artist] = values;
  const minutes = approxMinutes(link?.itunesDurationMs);
  return (
    <div className="flex items-center gap-3">
      {link?.itunesAlbumArtUrl ? (
        <img src={link.itunesAlbumArtUrl} alt="" className="size-12 shrink-0 rounded" loading="lazy" />
      ) : null}
      <div className="min-w-0">
        <p className="wrap-break-word">{title}</p>
        {artist ? <p className="wrap-break-word text-xs text-muted-foreground">{artist}</p> : null}
        {link && link.itunesTitle && (link.itunesTitle !== title || link.itunesArtist !== artist) ? (
          <p className="wrap-break-word text-xs text-muted-foreground">iTunes: {link.itunesTitle} — {link.itunesArtist}</p>
        ) : null}
        {minutes != null ? <p className="text-xs text-muted-foreground">演奏時間の目安 {minutes}分</p> : null}
      </div>
    </div>
  );
}

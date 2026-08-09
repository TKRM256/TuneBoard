import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Music, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ItunesLinkSelection, ItunesTrack } from '@/features/lives/types/live-types';
import { apiClient } from '@/lib/api/client';

interface ItunesTrackSelectorProps {
  selected: ItunesLinkSelection | null;
  onSelect: (link: ItunesLinkSelection | null) => void;
}

export const ItunesTrackSelector = ({ selected, onSelect }: ItunesTrackSelectorProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItunesTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const queryRef = useRef(query);
  queryRef.current = query;

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await apiClient.get<ItunesTrack[]>(`/public/itunes/search?q=${encodeURIComponent(q)}&limit=15`);
      setResults(data ?? []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearDebounceTimeout = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }

  useEffect(() => {
    if (selected || composingRef.current) return;
    clearDebounceTimeout();  
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => {
      clearDebounceTimeout();
    };
  }, [query, selected, search]);

  const handleCompositionEnd = useCallback(() => {
    composingRef.current = false;
    clearDebounceTimeout();
    debounceRef.current = setTimeout(() => search(queryRef.current), 400);
  }, [search]);

  const handleSelect = (track: ItunesTrack) => {
    onSelect({
      songTitle: track.name,
      songArtist: track.artist,
      itunesTrackId: track.id,
      itunesTitle: track.name,
      itunesArtist: track.artist,
      itunesAlbumArtUrl: track.albumArtUrl,
    });
    setQuery('');
    setResults([]);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setResults([]);
  };

  // Selected state: show the chosen track
  if (selected) {
    return (
      <div className="flex min-w-0 w-full items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 p-2 dark:border-green-800 dark:bg-green-950/20">
        {selected.itunesAlbumArtUrl ? (
          <img src={selected.itunesAlbumArtUrl} alt="" className="size-10 rounded" />
        ) : (
          <div className="flex size-10 items-center justify-center rounded bg-muted">
            <Music className="size-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{selected.itunesTitle}</p>
          <p className="truncate text-xs text-muted-foreground">{selected.itunesArtist}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleClear}>
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={handleCompositionEnd}
        placeholder="曲名やアーティスト名で検索..."
        className="h-9 text-base sm:h-8 sm:text-sm"
      />
      <TrackList tracks={results} isSearching={isSearching} hasQuery={!!query.trim()} onSelect={handleSelect} />
    </div>
  );
};

function TrackList({
  tracks,
  isSearching,
  hasQuery,
  onSelect,
}: {
  tracks: ItunesTrack[];
  isSearching: boolean;
  hasQuery: boolean;
  onSelect: (track: ItunesTrack) => void;
}) {
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tracks.length > 0) {
    return (
      <ul className="max-h-[280px] w-full space-y-1 overflow-y-auto">
        {tracks.map((track) => (
          <li key={track.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 overflow-hidden rounded-md p-2 text-left transition-colors hover:bg-accent"
              onClick={() => onSelect(track)}
            >
              {track.albumArtUrl ? (
                <img src={track.albumArtUrl} alt="" className="size-10 shrink-0 rounded" />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
                  <Music className="size-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{track.name}</p>
                <p className="truncate text-xs text-muted-foreground">{track.artist} — {track.album}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (hasQuery) {
    return <p className="py-2 text-center text-sm text-muted-foreground">結果が見つかりませんでした</p>;
  }

  return null;
}

import { useState } from 'react';
import { PenLine, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ItunesLinkSelection, SettingSheetBlock } from '@/features/lives/types/live-types';

import type { SettingSheetFieldValue } from '../types';
import { appearanceClass, fieldWidthClass } from '../helpers/layout-classes';
import { ItunesTrackSelector } from './ItunesTrackSelector';

interface SongBlockFieldProps {
  block: SettingSheetBlock;
  fieldValue: SettingSheetFieldValue;
  inputId: string;
  setScopedAnswer: (blockId: string, value: SettingSheetFieldValue) => void;
  itunesLink: ItunesLinkSelection | null;
  onItunesLinkChange?: (link: ItunesLinkSelection | null) => void;
  error?: string;
}

export const SongBlockField = ({
  block,
  fieldValue,
  inputId,
  setScopedAnswer,
  itunesLink,
  onItunesLinkChange,
  error,
}: SongBlockFieldProps) => {
  const hasInitialValues = (fieldValue.values[0] ?? '').trim().length > 0;
  const [manualMode, setManualMode] = useState(() => hasInitialValues && !itunesLink);
  const title = fieldValue.values[0] ?? '';
  const artist = fieldValue.values[1] ?? '';

  const updateValues = (newTitle: string, newArtist: string) => {
    const values: string[] = [];
    if (newTitle.trim() || newArtist.trim()) {
      values.push(newTitle);
      if (newArtist.trim()) {
        values.push(newArtist);
      }
    }
    setScopedAnswer(block.id, { values, items: [] });
  };

  const handleItunesSelect = (link: ItunesLinkSelection | null) => {
    onItunesLinkChange?.(link);
    if (link) {
      setManualMode(false);
      updateValues(link.itunesTitle, link.itunesArtist);
    } else {
      updateValues('', '');
    }
  };

  const switchToManual = () => {
    setManualMode(true);
    onItunesLinkChange?.(null);
    updateValues('', '');
  };

  const switchToItunes = () => {
    setManualMode(false);
  };

  const hasItunesSelection = !!itunesLink;
  const showItunesSelector = onItunesLinkChange && !manualMode;

  return (
    <section className={`${appearanceClass(block.appearance, 'field')} ${fieldWidthClass(block.layout.width)}`}>
      <Label htmlFor={`${inputId}-title`} className="text-sm font-medium text-foreground">
        {block.label}
        {block.required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {block.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{block.description}</p> : null}

      {showItunesSelector ? (
        <>
          <div className="mt-3">
            <ItunesTrackSelector
              selected={itunesLink}
              onSelect={handleItunesSelect}
            />
          </div>
          {!hasItunesSelection ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 gap-1.5 text-xs text-muted-foreground"
              onClick={switchToManual}
            >
              <PenLine className="size-3" />
              手動で入力
            </Button>
          ) : null}
        </>
      ) : null}

      {manualMode ? (
        <div className="mt-3">
          {onItunesLinkChange ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-2 gap-1.5 text-xs text-muted-foreground"
              onClick={switchToItunes}
            >
              <Search className="size-3" />
              iTunesで検索
            </Button>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${inputId}-title`} className="text-xs text-muted-foreground">曲名</Label>
              <Input
                id={`${inputId}-title`}
                value={title}
                onChange={(e) => updateValues(e.target.value, artist)}
                placeholder="曲名を入力"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`${inputId}-artist`} className="text-xs text-muted-foreground">アーティスト名</Label>
              <Input
                id={`${inputId}-artist`}
                value={artist}
                onChange={(e) => updateValues(title, e.target.value)}
                placeholder="アーティスト名を入力"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      ) : null}

      {!onItunesLinkChange ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${inputId}-title`} className="text-xs text-muted-foreground">曲名</Label>
            <Input
              id={`${inputId}-title`}
              value={title}
              onChange={(e) => updateValues(e.target.value, artist)}
              placeholder="曲名を入力"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`${inputId}-artist`} className="text-xs text-muted-foreground">アーティスト名</Label>
            <Input
              id={`${inputId}-artist`}
              value={artist}
              onChange={(e) => updateValues(title, e.target.value)}
              placeholder="アーティスト名を入力"
              className="mt-1"
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </section>
  );
};

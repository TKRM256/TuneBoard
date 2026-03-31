import { useEffect, useState } from 'react';

import { type PublicLiveResponse, type PublicSettingSheetSubmissionDetailResponse } from '@/features/lives/types/live-types';
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';

interface PublicLiveDataState {
  errorMessage: string;
  isLoading: boolean;
  live: PublicLiveResponse | null;
  submission: PublicSettingSheetSubmissionDetailResponse | null;
}

export function usePublicLiveData(publicToken: string | undefined, submissionId: string | undefined) {
  const [state, setState] = useState<PublicLiveDataState>({
    errorMessage: '',
    isLoading: true,
    live: null,
    submission: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!publicToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ errorMessage: '公開URLが不正です', isLoading: false, live: null, submission: null });
      return () => {
        cancelled = true;
      };
    }

    // publicToken/submissionId の変更直後は一度ローディング状態に戻し、
    // submission の取得前にフォームが初期値で描画されるのを防ぐ
    setState({ errorMessage: '', isLoading: true, live: null, submission: null });

    const load = async () => {
      try {
        const liveResponse = await apiClient.get<PublicLiveResponse>(`/public/lives/${publicToken}`);
        if (!liveResponse || !(liveResponse as PublicLiveResponse).settingSheetConfig) {
          if (!cancelled) {
            setState({ errorMessage: '公開フォームを読み込めませんでした', isLoading: false, live: null, submission: null });
          }
          return;
        }

        const nextLive = liveResponse as PublicLiveResponse;
        if (!submissionId) {
          if (!cancelled) {
            setState({ errorMessage: '', isLoading: false, live: nextLive, submission: null });
          }
          return;
        }

        const submissionResponse = await apiClient.get<PublicSettingSheetSubmissionDetailResponse>(
          `/public/lives/${publicToken}/setting-sheet/submissions/${submissionId}`,
        );

        if (!submissionResponse || !(submissionResponse as PublicSettingSheetSubmissionDetailResponse).id) {
          if (!cancelled) {
            setState({ errorMessage: '提出済みシートを読み込めませんでした', isLoading: false, live: nextLive, submission: null });
          }
          return;
        }

        if (!cancelled) {
          setState({
            errorMessage: '',
            isLoading: false,
            live: nextLive,
            submission: submissionResponse as PublicSettingSheetSubmissionDetailResponse,
          });
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 404) {
          setState({
            errorMessage: submissionId ? '提出済みシートが見つかりません' : 'フォームが見つかりません',
            isLoading: false,
            live: null,
            submission: null,
          });
          return;
        }

        setState({
          errorMessage: submissionId ? '提出済みシートを取得できませんでした' : '公開フォームを取得できませんでした',
          isLoading: false,
          live: null,
          submission: null,
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [publicToken, submissionId]);

  return state;
}

/** ライブ情報の編集フォーム（入力値の保持と更新リクエスト）。 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client';
import type { ApiClientError } from '@/lib/api/type';

import {
  applyLiveFormErrors,
  createLiveFormFromResponse,
  toLiveUpdatePayload,
  validateLiveForm,
  type LiveFormValues,
  type LiveResponse,
} from '../types/live-types';

export function useLiveEditForm(live: LiveResponse, onUpdated: (live: LiveResponse) => void) {
  const [formValues, setFormValues] = useState<LiveFormValues>(() => createLiveFormFromResponse(live));

  const setFieldValue = useCallback((field: keyof LiveFormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: { ...prev[field], value, error: undefined },
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormValues(createLiveFormFromResponse(live));
  }, [live]);

  const applyServerErrors = useCallback((error: ApiClientError) => {
    const serverFieldErrors = error.apiError?.fieldErrors;
    if (!serverFieldErrors) {
      toast.error(error.apiError?.message ?? 'ライブの更新に失敗しました', { position: 'top-center' });
      return;
    }

    setFormValues((prev) => {
      const next = { ...prev } as LiveFormValues;
      const mutableFields = next as Record<keyof LiveFormValues, { value: string; error?: string }>;
      for (const [key, value] of Object.entries(serverFieldErrors)) {
        if (key in next) {
          const fieldKey = key as keyof LiveFormValues;
          mutableFields[fieldKey] = { ...mutableFields[fieldKey], error: value };
        }
      }
      return next;
    });
  }, []);

  /** 入力チェック。問題があれば各項目にエラーを表示して false を返す。 */
  const validate = useCallback((): boolean => {
    const errors = validateLiveForm(formValues);
    if (Object.keys(errors).length === 0) {
      return true;
    }
    setFormValues((prev) => applyLiveFormErrors(prev, errors));
    return false;
  }, [formValues]);

  /** 更新に成功したら true を返す。入力エラーは formValues に反映される。 */
  const submit = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.post<LiveResponse>('/lives/update', {
        id: live.id,
        ...toLiveUpdatePayload(formValues),
      });

      if (!response) {
        return false;
      }

      onUpdated(response);
      setFormValues(createLiveFormFromResponse(response));
      toast.success('ライブを更新しました', { position: 'top-center' });
      return true;
    } catch (error: unknown) {
      applyServerErrors(error as ApiClientError);
      return false;
    }
  }, [applyServerErrors, formValues, live.id, onUpdated]);

  return { formValues, setFieldValue, resetForm, submit, validate };
}

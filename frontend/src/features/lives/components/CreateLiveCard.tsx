import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmButton } from '@/components/original/ConfirmButton';
import { CreateAccordionCard } from '@/components/original/CreateAccordionCard';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import type { ApiClientError } from '@/lib/api/type';

import {
  createTenantScopedLiveForm,
  LIVE_STATUS_OPTIONS,
  type LiveFormValues,
  type LiveResponse,
  toLiveCreatePayload,
} from '../types/live-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateLiveCardProps {
  tenantId: string;
  tenantName: string;
  onCreateSuccess: (live: LiveResponse) => void;
}

export const CreateLiveCard = ({ tenantId, tenantName, onCreateSuccess }: CreateLiveCardProps) => {
  const [formValues, setFormValues] = useState<LiveFormValues>(() => createTenantScopedLiveForm());

  const setFieldValue = (field: keyof LiveFormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: { ...prev[field], value, error: undefined },
    }));
  };

  const applyServerErrors = (error: ApiClientError) => {
    const serverFieldErrors = error.apiError?.fieldErrors;
    if (!serverFieldErrors) {
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
  };

  const onSubmit = () => {
    apiClient
      .post<LiveResponse>('/lives/create', toLiveCreatePayload(tenantId, formValues))
      .then((response) => {
        if (!response) {
          return;
        }

        onCreateSuccess(response);
        setFormValues(createTenantScopedLiveForm());
        toast.success('ライブを作成しました', { position: 'top-center' });
      })
      .catch((error: ApiClientError) => {
        applyServerErrors(error);
      });
  };

  return (
    <CreateAccordionCard
      value={`create-live-${tenantId}`}
      title={`${tenantName} のライブ作成`}
    >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="live-name">ライブ名<span className="text-red-500">*</span></FieldLabel>
            <Input id="live-name" value={formValues.name.value} onChange={(event) => setFieldValue('name', event.target.value)} />
            {formValues.name.error ? <FieldError>{formValues.name.error}</FieldError> : null}
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="live-date">開催日</FieldLabel>
              <Input id="live-date" type="date" value={formValues.date.value} onChange={(event) => setFieldValue('date', event.target.value)} />
              {formValues.date.error ? <FieldError>{formValues.date.error}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="live-deadline">回答締切</FieldLabel>
              <Input
                id="live-deadline"
                type="datetime-local"
                value={formValues.deadlineAt.value}
                onChange={(event) => setFieldValue('deadlineAt', event.target.value)}
              />
              {formValues.deadlineAt.error ? <FieldError>{formValues.deadlineAt.error}</FieldError> : null}
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <Field>
              <FieldLabel htmlFor="live-location">会場</FieldLabel>
              <Input id="live-location" value={formValues.location.value} onChange={(event) => setFieldValue('location', event.target.value)} />
              {formValues.location.error ? <FieldError>{formValues.location.error}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="live-status">公開状態</FieldLabel>
              <Select value={formValues.status.value} onValueChange={(value) => setFieldValue('status', value)}>
                <SelectTrigger id="live-status" className="w-full">
                  <SelectValue placeholder="状態を選択" />
                </SelectTrigger>
                <SelectContent>
                  {LIVE_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formValues.status.error ? <FieldError>{formValues.status.error}</FieldError> : null}
            </Field>
          </div>
        </FieldGroup>

        <div className="flex justify-end">
          <ConfirmButton onClick={onSubmit}>
            作成
          </ConfirmButton>
        </div>
    </CreateAccordionCard>
  );
};
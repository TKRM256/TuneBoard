import { describe, expect, it } from 'vitest';

import {
  buildPublicLiveUrl,
  createLiveFormFromResponse,
  formatDeadline,
  formatLiveDate,
  formatOptionalText,
  normalizeSettingSheetConfig,
  toLiveCreatePayload,
  toLiveUpdatePayload,
  validateLiveForm,
  type LiveResponse,
  type LiveFormValues,
} from './live-types';

describe('lives type utilities', () => {
  it('LiveResponse からフォーム値を生成する', () => {
    const live: LiveResponse = {
      id: 'live-1',
      tenantId: 'tenant-1',
      tenantName: 'TuneBoard',
      publicToken: 'public-token',
      name: 'Fresh Live',
      date: '2025-03-20T18:30:00',
      location: 'Main Stage',
      deadlineAt: '2025-03-10T23:59:59',
      status: 'PUBLISHED',
    };

    expect(createLiveFormFromResponse(live)).toEqual({
      tenantId: { value: 'tenant-1' },
      name: { value: 'Fresh Live' },
      date: { value: '2025-03-20T18:30:00' },
      location: { value: 'Main Stage' },
      deadlineAt: { value: '2025-03-10T23:59' },
      status: { value: 'PUBLISHED' },
    });
  });

  it('作成用と更新用の payload で空文字を null に正規化する', () => {
    const formValues: LiveFormValues = {
      tenantId: { value: 'tenant-1' },
      name: { value: 'Spring Live' },
      date: { value: '' },
      location: { value: '' },
      deadlineAt: { value: '' },
      status: { value: 'DRAFT' },
    };

    expect(toLiveCreatePayload('tenant-2', formValues)).toEqual({
      tenantId: 'tenant-2',
      name: 'Spring Live',
      date: null,
      location: null,
      deadlineAt: null,
      status: 'DRAFT',
    });

    expect(toLiveUpdatePayload(formValues)).toEqual({
      name: 'Spring Live',
      date: null,
      location: null,
      deadlineAt: null,
      status: 'DRAFT',
    });
  });

  it('公開 URL を現在の origin 基準で組み立てる', () => {
    expect(buildPublicLiveUrl('token-123')).toBe('http://localhost:3000/public/lives/token-123');
  });

  it('表示用フォーマッタでフォールバックと日付整形を返す', () => {
    expect(formatLiveDate(null)).toBe('未定');
    expect(formatDeadline(null)).toBe('未設定');
    expect(formatOptionalText('   ')).toBe('未定');
    expect(formatOptionalText('Shibuya')).toBe('Shibuya');

    expect(formatLiveDate('2025-04-05T00:00:00')).toBe(
      new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long' }).format(new Date('2025-04-05T00:00:00')),
    );
    expect(formatDeadline('2025-04-05T12:34:00')).toBe(
      new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2025-04-05T12:34:00')),
    );
  });

  it('normalizeSettingSheetConfig はセクションの publicVisible を保持する', () => {
    const normalized = normalizeSettingSheetConfig({
      title: 'test',
      description: '',
      submitButtonLabel: '送信',
      publicSubmissionEnabled: false,
      blocks: [
        {
          id: 'section-1',
          type: 'SECTION',
          label: '見出し',
          description: '',
          hidden: false,
          publicVisible: true,
          required: false,
          collapsible: false,
          appearance: 'plain',
          itemAppearance: 'plain',
          options: [],
          minItems: 0,
          addButtonLabel: '',
          entryTitle: '',
          titleSourceFieldId: '',
          fields: [],
          layout: { width: 'full', optionColumns: 1, optionFitContent: false },
          optionSource: null,
          duplicateDetectionRole: '',
        },
      ],
    });

    expect(normalized.blocks[0].publicVisible).toBe(true);
  });
});
describe('validateLiveForm', () => {
  const form = (date: string, deadlineAt: string): LiveFormValues => ({
    tenantId: { value: 't' },
    name: { value: 'ライブ' },
    date: { value: date },
    location: { value: '' },
    deadlineAt: { value: deadlineAt },
    status: { value: 'DRAFT' },
  });

  it('rejects a deadline after the live date', () => {
    expect(validateLiveForm(form('2026-08-01', '2026-08-02T00:00')).deadlineAt).toBe('回答締切は開催日以前にしてください');
  });

  it('counts surrounding spaces in the name length like the server does', () => {
    const values = { ...form('', ''), name: { value: `${'a'.repeat(255)} ` } };
    expect(validateLiveForm(values).name).toBe('ライブ名は255文字以内で入力してください');
  });

  it('accepts a deadline on the live date or when either is empty', () => {
    expect(validateLiveForm(form('2026-08-01', '2026-08-01T23:59')).deadlineAt).toBeUndefined();
    expect(validateLiveForm(form('', '2026-08-02T00:00')).deadlineAt).toBeUndefined();
    expect(validateLiveForm(form('2026-08-01', '')).deadlineAt).toBeUndefined();
  });
});

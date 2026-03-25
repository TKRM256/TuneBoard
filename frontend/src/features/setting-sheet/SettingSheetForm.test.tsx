import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicLiveResponse, PublicSettingSheetSubmissionDetailResponse } from '@/features/lives/types/type';

import { SettingSheetForm } from './SettingSheetForm';

const { mockNavigate, mockPost, mockPut } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: mockPost,
    put: mockPut,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const baseLive: PublicLiveResponse = {
  name: 'Spring Live',
  date: '2026-04-01',
  location: 'Main Hall',
  deadlineAt: '2026-03-20T18:00:00',
  status: 'PUBLISHED',
  settingSheetConfig: {
    title: 'バンド申請フォーム',
    description: '',
    submitButtonLabel: '送信する',
    publicSubmissionEnabled: false,
    recordLabelFieldId: 'band-name',
    blocks: [
      {
        id: 'band-name',
        type: 'SHORT_TEXT',
        label: 'バンド名',
        description: '',
        hidden: false,
        required: true,
        collapsible: false,
        appearance: 'outline',
        itemAppearance: 'plain',
        options: [],
        minItems: 0,
        addButtonLabel: '',
        entryTitle: '',
        titleSourceFieldId: '',
        fields: [],
        layout: {
          width: 'half',
          optionColumns: 1,
          optionFitContent: false,
        },
        optionSource: null,
      },
    ],
  },
};

describe('SettingSheetForm', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockNavigate.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('新規送信後に提出済みシートの編集 URL へ遷移する', async () => {
    mockPost.mockResolvedValue({
      id: 'submission-1',
      recordLabel: 'The Testers',
      submissionStatus: 'SUBMITTED',
      submittedAt: '2026-03-11T20:00:00',
    });

    render(<SettingSheetForm publicToken="public-token" live={baseLive} submission={null} />);

    await userEvent.type(screen.getByRole('textbox', { name: /バンド名/ }), 'The Testers');
    await userEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/public/lives/public-token/setting-sheet/submissions', {
        answers: [
          {
            fieldId: 'band-name',
            values: ['The Testers'],
            items: [],
          },
        ],
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/public/lives/public-token/submissions/submission-1', {
        replace: true,
      });
    });
  });

  it('提出済みシートを初期表示して更新 API を呼ぶ', async () => {
    const submission: PublicSettingSheetSubmissionDetailResponse = {
      id: 'submission-42',
      recordLabel: 'Saved Band',
      submissionStatus: 'SUBMITTED',
      submittedAt: '2026-03-11T20:00:00',
      answers: [
        {
          fieldId: 'band-name',
          values: ['Saved Band'],
          items: [],
        },
      ],
    };
    mockPut.mockResolvedValue({
      id: 'submission-42',
      recordLabel: 'Updated Band',
      submissionStatus: 'SUBMITTED',
      submittedAt: '2026-03-11T20:00:00',
    });

    render(<SettingSheetForm publicToken="public-token" live={baseLive} submission={submission} />);

    const input = screen.getByRole('textbox', { name: /バンド名/ });
    expect(input).toHaveValue('Saved Band');

    await userEvent.clear(input);
    await userEvent.type(input, 'Updated Band');
    await userEvent.click(screen.getByRole('button', { name: '更新する' }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/public/lives/public-token/setting-sheet/submissions/submission-42', {
        answers: [
          {
            fieldId: 'band-name',
            values: ['Updated Band'],
            items: [],
          },
        ],
      });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('repeatable group 内 section 配下の提出済み回答も初期表示できる', async () => {
    const live: PublicLiveResponse = {
      ...baseLive,
      settingSheetConfig: {
        title: '出演者フォーム',
        description: '',
        submitButtonLabel: '更新する',
        publicSubmissionEnabled: false,
        recordLabelFieldId: '',
        blocks: [
          {
            id: 'members',
            type: 'REPEATABLE_GROUP',
            label: '出演者',
            description: '',
            hidden: false,
            required: false,
            collapsible: false,
            appearance: 'subtle',
            itemAppearance: 'outline',
            options: [],
            minItems: 0,
            addButtonLabel: '追加',
            entryTitle: '出演者',
            titleSourceFieldId: 'member-name',
            fields: [
              {
                id: 'member-section',
                type: 'SECTION',
                label: '基本情報',
                description: '',
                hidden: false,
                required: false,
                collapsible: false,
                appearance: 'plain',
                itemAppearance: 'plain',
                options: [],
                minItems: 0,
                addButtonLabel: '',
                entryTitle: '',
                titleSourceFieldId: '',
                fields: [
                  {
                    id: 'member-name',
                    type: 'SHORT_TEXT',
                    label: '氏名',
                    description: '',
                    hidden: false,
                    required: true,
                    collapsible: false,
                    appearance: 'outline',
                    itemAppearance: 'plain',
                    options: [],
                    minItems: 0,
                    addButtonLabel: '',
                    entryTitle: '',
                    titleSourceFieldId: '',
                    fields: [],
                    layout: {
                      width: 'half',
                      optionColumns: 1,
                      optionFitContent: false,
                    },
                    optionSource: null,
                  },
                ],
                layout: {
                  width: 'full',
                  optionColumns: 1,
                  optionFitContent: false,
                },
                optionSource: null,
              },
            ],
            layout: {
              width: 'full',
              optionColumns: 1,
              optionFitContent: false,
            },
            optionSource: null,
          },
        ],
      },
    };

    const submission: PublicSettingSheetSubmissionDetailResponse = {
      id: 'submission-99',
      recordLabel: 'Section Band',
      submissionStatus: 'SUBMITTED',
      submittedAt: '2026-03-11T20:00:00',
      answers: [
        {
          fieldId: 'members',
          values: [],
          items: [
            {
              answers: [
                {
                  fieldId: 'member-name',
                  values: ['Alice'],
                  items: [],
                },
              ],
            },
          ],
        },
      ],
    };

    render(<SettingSheetForm publicToken="public-token" live={live} submission={submission} />);

    expect(await screen.findByDisplayValue('Alice')).toBeInTheDocument();
  });

  it('BOOLEAN 項目で false を選んで送信できる', async () => {
    const live: PublicLiveResponse = {
      ...baseLive,
      settingSheetConfig: {
        ...baseLive.settingSheetConfig,
        blocks: [
          ...baseLive.settingSheetConfig.blocks,
          {
            id: 'is-bring-amp',
            type: 'BOOLEAN',
            label: 'アンプ持ち込み',
            description: '',
            hidden: false,
            required: true,
            collapsible: false,
            appearance: 'outline',
            itemAppearance: 'plain',
            options: [],
            minItems: 0,
            addButtonLabel: '',
            entryTitle: '',
            titleSourceFieldId: '',
            fields: [],
            layout: {
              width: 'half',
              optionColumns: 1,
              optionFitContent: false,
            },
            optionSource: null,
          },
        ],
      },
    };

    mockPost.mockResolvedValue({
      id: 'submission-bool',
      recordLabel: 'The Testers',
      submissionStatus: 'SUBMITTED',
      submittedAt: '2026-03-11T20:00:00',
    });

    render(<SettingSheetForm publicToken="public-token" live={live} submission={null} />);

    await userEvent.type(screen.getByRole('textbox', { name: /バンド名/ }), 'The Testers');
    const switchEl = screen.getByRole('switch', { name: /アンプ持ち込み/ });
    await userEvent.click(switchEl); // ON (true)
    await userEvent.click(switchEl); // OFF (false) → values: ['false']
    await userEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/public/lives/public-token/setting-sheet/submissions', {
        answers: [
          {
            fieldId: 'band-name',
            values: ['The Testers'],
            items: [],
          },
          {
            fieldId: 'is-bring-amp',
            values: ['false'],
            items: [],
          },
        ],
      });
    });
  });

  it('締切済みライブでは送信ボタンが無効になる', () => {
    const live: PublicLiveResponse = {
      ...baseLive,
      deadlineAt: '2020-01-01T00:00:00',
    };

    render(<SettingSheetForm publicToken="public-token" live={live} submission={null} />);

    expect(screen.getByText('現在は送信できません')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送信する' })).toBeDisabled();
  });
});
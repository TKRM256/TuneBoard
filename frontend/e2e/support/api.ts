/** シナリオテストの下準備（ログイン・テナント・ライブ・フォーム・提出）を API で行う。 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type Page } from '@playwright/test';

/** 書き込み系の API に必要なヘッダー（CSRF 対策）。 */
const HEADERS = { 'X-Requested-With': 'TuneBoard' };
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export const DANCE_FORM_PDF = path.join(FIXTURES, 'dance-form.pdf');

/** 開発用のテストログイン。ページと同じ Cookie を使うので、以降の画面も API もログイン済みになる。 */
export async function loginAsTestUser(page: Page, key: string, name = 'シナリオ担当') {
  const response = await page.request.post('/api/dev/test-login', { data: { key, name }, headers: HEADERS });
  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function apiGet<T>(page: Page, url: string): Promise<T> {
  const response = await page.request.get(`/api${url}`);
  expect(response.ok(), `${url}: ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

export async function apiPost<T>(page: Page, url: string, data: unknown): Promise<T> {
  const response = await page.request.post(`/api${url}`, { data, headers: HEADERS });
  expect(response.ok(), `${url}: ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

export interface Live {
  id: string;
  publicToken: string;
}

export async function createTenant(page: Page, name: string) {
  return apiPost<{ id: string }>(page, '/tenants/create', { name });
}

export async function createLive(page: Page, tenantId: string, name: string) {
  return apiPost<Live>(page, '/lives/create', { tenantId, name, date: '2026-12-20', location: '市民文化ホール', status: 'PUBLISHED' });
}

type Block = Record<string, unknown>;

function block(id: string, type: string, label: string, extra: Block = {}): Block {
  return {
    id, type, label, description: '', hidden: false, publicVisible: true, adminVisible: true, required: false,
    collapsible: false, appearance: 'plain', itemAppearance: 'outline', options: [], minItems: null,
    addButtonLabel: null, entryTitle: null, titleSourceFieldId: null, fields: [],
    layout: { width: 'full', optionColumns: null, optionFitContent: null }, optionSource: null,
    duplicateDetectionRole: '', variants: [], adminOnly: false, ...extra,
  };
}

/** バンド向けの既定とはまったく違う、ダンス発表会の出演申込フォーム。 */
export async function applyDanceForm(page: Page, liveId: string) {
  const blocks = [
    block('team', 'SECTION', '団体情報', {
      fields: [
        block('team-name', 'SHORT_TEXT', '団体名', { required: true }),
        block('leader', 'SHORT_TEXT', '代表者'),
        block('phone', 'SHORT_TEXT', '連絡先'),
        block('genre', 'SINGLE_SELECT', 'ジャンル', { options: ['ヒップホップ', 'ジャズ', 'K-POP', 'バレエ', 'その他'] }),
        block('slot', 'SINGLE_SELECT', '出演枠', { options: ['昼の部', '夜の部'] }),
        block('lights', 'MULTI_SELECT', '照明の希望', { options: ['スポット', 'ミラーボール', 'ストロボ', '暗転スタート'] }),
        block('props', 'BOOLEAN', '小道具あり'),
      ],
    }),
    block('dancers', 'REPEATABLE_GROUP', '出演者', {
      addButtonLabel: '出演者を追加',
      fields: [
        block('dancer-name', 'SHORT_TEXT', '名前'),
        block('dancer-grade', 'SINGLE_SELECT', '学年', { options: ['1年', '2年', '3年', '4年'] }),
        block('dancer-pos', 'SINGLE_SELECT', '立ち位置', { options: ['センター', '下手', '上手'] }),
      ],
    }),
    block('tracks', 'REPEATABLE_GROUP', '使用音源', {
      addButtonLabel: '音源を追加',
      fields: [
        block('track-title', 'SHORT_TEXT', '曲名'),
        block('track-time', 'DURATION', '尺'),
        block('cue', 'SHORT_TEXT', 'きっかけ'),
      ],
    }),
    block('notes', 'LONG_TEXT', '備考'),
  ];
  await apiPost(page, `/lives/${liveId}/setting-sheet/config`, {
    title: 'ダンス発表会 出演申込', description: '', submitButtonLabel: '申し込む', publicSubmissionEnabled: true, blocks,
  });
}

const answer = (fieldId: string, ...values: string[]) => ({ fieldId, values, items: [] as unknown[] });
const group = (fieldId: string, items: ReturnType<typeof answer>[][]) => ({
  fieldId, values: [] as string[], items: items.map((answers) => ({ variantId: null, answers })),
});

/** 出演者が 6 人（書式の 5 行より多い）・長い名前・複数行の備考の提出。 */
export async function submitRichEntry(page: Page, publicToken: string) {
  return apiPost<{ id: string }>(page, `/public/lives/${publicToken}/setting-sheet/submissions`, {
    itunesLinks: [],
    answers: [
      answer('team-name', '国際文化大学ストリートダンス愛好会ネクストジェネレーション'), answer('leader', '佐藤 一郎'),
      answer('phone', '080-1111-2222'), answer('genre', 'その他'), answer('slot', '昼の部'),
      answer('lights', 'ミラーボール', 'ストロボ', 'スポット'), answer('props', 'false'),
      group('dancers', [
        [answer('dancer-name', 'あおい'), answer('dancer-grade', '1年'), answer('dancer-pos', 'センター')],
        [answer('dancer-name', 'ひかる'), answer('dancer-grade', '2年'), answer('dancer-pos', '下手')],
        [answer('dancer-name', 'ミナミ・アレクサンドラ・ジョーンズ'), answer('dancer-grade', '4年'), answer('dancer-pos', '上手')],
        [answer('dancer-name', 'りく'), answer('dancer-grade', '3年'), answer('dancer-pos', '下手')],
        [answer('dancer-name', 'そら'), answer('dancer-grade', '2年'), answer('dancer-pos', '上手')],
        [answer('dancer-name', 'ゆい'), answer('dancer-grade', '1年'), answer('dancer-pos', 'センター')],
      ]),
      group('tracks', [
        [answer('track-title', 'オープニング Remix'), answer('track-time', '2:45'), answer('cue', '暗転後に音先')],
        [answer('track-title', 'とても長い曲名のメドレー（Part 1〜3 ノンストップ）'), answer('track-time', '6:30'), answer('cue', 'センターのポーズで')],
      ]),
      answer('notes', '1行目：ストロボは2曲目のサビだけ。\n2行目：小道具は使いません。'),
    ],
  });
}

/** 書式のファイルを会場書式に取り込む。 */
export async function uploadVenueAsset(page: Page, liveId: string, filePath: string) {
  const response = await page.request.post(`/api/lives/${liveId}/venue-form/assets`, {
    headers: HEADERS,
    multipart: { file: { name: path.basename(filePath), mimeType: 'application/pdf', buffer: readFileSync(filePath) } },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<{ id: string }>;
}

/** ログインからライブ・フォーム・提出・背景つきの会場書式（空）までを API でそろえる。 */
export async function prepareVenueForm(page: Page, key: string) {
  await loginAsTestUser(page, key);
  const tenant = await createTenant(page, `${key} 用サークル`);
  const live = await createLive(page, tenant.id, `${key} のライブ`);
  await applyDanceForm(page, live.id);
  await submitRichEntry(page, live.publicToken);
  const asset = await uploadVenueAsset(page, live.id, DANCE_FORM_PDF);
  await apiPost(page, `/lives/${live.id}/venue-form`, {
    document: {
      pages: [{ id: 'page-1', widthMm: 209.9, heightMm: 297, background: { assetId: asset.id, pageIndex: 0 } }],
      elements: [],
    },
  });
  return { tenant, live };
}

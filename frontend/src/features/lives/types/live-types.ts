export type LiveStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type SettingSheetBlockType =
  | 'SECTION'
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'BOOLEAN'
  | 'REPEATABLE_GROUP'
  | 'SONG';

export interface SettingSheetOptionSource {
  blockId: string;
  fieldId: string;
}

export type SettingSheetBlockAppearance = 'plain' | 'outline' | 'subtle';

export type SettingSheetLayoutWidth = 'full' | 'two-thirds' | 'half' | 'third';

export interface SettingSheetBlockLayout {
  width: SettingSheetLayoutWidth;
  optionColumns: number;
  optionFitContent: boolean;
}

function createLayout(width: SettingSheetLayoutWidth, optionColumns = 1, optionFitContent = false): SettingSheetBlockLayout {
  return { width, optionColumns, optionFitContent };
}

export interface SettingSheetGroupVariant {
  id: string;
  label: string;
  fields: SettingSheetBlock[];
}

export interface SettingSheetBlock {
  id: string;
  type: SettingSheetBlockType;
  label: string;
  description: string;
  hidden: boolean;
  publicVisible?: boolean;
  required: boolean;
  collapsible: boolean;
  appearance: SettingSheetBlockAppearance;
  itemAppearance: SettingSheetBlockAppearance;
  options: string[];
  minItems: number;
  addButtonLabel: string;
  entryTitle: string;
  titleSourceFieldId: string;
  fields: SettingSheetBlock[];
  layout: SettingSheetBlockLayout;
  optionSource: SettingSheetOptionSource | null;
  duplicateDetectionRole: DuplicateDetectionRole;
  variants?: SettingSheetGroupVariant[];
}

export type DuplicateDetectionRole = '' | 'SONG_TITLE' | 'SONG_ARTIST';

export const DUPLICATE_DETECTION_ROLE_OPTIONS: Array<{ value: DuplicateDetectionRole; label: string }> = [
  { value: '', label: 'なし' },
  { value: 'SONG_TITLE', label: '曲名（重複検知用）' },
  { value: 'SONG_ARTIST', label: 'アーティスト名（重複検知用）' },
];

export interface SettingSheetConfigResponse {
  title: string;
  description: string;
  submitButtonLabel: string;
  publicSubmissionEnabled: boolean;
  blocks: SettingSheetBlock[];
}

export interface LiveResponse {
  id: string;
  tenantId: string;
  tenantName: string;
  publicToken: string;
  name: string;
  date: string | null;
  location: string | null;
  deadlineAt: string | null;
  status: LiveStatus;
}

/** フォーム設定・PDFレイアウトのコピー元候補。所属する全テナントのライブが並ぶ。 */
export interface LiveCopySourceResponse {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  date: string | null;
  status: LiveStatus;
  hasSettingSheetConfig: boolean;
  hasPdfCanvas: boolean;
}

export interface PublicLiveResponse {
  name: string;
  date: string | null;
  location: string | null;
  deadlineAt: string | null;
  status: LiveStatus;
  settingSheetConfig: SettingSheetConfigResponse;
}

export interface SettingSheetSubmissionAnswerResponse {
  fieldId: string;
  values: string[];
  items: Array<{ variantId?: string; answers: SettingSheetSubmissionAnswerResponse[] }>;
}

export interface SettingSheetSubmissionResponse {
  id: string;
  recordLabel: string;
  submissionStatus: string;
  submittedAt: string;
  /** 楽観ロック用の版番号。更新時に baseVersion として送り返す。 */
  version: number;
}

export interface PublicSettingSheetSubmissionDetailResponse extends SettingSheetSubmissionResponse {
  answers: SettingSheetSubmissionAnswerResponse[];
  itunesLinks: ItunesLinkSelection[];
}

/** 提出済みシートの更新が競合したときに 409 で返るボディ。 */
export interface SettingSheetSubmissionConflictBody {
  status: number;
  error: string;
  message: string;
  latest: PublicSettingSheetSubmissionDetailResponse;
}

export interface SongDuplicateResponse {
  totalDuplicateGroups: number;
  groups: SongDuplicateGroup[];
}

export interface SongDuplicateGroup {
  normalizedTitle: string;
  normalizedArtist: string;
  itunesTrackId: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  dismissed: boolean;
  entries: SongDuplicateEntry[];
}

export interface SongDuplicateEntry {
  submissionId: string;
  recordLabel: string;
  originalTitle: string;
  originalArtist: string;
}

export interface ItunesTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  previewUrl: string | null;
  trackViewUrl: string;
}

export interface ItunesLinkSelection {
  songTitle: string;
  songArtist: string;
  itunesTrackId: string;
  itunesTitle: string;
  itunesArtist: string;
  itunesAlbumArtUrl: string;
}

export interface FormField {
  value: string;
  error?: string;
}

export interface LiveFormValues {
  tenantId: FormField;
  name: FormField;
  date: FormField;
  location: FormField;
  deadlineAt: FormField;
  status: { value: LiveStatus; error?: string };
}

export const LIVE_STATUS_LABELS: Record<LiveStatus, string> = {
  DRAFT: '下書き',
  PUBLISHED: '公開中',
  CLOSED: '締切済み',
};

export const LIVE_STATUS_OPTIONS: Array<{ value: LiveStatus; label: string }> = [
  { value: 'DRAFT', label: LIVE_STATUS_LABELS.DRAFT },
  { value: 'PUBLISHED', label: LIVE_STATUS_LABELS.PUBLISHED },
  { value: 'CLOSED', label: LIVE_STATUS_LABELS.CLOSED },
];

export const SETTING_SHEET_BLOCK_OPTIONS: Array<{ value: SettingSheetBlockType; label: string; description: string }> = [
  { value: 'SECTION', label: 'セクション見出し', description: '見出しと説明だけを表示します。' },
  { value: 'SHORT_TEXT', label: '短いテキスト', description: '1行の自由入力質問です。' },
  { value: 'LONG_TEXT', label: '長いテキスト', description: '複数行の自由入力質問です。' },
  { value: 'SINGLE_SELECT', label: '単一選択', description: 'プルダウンで1つ選びます。' },
  { value: 'MULTI_SELECT', label: '複数選択', description: '複数の選択肢を選べます。' },
  { value: 'CHECKBOX', label: 'チェックボックス', description: 'ON/OFFで複数回答する質問です。' },
  { value: 'BOOLEAN', label: '真偽値', description: '代表者やメインVoのようなON/OFF項目です。' },
  { value: 'REPEATABLE_GROUP', label: '繰り返しグループ', description: 'メンバーや曲のように動的に追加できるまとまりです。' },
  { value: 'SONG', label: '楽曲', description: '曲名・アーティスト名とiTunes検索をセットで入力します。' },
];

export const SETTING_SHEET_APPEARANCE_OPTIONS: Array<{ value: SettingSheetBlockAppearance; label: string; description: string }> = [
  { value: 'plain', label: 'プレーン', description: '枠をほぼ使わずに軽く表示します。' },
  { value: 'outline', label: 'アウトライン', description: '境界線だけで区切ります。' },
  { value: 'subtle', label: 'やわらかい面', description: '淡い背景でまとまりを見せます。' },
];

function createId() {
  return crypto.randomUUID();
}

export function createBlockTemplate(type: SettingSheetBlockType): SettingSheetBlock {
  switch (type) {
    case 'SECTION':
      return { id: createId(), type, label: 'セクション見出し', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'plain', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: createLayout('full', 1, false), optionSource: null, duplicateDetectionRole: '' };
    case 'SHORT_TEXT':
      return { id: createId(), type, label: '質問', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: createLayout('half', 1, false), optionSource: null, duplicateDetectionRole: '' };
    case 'LONG_TEXT':
      return { id: createId(), type, label: '質問', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: createLayout('full', 1, false), optionSource: null, duplicateDetectionRole: '' };
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
    case 'CHECKBOX':
      return { id: createId(), type, label: '質問', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: ['選択肢1'], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: createLayout('half', type === 'SINGLE_SELECT' ? 1 : 2, false), optionSource: null, duplicateDetectionRole: '' };
    case 'BOOLEAN':
      return { id: createId(), type, label: 'チェック項目', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: createLayout('half', 1, false), optionSource: null, duplicateDetectionRole: '' };
    case 'REPEATABLE_GROUP':
      return { id: createId(), type, label: '繰り返しグループ', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'subtle', itemAppearance: 'outline', options: [], minItems: 0, addButtonLabel: '項目を追加', entryTitle: '項目', titleSourceFieldId: '', fields: [createBlockTemplate('SHORT_TEXT')], layout: createLayout('full', 1, false), optionSource: null, duplicateDetectionRole: '', variants: [] };
    case 'SONG':
      return { id: createId(), type, label: '楽曲', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: createLayout('full', 1, false), optionSource: null, duplicateDetectionRole: '' };
  }
}

// フォームの実際の初期構造は backend の SettingSheetConfigService.defaultSettingSheetConfig() が唯一の情報源。
// ここでは「空の状態」だけを最小限のシェイプとして提供する。
export function createEmptySettingSheetConfig(): SettingSheetConfigResponse {
  return {
    title: '',
    description: '',
    submitButtonLabel: '送信する',
    publicSubmissionEnabled: true,
    blocks: [],
  };
}

function normalizeOptions(values: string[] | undefined, fallback: string[] = []) {
  const normalized = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

export function isOptionBlock(type: SettingSheetBlockType) {
  return ['SINGLE_SELECT', 'MULTI_SELECT', 'CHECKBOX'].includes(type);
}

export function isTextBlock(type: SettingSheetBlockType) {
  return ['SHORT_TEXT', 'LONG_TEXT'].includes(type);
}

export function isInputBlock(type: SettingSheetBlockType) {
  return ['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_SELECT', 'MULTI_SELECT', 'CHECKBOX', 'BOOLEAN', 'SONG'].includes(type);
}

export function isSectionBlock(type: SettingSheetBlockType) {
  return type === 'SECTION';
}

export function canContainBlocks(type: SettingSheetBlockType) {
  return isSectionBlock(type) || isRepeatableGroupBlock(type);
}

export function canUseAsTitleSourceBlock(type: SettingSheetBlockType) {
  return ['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_SELECT', 'MULTI_SELECT', 'SONG'].includes(type);
}

export function isRepeatableGroupBlock(type: SettingSheetBlockType) {
  return type === 'REPEATABLE_GROUP';
}

export function isSongBlock(type: SettingSheetBlockType) {
  return type === 'SONG';
}

export function getGroupItemFields(block: SettingSheetBlock, variantId: string): SettingSheetBlock[] {
  const variants = block.variants ?? [];
  if (variants.length === 0) return block.fields;
  return variants.find((v) => v.id === variantId)?.fields ?? variants[0]?.fields ?? block.fields;
}

export function normalizeSettingSheetConfig(config: SettingSheetConfigResponse | null | undefined): SettingSheetConfigResponse {
  if (!config) {
    return createEmptySettingSheetConfig();
  }

  const blocks = (config.blocks ?? []).map((block, index) => normalizeBlock(block, `${index + 1}`));

  return {
    title: config.title?.trim() || '',
    description: config.description?.trim() || '',
    submitButtonLabel: config.submitButtonLabel?.trim() || '送信する',
    publicSubmissionEnabled: config.publicSubmissionEnabled === true,
    blocks: config.blocks == null ? [] : blocks,
  };
}

function normalizeBlock(block: SettingSheetBlock, fallbackId: string): SettingSheetBlock {
  const type = SETTING_SHEET_BLOCK_OPTIONS.some((option) => option.value === block.type) ? block.type : ('SHORT_TEXT' as SettingSheetBlockType);
  const template = createBlockTemplate(type);
  const required = isInputBlock(type) || isRepeatableGroupBlock(type) ? block.required === true : false;
  const normalizedFields = canContainBlocks(type) ? (block.fields ?? []).map((child, index) => normalizeBlock(child, `${fallbackId}-${index + 1}`)) : [];
  const normalizedVariants: SettingSheetGroupVariant[] = isRepeatableGroupBlock(type)
    ? (block.variants ?? []).map((v) => ({ id: v.id?.trim() || crypto.randomUUID(), label: v.label?.trim() || '項目', fields: (v.fields ?? []).map((child, index) => normalizeBlock(child, `${fallbackId}-v-${index + 1}`)) }))
    : [];
  const allFieldsForTitle = normalizedVariants.length > 0 ? normalizedVariants.flatMap((v) => v.fields) : normalizedFields;
  const validTitleSource = isRepeatableGroupBlock(type)
    ? allFieldsForTitle.some((field) => field.id === block.titleSourceFieldId?.trim() && canUseAsTitleSourceBlock(field.type))
    : false;

  return {
    id: block.id?.trim() || `${type.toLowerCase()}-${fallbackId}`,
    type,
    label: block.label?.trim() || template.label,
    description: block.description?.trim() ?? '',
    hidden: block.hidden === true,
    publicVisible: block.publicVisible === true,
    required,
    collapsible: isRepeatableGroupBlock(type) ? block.collapsible === true : false,
    appearance: block.appearance === 'plain' || block.appearance === 'subtle' || block.appearance === 'outline' ? block.appearance : template.appearance,
    itemAppearance: isRepeatableGroupBlock(type) && (block.itemAppearance === 'plain' || block.itemAppearance === 'subtle' || block.itemAppearance === 'outline')
      ? block.itemAppearance
      : template.itemAppearance,
    options: isOptionBlock(type) && !block.optionSource ? normalizeOptions(block.options, ['選択肢1']) : [],
    minItems: isRepeatableGroupBlock(type) ? Math.max(0, Number(block.minItems ?? template.minItems ?? 0)) : 0,
    addButtonLabel: isRepeatableGroupBlock(type) ? block.addButtonLabel?.trim() || template.addButtonLabel : '',
    entryTitle: isRepeatableGroupBlock(type) ? block.entryTitle?.trim() || template.entryTitle : '',
    titleSourceFieldId: validTitleSource ? block.titleSourceFieldId.trim() : '',
    fields: normalizedFields,
    layout: normalizeLayout(block.layout, template.layout),
    optionSource: isOptionBlock(type) && block.optionSource?.blockId?.trim() && block.optionSource?.fieldId?.trim()
      ? { blockId: block.optionSource.blockId.trim(), fieldId: block.optionSource.fieldId.trim() }
      : null,
    duplicateDetectionRole: isInputBlock(type) && !isSongBlock(type) && (block.duplicateDetectionRole === 'SONG_TITLE' || block.duplicateDetectionRole === 'SONG_ARTIST')
      ? block.duplicateDetectionRole
      : '',
    variants: normalizedVariants,
  };
}

function normalizeLayout(layout: Partial<SettingSheetBlockLayout> | undefined, fallback: SettingSheetBlockLayout): SettingSheetBlockLayout {
  const width = layout?.width;
  const normalizedWidth = width === 'third' || width === 'half' || width === 'two-thirds' || width === 'full'
    ? width
    : fallback.width;
  return {
    width: normalizedWidth,
    optionColumns: Math.min(3, Math.max(1, Number(layout?.optionColumns ?? fallback.optionColumns ?? 1))),
    optionFitContent: layout?.optionFitContent ?? fallback.optionFitContent ?? false,
  };
}

export function canAddBlock(_config: SettingSheetConfigResponse, _type: SettingSheetBlockType) {
  void _config;
  void _type;
  return true;
}

export function createEmptyLiveForm(defaultTenantId = ''): LiveFormValues {
  return {
    tenantId: { value: defaultTenantId },
    name: { value: '' },
    date: { value: '' },
    location: { value: '' },
    deadlineAt: { value: '' },
    status: { value: 'DRAFT' },
  };
}

export function createTenantScopedLiveForm(): LiveFormValues {
  return createEmptyLiveForm('');
}

export function createLiveFormFromResponse(live: LiveResponse): LiveFormValues {
  return {
    tenantId: { value: live.tenantId },
    name: { value: live.name },
    date: { value: live.date ?? '' },
    location: { value: live.location ?? '' },
    deadlineAt: { value: live.deadlineAt ? live.deadlineAt.slice(0, 16) : '' },
    status: { value: live.status },
  };
}

export function toLiveCreatePayload(tenantId: string, formValues: LiveFormValues) {
  return {
    tenantId,
    name: formValues.name.value,
    date: formValues.date.value || null,
    location: formValues.location.value || null,
    deadlineAt: formValues.deadlineAt.value || null,
    status: formValues.status.value,
  };
}

export function toLiveUpdatePayload(formValues: LiveFormValues) {
  return {
    name: formValues.name.value,
    date: formValues.date.value || null,
    location: formValues.location.value || null,
    deadlineAt: formValues.deadlineAt.value || null,
    status: formValues.status.value,
  };
}

export function buildPublicLiveUrl(publicToken: string) {
  return `${window.location.origin}/public/lives/${publicToken}`;
}

export function formatLiveDate(value: string | null) {
  if (!value) {
    return '未定';
  }

  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long' }).format(new Date(value));
}

export function formatDeadline(value: string | null) {
  if (!value) {
    return '未設定';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatOptionalText(value: string | null) {
  if (!value || !value.trim()) {
    return '未定';
  }

  return value;
}

export function isPublicSubmissionClosed(live: Pick<PublicLiveResponse, 'status' | 'deadlineAt'>) {
  if (live.status !== 'PUBLISHED') {
    return true;
  }

  if (!live.deadlineAt) {
    return false;
  }

  return new Date(live.deadlineAt).getTime() < Date.now();
}

export function getPublicSubmissionStatusMessage(live: Pick<PublicLiveResponse, 'status' | 'deadlineAt'>) {
  if (live.status === 'DRAFT') {
    return 'このライブはまだ公開準備中です。管理者が公開すると回答できるようになります。';
  }

  if (live.status === 'CLOSED') {
    return 'このライブの回答受付は終了しています。';
  }

  if (live.deadlineAt && new Date(live.deadlineAt).getTime() < Date.now()) {
    return '回答締切を過ぎたため、送信・更新はできません。';
  }

  return '';
}


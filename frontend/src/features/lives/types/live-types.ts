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
  items: Array<{ answers: SettingSheetSubmissionAnswerResponse[] }>;
}

export interface SettingSheetSubmissionResponse {
  id: string;
  recordLabel: string;
  submissionStatus: string;
  submittedAt: string;
}

export interface PublicSettingSheetSubmissionDetailResponse extends SettingSheetSubmissionResponse {
  answers: SettingSheetSubmissionAnswerResponse[];
  itunesLinks: ItunesLinkSelection[];
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

const DEFAULT_MEMBER_PART_OPTIONS = ['Vo', 'Gt', 'Ba', 'Dr', 'Key', 'Cho', 'DJ'];
const DEFAULT_SONG_PART_OPTIONS = ['Vo', 'Gt', 'Ba', 'Dr', 'Key', 'Cho', 'SE', '同期'];

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
      return { id: createId(), type, label: '繰り返しグループ', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'subtle', itemAppearance: 'outline', options: [], minItems: 0, addButtonLabel: '項目を追加', entryTitle: '項目', titleSourceFieldId: '', fields: [createBlockTemplate('SHORT_TEXT')], layout: createLayout('full', 1, false), optionSource: null, duplicateDetectionRole: '' };
    case 'SONG':
      return { id: createId(), type, label: '楽曲', description: '', hidden: false, publicVisible: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: createLayout('full', 1, false), optionSource: null, duplicateDetectionRole: '' };
  }
}

export const DEFAULT_SETTING_SHEET_CONFIG: SettingSheetConfigResponse = {
  title: 'バンド申請フォーム',
  description: '出演情報、メンバー、演奏曲を入力してください。',
  submitButtonLabel: '送信する',
  publicSubmissionEnabled: true,
  blocks: [
    { id: 'section-band', type: 'SECTION', label: 'バンド基本情報', description: 'バンド名、提出状況、備考を入力します。', hidden: false, required: false, collapsible: false, appearance: 'plain', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'full', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
    { id: 'band-name', type: 'SHORT_TEXT', label: 'バンド名', description: '', hidden: false, required: true, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
    { id: 'submission-status', type: 'SINGLE_SELECT', label: '提出状況', description: '', hidden: false, required: true, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: ['未完成', '完成'], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
    { id: 'detail', type: 'LONG_TEXT', label: '備考', description: '', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'full', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
    {
      id: 'members',
      type: 'REPEATABLE_GROUP',
      label: '出演者',
      description: '出演者と担当パートを入力します。',
      hidden: false,
      required: true,
      collapsible: true,
      appearance: 'subtle',
      itemAppearance: 'outline',
      options: [],
      minItems: 1,
      addButtonLabel: 'メンバー追加',
      entryTitle: 'メンバー',
      titleSourceFieldId: 'member-name',
      layout: { width: 'full', optionColumns: 1, optionFitContent: false },
      optionSource: null,
      duplicateDetectionRole: '',
      fields: [
        { id: 'member-name', type: 'SHORT_TEXT', label: '氏名', description: '', hidden: false, required: true, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
        { id: 'member-parts', type: 'MULTI_SELECT', label: '担当パート', description: '', hidden: false, required: true, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [...DEFAULT_MEMBER_PART_OPTIONS], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 2, optionFitContent: true }, optionSource: null, duplicateDetectionRole: '' },
        { id: 'member-representative', type: 'BOOLEAN', label: '代表者', description: '代表者にチェックを入れてください。', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
      ],
    },
    {
      id: 'songs',
      type: 'REPEATABLE_GROUP',
      label: '演奏する曲',
      description: '曲名、使用パート、マイク設定を入力します。',
      hidden: false,
      required: true,
      collapsible: true,
      appearance: 'subtle',
      itemAppearance: 'outline',
      options: [],
      minItems: 1,
      addButtonLabel: '曲を追加',
      entryTitle: '曲',
      titleSourceFieldId: 'song',
      layout: { width: 'full', optionColumns: 1, optionFitContent: false },
      optionSource: null,
      duplicateDetectionRole: '',
      fields: [
        { id: 'song', type: 'SONG', label: '楽曲', description: '', hidden: false, required: true, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'full', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
        { id: 'song-parts', type: 'MULTI_SELECT', label: '使うパート', description: '', hidden: false, required: true, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [...DEFAULT_SONG_PART_OPTIONS], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'full', optionColumns: 2, optionFitContent: true }, optionSource: null, duplicateDetectionRole: '' },
        { id: 'song-note-pa', type: 'LONG_TEXT', label: 'PAへの要望', description: '', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
        { id: 'song-note-light', type: 'LONG_TEXT', label: '照明への要望', description: '', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
        { id: 'song-note-other', type: 'LONG_TEXT', label: '備考', description: '', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'full', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
        {
          id: 'song-mics',
          type: 'REPEATABLE_GROUP',
          label: '使うマイク',
          description: '誰がどのマイクを使うか入力します。',
          hidden: false,
          required: false,
          collapsible: true,
          appearance: 'subtle',
          itemAppearance: 'outline',
          options: [],
          minItems: 0,
          addButtonLabel: 'マイク追加',
          entryTitle: 'マイク',
          titleSourceFieldId: 'mic-member',
          layout: { width: 'full', optionColumns: 1, optionFitContent: false },
          optionSource: null,
          duplicateDetectionRole: '',
          fields: [
            { id: 'mic-member', type: 'SINGLE_SELECT', label: '担当者', description: '出演者から選択します。', hidden: false, required: true, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: { blockId: 'members', fieldId: 'member-name' }, duplicateDetectionRole: '' },
            { id: 'mic-main-vocal', type: 'BOOLEAN', label: 'メインボーカル', description: '', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
          ],
        },
      ],
    },
    {
      id: 'mcs',
      type: 'REPEATABLE_GROUP',
      label: 'MC',
      description: 'MCの内容や担当者を入力します。',
      hidden: false,
      required: false,
      collapsible: true,
      appearance: 'subtle',
      itemAppearance: 'outline',
      options: [],
      minItems: 0,
      addButtonLabel: 'MCを追加',
      entryTitle: 'MC',
      titleSourceFieldId: 'mc-title',
      layout: { width: 'full', optionColumns: 1, optionFitContent: false },
      optionSource: null,
      duplicateDetectionRole: '',
      fields: [
        { id: 'mc-title', type: 'SHORT_TEXT', label: 'タイトル', description: '', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
        { id: 'mc-member', type: 'SINGLE_SELECT', label: '担当者', description: '出演者から選択します。', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'half', optionColumns: 1, optionFitContent: false }, optionSource: { blockId: 'members', fieldId: 'member-name' }, duplicateDetectionRole: '' },
        { id: 'mc-content', type: 'LONG_TEXT', label: '内容・備考', description: '', hidden: false, required: false, collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [], minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [], layout: { width: 'full', optionColumns: 1, optionFitContent: false }, optionSource: null, duplicateDetectionRole: '' },
      ],
    },
  ],
};

export function createTemplateSettingSheetConfig(): SettingSheetConfigResponse {
  return {
    ...DEFAULT_SETTING_SHEET_CONFIG,
    blocks: DEFAULT_SETTING_SHEET_CONFIG.blocks.map(cloneBlock),
  };
}

export function createEmptySettingSheetConfig(): SettingSheetConfigResponse {
  return {
    ...createTemplateSettingSheetConfig(),
    blocks: [],
  };
}

function normalizeOptions(values: string[] | undefined, fallback: string[] = []) {
  const normalized = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

function cloneBlock(block: SettingSheetBlock): SettingSheetBlock {
  return {
    ...block,
    options: [...block.options],
    fields: block.fields.map(cloneBlock),
    layout: { ...block.layout },
    optionSource: block.optionSource ? { ...block.optionSource } : null,
  };
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

export function normalizeSettingSheetConfig(config: SettingSheetConfigResponse | null | undefined): SettingSheetConfigResponse {
  if (!config) {
    return createTemplateSettingSheetConfig();
  }

  const blocks = (config.blocks ?? []).map((block, index) => normalizeBlock(block, `${index + 1}`));

  return {
    title: config.title?.trim() || DEFAULT_SETTING_SHEET_CONFIG.title,
    description: config.description?.trim() || DEFAULT_SETTING_SHEET_CONFIG.description,
    submitButtonLabel: config.submitButtonLabel?.trim() || DEFAULT_SETTING_SHEET_CONFIG.submitButtonLabel,
    publicSubmissionEnabled: config.publicSubmissionEnabled === true,
    blocks: config.blocks == null ? createTemplateSettingSheetConfig().blocks : blocks,
  };
}

function normalizeBlock(block: SettingSheetBlock, fallbackId: string): SettingSheetBlock {
  const type = SETTING_SHEET_BLOCK_OPTIONS.some((option) => option.value === block.type) ? block.type : ('SHORT_TEXT' as SettingSheetBlockType);
  const template = createBlockTemplate(type);
  const required = isInputBlock(type) || isRepeatableGroupBlock(type) ? block.required === true : false;
  const normalizedFields = canContainBlocks(type) ? (block.fields ?? []).map((child, index) => normalizeBlock(child, `${fallbackId}-${index + 1}`)) : [];
  const validTitleSource = isRepeatableGroupBlock(type)
    ? normalizedFields.some((field) => field.id === block.titleSourceFieldId?.trim() && canUseAsTitleSourceBlock(field.type))
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


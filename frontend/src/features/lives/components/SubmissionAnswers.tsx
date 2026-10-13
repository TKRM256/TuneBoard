/** 提出内容の読み取り専用の表示。見出しごとに「項目名 → 回答」を行で並べ、繰り返しは 1 件ずつ区切って並べる。開け閉めはさせない。 */
import type { ReactNode } from 'react';

import {
  isSectionBlock,
  isRepeatableGroupBlock,
  getGroupItemFields,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetSubmissionAnswerResponse,
} from '../types/live-types';
import { formatAnswerValue, resolveItemTitle } from '../helpers/submission-detail-helpers';

type Answers = PublicSettingSheetSubmissionDetailResponse['answers'];

/** 提出内容のすべて。見出しのない項目は、続けて並ぶ分をまとめて 1 つの表にする。 */
export function SubmissionAnswers({ blocks, answers, path }: { blocks: SettingSheetBlock[]; answers: Answers; path: string }) {
  const out: ReactNode[] = [];
  let loose: SettingSheetBlock[] = [];
  const flush = () => {
    if (loose.length === 0) return;
    out.push(<Rows key={`${path}-rows-${out.length}`} blocks={loose} answers={answers} path={`${path}-${out.length}`} />);
    loose = [];
  };
  for (const block of blocks) {
    if (!isSectionBlock(block.type)) {
      loose.push(block);
      continue;
    }
    flush();
    out.push(
      <section key={`${path}-${block.id}`} className="space-y-2">
        <div>
          <h3 className="text-base font-semibold">{block.label}</h3>
          {block.description ? <p className="mt-0.5 text-xs text-muted-foreground">{block.description}</p> : null}
        </div>
        <Rows blocks={block.fields} answers={answers} path={`${path}-${block.id}`} />
      </section>,
    );
  }
  flush();
  return <div className="space-y-8">{out}</div>;
}

function Rows({ blocks, answers, path }: { blocks: SettingSheetBlock[]; answers: Answers; path: string }) {
  const answerMap = new Map(answers.map((a) => [a.fieldId, a]));
  return (
    <dl className="divide-y">
      {blocks.map((block, index) => {
        const key = `${path}-${block.id}-${index}`;
        const answer = answerMap.get(block.id);
        if (isRepeatableGroupBlock(block.type)) return <GroupRow key={key} block={block} items={answer?.items ?? []} path={key} />;
        if (isSectionBlock(block.type)) {
          return (
            <div key={key} className="py-3">
              <p className="px-0.5 text-sm font-semibold">{block.label}</p>
              <Rows blocks={block.fields} answers={answers} path={key} />
            </div>
          );
        }
        return <FieldRow key={key} label={block.label} value={formatAnswerValue(answer?.values ?? [], block.type)} empty={!answer || answer.values.length === 0} />;
      })}
    </dl>
  );
}

function FieldRow({ label, value, empty }: { label: string; value: string; empty: boolean }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd className={empty ? 'text-sm text-muted-foreground' : 'whitespace-pre-wrap wrap-break-word text-sm'}>{value}</dd>
    </div>
  );
}

function GroupRow({ block, items, path }: { block: SettingSheetBlock; items: NonNullable<Answers[number]['items']>; path: string }) {
  return (
    <div className="space-y-2 py-3">
      <p className="text-sm font-semibold">
        {block.label}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{items.length}件</span>
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">未入力</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, itemIndex) => (
            <li key={`${path}-item-${itemIndex}`} className="rounded-lg bg-muted/50 p-2.5 sm:p-3">
              <p className="px-0.5 text-sm font-semibold">
                <span className="mr-2 text-xs font-normal text-muted-foreground tabular-nums">{itemIndex + 1}</span>
                {resolveItemTitle(block, item.answers, itemIndex)}
              </p>
              <ItemFields fields={getGroupItemFields(block, item.variantId ?? '')} answers={item.answers} path={`${path}-item-${itemIndex}`} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** 繰り返しの 1 件の中身。項目ごとに線で区切り、長い回答でも境目が分かるようにする。 */
function ItemFields({ fields, answers, path }: { fields: SettingSheetBlock[]; answers: SettingSheetSubmissionAnswerResponse[]; path: string }) {
  const answerMap = new Map(answers.map((a) => [a.fieldId, a]));
  return (
    <dl className="mt-2 divide-y overflow-hidden rounded-md border bg-background">
      {fields.map((field, index) => {
        const key = `${path}-${field.id}-${index}`;
        const answer = answerMap.get(field.id);
        if (isRepeatableGroupBlock(field.type) && (answer?.items?.length ?? 0) > 0) {
          return (
            <div key={key} className="px-3">
              <GroupRow block={field} items={answer?.items ?? []} path={key} />
            </div>
          );
        }
        const empty = isRepeatableGroupBlock(field.type) || !answer || answer.values.length === 0;
        return (
          <div key={key} className="grid gap-0.5 px-3 py-2 text-sm sm:grid-cols-[9rem_1fr] sm:gap-3">
            <dt className="text-xs text-muted-foreground sm:text-sm">{field.label}</dt>
            <dd className={empty ? 'text-muted-foreground' : 'whitespace-pre-wrap wrap-break-word'}>
              {isRepeatableGroupBlock(field.type) ? '未入力' : formatAnswerValue(answer?.values ?? [], field.type)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** 貼り付けられた編集用リンクから、公開トークンと提出IDを取り出す。 */

const SUBMISSION_LINK = /public\/lives\/([^/?#\s]+)\/submissions\/([0-9a-fA-F-]{36})/;

export interface SubmissionLinkTarget {
  publicToken: string;
  submissionId: string;
}

export function parseSubmissionLink(input: string): SubmissionLinkTarget | null {
  const matched = SUBMISSION_LINK.exec(input.trim());
  if (!matched) {
    return null;
  }
  return { publicToken: matched[1], submissionId: matched[2] };
}

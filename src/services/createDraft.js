import { AUDIENCES, REPLY_POLICIES } from '../domain/models';

export function createEmptyDraft() {
  return {
    id: undefined,
    text: '',
    media: [],
    audio: undefined,
    background: undefined,
    audience: AUDIENCES[0],
    replyPolicy: REPLY_POLICIES[0],
    status: 'draft',
  };
}

export function normalizeDraft(input = {}) {
  return {
    ...createEmptyDraft(),
    ...input,
    text: String(input.text || ''),
    media: Array.isArray(input.media) ? input.media : [],
    status: input.status || 'draft',
  };
}

export function canPublishDraft(draft) {
  const normalized = normalizeDraft(draft);
  return Boolean(normalized.text.trim() || normalized.media.length || normalized.audio || normalized.background);
}

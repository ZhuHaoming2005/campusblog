export const EDITOR_POST_TAG_LIMIT = 8
export const EDITOR_POST_TAG_NAME_MAX_LENGTH = 40

export function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

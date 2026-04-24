type RelationValue = number | string | { id?: number | string | null } | null | undefined

function toNumericId(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

export function resolveCoverImageForQuota(args: {
  existingCoverImage: RelationValue
  submittedCoverImage: string | number | null | undefined
}) {
  if (args.submittedCoverImage === undefined) {
    return toRelationId(args.existingCoverImage)
  }

  return toNumericId(args.submittedCoverImage)
}

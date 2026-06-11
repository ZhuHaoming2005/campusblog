import { APIError, type CollectionBeforeValidateHook } from 'payload'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type UserSchoolData = {
  school?: RelationValue
}

const extractRelationID = (value: RelationValue): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

export const validateUserSchool: CollectionBeforeValidateHook = async ({ data, req }) => {
  const nextData = (data ?? {}) as UserSchoolData

  if (!Object.prototype.hasOwnProperty.call(nextData, 'school')) return data
  if (nextData.school == null || nextData.school === '') return data

  const schoolID = extractRelationID(nextData.school)
  if (!schoolID) {
    throw new APIError('School must be active.', 400)
  }

  const activeSchool = await req.payload.find({
    collection: 'schools',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        {
          id: {
            equals: schoolID,
          },
        },
        {
          isActive: {
            equals: true,
          },
        },
      ],
    },
  })

  if (activeSchool.docs.length === 0) {
    throw new APIError('School must be active.', 400)
  }

  const activeSchoolDoc = activeSchool.docs[0] as { id?: number | string } | undefined
  if (!activeSchoolDoc || (typeof activeSchoolDoc.id !== 'number' && typeof activeSchoolDoc.id !== 'string')) {
    throw new APIError('School must be active.', 400)
  }

  nextData.school = activeSchoolDoc.id
  return nextData
}

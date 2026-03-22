import type { CollectionBeforeValidateHook } from 'payload'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type PostRelationData = {
  school?: RelationValue
  subChannel?: RelationValue
}

const extractRelationID = (value: RelationValue): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

export const validatePostChannelRelation: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const nextData = (data ?? {}) as PostRelationData
  const previousData = (originalDoc ?? {}) as PostRelationData

  const schoolID = extractRelationID(nextData.school) ?? extractRelationID(previousData.school)
  const subChannelID =
    extractRelationID(nextData.subChannel) ?? extractRelationID(previousData.subChannel)

  if (!subChannelID) return data
  if (!schoolID) {
    throw new Error('Please select a school before selecting a sub channel.')
  }

  const subChannel = await req.payload.findByID({
    collection: 'school-sub-channels',
    id: subChannelID,
    depth: 0,
    req,
  })

  const subChannelSchoolID = extractRelationID((subChannel as PostRelationData).school)

  if (!subChannelSchoolID || String(subChannelSchoolID) !== String(schoolID)) {
    throw new Error('Selected sub channel does not belong to the selected school.')
  }

  return data
}

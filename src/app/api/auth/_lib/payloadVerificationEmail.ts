import { createLocalReq, type Payload, type TypedUser } from 'payload'

type VerificationUser = Record<string, unknown> & {
  email: string
}

function buildAdminVerificationURL(args: {
  adminRoute: string
  collectionSlug: string
  serverURL: string
  token: string
}) {
  const adminBase = args.adminRoute.replace(/\/$/, "")
  const path = `${adminBase}/${args.collectionSlug}/verify/${args.token}`.replace(/\/{2,}/g, '/')
  return new URL(path, args.serverURL).toString()
}

export async function sendVerificationEmail(args: {
  collectionSlug: keyof Payload['collections'] & string
  context?: Record<string, unknown>
  payload: Payload
  requestHeaders?: Headers
  requestURL?: string
  token: string
  user: VerificationUser
}) {
  const collection = args.payload.collections[args.collectionSlug]
  const authConfig = collection?.config.auth

  if (!collection || !authConfig?.verify || !args.user.email) {
    return
  }

  const verifyConfig = authConfig.verify === true ? null : authConfig.verify

  const req = await createLocalReq(
    {
      context: args.context,
      req: {
        headers: args.requestHeaders ?? new Headers(),
        url: args.requestURL,
      },
    },
    args.payload,
  )

  const verificationURL = buildAdminVerificationURL({
    adminRoute: args.payload.config.routes.admin,
    collectionSlug: collection.config.slug,
    serverURL: req.origin || args.payload.config.serverURL,
    token: args.token,
  })

  let html = `${req.t('authentication:newAccountCreated', {
    serverURL: args.payload.config.serverURL,
    verificationURL,
  })}`

  if (typeof verifyConfig?.generateEmailHTML === 'function') {
    html = await verifyConfig.generateEmailHTML({
      req,
      token: args.token,
      user: args.user as unknown as TypedUser,
    })
  }

  let subject = req.t('authentication:verifyYourEmail')

  if (typeof verifyConfig?.generateEmailSubject === 'function') {
    subject = await verifyConfig.generateEmailSubject({
      req,
      token: args.token,
      user: args.user as unknown as TypedUser,
    })
  }

  await args.payload.email.sendEmail({
    from: `"${args.payload.email.defaultFromName}" <${args.payload.email.defaultFromAddress}>`,
    html,
    subject,
    to: args.user.email,
  })
}

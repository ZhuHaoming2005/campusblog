import type { EmailAdapter, SendEmailOptions } from 'payload'

import { writeEmailDebugRecord } from './emailDebug'

type CloudflareEmailBindingMessage = {
  content?: string
  from: string
  html?: string
  subject: string
  text?: string
  to: string
}

type CloudflareEmailBinding = {
  send: (message: CloudflareEmailBindingMessage) => Promise<unknown>
}

type KVLike = {
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<unknown>
}

type AdapterArgs = {
  allowRealDelivery?: boolean
  debug?: boolean
  debugPrintFullURLs?: boolean
  defaultFromAddress: string
  defaultFromName: string
  emailBinding?: CloudflareEmailBinding | null
  kv?: KVLike
}

function formatFromAddress(name: string, address: string): string {
  return name ? `${name} <${address}>` : address
}

function getPrimaryRecipient(to: SendEmailOptions['to']): string {
  if (typeof to === 'string') return to
  if (Array.isArray(to)) {
    const first = to[0]
    if (typeof first === 'string') return first
    if (first && typeof first === 'object' && 'address' in first) return String(first.address)
  }
  if (to && typeof to === 'object' && 'address' in to) return String(to.address)

  throw new Error('Cloudflare email adapter requires a recipient address')
}

export function createCloudflareEmailAdapter(args: AdapterArgs): EmailAdapter {
  if (!args.defaultFromAddress.trim()) {
    throw new Error('AUTH_EMAIL_FROM_ADDRESS must be configured')
  }

  return ({ payload }) => ({
    defaultFromAddress: args.defaultFromAddress,
    defaultFromName: args.defaultFromName,
    name: 'cloudflare-email-service',
    async sendEmail(message) {
      const allowRealDelivery = args.allowRealDelivery ?? true
      const recipient = getPrimaryRecipient(message.to)
      const fullURL =
        message.html?.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ??
        message.text?.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ??
        null

      if (args.debug && !allowRealDelivery) {
        if (args.debugPrintFullURLs && fullURL) {
          console.info(
            JSON.stringify({
              msg: 'Auth email skipped during debug delivery mode',
              subject: message.subject,
              to: recipient,
              url: fullURL,
            }),
          )
        }

        await writeEmailDebugRecord({
          kv: args.kv,
          logger: payload.logger,
          payload: {
            html: message.html,
            redactDestinationURL: !args.debugPrintFullURLs,
            recipient,
            status: 'skipped',
            subject: message.subject,
            text: message.text,
          },
        })

        return { skipped: true }
      }

      if (!args.emailBinding) {
        throw new Error('Cloudflare send_email binding is required')
      }

      const result = await args.emailBinding.send({
        content: message.text ?? undefined,
        from: formatFromAddress(args.defaultFromName, args.defaultFromAddress),
        html: message.html ?? undefined,
        subject: message.subject,
        text: message.text ?? undefined,
        to: recipient,
      })

      if (args.debug) {
        await writeEmailDebugRecord({
          kv: args.kv,
          logger: payload.logger,
          payload: {
            html: message.html,
            redactDestinationURL: !args.debugPrintFullURLs,
            recipient,
            status: 'delivered',
            subject: message.subject,
            text: message.text,
          },
        })
      }

      return result
    },
  })
}

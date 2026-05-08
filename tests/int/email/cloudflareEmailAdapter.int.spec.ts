import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMock = vi.fn()
const putMock = vi.fn()
const loggerInfoMock = vi.fn()
const consoleInfoMock = vi.spyOn(console, 'info').mockImplementation(() => {})

describe('cloudflareEmailAdapter', () => {
  beforeEach(() => {
    sendMock.mockReset()
    putMock.mockReset()
    loggerInfoMock.mockReset()
    consoleInfoMock.mockClear()
  })

  it('prefers the Workers send_email binding and stores only redacted debug metadata', async () => {
    const { createCloudflareEmailAdapter } = await import('@/email/cloudflareEmailAdapter')

    const adapter = createCloudflareEmailAdapter({
      debug: true,
      defaultFromAddress: 'noreply@campusblog.net',
      defaultFromName: 'CampusBlog',
      emailBinding: { send: sendMock },
      kv: { put: putMock },
    })({
      payload: {
        logger: {
          info: loggerInfoMock,
        },
      } as never,
    })

    sendMock.mockResolvedValue({ messageId: 'cf-msg-1' })

    await adapter.sendEmail({
      html: '<p><a href="https://campusblog.net/verify?token=super-secret-token">Verify</a></p>',
      subject: 'Verify your email',
      text: 'Verify your email: https://campusblog.net/verify?token=super-secret-token',
      to: 'user@example.com',
    })

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'CampusBlog <noreply@campusblog.net>',
        html: '<p><a href="https://campusblog.net/verify?token=super-secret-token">Verify</a></p>',
        subject: 'Verify your email',
        text: 'Verify your email: https://campusblog.net/verify?token=super-secret-token',
        to: 'user@example.com',
      }),
    )

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:debug-email:/),
      expect.any(String),
      expect.objectContaining({ expirationTtl: 900 }),
    )

    const serializedRecord = putMock.mock.calls[0]?.[1]
    expect(serializedRecord).toContain('user@example.com')
    expect(serializedRecord).toContain('Verify your email')
    expect(serializedRecord).toContain('supe...[redacted]')
    expect(serializedRecord).not.toContain('super-secret-token')
    expect(serializedRecord).not.toContain('https://campusblog.net/verify?token=super-secret-token')
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authEmail: expect.objectContaining({
          status: 'delivered',
          templateType: 'verify-email',
        }),
      }),
    )
  })

  it('prints and stores full auth URLs in debug mode when full URL logging is enabled', async () => {
    const { createCloudflareEmailAdapter } = await import('@/email/cloudflareEmailAdapter')

    const adapter = createCloudflareEmailAdapter({
      allowRealDelivery: false,
      debug: true,
      debugPrintFullURLs: true,
      defaultFromAddress: 'noreply@campusblog.net',
      defaultFromName: 'CampusBlog',
      emailBinding: { send: sendMock },
      kv: { put: putMock },
    })({
      payload: {
        logger: {
          info: loggerInfoMock,
        },
      } as never,
    })

    const result = await adapter.sendEmail({
      subject: 'Reset your password',
      text: 'Visit https://campusblog.net/reset-password?token=full-reset-token',
      to: 'user@example.com',
    })

    expect(result).toEqual({ skipped: true })
    expect(sendMock).not.toHaveBeenCalled()
    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0]?.[1]).toContain('"status":"skipped"')
    expect(putMock.mock.calls[0]?.[1]).toContain(
      'https://campusblog.net/reset-password?token=full-reset-token',
    )
    expect(consoleInfoMock).toHaveBeenCalledWith(
      JSON.stringify({
        msg: 'Auth email skipped during debug delivery mode',
        subject: 'Reset your password',
        to: 'user@example.com',
        url: 'https://campusblog.net/reset-password?token=full-reset-token',
      }),
    )
  })

  it('requires the Cloudflare send_email binding when delivery is enabled', async () => {
    const { createCloudflareEmailAdapter } = await import('@/email/cloudflareEmailAdapter')

    const adapter = createCloudflareEmailAdapter({
      defaultFromAddress: 'noreply@campusblog.net',
      defaultFromName: 'CampusBlog',
    })({
      payload: {
        logger: {
          info: loggerInfoMock,
        },
      } as never,
    })

    await expect(
      adapter.sendEmail({
        subject: 'Verify your email',
        text: 'Verify',
        to: 'user@example.com',
      }),
    ).rejects.toThrow('Cloudflare send_email binding is required')
  })

  it('fails fast when the default from address is missing', async () => {
    const { createCloudflareEmailAdapter } = await import('@/email/cloudflareEmailAdapter')

    expect(() =>
      createCloudflareEmailAdapter({
        defaultFromAddress: '',
        defaultFromName: 'CampusBlog',
      }),
    ).toThrow('AUTH_EMAIL_FROM_ADDRESS must be configured')
  })
})

import { getCloudflareContext } from '@opennextjs/cloudflare'

type RuntimeBindings = object | null | undefined
type RuntimeProcessEnv = Record<string, string | undefined> | undefined

type ReadRuntimeEnvOptions<TBindings extends RuntimeBindings = RuntimeBindings> = {
  bindings?: TBindings
  fallback?: string
  processEnv?: RuntimeProcessEnv
}

function normalizeRuntimeEnvValue(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function readBindingValue(key: string, bindings: RuntimeBindings) {
  return normalizeRuntimeEnvValue((bindings as Record<string, unknown> | undefined)?.[key])
}

export function readRuntimeEnvString<TBindings extends RuntimeBindings = RuntimeBindings>(
  key: string,
  options: ReadRuntimeEnvOptions<TBindings> = {},
) {
  const bindingValue = readBindingValue(key, options.bindings)
  if (bindingValue !== undefined) {
    return bindingValue
  }

  const processValue = normalizeRuntimeEnvValue(options.processEnv?.[key])
  if (processValue !== undefined) {
    return processValue
  }

  return options.fallback ?? ''
}

export function readRuntimeEnvFlag(
  key: string,
  options: Omit<ReadRuntimeEnvOptions, 'fallback'> & { fallback?: boolean } = {},
) {
  const raw = readRuntimeEnvString(key, {
    bindings: options.bindings,
    fallback: '',
    processEnv: options.processEnv,
  })
    .trim()
    .toLowerCase()

  if (['1', 'true', 'yes', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'off', ''].includes(raw)) return false

  return options.fallback ?? false
}

export function readRuntimeEnvList(
  key: string,
  options: ReadRuntimeEnvOptions & { delimiter?: string } = {},
) {
  return readRuntimeEnvString(key, options)
    .split(options.delimiter ?? ',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export async function getCloudflareRuntimeBindings() {
  try {
    const context = await getCloudflareContext({ async: true })
    return context.env as unknown as Record<string, unknown>
  } catch {
    return undefined
  }
}

export async function readCloudflareRuntimeEnvString(
  key: string,
  options: Omit<ReadRuntimeEnvOptions, 'bindings'> & { bindings?: RuntimeBindings } = {},
) {
  const bindings = options.bindings ?? (await getCloudflareRuntimeBindings())

  return readRuntimeEnvString(key, {
    bindings,
    fallback: options.fallback,
    processEnv: options.processEnv,
  })
}

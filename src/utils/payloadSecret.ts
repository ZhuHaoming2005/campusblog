type SecretSource = {
  PAYLOAD_SECRET?: string | null
}

type ResolvePayloadSecretArgs = {
  processEnv?: SecretSource
  cloudflareEnv?: SecretSource
}

export function resolvePayloadSecret({
  processEnv,
  cloudflareEnv,
}: ResolvePayloadSecretArgs): string {
  return processEnv?.PAYLOAD_SECRET || cloudflareEnv?.PAYLOAD_SECRET || ''
}

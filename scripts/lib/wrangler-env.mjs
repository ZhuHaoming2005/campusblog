import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

function parseWranglerConfigText(configText) {
  const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', configText)
  if (parsed.error) {
    const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n')
    throw new Error(`Failed to parse wrangler.jsonc: ${message}`)
  }

  return parsed.config ?? {}
}

function normalizeVars(vars) {
  if (!vars || typeof vars !== 'object' || Array.isArray(vars)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(vars).flatMap(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return [[key, String(value)]]
      }

      return []
    }),
  )
}

export function parseWranglerEnvironmentVars(configText, environment) {
  const config = parseWranglerConfigText(configText)

  if (!environment) {
    return normalizeVars(config.vars)
  }

  const namedEnvironment = config.env?.[environment]
  if (!namedEnvironment || typeof namedEnvironment !== 'object' || Array.isArray(namedEnvironment)) {
    throw new Error(`Missing Wrangler environment: ${environment}`)
  }

  return normalizeVars(namedEnvironment.vars)
}

export function readWranglerEnvironmentVars(configPath, environment) {
  const resolvedPath = path.resolve(configPath)
  return parseWranglerEnvironmentVars(fs.readFileSync(resolvedPath, 'utf8'), environment)
}

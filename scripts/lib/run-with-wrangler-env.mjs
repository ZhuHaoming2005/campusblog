import { spawn } from 'node:child_process'
import path from 'node:path'
import { readWranglerEnvironmentVars } from './wrangler-env.mjs'

function hasPathSeparator(value) {
  return value.includes('/') || value.includes('\\')
}

function hasKnownExtension(value) {
  return path.extname(value).length > 0
}

export function resolveCommandForPlatform(command, platform = process.platform) {
  if (platform !== 'win32') {
    return command
  }

  if (hasPathSeparator(command) || hasKnownExtension(command)) {
    return command
  }

  return `${command}.cmd`
}

function needsCmdShim(command, platform = process.platform) {
  return platform === 'win32' && /\.(cmd|bat)$/i.test(command)
}

function quoteForCmd(value) {
  if (value.length === 0) {
    return '""'
  }

  const escaped = value
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\+)$/g, '$1$1')

  if (!/[\s"&|<>^()]/.test(escaped)) {
    return escaped
  }

  return `"${escaped}"`
}

function buildCmdCommandLine(command, args) {
  return [command, ...args].map(quoteForCmd).join(' ')
}

export function resolveSpawnSpec(command, args = [], options = {}) {
  const platform = options.platform ?? process.platform
  const resolvedCommand = resolveCommandForPlatform(command, platform)

  if (!needsCmdShim(resolvedCommand, platform)) {
    return {
      args,
      command: resolvedCommand,
    }
  }

  return {
    args: [
      '/d',
      '/s',
      '/c',
      buildCmdCommandLine(resolvedCommand, args),
    ],
    command: options.comSpec ?? process.env.ComSpec ?? 'cmd.exe',
  }
}

/**
 * @param {Record<string, string | undefined>} [processEnv]
 * @param {string} [cwd]
 */
export function createWranglerEnv(processEnv = process.env, cwd = process.cwd()) {
  const environment = processEnv.CLOUDFLARE_ENV || undefined
  const wranglerConfigPath = path.resolve(cwd, 'wrangler.jsonc')

  return {
    ...processEnv,
    ...readWranglerEnvironmentVars(wranglerConfigPath, environment),
  }
}

/**
 * @param {string} command
 * @param {string[]} [args]
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, stdio?: import('node:child_process').StdioOptions }} [options]
 */
export function runWithWranglerEnv(command, args = [], options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const env = createWranglerEnv(options.env ?? process.env, cwd)
  const spawnSpec = resolveSpawnSpec(command, args, options)

  return spawn(spawnSpec.command, spawnSpec.args, {
    cwd,
    env,
    shell: false,
    stdio: options.stdio ?? 'inherit',
  })
}

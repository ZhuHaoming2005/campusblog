import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const WRANGLER_ENV_ALIASES = new Set(['', 'production', 'prod'])

function stripJsonc(source) {
  let output = ''
  let inString = false
  let quote = ''
  let escaped = false

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    const next = source[i + 1]

    if (inString) {
      output += char

      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        inString = false
        quote = ''
      }

      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      quote = char
      output += char
      continue
    }

    if (char === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1
      output += '\n'
      continue
    }

    if (char === '/' && next === '*') {
      i += 2
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1
      i += 1
      continue
    }

    output += char
  }

  return output.replace(/,\s*([}\]])/g, '$1')
}

function readWranglerConfig() {
  const configPath = resolve(process.cwd(), 'wrangler.jsonc')
  return JSON.parse(stripJsonc(readFileSync(configPath, 'utf8')))
}

function getWranglerVars(config, environmentName) {
  if (WRANGLER_ENV_ALIASES.has(environmentName)) {
    return config.vars ?? {}
  }

  const envConfig = config.env?.[environmentName]
  if (!envConfig) {
    const available = Object.keys(config.env ?? {})
    const suffix = available.length ? ` Available environments: ${available.join(', ')}.` : ''
    throw new Error(`wrangler.jsonc has no env.${environmentName}.${suffix}`)
  }

  return envConfig.vars ?? {}
}

function resolveCommand(command) {
  if (process.platform !== 'win32' || command.includes('\\') || command.includes('/')) {
    return command
  }

  const extensions = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .filter(Boolean)
  const paths = (process.env.PATH ?? '').split(';').filter(Boolean)

  for (const directory of paths) {
    for (const extension of ['', ...extensions]) {
      const candidate = resolve(directory, `${command}${extension}`)
      if (existsSync(candidate)) return candidate
    }
  }

  return command
}

const separatorIndex = process.argv.indexOf('--')
const commandArgs = separatorIndex === -1 ? process.argv.slice(2) : process.argv.slice(separatorIndex + 1)

if (commandArgs.length === 0) {
  throw new Error('Usage: node scripts/with-wrangler-env.mjs -- <command> [...args]')
}

const environmentName = (process.env.CLOUDFLARE_ENV ?? '').trim()
const config = readWranglerConfig()
const wranglerVars = getWranglerVars(config, environmentName)
const env = {
  ...process.env,
  ...Object.fromEntries(Object.entries(wranglerVars).map(([key, value]) => [key, String(value)])),
}

const child = spawn(resolveCommand(commandArgs[0]), commandArgs.slice(1), {
  env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})

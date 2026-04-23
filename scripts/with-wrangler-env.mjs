import { spawn } from 'node:child_process'
import path from 'node:path'
import { readWranglerEnvironmentVars } from './lib/wrangler-env.mjs'

const [command, ...args] = process.argv.slice(2)

if (!command) {
  console.error('Usage: node scripts/with-wrangler-env.mjs <command> [...args]')
  process.exit(1)
}

const environment = process.env.CLOUDFLARE_ENV || undefined
const wranglerConfigPath = path.resolve(process.cwd(), 'wrangler.jsonc')
const wranglerVars = readWranglerEnvironmentVars(wranglerConfigPath, environment)

const child = spawn(command, args, {
  env: {
    ...process.env,
    ...wranglerVars,
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})

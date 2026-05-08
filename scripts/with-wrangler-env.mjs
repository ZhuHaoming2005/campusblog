import { runWithWranglerEnv } from './lib/run-with-wrangler-env.mjs'

const [command, ...args] = process.argv.slice(2)

if (!command) {
  console.error('Usage: node scripts/with-wrangler-env.mjs <command> [...args]')
  process.exit(1)
}

const child = runWithWranglerEnv(command, args)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})

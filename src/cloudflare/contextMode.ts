import fs from 'fs'
import path from 'path'

export type ResolveRealPath = (value: string) => string | undefined
type RuntimeEnv = Record<string, string | undefined>

export const resolveRealPath: ResolveRealPath = (value) =>
  fs.existsSync(value) ? fs.realpathSync(value) : undefined

export function isPayloadCLIProcess(
  argv = process.argv,
  realpath: ResolveRealPath = resolveRealPath,
) {
  return argv.some((value) => realpath(value)?.endsWith(path.join('payload', 'bin.js')) ?? false)
}

export function isNextBuildProcess(
  argv = process.argv,
  realpath: ResolveRealPath = resolveRealPath,
) {
  const isNextBinary = argv.some(
    (value) => realpath(value)?.endsWith(path.join('next', 'dist', 'bin', 'next')) ?? false,
  )

  return isNextBinary && argv.includes('build')
}

export function isNextProductionBuildPhase(env: RuntimeEnv = process.env) {
  return env.NEXT_PHASE === 'phase-production-build'
}

export function isPackageBuildLifecycle(env: RuntimeEnv = process.env) {
  return env.npm_lifecycle_event === 'build'
}

export function shouldUseBuildTimeBindings(args: {
  argv?: string[]
  env?: RuntimeEnv
  realpath?: ResolveRealPath
}) {
  return (
    isNextBuildProcess(args.argv ?? process.argv, args.realpath ?? resolveRealPath) ||
    isNextProductionBuildPhase(args.env ?? process.env) ||
    isPackageBuildLifecycle(args.env ?? process.env)
  )
}

export function shouldUseWranglerPlatformProxy(args: {
  argv?: string[]
  env?: RuntimeEnv
  nodeEnv?: string
  realpath?: ResolveRealPath
}) {
  const argv = args.argv ?? process.argv
  const env = args.env ?? process.env
  const realpath = args.realpath ?? resolveRealPath
  const isProduction = args.nodeEnv === 'production'

  return (
    isPayloadCLIProcess(argv, realpath) ||
    (!isProduction &&
      !shouldUseBuildTimeBindings({
        argv,
        env,
        realpath,
      }))
  )
}

export function shouldUseRemoteBindings(args: {
  argv?: string[]
  env?: RuntimeEnv
  nodeEnv?: string
  realpath?: ResolveRealPath
}) {
  if (args.nodeEnv !== 'production') return false

  return (
    !shouldUseBuildTimeBindings({
      argv: args.argv ?? process.argv,
      env: args.env ?? process.env,
      realpath: args.realpath ?? resolveRealPath,
    })
  )
}

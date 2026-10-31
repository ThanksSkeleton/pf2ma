import { listArchetypes } from '../src/data-builder.ts'
import { loadSources, realizeMonster } from './realized-monster-data.ts'

async function main() {
  const args = process.argv.slice(2)
  if (args.length % 2 !== 0) throw new Error('Usage: npm run realize:all-level-1 -- [--physical <type>] [--nonphysical <type>]')
  const options = new Map<string, string>()
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
    const value = args[i + 1]
    if ((key !== '--physical' && key !== '--nonphysical') || !value || options.has(key)) {
      throw new Error('Usage: npm run realize:all-level-1 -- [--physical <type>] [--nonphysical <type>]')
    }
    options.set(key, value)
  }
  const physical = options.get('--physical') ?? 'piercing'
  const nonphysical = options.get('--nonphysical') ?? 'fire'
  const sources = await loadSources()
  const monsters = listArchetypes(sources).map((name) => realizeMonster(sources, name, 1, physical, nonphysical))
  process.stdout.write(`${JSON.stringify(monsters, null, 2)}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

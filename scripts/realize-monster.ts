import { listArchetypes } from '../src/data-builder.ts'
import { loadSources, realizeMonster } from './realized-monster-data.ts'

function usage(): never {
  throw new Error([
    'Usage: npm run realize:monster -- --archetype <name> --physical <type> --nonphysical <type> --level <number>',
    'Example: npm run realize:monster -- --archetype Summoner --physical slashing --nonphysical fire --level 5',
  ].join('\n'))
}

function readOptions(args: string[]) {
  const options = new Map<string, string>()
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
    const value = args[i + 1]
    if (!key?.startsWith('--') || !value || options.has(key)) usage()
    options.set(key.slice(2), value)
  }
  const archetype = options.get('archetype')
  const physical = options.get('physical')
  const nonphysical = options.get('nonphysical')
  const level = Number(options.get('level'))
  if (options.size !== 4 || !archetype || !physical || !nonphysical || !Number.isInteger(level)) usage()
  return { archetype, physical, nonphysical, level }
}

async function main() {
  const { archetype, physical, nonphysical, level } = readOptions(process.argv.slice(2))
  const physicalTypes = ['piercing', 'slashing', 'bludgeoning']
  const nonphysicalTypes = ['acid', 'cold', 'electricity', 'fire', 'sonic', 'force', 'mental', 'poison', 'bleed', 'spirit', 'vitality', 'void']
  if (!physicalTypes.includes(physical)) throw new Error(`Unsupported physical damage type: ${physical}. Choose: ${physicalTypes.join(', ')}`)
  if (!nonphysicalTypes.includes(nonphysical)) throw new Error(`Unsupported nonphysical damage type: ${nonphysical}. Choose: ${nonphysicalTypes.join(', ')}`)

  const sources = await loadSources()
  if (!listArchetypes(sources).includes(archetype)) {
    throw new Error(`Unknown archetype: ${archetype}. Available archetypes: ${listArchetypes(sources).join(', ')}`)
  }
  const creature = realizeMonster(sources, archetype, level, physical, nonphysical)
  // Match the page's creature object, omitting its UI controls and HTML presentation.
  process.stdout.write(`${JSON.stringify(creature, null, 2)}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

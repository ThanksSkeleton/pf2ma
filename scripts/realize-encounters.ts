import { listArchetypes, parseCsv } from '../src/data-builder.ts'
import { encounterTemplates, rollEncounter, validPartyLevels } from '../src/encounter.ts'
import { loadSources, realizeMonster } from './realized-monster-data.ts'

const physicalTypes = ['piercing', 'slashing', 'bludgeoning']
const nonphysicalTypes = ['acid', 'cold', 'electricity', 'fire', 'sonic', 'force', 'mental', 'poison', 'bleed', 'spirit', 'vitality', 'void']

function usage(): never {
  throw new Error('Usage: npm run realize:encounters -- --count <positive integer> --level <party level -1 through 24> [--physical <type>] [--nonphysical <type>]')
}

function readOptions(args: string[]) {
  if (args.length % 2 !== 0) usage()
  const options = new Map<string, string>()
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]
    const value = args[index + 1]
    if (!['--count', '--level', '--physical', '--nonphysical'].includes(key) || !value || options.has(key)) usage()
    options.set(key, value)
  }
  const count = Number(options.get('--count'))
  const level = Number(options.get('--level'))
  if (!options.has('--count') || !Number.isSafeInteger(count) || count < 1 ||
    !options.has('--level') || !Number.isInteger(level) || level < -1 || level > 24) usage()
  const physical = options.get('--physical') ?? 'piercing'
  const nonphysical = options.get('--nonphysical') ?? 'fire'
  if (!physicalTypes.includes(physical)) throw new Error(`Unsupported physical damage type: ${physical}. Choose: ${physicalTypes.join(', ')}`)
  if (!nonphysicalTypes.includes(nonphysical)) throw new Error(`Unsupported nonphysical damage type: ${nonphysical}. Choose: ${nonphysicalTypes.join(', ')}`)
  return { count, level, physical, nonphysical }
}

async function main() {
  const { count, level, physical, nonphysical } = readOptions(process.argv.slice(2))
  const sources = await loadSources()
  const names = new Set(listArchetypes(sources))
  const archetypes = parseCsv(sources['RoadMaps_Prod.csv'])
    .filter((row) => names.has(row['Road Map']))
    .map((row) => ({
      name: row['Road Map'], role: row.Role,
      traits: row.ArchetypeTraits?.split(',').map((trait) => trait.trim()).filter(Boolean) ?? [],
    }))
  const available = encounterTemplates.filter((template) => validPartyLevels(template).includes(level))
  const encounters = Array.from({ length: count }, () => {
    const template = available[Math.floor(Math.random() * available.length)]
    const groups = rollEncounter(template, level, archetypes)
    return {
      encounter: template.name,
      partyLevel: level,
      xp: template.xp,
      monsters: groups.map((group) => ({
        count: group.count,
        ...(group.mode ? { mode: group.mode } : {}),
        creature: realizeMonster(sources, group.name, group.level, physical, nonphysical),
      })),
    }
  })
  process.stdout.write(`${JSON.stringify(encounters, null, 2)}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

import type { AbilityCard, Archetype } from './archetype.ts'

type Row = Record<string, string>
export type CsvSources = Readonly<Record<string, string>>

/** Parse quoted CSV cells, including escaped quotes, CRLF, and embedded newlines. */
export function parseCsv(source: string): Row[] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  const text = source.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(cell); cell = ''
      if (char !== ',') {
        if (char === '\r' && text[i + 1] === '\n') i++
        if (row.some(Boolean)) rows.push(row)
        row = []
      }
    } else cell += char
  }
  if (quoted) throw new Error('Unterminated CSV quote')
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const headers = rows.shift() ?? []
  return rows.map((cells) => {
    if (cells.length !== headers.length) throw new Error('CSV row has an unexpected column count')
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]))
  })
}

/** Initial builder scope: Ace level 1. Blank ranks use the specification's Moderate default. */
export function buildAce(sources: CsvSources, level = 1): Archetype {
  if (level !== 1) throw new Error('Only level 1 Ace is supported in this comparison pass')
  const table = (file: string) => {
    if (sources[file] === undefined) throw new Error(`Missing CSV: ${file}`)
    return parseCsv(sources[file])
  }
  const find = (file: string, key: string, value: string) => {
    const row = table(file).find((candidate) => candidate[key] === value)
    if (!row) throw new Error(`Missing ${key}=${value} in ${file}`)
    return row
  }
  const roadmap = find('RoadMaps_Prod.csv', 'Road Map', 'Ace')
  const narrative = find('TacticsAndDescription.csv', 'archetype', 'Ace')
  const benchmark = (file: string, rank: string, suffix = '') => {
    const column = `${rank || 'Moderate'}${suffix}`
    const value = find(file, 'Level', String(level))[column]
    if (!value) throw new Error(`Missing benchmark ${column} in ${file}`)
    return value
  }
  const stat = (label: string, file: string, rank: string) => ({ label, value: benchmark(file, rank) })
  const abilities = roadmap['Special Abilities'].split(';').map((name): AbilityCard => {
    const row = find('all-abilites.csv', 'name', name.trim())
    if (row.entry_type !== 'Spell' || row.activation !== 'two actions') {
      throw new Error(`Unsupported ability mapping: ${row.name}`)
    }
    const card: AbilityCard = { name: row.name, type: 'spell', actionCost: 2 }
    if (row.traits) card.traits = row.traits.split(',').map((trait) => trait.trim())
    if (row.frequency) card.frequency = row.frequency
    if (row.duration) card.duration = row.duration
    if (row.target) card.targets = row.target
    if (row.effect) card.text = row.effect
    return card
  })
  if (roadmap['Ranged Or Melee'] !== 'R') throw new Error('Expected a ranged Ace')
  return {
    name: roadmap['Road Map'], level, role: roadmap.Role,
    size: find('Size.csv', 'archetype', 'Ace').size,
    description: narrative.description, tactics: narrative.tactics,
    statGroups: [
      [stat('Perception', 'table-2-2-perception.csv', roadmap.Perception)],
      [stat('AC', 'table-2-5-armor-class.csv', roadmap.AC), stat('HP', 'table-2-7-hit-points.csv', roadmap.HP)],
      [stat('Fort', 'table-2-6-saving-throws.csv', roadmap.Fortitude),
        stat('Reflex', 'table-2-6-saving-throws.csv', roadmap.Reflex),
        stat('Will', 'table-2-6-saving-throws.csv', roadmap.Will)],
      [{ label: 'Speed', value: `${benchmark('speed-feet.csv', roadmap.Speed)} feet` }],
    ],
    attack: {
      name: 'Ranged Strike', type: 'attack', actionCost: 1, attackType: 'Ranged',
      range: `${benchmark('range-per-level.csv', roadmap.Range, ' (feet)')} feet`,
      attack: benchmark('table-2-9-strike-attack-bonus.csv', roadmap['Ranged Attack']),
      damage: benchmark('table-2-10-strike-damage.csv', roadmap['Ranged Damage']),
    },
    abilities, minions: [],
  }
}

/** Compare named stat values and all other fields; arrays of traits count as one field.
 * Uses the union of fields so extra generated fields count as differences too.
 */
export function compareArchetypes(expected: Archetype, actual: Archetype) {
  const flatten = (creature: Archetype) => {
    const fields: Record<string, unknown> = {}
    const visit = (value: unknown, path: string) => {
      if (Array.isArray(value) && (!value.length || value.every((item) => typeof item === 'string'))) fields[path] = value
      else if (value !== null && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) visit(child, path ? `${path}.${key}` : key)
      } else fields[path] = value
    }
    const { statGroups, ...rest } = creature
    visit(rest, '')
    for (const stat of statGroups.flat()) fields[`stats.${stat.label}`] = stat.value
    return fields
  }
  const left = flatten(expected), right = flatten(actual)
  const paths = [...new Set([...Object.keys(left), ...Object.keys(right)])]
  const differences = paths.filter((path) => JSON.stringify(left[path]) !== JSON.stringify(right[path]))
    .map((path) => ({ field: path, expected: left[path] ?? null, actual: right[path] ?? null }))
  const matched = paths.length - differences.length
  return { matched, total: paths.length, percentage: matched / paths.length * 100, differences }
}

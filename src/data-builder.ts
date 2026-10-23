import type { AbilityCard, Archetype } from './archetype.ts'
import { formatFields } from './format.ts'

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

/** Roadmap entries available to the general builder; Engineer owns its special minions. */
export function listArchetypes(sources: CsvSources): string[] {
  return parseCsv(sources['RoadMaps_Prod.csv'] ?? '').map((row) => row['Road Map'])
    .filter((name) => !name.startsWith('Special:'))
}

/** Build from CSV benchmarks and ability templates. Damage type defaults are temporary. */
export function buildArchetype(
  sources: CsvSources, name: string, level = 1, damageType = 'piercing',
): Archetype {
  if (!Number.isInteger(level) || level < -1 || level > 24) throw new Error('Level must be an integer from -1 through 24')
  if (name.startsWith('Special:')) throw new Error('Minions are handled separately by Engineer')
  const cache = new Map<string, Row[]>()
  const table = (file: string) => {
    if (sources[file] === undefined) throw new Error(`Missing CSV: ${file}`)
    if (!cache.has(file)) cache.set(file, parseCsv(sources[file]))
    return cache.get(file)!
  }
  const find = (file: string, key: string, value: string) => {
    const row = table(file).find((candidate) => candidate[key] === value)
    if (!row) throw new Error(`Missing ${key}=${value} in ${file}`)
    return row
  }
  const roadmap = find('RoadMaps_Prod.csv', 'Road Map', name)
  const narrativeName = ['Trapper', 'Saboteur'].includes(name) ? 'Seeder' : name
  const narrative = find('TacticsAndDescription.csv', 'archetype', narrativeName)
  const benchmark = (file: string, rank = '', suffix = '') => {
    const column = `${rank || 'Moderate'}${suffix}`
    const row = table(file).find((candidate) => Number(candidate.Level.replace('–', '-')) === level)
    const value = row?.[column]
    if (!value) throw new Error(`Missing level ${level} benchmark ${column} in ${file}`)
    return value
  }
  const stat = (label: string, file: string, rank: string) => ({ label, value: benchmark(file, rank) })
  const speed = Number(benchmark('speed-feet.csv', roadmap.Speed))
  const spellRank = Math.max(1, Math.ceil(level / 2))
  const healRank = Math.min(10, spellRank)
  const variables: Record<string, string | number> = {
    level, spellRank, abilityDC: benchmark('table-2-11-spell-dc-attack-bonus.csv', roadmap['Spell DC'], ' DC'),
    spellAttack: benchmark('table-2-11-spell-dc-attack-bonus.csv', roadmap['Spell Attack'], ' Spell Attack Bonus'),
    minimumResistance: benchmark('table-2-8-resistances-weaknesses.csv', 'Minimum'),
    athletics: benchmark('table-2-3-skills.csv', roadmap.Athletics),
    speed: `${speed} feet`, halfSpeed: `${Math.floor(speed / 10) * 5} feet`, doubleSpeed: `${speed * 2} feet`,
    meleeDamageType: damageType, rangedDamageType: damageType,
    breatheFireDamage: `${2 * spellRank}d6`, healDice: `${healRank}d8`, healBonus: 8 * healRank,
    dartCount: 2 + 2 * Math.floor((spellRank - 1) / 2),
  }
  for (const rank of ['Terrible', 'Low', 'Moderate', 'High', 'Extreme']) {
    variables[`${rank.toLowerCase()}Damage`] = benchmark('table-2-10-strike-damage.csv', rank)
  }
  const strikes: AbilityCard[] = []
  for (const subtype of ['Melee', 'Ranged'] as const) {
    if (roadmap[`${subtype} Attack`] === '-' || roadmap[`${subtype} Damage`] === '-') continue
    const attack = benchmark('table-2-9-strike-attack-bonus.csv', roadmap[`${subtype} Attack`])
    const damage = benchmark('table-2-10-strike-damage.csv', roadmap[`${subtype} Damage`])
    const prefix = subtype.toLowerCase()
    variables[`${prefix}Attack`] = attack
    variables[`${prefix}Damage`] = damage
    const strike: AbilityCard = { name: `${subtype} Strike`, type: 'attack', actionCost: 1, attackType: subtype, attack, damage, damageType }
    if (subtype === 'Ranged') {
      strike.range = `${benchmark('range-per-level.csv', roadmap.Range, ' (feet)')} feet`
      variables.rangedRange = strike.range
    }
    strikes.push(strike)
  }
  const primaryType = roadmap['Ranged Or Melee'] === 'R' ? 'Ranged' : 'Melee'
  const primary = strikes.find((strike) => strike.attackType === primaryType)
  const abilities = roadmap['Special Abilities'].split(';').map((entry) => entry.trim()).filter(Boolean).map((entry): AbilityCard => {
    // The legacy Support roadmap embeds a Heal note; frequency now comes from the ability row.
    const abilityName = entry.startsWith('Heal (') ? 'Heal' : entry
    const row = formatFields(find('all-abilites.csv', 'name', abilityName), variables)
    const types: Record<string, AbilityCard['type']> = { Attack: 'attack', Spell: 'spell', Passive: 'passive', Reaction: 'reaction' }
    const costs: Record<string, AbilityCard['actionCost']> = {
      'one action': 1, 'two actions': 2, 'three actions': 3, 'one to three actions': '1–3',
      'free action': 'free', reaction: 'reaction', passive: 'passive',
    }
    const type = types[row.entry_type]
    const actionCost = costs[row.activation || (type === 'passive' ? 'passive' : '')]
    if (!type || !actionCost) throw new Error(`Unsupported ability mapping: ${row.name}`)
    const card: AbilityCard = { name: row.name, type, actionCost }
    const fields = { requirements: 'requirements', trigger: 'trigger', targets: 'target', area: 'area',
      range: 'range', attack: 'attack', damage: 'damage', frequency: 'frequency', duration: 'duration', text: 'effect' } as const
    for (const [field, column] of Object.entries(fields)) {
      if (row[column]) card[field as keyof typeof fields] = row[column]
    }
    if (row.damage_type) card.damageType = row.damage_type
    else if (card.damage) card.damageType = damageType
    if (row.traits) card.traits = row.traits.split(',').map((trait) => trait.trim())
    if (row.defense) {
      if (row.defense.endsWith(' DC')) card.targetDC = row.defense
      else {
        card.savingThrow = row.defense.replace(/^Basic /, '')
        if (row.defense.startsWith('Basic ')) card.basicSave = true
      }
    }
    if (row.dc) {
      card.dc = Number(row.dc)
      if (!Number.isFinite(card.dc)) throw new Error(`Invalid DC for ${row.name}`)
    }
    return card
  })
  const creature: Archetype = {
    name, level, role: roadmap.Role,
    size: find('Size.csv', 'archetype', narrativeName).size,
    description: narrative.description, tactics: narrative.tactics,
    statGroups: [
      [stat('Perception', 'table-2-2-perception.csv', roadmap.Perception)],
      [stat('AC', 'table-2-5-armor-class.csv', roadmap.AC), stat('HP', 'table-2-7-hit-points.csv', roadmap.HP)],
      [stat('Fort', 'table-2-6-saving-throws.csv', roadmap.Fortitude),
        stat('Reflex', 'table-2-6-saving-throws.csv', roadmap.Reflex),
        stat('Will', 'table-2-6-saving-throws.csv', roadmap.Will)],
      [{ label: 'Speed', value: `${speed} feet` }],
    ],
    abilities, minions: [],
    skills: {
      Athletics: String(variables.athletics),
      'Stealth/Acrobatics': benchmark('table-2-3-skills.csv', roadmap['Stealth/Acrobatics']),
      Escape: benchmark('table-2-3-skills.csv', roadmap.Escape),
    },
    spellRank,
  }
  if (primary) creature.attack = primary
  const secondary = strikes.filter((strike) => strike !== primary)
  if (secondary.length) creature.secondaryAttacks = secondary
  return creature
}

/** Compatibility helper for the original Ace comparison. */
export function buildAce(sources: CsvSources, level = 1, damageType = 'piercing'): Archetype {
  return buildArchetype(sources, 'Ace', level, damageType)
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

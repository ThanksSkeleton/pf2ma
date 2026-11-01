import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildArchetype, type CsvSources } from '../src/data-builder.ts'
import { buildSummonerMinions } from '../src/summoner-minions.ts'
import { buildTraps } from '../src/traps.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  'RoadMaps_Prod.csv', 'TacticsAndDescription.csv', 'Size.csv', 'all-abilites.csv',
  'speed-feet.csv', 'range-per-level.csv', 'table-2-2-perception.csv',
  'table-2-3-skills.csv', 'table-2-5-armor-class.csv', 'table-2-6-saving-throws.csv',
  'table-2-7-hit-points.csv', 'table-2-8-resistances-weaknesses.csv',
  'table-2-9-strike-attack-bonus.csv', 'table-2-10-strike-damage.csv',
  'table-2-11-spell-dc-attack-bonus.csv', 'table-2-15-trap-defenses.csv',
]

export async function loadSources(): Promise<CsvSources> {
  return Object.fromEntries(await Promise.all(files.map(async (file) =>
    [file, await readFile(resolve(root, 'csv', file), 'utf8')] as const)))
}

export function realizeMonster(sources: CsvSources, name: string, level: number, physical = 'piercing', nonphysical = 'fire') {
  const creature = buildArchetype(sources, name, level, physical, nonphysical)
  if (name === 'Summoner') creature.minions = buildSummonerMinions(sources, level, physical)
  if (name === 'Trapper' || name === 'Saboteur') {
    creature.minions = buildTraps(sources, name, level, physical, nonphysical)
  }
  return creature
}

import { parseCsv, type CsvSources } from './data-builder.ts'
import { matchesEncounterCategory, type EncounterArchetype } from './encounter.ts'
import { isAttackDisabled, type AttackMode } from './attack-mode.ts'
import type { Archetype, AbilityCard } from './archetype.ts'

export function comparisonAttack(archetype: Archetype, mode: AttackMode = 'Melee'): AbilityCard | undefined {
  const attacks = [...(archetype.attack ? [archetype.attack] : []), ...(archetype.secondaryAttacks ?? []),
    ...archetype.abilities.filter((card) => card.type === 'attack')]
  return attacks.find((candidate) => !isAttackDisabled(archetype, candidate, mode))
}

/** Match the encounter builder's default melee mode for archetypes eligible for both attack categories. */
export function matchingPublishedMonster<T extends { level: number; role: string }>(
  archetype: EncounterArchetype, level: number, monsters: readonly T[], mode?: 'Melee' | 'Ranged',
): T | undefined {
  const category = (mode === 'Ranged' ? ['Ability', 'Ranged+', 'Melee+'] as const : ['Ability', 'Melee+', 'Ranged+'] as const)
    .find((candidate) => matchesEncounterCategory(archetype, candidate))
  const publishedType = category === 'Melee+' ? 'Melee' : category === 'Ranged+' ? 'Ranged' : category
  return monsters.find((monster) => monster.level === level && monster.role === publishedType)
}

export type RankName = 'Superterrible' | 'Terrible' | 'Low' | 'Minimum' | 'Moderate' | 'High' | 'Maximum' | 'Extreme'
export type RankBand = { lower: RankName; upper: RankName }

export const rankColors: Record<RankName, string> = {
  Superterrible: '#3F224D', Terrible: '#5C34AD', Low: '#0000FF', Minimum: '#0000FF',
  Moderate: '#00FF00', High: '#FFFF00', Maximum: '#FF0000', Extreme: '#FF0000',
}

export function winnerFor(archetype: number | null, official: number | null): 'archetype' | 'official' | null {
  if (archetype === null || official === null || !Number.isFinite(archetype) || !Number.isFinite(official)) return null
  if (archetype === official) return null
  return archetype > official ? 'archetype' : 'official'
}

const rankOrder: RankName[] = ['Superterrible', 'Terrible', 'Low', 'Minimum', 'Moderate', 'High', 'Maximum', 'Extreme']
const rankNames = new Set<string>(rankOrder)

/** Average of plain base-damage dice and flat modifiers. Conditional damage is not included. */
export function damageAverage(formula: string): number | null {
  const normalized = formula.replace(/\s/g, '')
  if (!/^[+-]?(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/i.test(normalized)) return null
  let total = 0
  for (const term of normalized.match(/[+-]?(?:\d+d\d+|\d+)/gi) ?? []) {
    const sign = term.startsWith('-') ? -1 : 1
    const raw = term.replace(/^[+-]/, '')
    const dice = raw.match(/^(\d+)d(\d+)$/i)
    total += sign * (dice ? Number(dice[1]) * (Number(dice[2]) + 1) / 2 : Number(raw))
  }
  return total
}

export function benchmarkBand(
  sources: CsvSources, file: string, level: number, value: number, suffix = '',
): RankBand | null {
  const source = sources[file]
  if (!source || !Number.isFinite(value)) return null
  const row = parseCsv(source).find((candidate) => Number(candidate.Level.replace('–', '-')) === level)
  if (!row) return null
  const benchmarks = Object.entries(row).flatMap(([column, raw]) => {
    if (!column.endsWith(suffix)) return []
    const rank = column.slice(0, column.length - suffix.length)
    if (!rankNames.has(rank)) return []
    if (!raw.trim()) return []
    const numeric = Number(raw.replace(/[^\d.+-]/g, ''))
    return Number.isFinite(numeric) ? [{ rank: rank as RankName, value: numeric }] : []
  }).sort((a, b) => a.value - b.value || rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank))
  if (!benchmarks.length) return null
  const exact = benchmarks.find((candidate) => candidate.value === value)
  if (exact) return { lower: exact.rank, upper: exact.rank }
  const higher = benchmarks.findIndex((candidate) => candidate.value > value)
  if (higher === -1) return { lower: benchmarks.at(-1)!.rank, upper: benchmarks.at(-1)!.rank }
  if (higher === 0) return { lower: benchmarks[0].rank, upper: benchmarks[0].rank }
  return { lower: benchmarks[higher - 1].rank, upper: benchmarks[higher].rank }
}

export function damageBand(sources: CsvSources, level: number, formula: string): RankBand | null {
  const average = damageAverage(formula)
  if (average === null) return null
  const source = sources['table-2-10-strike-damage.csv']
  if (!source) return null
  const row = parseCsv(source).find((candidate) => Number(candidate.Level.replace('–', '-')) === level)
  if (!row) return null
  const exactRank = rankOrder.find((rank) => row[rank] === formula)
  if (exactRank) return { lower: exactRank, upper: exactRank }
  return benchmarkBand(sources, 'table-2-10-strike-damage.csv', level, average, ' Average')
}

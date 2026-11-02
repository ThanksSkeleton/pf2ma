import { buildArchetype, parseCsv, type CsvSources } from './data-builder.ts'
import { matchesEncounterCategory, type EncounterArchetype } from './encounter.ts'
import { comparisonAttack, damageAverage } from './monster-comparison.ts'
import type { Archetype } from './archetype.ts'

export const graphCategories = ['Melee+', 'Ranged+', 'Ability'] as const
export const graphMetrics = ['AC', 'HP', 'Attack Bonus', 'Damage'] as const
export type GraphCategory = typeof graphCategories[number]
export type GraphMetric = typeof graphMetrics[number]
export type GraphPoint = { level: number; value: number | null; count: number }
export type GraphSeries = { category: GraphCategory; metric: GraphMetric; points: GraphPoint[] }

export type PublishedGraphMonster = {
  level: number
  role: string
  ac: number
  hp: number
  strike: { attackBonus: number; damage: string } | null
}

type Measurement = { value: number; formula?: string }
type Benchmark = { rank: string; value: number; formula?: string }
type LevelData = { level: number; published: number | null; values: Measurement[] }

const benchmarkTables: Record<GraphMetric, { file: string; ranks: string[] }> = {
  AC: { file: 'table-2-5-armor-class.csv', ranks: ['Low', 'Moderate', 'High', 'Extreme'] },
  HP: { file: 'table-2-7-hit-points.csv', ranks: ['Superterrible', 'Terrible', 'Low', 'Moderate', 'High'] },
  'Attack Bonus': { file: 'table-2-9-strike-attack-bonus.csv', ranks: [
    'Low', 'LowPlus', 'Moderate', 'ModeratePlus', 'High', 'HighPlus', 'Extreme', 'ExtremePlus',
  ] },
  Damage: { file: 'table-2-10-strike-damage.csv', ranks: ['Terrible', 'Low', 'Moderate', 'High', 'Extreme'] },
}

export const maxPreviewBump = (metric: GraphMetric) => benchmarkTables[metric].ranks.length - 1

const numeric = (value: string | undefined) => {
  if (!value) return null
  const result = Number(value.replace(/[^\d.+-]/g, ''))
  return Number.isFinite(result) ? result : null
}

const stat = (creature: Archetype, label: 'AC' | 'HP') =>
  numeric(creature.statGroups.flat().find((entry) => entry.label === label)?.value)

const ownMeasurement = (creature: Archetype, metric: GraphMetric, category: GraphCategory): Measurement | null => {
  if (metric === 'AC' || metric === 'HP') {
    const value = stat(creature, metric)
    return value === null ? null : { value }
  }
  const attack = comparisonAttack(creature, category === 'Ranged+' ? 'Ranged' : 'Melee')
  if (metric === 'Attack Bonus') {
    const value = numeric(attack?.attack)
    return value === null ? null : { value }
  }
  const value = attack?.damage ? damageAverage(attack.damage) : null
  return value === null ? null : { value, formula: attack!.damage }
}

const publishedValue = (monster: PublishedGraphMonster | undefined, metric: GraphMetric) => {
  if (!monster) return null
  if (metric === 'AC') return monster.ac
  if (metric === 'HP') return monster.hp
  if (metric === 'Attack Bonus') return monster.strike?.attackBonus ?? null
  return monster.strike ? damageAverage(monster.strike.damage) : null
}

const benchmarkRows = (sources: CsvSources, metric: GraphMetric) => {
  const { file, ranks } = benchmarkTables[metric]
  return new Map(parseCsv(sources[file]).map((row) => [Number(row.Level.replace('–', '-')), ranks.flatMap((rank): Benchmark[] => {
    const formula = row[rank]
    if (!formula) return []
    const value = metric === 'Damage' ? damageAverage(formula) : numeric(formula)
    return value === null ? [] : [{ rank, value, ...(metric === 'Damage' ? { formula } : {}) }]
  })]))
}

/** Step from the realized rank; an end rank retains its original value when bumped past the table. */
export function previewRankedValue(measurement: Measurement, benchmarks: readonly Benchmark[], bump: number): number {
  if (!bump || !benchmarks.length) return measurement.value
  const exactFormula = measurement.formula
    ? benchmarks.findIndex((benchmark) => benchmark.formula === measurement.formula) : -1
  const exactValue = benchmarks.findIndex((benchmark) => benchmark.value === measurement.value)
  const current = exactFormula >= 0 ? exactFormula : exactValue >= 0 ? exactValue
    : benchmarks.reduce((closest, benchmark, index) =>
      Math.abs(benchmark.value - measurement.value) < Math.abs(benchmarks[closest].value - measurement.value)
        ? index : closest, 0)
  const next = Math.max(0, Math.min(benchmarks.length - 1, current + bump))
  return next === current ? measurement.value : benchmarks[next].value
}

export function createGraphAnalysis(
  sources: CsvSources, archetypes: readonly EncounterArchetype[], monsters: readonly PublishedGraphMonster[],
) {
  const levels = Array.from({ length: 26 }, (_, index) => index - 1)
  const realized = new Map<string, Archetype>()
  const creatureAt = (name: string, level: number) => {
    const key = `${name}\u0000${level}`
    let creature = realized.get(key)
    if (!creature) {
      creature = buildArchetype(sources, name, level)
      realized.set(key, creature)
    }
    return creature
  }
  const benchmarks = new Map(graphMetrics.map((metric) => [metric, benchmarkRows(sources, metric)] as const))
  const publishedRole = { 'Melee+': 'Melee', 'Ranged+': 'Ranged', Ability: 'Ability' }
  const data = new Map<string, LevelData[]>()
  for (const category of graphCategories) {
    const eligible = archetypes.filter((archetype) => matchesEncounterCategory(archetype, category))
    for (const metric of graphMetrics) {
      data.set(`${category}\u0000${metric}`, levels.map((level) => {
        const published = monsters.find((monster) => monster.level === level && monster.role === publishedRole[category])
        const values = eligible.map((archetype) => ownMeasurement(creatureAt(archetype.name, level), metric, category))
          .filter((measurement): measurement is Measurement => measurement !== null)
        return { level, published: publishedValue(published, metric), values }
      }))
    }
  }
  const seriesFor = (category: GraphCategory, metric: GraphMetric, bump = 0): GraphSeries => ({
    category, metric,
    points: data.get(`${category}\u0000${metric}`)!.map((entry): GraphPoint => {
      if (entry.published === null || !entry.values.length) return { level: entry.level, value: null, count: 0 }
      const ranked = benchmarks.get(metric)!.get(entry.level) ?? []
      const average = entry.values.reduce((sum, measurement) =>
        sum + previewRankedValue(measurement, ranked, bump), 0) / entry.values.length
      const value = metric === 'AC' || metric === 'Attack Bonus' ? entry.published - average
        : average > 0 ? entry.published / average : null
      return { level: entry.level, value, count: value === null ? 0 : entry.values.length }
    }),
  })
  return { seriesFor, baseSeries: graphCategories.flatMap((category) => graphMetrics.map((metric) => seriesFor(category, metric))) }
}

export function buildGraphSeries(
  sources: CsvSources, archetypes: readonly EncounterArchetype[], monsters: readonly PublishedGraphMonster[],
): GraphSeries[] {
  return createGraphAnalysis(sources, archetypes, monsters).baseSeries
}

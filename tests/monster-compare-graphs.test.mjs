import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { buildArchetype, parseCsv } from '../src/data-builder.ts'
import { createGraphAnalysis, previewRankedValue } from '../src/monster-compare-graphs.ts'
import { comparisonAttack } from '../src/monster-comparison.ts'

const directory = new URL('../csv/', import.meta.url)
const sources = Object.fromEntries(await Promise.all(
  (await readdir(directory)).filter((name) => name.endsWith('.csv'))
    .map(async (name) => [name, await readFile(new URL(name, directory), 'utf8')]),
))
const archetypes = parseCsv(sources['RoadMaps_Prod.csv'])
  .filter((row) => !row['Road Map'].startsWith('Special:'))
  .map((row) => ({ name: row['Road Map'], role: row.Role, traits: row.ArchetypeTraits.split(',').filter(Boolean) }))
const monsters = JSON.parse(await readFile(new URL('official_monsters.json', directory), 'utf8'))
const analysis = createGraphAnalysis(sources, archetypes, monsters)

test('graph series use matching encounter pools and omit absent attacks', () => {
  const series = analysis.baseSeries
  assert.equal(series.length, 12)
  assert.ok(series.every((entry) => entry.points.length === 26))
  const at = (category, metric, level) => series.find((entry) => entry.category === category && entry.metric === metric)
    .points.find((point) => point.level === level)

  assert.deepEqual(at('Melee+', 'AC', 1), { level: 1, value: 1.8571428571428577, count: 14 })
  assert.deepEqual(at('Ranged+', 'AC', 1), { level: 1, value: 1.5714285714285712, count: 7 })
  assert.equal(at('Melee+', 'Attack Bonus', 1).count, 13)
  assert.equal(at('Ranged+', 'Attack Bonus', 1).count, 7)
  assert.equal(at('Ability', 'AC', 1).count, 12)
  assert.equal(at('Ability', 'HP', 1).count, 12)
  assert.deepEqual(at('Ability', 'Attack Bonus', 1), { level: 1, value: null, count: 0 })
  assert.deepEqual(at('Ability', 'Damage', 1), { level: 1, value: null, count: 0 })
  assert.ok(at('Melee+', 'HP', 1).value < 1)
  assert.ok(at('Melee+', 'Damage', 1).value > 1)
})

test('preview steps through benchmark ranks and clamps each monster at the table ends', () => {
  const benchmarks = [
    { rank: 'Low', value: 15 }, { rank: 'Moderate', value: 20 }, { rank: 'High', value: 25 },
  ]
  assert.equal(previewRankedValue({ value: 20 }, benchmarks, 0), 20)
  assert.equal(previewRankedValue({ value: 20 }, benchmarks, 1), 25)
  assert.equal(previewRankedValue({ value: 20 }, benchmarks, 2), 25)
  assert.equal(previewRankedValue({ value: 20 }, benchmarks, -2), 15)
  assert.equal(previewRankedValue({ value: 25 }, benchmarks, 1), 25)
  assert.equal(previewRankedValue({ value: 15 }, benchmarks, -1), 15)
  const damageRanks = [
    { rank: 'Low', value: 4.5, formula: '1d4+2' },
    { rank: 'Moderate', value: 5.5, formula: '1d6+2' },
  ]
  assert.equal(previewRankedValue({ value: 4.5, formula: '1d4+2' }, damageRanks, 1), 5.5)
  assert.equal(previewRankedValue({ value: 5.5, formula: '1d6+2' }, damageRanks, 1), 5.5)

  const at = (metric, bump, level = 1) => analysis.seriesFor('Melee+', metric, bump).points.find((point) => point.level === level)
  assert.ok(at('AC', 1).value < at('AC', 0).value)
  assert.ok(at('AC', -1).value > at('AC', 0).value)
  assert.ok(at('HP', 1).value < at('HP', 0).value)
  assert.ok(at('HP', -1).value > at('HP', 0).value)
  assert.ok(at('Attack Bonus', 1).value < at('Attack Bonus', 0).value)
  assert.ok(at('Damage', 1).value < at('Damage', 0).value)
  assert.ok(at('AC', 2).value < at('AC', 1).value)
  assert.deepEqual(at('AC', 4), at('AC', 3))
  assert.deepEqual(analysis.seriesFor('Ability', 'Attack Bonus', 2).points.find((point) => point.level === 1),
    { level: 1, value: null, count: 0 })
})

test('Modal attack data follows the selected graph category', () => {
  const soldier = buildArchetype(sources, 'Soldier', 1)
  assert.equal(comparisonAttack(soldier, 'Melee').name, 'Glancing Blow')
  assert.equal(comparisonAttack(soldier, 'Ranged').name, 'Glancing Shot')
})

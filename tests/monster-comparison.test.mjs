import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { benchmarkBand, damageAverage, damageBand, matchingPublishedMonster, winnerFor } from '../src/monster-comparison.ts'
import { parseCsv } from '../src/data-builder.ts'

const source = (name) => readFileSync(new URL(`../csv/${name}`, import.meta.url), 'utf8')
const sources = {
  'table-2-2-perception.csv': source('table-2-2-perception.csv'),
  'table-2-7-hit-points.csv': source('table-2-7-hit-points.csv'),
  'table-2-9-strike-attack-bonus.csv': source('table-2-9-strike-attack-bonus.csv'),
  'table-2-10-strike-damage.csv': source('table-2-10-strike-damage.csv'),
  'speed-feet.csv': source('speed-feet.csv'),
}

test('rank colors are solid at exact values and split at adjacent values', () => {
  assert.deepEqual(benchmarkBand(sources, 'table-2-2-perception.csv', 1, 7), { lower: 'Moderate', upper: 'Moderate' })
  assert.deepEqual(benchmarkBand(sources, 'table-2-2-perception.csv', 1, 5), { lower: 'Low', upper: 'Moderate' })
  assert.deepEqual(benchmarkBand(sources, 'table-2-7-hit-points.csv', 1, 18), { lower: 'Low', upper: 'Moderate' })
  assert.deepEqual(benchmarkBand(sources, 'speed-feet.csv', 1, 25), { lower: 'Moderate', upper: 'Moderate' })
  assert.deepEqual(benchmarkBand(sources, 'table-2-9-strike-attack-bonus.csv', 1, 10),
    { lower: 'HighPlus', upper: 'HighPlus' })
  assert.deepEqual(benchmarkBand(sources, 'table-2-9-strike-attack-bonus.csv', 1, 12),
    { lower: 'ExtremePlus', upper: 'ExtremePlus' })
})

test('damage uses exact formula rank first, then average for values between benchmarks', () => {
  assert.equal(damageAverage('1d8+3'), 7.5)
  assert.equal(damageAverage('1d6+6+1d6'), 13)
  assert.equal(damageAverage('1d6+2d8+11'), 23.5)
  assert.equal(damageAverage('4d12+10d6'), 61)
  assert.deepEqual(damageBand(sources, 1, '1d6+2'), { lower: 'Moderate', upper: 'Moderate' })
  assert.deepEqual(damageBand(sources, 1, '1d8+3'), { lower: 'High', upper: 'Extreme' })
  assert.equal(damageBand(sources, 1, 'special damage'), null)
})

test('curated monsters cover each role at levels -1 through 24', () => {
  const monsters = JSON.parse(source('official_monsters.json'))
  assert.deepEqual(monsters.map((monster) => monster.level), Array.from({ length: 26 }, (_, index) => Array(3).fill(index - 1)).flat())
  assert.equal(new Set(monsters.map((monster) => monster.id)).size, 78)
  for (let level = -1; level <= 24; level++) {
    assert.deepEqual(monsters.filter((monster) => monster.level === level).map((monster) => monster.role), ['Melee', 'Ranged', 'Ability'])
  }
  assert.deepEqual(monsters.filter((monster) => monster.level === 1).map((monster) => monster.name), ['Goblin Commando', 'Elf Ranger', 'Gnome Bard'])
  assert.equal(monsters.find((monster) => monster.name === 'Gnome Bard').strike, null)
  assert.equal(monsters.find((monster) => monster.name === 'Poltergeist').speed.type, 'Fly')
  assert.equal(monsters.find((monster) => monster.name === 'Gunwitch').strike.damage, '1d6+6+1d6')
  assert.equal(monsters.find((monster) => monster.name === 'Choral').strike.damage, '4d6')
  assert.equal(monsters.find((monster) => monster.name === 'Peri').strike.damage, '8d6')
  assert.deepEqual(monsters.find((monster) => monster.name === 'Peri').speed, { type: 'Land', feet: 0 })
  assert.equal(monsters.find((monster) => monster.name === 'Ninkonda').strike.damage, '3d8+8')
  assert.deepEqual(monsters.find((monster) => monster.name === 'Bone Ship').speed, { type: 'Swim', feet: 40 })
  assert.equal(monsters.find((monster) => monster.name === 'Star Archon').strike.damage, '3d4+16+2d6+3d6')
  assert.equal(monsters.find((monster) => monster.name === 'Green Man').strike.damage, '4d10+27')
})

test('published monster selection follows encounter categories and defaults Modal to melee', () => {
  const monsters = JSON.parse(source('official_monsters.json'))
  const archetypes = parseCsv(source('RoadMaps_Prod.csv')).map((row) => ({
    name: row['Road Map'], role: row.Role, traits: row.ArchetypeTraits.split(',').filter(Boolean),
  }))
  const pick = (name, level = 1) => matchingPublishedMonster(archetypes.find((entry) => entry.name === name), level, monsters)
  assert.equal(pick('Priest').role, 'Ability')
  assert.equal(pick('Bastion').role, 'Ability')
  assert.equal(pick('Specter').role, 'Melee')
  assert.equal(pick('Pyro').role, 'Melee')
  assert.equal(pick('Soldier').role, 'Melee')
  assert.equal(pick('Hornet').role, 'Melee')
  assert.equal(matchingPublishedMonster(archetypes.find((entry) => entry.name === 'Soldier'), 1, monsters, 'Ranged').role, 'Ranged')
  assert.equal(matchingPublishedMonster(archetypes.find((entry) => entry.name === 'Hornet'), 1, monsters, 'Ranged').role, 'Ranged')
  assert.equal(pick('Rainmaker').role, 'Ability')
  assert.equal(pick('Ace').role, 'Ranged')
  assert.equal(pick('Ace', 2).level, 2)
})

test('higher realized number wins; ties and absent values do not', () => {
  assert.equal(winnerFor(20, 18), 'archetype')
  assert.equal(winnerFor(4.5, 7.5), 'official')
  assert.equal(winnerFor(25, 25), null)
  assert.equal(winnerFor(25, null), null)
})

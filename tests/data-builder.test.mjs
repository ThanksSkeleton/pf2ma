import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { buildAce, parseCsv } from '../src/data-builder.ts'

const directory = new URL('../csv/', import.meta.url)
const sources = Object.fromEntries(await Promise.all(
  (await readdir(directory)).filter((name) => name.endsWith('.csv'))
    .map(async (name) => [name, await readFile(new URL(name, directory), 'utf8')]),
))

test('CSV parser preserves quoted commas, quotes, newlines, and empty trailing cells', () => {
  assert.deepEqual(parseCsv('name,text,empty\r\nAce,"a, b ""quoted""\nnext",\r\n'),
    [{ name: 'Ace', text: 'a, b "quoted"\nnext', empty: '' }])
  assert.throws(() => parseCsv('name\n"unfinished'), /Unterminated/)
})

test('builder reads changed benchmarks and fails clearly for missing data or unsupported levels', () => {
  const changed = { ...sources, 'table-2-5-armor-class.csv': sources['table-2-5-armor-class.csv'].replace('1,19,16,15,13', '1,19,16,14,13') }
  assert.equal(buildAce(changed).statGroups[1][0].value, '14')
  assert.throws(() => buildAce({}, 1), /Missing CSV/)
  assert.throws(() => buildAce(sources, 25), /Level must/)
})

test('requested attack-mode traits appear on the listed archetypes', async () => {
  const { buildArchetype } = await import('../src/data-builder.ts')
  const categoryMembers = {
    Ranged: ['Ace', 'Aegis', 'Archer', 'Barricade', 'Bombard', 'Summoner', 'Operator', 'Rainmaker', 'Saboteur', 'Scout', 'Sniper', 'Trapper', 'Witch'],
    Modal: ['Soldier', 'Hornet'],
    Flexible: ['Assassin', 'Kidnapper', 'Goliath', 'Despoiler', 'Pyro', 'Ronin', 'Sentinel', 'Specter'],
    Melee: ['Bastion', 'Berserker', 'Breacher', 'Demolisher', 'Scourer'],
  }
  for (const row of parseCsv(sources['RoadMaps_Prod.csv']).filter((row) => !row['Road Map'].startsWith('Special:'))) {
    const creature = buildArchetype(sources, row['Road Map'])
    const categories = Object.entries(categoryMembers).filter(([, members]) => members.includes(row['Road Map'])).map(([category]) => category)
    assert.deepEqual(creature.archetypeTraits?.filter((trait) => Object.keys(categoryMembers).includes(trait)) ?? [], categories, row['Road Map'])
  }
})

test('Ability marks the archetypes powered chiefly by special abilities', async () => {
  const { buildArchetype } = await import('../src/data-builder.ts')
  const expected = ['Aegis', 'Barricade', 'Bastion', 'Bombard', 'Mirage', 'Priest', 'Rainmaker', 'Saboteur', 'Summoner', 'Support', 'Trapper', 'Witch']
  const rows = parseCsv(sources['RoadMaps_Prod.csv']).filter((row) => !row['Road Map'].startsWith('Special:'))
  assert.deepEqual(rows.filter((row) => row.ArchetypeTraits.split(',').includes('Ability')).map((row) => row['Road Map']).sort(), expected.sort())
  for (const name of expected) assert.ok(buildArchetype(sources, name).archetypeTraits?.includes('Ability'), name)
})

test('Unusual Attack marks fighters with nontraditional main attacks', async () => {
  const { buildArchetype } = await import('../src/data-builder.ts')
  const expected = ['Pyro', 'Soldier']
  const rows = parseCsv(sources['RoadMaps_Prod.csv']).filter((row) => !row['Road Map'].startsWith('Special:'))
  assert.deepEqual(rows.filter((row) => row.ArchetypeTraits.split(',').includes('Unusual Attack')).map((row) => row['Road Map']).sort(), expected.sort())
  for (const name of expected) assert.ok(buildArchetype(sources, name).archetypeTraits?.includes('Unusual Attack'), name)
  assert.ok(!buildArchetype(sources, 'Pyro').archetypeTraits?.includes('Ability'))
})

test('slot rank changes reach generated stats and active attacks', async () => {
  const { buildArchetype } = await import('../src/data-builder.ts')
  const { comparisonAttack } = await import('../src/monster-comparison.ts')
  const ace = buildArchetype(sources, 'Ace')
  assert.deepEqual(ace.statGroups[1].map((stat) => stat.value), ['15', '20'])
  assert.equal(ace.attack.attack, '+11')

  const aegis = buildArchetype(sources, 'Aegis')
  assert.deepEqual(aegis.statGroups[1].map((stat) => stat.value), ['16', '20'])
  assert.equal(aegis.attack.attack, '+6')

  const soldier = buildArchetype(sources, 'Soldier')
  assert.deepEqual(soldier.statGroups[1].map((stat) => stat.value), ['16', '25'])
  assert.deepEqual([comparisonAttack(soldier, 'Melee')?.attack, comparisonAttack(soldier, 'Melee')?.damage],
    ['+8', '1d6+2'])
  assert.deepEqual([comparisonAttack(soldier, 'Ranged')?.attack, comparisonAttack(soldier, 'Ranged')?.damage],
    ['+9', '1d4+2'])

  const hornet = buildArchetype(sources, 'Hornet')
  assert.deepEqual(hornet.statGroups[1].map((stat) => stat.value), ['19', '20'])
  assert.equal(comparisonAttack(hornet, 'Melee')?.attack, '+10')
  assert.equal(comparisonAttack(hornet, 'Ranged')?.attack, '+7')
  assert.equal(buildArchetype(sources, 'Sniper').attack.attack, '+12')
  assert.equal(buildArchetype(sources, 'Demolisher').statGroups[1][1].value, '25')
  assert.equal(comparisonAttack(buildArchetype(sources, 'Pyro'), 'Melee'), undefined)
})

test('Summoner minions scale separately and keep their special movement', async () => {
  const { buildSummonerMinions } = await import('../src/summoner-minions.ts')
  for (let level = -1; level <= 24; level++) {
    const [ranged, melee] = buildSummonerMinions(sources, level, 'cold')
    assert.equal(ranged.level, level)
    assert.equal(melee.level, level)
    assert.equal(ranged.statGroups[3][0].value, '0 feet')
    assert.equal(melee.statGroups[3][0].value, '15 feet')
    assert.equal(ranged.attack.damageType, 'cold')
    assert.equal(melee.attack.damageType, 'cold')
  }
  const [ranged, melee] = buildSummonerMinions(sources, 1)
  assert.equal(ranged.statGroups[1][1].value, '3')
  assert.equal(melee.statGroups[1][1].value, '7')
  assert.equal(ranged.attack.attack, '+7')
  assert.equal(melee.attack.damage, '2')
  assert.equal(buildSummonerMinions(sources, 5)[0].statGroups[1][1].value, '14')
})

import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { buildAce, compareArchetypes, parseCsv } from '../src/data-builder.ts'
import { ace } from '../src/ace-reference.ts'

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

test('level 1 Ace matches the accepted reference', () => {
  const built = buildAce(sources)
  const result = compareArchetypes(ace, built)
  assert.equal(result.percentage, 100, JSON.stringify(result))
  assert.equal(built.statGroups.flat().find((stat) => stat.label === 'Reflex').value, '+7')
  assert.equal(built.attack.range, '30 feet')
  assert.equal(built.attack.damageType, 'piercing')
  assert.equal(built.abilities[0].frequency, 'Once per day')
  assert.equal(built.abilities[0].targets, 'You.')
  assert.equal(buildAce(sources, 1, 'slashing').attack.damageType, 'slashing')
})

test('builder reads changed benchmarks and fails clearly for missing data or unsupported levels', () => {
  const changed = { ...sources, 'table-2-5-armor-class.csv': sources['table-2-5-armor-class.csv'].replace('1,19,16,15,13', '1,19,16,15,12') }
  assert.equal(buildAce(changed).statGroups[1][0].value, '12')
  assert.throws(() => buildAce({}, 1), /Missing CSV/)
  assert.throws(() => buildAce(sources, 25), /Level must/)
})

test('every non-minion archetype builds at every supported level with resolved templates', async () => {
  const { listArchetypes, buildArchetype } = await import('../src/data-builder.ts')
  const names = listArchetypes(sources)
  assert.equal(names.length, 31)
  assert.ok(!names.some((name) => name.includes('Minion')))
  for (const name of names) {
    for (let level = -1; level <= 24; level++) {
      const built = buildArchetype(sources, name, level)
      assert.equal(built.name, name)
      assert.equal(built.level, level)
      assert.deepEqual(built.minions, [])
      assert.ok(!/\$[A-Za-z_]/.test(JSON.stringify(built)), `${name} ${level}: unresolved template`)
      assert.ok(!JSON.stringify(built).includes('NaN'))
    }
  }
  assert.throws(() => buildArchetype(sources, 'Special: Ranged Minion'), /Minions/)
  assert.throws(() => buildArchetype(sources, 'Unknown'), /Missing Road Map/)
})

test('attack modes, abilities, defaults, and scaling follow the CSV data', async () => {
  const { buildArchetype } = await import('../src/data-builder.ts')
  const build = (name, level = 1, damageType = 'piercing') => buildArchetype(sources, name, level, damageType)
  for (const name of ['Mirage', 'Priest', 'Support', 'Pyro']) assert.equal(build(name).attack, undefined)
  assert.equal(build('Hornet').abilities.length, 0)
  assert.equal(build('Bastion').attack.attackType, 'Ranged')
  assert.equal(build('Bastion').secondaryAttacks[0].attackType, 'Melee')
  assert.equal(build('Assassin').attack.attackType, 'Melee')
  assert.equal(build('Assassin').secondaryAttacks[0].attackType, 'Ranged')
  assert.equal(build('Archer').abilities[0].actionCost, 'reaction')
  assert.equal(build('Pyro', 7).abilities[0].damage, '8d6')
  assert.equal(build('Pyro', 7, 'cold').abilities[0].damageType, 'fire')
  assert.equal(build('Pyro').abilities[0].basicSave, true)
  assert.equal(build('Pyro').abilities[0].dc, 14)
  assert.equal(build('Support', 24).abilities[0].damage, '10d8')
  assert.equal(build('Support').abilities[0].actionCost, '1–3')
  assert.equal(build('Support').abilities[0].frequency, 'At Will')
  const missile = build('Rainmaker', 9).abilities[0]
  assert.equal(missile.damage, undefined)
  assert.equal(missile.damageType, undefined)
  assert.equal(missile.targets, 'Each opponent you can see.')
  assert.equal(missile.text, 'Fire a dart for each opponent you can see. At the start of the next turn, each dart automatically hits its assigned target and deals 2d6 force damage.')
  const demolisher = build('Demolisher', 9)
  const slam = demolisher.abilities.find((ability) => ability.name === 'Overcommitted Slam')
  assert.ok(slam)
  assert.equal(slam.attack, demolisher.attack.attack)
  assert.equal(slam.damage, parseCsv(sources['table-2-10-strike-damage.csv']).find((row) => row.Level === '9').Extreme)
  assert.equal(slam.area, '15-foot cone')
  assert.match(slam.text, /basic Reflex save against DC \d+/)
  assert.match(slam.text, /fall prone and become slowed 1 and stunned 3/)
  assert.ok(slam.text.includes(demolisher.attack.damage))
  assert.match(build('Cataphract').abilities.find((ability) => ability.name === 'Abduct').text, /10 feet/)
  assert.equal(build('Trapper').size, 'Medium')
  assert.equal(build('Scout').abilities[1].frequency, 'Once per day')
  assert.equal(build('Cataphract').abilities[0].targetDC, 'Fortitude DC')
  assert.equal(build('Cataphract').abilities[0].savingThrow, undefined)
  for (const level of [1, 5, 24]) {
    const translocate = build('Operator', level).abilities[0]
    assert.equal(translocate.range, '120 feet')
    assert.ok(!translocate.text.includes('At rank 5'))
    assert.equal(build('Witch', level).abilities[1].area, '15-foot cone')
  }
  for (const name of ['Translocate', 'Dazzling Flash']) {
    assert.equal(parseCsv(sources['all-abilites.csv']).find((row) => row.name === name).Source, 'Mod')
  }
})

test('archetype tags and stealth actions come from the CSV', async () => {
  const { buildArchetype } = await import('../src/data-builder.ts')
  const tagged = {
    Mirage: ['Pacifist', 'Stealth'], Priest: ['Pacifist'], Support: ['Pacifist'],
    Bastion: ['Manuevers'], Cataphract: ['Manuevers'], Ronin: ['Manuevers'], Sentinel: ['Manuevers'],
    Assassin: ['Stealth'], Specter: ['Stealth'],
  }
  for (const row of parseCsv(sources['RoadMaps_Prod.csv']).filter((row) => !row['Road Map'].startsWith('Special:'))) {
    const creature = buildArchetype(sources, row['Road Map'])
    assert.deepEqual(creature.archetypeTags, tagged[row['Road Map']], row['Road Map'])
    if (!creature.archetypeTags?.includes('Stealth')) continue
    for (const name of ['Hide', 'Sneak']) {
      const card = creature.abilities.find((ability) => ability.name === name)
      assert.equal(card?.type, 'action', `${creature.name}: ${name}`)
      assert.equal(card.actionCost, 1)
    }
    assert.equal(creature.abilities.find((card) => card.name === 'Hide')?.requirements,
      'You are behind standard cover OR otherwise concealed.')
    assert.equal(creature.abilities.find((card) => card.name === 'Hide')?.text,
      "Roll a Secret stealth check against every visible enemy's perception.\nAdd a +2 or +4 circumstance bonus if you have standard or greater cover.\nYou have the Hidden status against every enemy you beat.")
    assert.equal(creature.abilities.find((card) => card.name === 'Sneak')?.text,
      "Stride up to half your Speed.\n\nAt the end of your move, make a Stealth check against every enemy's Perception that you have standard cover OR concealment against, and that you were previously Hidden or Undetected from.\n\nSuccess: You become Undetected to those enemies.\nFailure: You become Hidden to those enemies.\nCritical Failure: You become Observed to those enemies, unless you are Invisible, in which case you become Hidden.")
    assert.equal(creature.references.find((card) => card.name === 'Breaking Stealth (PC Response)')?.text,
      'If you Strike an enemy, you still get the Offguard bonus, but you become Observed.\nIf you take any other action except Hide, Sneak, or Step, you become Observed.\nSeek can detect hidden creatures.')
    for (const name of ['Hidden', 'Undetected', 'Concealed', 'Observed', 'Off-Guard', 'Invisible']) {
      assert.ok(creature.references.some((card) => card.name === name), `${creature.name}: ${name}`)
    }
  }
  const assassin = buildArchetype(sources, 'Assassin')
  assert.equal(assassin.abilities.find((card) => card.name === 'Lying in Wait')?.text,
    'The Assassin starts combat Unnoticed.')
  assert.ok(assassin.references.some((card) => card.name === 'Unnoticed'))
  assert.match(buildArchetype(sources, 'Mirage').abilities.find((card) => card.name === 'Shared Veil')?.text,
    /The target can make a Hide check as a reaction\./)
  assert.match(buildArchetype(sources, 'Specter').abilities.find((card) => card.name === 'Shadow Prowl')?.text,
    /You can make a Hide check as a free action/)
})

test('Engineer minions scale separately and keep their special movement', async () => {
  const { buildEngineerMinions } = await import('../src/engineer-minions.ts')
  for (let level = -1; level <= 24; level++) {
    const [ranged, melee] = buildEngineerMinions(sources, level, 'cold')
    assert.equal(ranged.level, level)
    assert.equal(melee.level, level)
    assert.equal(ranged.statGroups[3][0].value, '0 feet')
    assert.equal(melee.statGroups[3][0].value, '15 feet')
    assert.equal(ranged.attack.damageType, 'cold')
    assert.equal(melee.attack.damageType, 'cold')
  }
  const [ranged, melee] = buildEngineerMinions(sources, 1)
  assert.equal(ranged.statGroups[1][1].value, '3')
  assert.equal(melee.statGroups[1][1].value, '7')
  assert.equal(ranged.attack.attack, '+7')
  assert.equal(melee.attack.damage, '2')
  assert.equal(buildEngineerMinions(sources, 5)[0].statGroups[1][1].value, '14')
})

import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { buildArchetype, parseCsv } from '../src/data-builder.ts'

const directory = new URL('../csv/', import.meta.url)
const sources = Object.fromEntries(await Promise.all(
  (await readdir(directory)).filter((name) => name.endsWith('.csv'))
    .map(async (name) => [name, await readFile(new URL(name, directory), 'utf8')]),
))
const rows = parseCsv(sources['all-abilites.csv'])
const byName = new Map(rows.map((row) => [row.name, row]))
const families = ['Trip', 'Grapple', 'Shove', 'Disarm']
const tiers = ['', 'Advanced ', 'Supreme ']

test('all twelve maneuver tiers and both maintenance actions are unique homebrew entries', () => {
  assert.equal(byName.size, rows.length)
  for (const family of families) {
    for (const prefix of tiers) {
      const name = prefix + family
      const row = byName.get(name)
      assert.ok(row, name)
      assert.equal(row.Source, 'homebrew', name)
      assert.equal(row.entry_type, 'Attack', name)
      assert.equal(row.traits, 'Attack', name)
      assert.equal(row.defense, ['Trip', 'Disarm'].includes(family) ? 'Reflex DC' : 'Fortitude DC', name)
      assert.equal(row.attack, '$athletics', name)
      for (const outcome of ['Critical Success:', 'Success:', 'Failure:', 'Critical Failure:']) {
        assert.ok(row.effect.includes(outcome), `${name}: ${outcome}`)
      }
      assert.doesNotMatch(row.effect, /(?:Prone|Grabbed|Restrained):|−2 AC|DC 5 flat check/,
        `${name} must leave status effects to reminder cards`)
      if (!prefix) {
        assert.equal(row.activation, 'one action')
        assert.match(row.effect, /uses your current multiple attack penalty and increases it/)
      } else {
        assert.match(row.effect, /ignores your multiple attack penalty and does not increase it/)
        if (prefix === 'Advanced ') {
          assert.equal(row.activation, 'one action')
          assert.match(row.requirements, /last action was a successful Strike/)
        } else {
          assert.equal(row.activation, 'free action')
          assert.match(row.trigger, /first Strike on this turn hits/)
        }
      }
    }
  }
  for (const prefix of ['Advanced', 'Supreme']) {
    const row = byName.get(`${prefix} Maintain Grapple`)
    assert.equal(row.Source, 'homebrew')
    assert.equal(row.activation, 'one action')
    assert.equal(row.effect, 'Extend the target’s existing grabbed or restrained condition until the end of your next turn.')
  }
  for (const name of ['Push', 'Grab', 'Knockdown']) assert.equal(byName.has(name), false)
  for (const name of ['Prone', 'Grabbed', 'Restrained']) {
    assert.doesNotMatch(byName.get(name).effect, /−2 circumstance penalty to AC/)
  }
  assert.equal(byName.has('Slowed'), false)
  assert.equal(byName.get('Abduct').requirements, 'You have at least one creature grabbed.')
  assert.doesNotMatch(byName.get('Abduct').effect, /movement does not release/)
  for (const name of ['Advanced Grapple', 'Supreme Grapple']) {
    assert.doesNotMatch(byName.get(name).effect, /You can spend one action/)
  }
})

test('migrated sheets get matching actions and complete relevant references', () => {
  const build = (name) => buildArchetype(sources, name)
  const names = (cards) => cards?.map((card) => card.name) ?? []
  for (const name of ['Bastion', 'Cataphract', 'Sentinel']) {
    const creature = build(name)
    assert.ok(names(creature.abilities).includes('Advanced Grapple'))
    assert.ok(names(creature.abilities).includes('Advanced Maintain Grapple'))
    assert.ok(!names(creature.abilities).includes('Grapple'))
    assert.deepEqual(names(creature.references).sort(),
      ['Grabbed', 'Restrained', 'Prone', 'Immobilized', 'Off-Guard', 'Escape (PC Response)'].sort())
    assert.match(creature.references.find((card) => card.name === 'Grabbed').text, /DC 5 flat check/)
    assert.match(creature.references.find((card) => card.name === 'Restrained').text, /cannot use attack or manipulate/)
    assert.match(creature.references.find((card) => card.name === 'Escape (PC Response)').text,
      new RegExp(`Athletics DC \\(${Number(creature.skills.Athletics) + 10}\\)`))
  }
  assert.ok(names(build('Ronin').abilities).includes('Advanced Disarm'))
  assert.ok(names(build('Ronin').abilities).includes('Advanced Trip'))
  assert.ok(names(build('Sentinel').abilities).includes('Advanced Shove'))
  assert.deepEqual(names(build('Assassin').references).sort(),
    ['Prone', 'Unnoticed', 'Off-Guard', 'Hidden', 'Concealed', 'Undetected', 'Observed', 'Invisible', 'Breaking Stealth (PC Response)'].sort())
  assert.match(build('Cataphract').abilities.find((card) => card.name === 'Abduct').text,
    /pulling any creatures you have grabbed/)
  assert.equal(build('Ace').references, undefined)
})

test('sheets never combine lower and higher ranks of one maneuver', () => {
  for (const row of parseCsv(sources['RoadMaps_Prod.csv'])) {
    const assigned = row['Special Abilities'].split(';').map((name) => name.trim())
    for (const family of families) {
      assert.ok([family, `Advanced ${family}`, `Supreme ${family}`]
        .filter((name) => assigned.includes(name)).length <= 1, `${row['Road Map']}: ${family}`)
    }
  }
})

test('non-maneuver status users get separate reminder cards', () => {
  const build = (name) => buildArchetype(sources, name)
  const names = (cards) => cards?.map((card) => card.name) ?? []
  for (const [name, expected] of [
    ['Demolisher', ['Stunned']],
    ['Mirage', ['Hidden', 'Off-Guard', 'Concealed', 'Undetected', 'Observed', 'Invisible', 'Breaking Stealth (PC Response)']],
    ['Specter', ['Hidden', 'Off-Guard', 'Concealed', 'Undetected', 'Observed', 'Invisible', 'Breaking Stealth (PC Response)']],
    ['Scout', ['Dazzled', 'Concealed', 'Invisible', 'Undetected', 'Hidden', 'Off-Guard']],
    ['Witch', ['Dazzled', 'Blinded', 'Concealed']],
    ['Priest', ['Lifelink Donor', 'Lifelink Recipient', 'Stunned']],
    ['Sniper', ['In the Crosshairs']],
  ]) {
    const creature = build(name)
    assert.deepEqual(names(creature.references).sort(), expected.sort(), name)
    assert.ok(creature.abilities.every((card) => card.type !== 'status'), name)
  }
})

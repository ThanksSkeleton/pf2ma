import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { buildArchetype, parseCsv } from '../src/data-builder.ts'

const directory = new URL('../csv/', import.meta.url)
const sources = Object.fromEntries(await Promise.all(
  (await readdir(directory)).filter((name) => name.endsWith('.csv'))
    .map(async (name) => [name, await readFile(new URL(name, directory), 'utf8')]),
))
const damageRows = parseCsv(sources['table-2-10-strike-damage.csv'])
const dcRows = parseCsv(sources['table-2-11-spell-dc-attack-bonus.csv'])

test('Sniper uses Paint Target and level-scaled High DC and Moderate Average weakness', () => {
  for (const level of [1, 5, 10]) {
    const sniper = buildArchetype(sources, 'Sniper', level)
    const strike = sniper.attack
    const paint = sniper.abilities[0]
    const [redDot, exposed] = sniper.references
    assert.deepEqual(sniper.abilities.map((card) => card.name), ['Paint Target'])
    assert.deepEqual(sniper.references.map((card) => card.name), ['Red Dot', 'Exposed'])
    assert.equal(strike.actionCost, 1)
    assert.equal(strike.range, '120 feet')
    assert.deepEqual(strike.properties, ['Reload 1'])
    assert.equal(strike.damage, damageRows.find((row) => Number(row.Level.replace('–', '-')) === level).Moderate)
    assert.equal(strike.damageType, 'piercing')
    assert.equal(paint.actionCost, 1)
    assert.deepEqual(paint.traits, ['Concentrate'])
    assert.equal(paint.range, '30–120 feet')
    assert.equal(paint.targets, 'One visible target')
    assert.equal(paint.requirements, 'The target is not prone, and does not have Standard or Greater Cover.')
    assert.equal(paint.savingThrow, 'Reflex')
    assert.equal(paint.dc, Number(dcRows.find((row) => Number(row.Level.replace('–', '-')) === level)['High DC']))
    assert.match(paint.text, /All previous quarries lose their Red Dot and Exposed conditions/)
    assert.match(redDot.text, /^You are aware that you are being targeted by a sniper\./)
    assert.match(redDot.text, /- When you Take Cover, Red Dot ends\./)
    assert.match(redDot.text, /if you are hidden, undetected, or unnoticed by the sniper, or the sniper has no line of sight to you, Red Dot ends\./)
    assert.match(redDot.text, /- Otherwise, Red Dot becomes Exposed\./)
    const average = damageRows.find((row) => Number(row.Level.replace('–', '-')) === level)['Moderate Average']
    assert.match(exposed.text, new RegExp(`weakness ${average} to the sniper's Strikes`))
    assert.match(exposed.text, /^You are aware that the sniper has acquired a clear shot at you\./)
    assert.match(exposed.text, /- When you Take Cover, Exposed ends\./)
    assert.match(exposed.text, /if you are hidden, undetected, or unnoticed by the sniper, or the sniper has no line of sight to you, Exposed ends\./)
  }
})

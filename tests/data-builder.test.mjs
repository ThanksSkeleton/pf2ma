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

test('level 1 Ace meets the comparison threshold without hiding CSV differences', () => {
  const built = buildAce(sources)
  const result = compareArchetypes(ace, built)
  assert.ok(result.percentage >= 75, JSON.stringify(result))
  assert.equal(built.statGroups.flat().find((stat) => stat.label === 'Reflex').value, '+7')
  assert.equal(built.attack.range, '30 feet')
  assert.equal(built.attack.damageType, undefined)
  assert.equal(built.abilities[0].frequency, undefined)
  assert.ok(result.differences.some((difference) => difference.field === 'abilities.0.targets'))
})

test('builder reads changed benchmarks and fails clearly for missing data or unsupported levels', () => {
  const changed = { ...sources, 'table-2-5-armor-class.csv': sources['table-2-5-armor-class.csv'].replace('1,19,16,15,13', '1,19,16,15,12') }
  assert.equal(buildAce(changed).statGroups[1][0].value, '12')
  assert.throws(() => buildAce({}, 1), /Missing CSV/)
  assert.throws(() => buildAce(sources, 2), /Only level 1/)
})

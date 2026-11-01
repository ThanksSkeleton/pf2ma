import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { parseCsv } from '../src/data-builder.ts'

const directory = new URL('../csv/', import.meta.url)
const sources = Object.fromEntries(await Promise.all(
  (await readdir(directory)).filter((name) => name.endsWith('.csv'))
    .map(async (name) => [name, await readFile(new URL(name, directory), 'utf8')]),
))
const families = ['Trip', 'Grapple', 'Shove', 'Disarm']

test('sheets never combine lower and higher ranks of one maneuver', () => {
  for (const row of parseCsv(sources['RoadMaps_Prod.csv'])) {
    const assigned = row['Special Abilities'].split(';').map((name) => name.trim())
    for (const family of families) {
      assert.ok([family, `Advanced ${family}`, `Supreme ${family}`]
        .filter((name) => assigned.includes(name)).length <= 1, `${row['Road Map']}: ${family}`)
    }
  }
})

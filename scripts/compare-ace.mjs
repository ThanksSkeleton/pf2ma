import { readFile, readdir } from 'node:fs/promises'
import { buildAce, compareArchetypes } from '../src/data-builder.ts'
import { ace } from '../src/ace-reference.ts'

const directory = new URL('../csv/', import.meta.url)
const sources = Object.fromEntries(await Promise.all(
  (await readdir(directory)).filter((name) => name.endsWith('.csv'))
    .map(async (name) => [name, await readFile(new URL(name, directory), 'utf8')]),
))
const result = compareArchetypes(ace, buildAce(sources))
console.log(JSON.stringify(result, null, 2))
if (result.percentage < 75) process.exitCode = 1

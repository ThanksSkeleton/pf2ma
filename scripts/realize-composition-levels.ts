import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listArchetypes } from '../src/data-builder.ts'
import { loadSources, realizeMonster } from './realized-monster-data.ts'

const partyLevels = [6, 10]
const encounterOffsets = [2, 0, -4, -2]
const creatureLevels = [...new Set(partyLevels.flatMap((partyLevel) =>
  encounterOffsets.map((offset) => partyLevel + offset)))].sort((a, b) => a - b)
const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../output/unit_comparison')

async function main() {
  const sources = await loadSources()
  const names = listArchetypes(sources)
  await mkdir(outputDirectory, { recursive: true })
  for (const level of creatureLevels) {
    const units = names.map((name) => realizeMonster(sources, name, level))
    const path = resolve(outputDirectory, `level-${level}.json`)
    await writeFile(path, `${JSON.stringify(units, null, 2)}\n`)
    process.stdout.write(`${path}: ${units.length} units\n`)
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

import type { Archetype } from './archetype.ts'
import type { CsvSources } from './data-builder.ts'
import { parseCsv } from './data-builder.ts'

/** Engineer's attached minions remain separate from selectable archetypes. */
export function buildEngineerMinions(sources: CsvSources, level: number, damageType = 'piercing'): Archetype[] {
  if (!Number.isInteger(level) || level < -1 || level > 24) throw new Error('Level must be an integer from -1 through 24')
  const lookup = (file: string, rank: string) => {
    const value = parseCsv(sources[file] ?? '').find((row) => Number(row.Level.replace('–', '-')) === level)?.[rank]
    if (!value) throw new Error(`Missing minion benchmark ${file}: ${level} ${rank}`)
    return value
  }
  return ['Ranged', 'Melee'].map((subtype): Archetype => {
    const ranged = subtype === 'Ranged'
    const save = lookup('table-2-6-saving-throws.csv', 'Terrible')
    return {
      name: `${subtype} Minion`, level, role: 'Minion', size: 'Small',
      description: ranged ? 'A stationary, fragile minion that attacks from a short distance.' : 'A fragile minion that closes on nearby enemies to attack.',
      statGroups: [
        [{ label: 'Perception', value: lookup('table-2-2-perception.csv', 'Terrible') }],
        [{ label: 'AC', value: lookup('table-2-5-armor-class.csv', 'Low') },
          { label: 'HP', value: lookup('table-2-7-hit-points.csv', ranged ? 'Superterrible' : 'Terrible') }],
        [{ label: 'Fort', value: save }, { label: 'Reflex', value: save }, { label: 'Will', value: save }],
        [{ label: 'Speed', value: ranged ? '0 feet' : '15 feet' }],
      ],
      attack: {
        name: `${subtype} Strike`, type: 'attack', actionCost: 1, attackType: ranged ? 'Ranged' : 'Melee',
        ...(ranged ? { range: '30 feet' } : {}),
        attack: lookup('table-2-9-strike-attack-bonus.csv', 'Moderate'),
        damage: lookup('table-2-10-strike-damage.csv', 'Terrible'), damageType,
      },
      tactics: ranged ? 'The Ranged Minion cannot move. It attacks a creature within 30 feet.' : 'The Melee Minion moves toward an enemy and attacks when it can reach one.',
      abilities: [], minions: [],
    }
  })
}

import type { Archetype, AbilityCard } from './archetype.ts'
import type { CsvSources } from './data-builder.ts'
import { parseCsv } from './data-builder.ts'

/** Build the trap stat blocks placed by Trapper and Saboteur. */
export function buildTraps(sources: CsvSources, archetype: 'Trapper' | 'Saboteur', level: number, physicalDamageType = 'piercing', nonphysicalDamageType = 'fire'): Archetype[] {
  if (!Number.isInteger(level) || level < -1 || level > 24) throw new Error('Level must be an integer from -1 through 24')
  const table = (file: string) => parseCsv(sources[file] ?? '')
  const narratives = table('TacticsAndDescription.csv')
  const narrative = (name: string) => {
    const row = narratives.find((candidate) => candidate.archetype === name)
    if (!row?.description || !row.tactics) throw new Error(`Missing description or tactics for ${name} in TacticsAndDescription.csv`)
    return row
  }
  const roadmap = table('RoadMaps_Prod.csv').find((row) => row['Road Map'] === archetype)
  if (!roadmap) throw new Error(`Missing roadmap for ${archetype}`)
  const benchmark = (file: string, column: string) => {
    const row = table(file).find((entry) => Number(entry.Level.replace('–', '-')) === level)
    const value = row?.[column]
    if (!value) throw new Error(`Missing trap benchmark ${file}: level ${level}, ${column}`)
    return value
  }
  const dc = benchmark('table-2-11-spell-dc-attack-bonus.csv', `${roadmap['Spell DC'] || 'Moderate'} DC`)
  const trapConfigs = archetype === 'Trapper'
    ? [
      { name: 'Instant Trap', target: 'The first creature to move adjacent to the trap', area: '', damageRank: 'Low', duration: 'The Speed penalty lasts 1 minute.', effect: 'When a creature moves adjacent to the trap, it takes the listed damage with a basic Reflex save. On a failed save, its Speed is reduced by 5 feet for 1 minute. The trap is then destroyed.' },
      { name: 'Prepared Trap', target: 'Creatures in the area', area: '10-foot burst centered on the opened object', damageRank: 'High', duration: '', effect: 'When the object is opened without first disabling the trap, creatures in the area take the listed damage with a basic Reflex save. A Perception check can reveal the trap; two successful Thievery checks disable it.' },
    ]
    : [
      { name: 'Mine', target: 'The creature that enters the trapped square', area: '', damageRank: 'High', duration: '', effect: 'When a creature enters the trapped square, it takes the listed damage with a basic Reflex save. The mine is then destroyed.' },
    ]
  return trapConfigs.map((config): Archetype => {
    const damage = benchmark('table-2-10-strike-damage.csv', config.damageRank)
    const hardness = benchmark('table-2-15-trap-defenses.csv', 'Hardness')
    const text = narrative(config.name)
    const trigger: AbilityCard = {
      name: 'Trap Trigger', type: 'action', actionCost: 'passive', symbol: 'starburst', targets: config.target,
      ...(config.area ? { area: config.area } : {}), ...(config.duration ? { duration: config.duration } : {}),
      savingThrow: 'Reflex', basicSave: true, dc: Number(dc), damage,
      damageType: archetype === 'Saboteur' ? nonphysicalDamageType : physicalDamageType,
      text: config.effect,
    }
    return {
      name: config.name, level, role: 'Trap', size: 'Small',
      description: text.description,
      statGroups: [
        [{ label: 'AC', value: benchmark('table-2-15-trap-defenses.csv', 'Low AC') },
          { label: 'HP', value: benchmark('table-2-15-trap-defenses.csv', 'HP') }],
        [{ label: 'Fort', value: benchmark('table-2-15-trap-defenses.csv', 'Low Save') },
          { label: 'Reflex', value: benchmark('table-2-15-trap-defenses.csv', 'Low Save') },
          { label: 'Will', value: benchmark('table-2-15-trap-defenses.csv', 'Low Save') }],
        [{ label: 'Speed', value: '0 feet' }],
      ],
      tactics: text.tactics,
      abilities: [{ name: 'Hardness', type: 'passive', actionCost: 'passive', text: `The trap has Hardness ${hardness}.` }, trigger], minions: [],
    }
  })
}

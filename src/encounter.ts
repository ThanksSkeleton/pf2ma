export type EncounterCategory = 'Any' | 'Melee+' | 'Ranged+' | 'Pacifist' | 'Controller' | 'Striker' | 'Defender'
export type EncounterSlot = { levelOffset: number; count: number; category: EncounterCategory }
export type EncounterTemplate = { name: string; xp: number; slots: EncounterSlot[]; maxPacifists?: number }
export type EncounterArchetype = { name: string; role: string; traits: string[] }
export type EncounterGroup = { name: string; count: number; level: number; mode?: 'Melee' | 'Ranged' }

const slot = (levelOffset: number, count: number, category: EncounterCategory): EncounterSlot => ({ levelOffset, count, category })
const pair = (name: string, first: EncounterCategory, second: EncounterCategory): EncounterTemplate => ({
  name: `Mated Pair : ${name}`, xp: 80, slots: [slot(0, 1, first), slot(0, 1, second)],
})
const lackeys = (original: string, xp: number, leaderOffset: number, name: string, leader: EncounterCategory, followers: EncounterCategory): EncounterTemplate => ({
  name: `${original} : ${name}`, xp, slots: [slot(leaderOffset, 1, leader), slot(-4, 4, followers)],
})

export const encounterTemplates: EncounterTemplate[] = [
  ...(['Boss and Lackeys', 'Lieutenant and Lackeys'] as const).flatMap((original) => {
    const boss = original === 'Boss and Lackeys'
    return [
      lackeys(original, boss ? 120 : 80, boss ? 2 : 0, 'Fray', 'Melee+', 'Melee+'),
      lackeys(original, boss ? 120 : 80, boss ? 2 : 0, 'Brute', 'Melee+', 'Ranged+'),
      lackeys(original, boss ? 120 : 80, boss ? 2 : 0, 'Protected', 'Ranged+', 'Melee+'),
      lackeys(original, boss ? 120 : 80, boss ? 2 : 0, 'Sorcerer', 'Ranged+', 'Ranged+'),
      lackeys(original, boss ? 120 : 80, boss ? 2 : 0, 'Overlord', 'Pacifist', 'Melee+'),
    ]
  }),
  { name: 'Boss and Lieutenant : Heal Me', xp: 120, slots: [slot(2, 1, 'Melee+'), slot(0, 1, 'Pacifist')] },
  { name: 'Boss and Lieutenant : Backup', xp: 120, slots: [slot(2, 1, 'Melee+'), slot(0, 1, 'Ranged+')] },
  { name: 'Boss and Lieutenant : Controller', xp: 120, slots: [slot(2, 1, 'Ranged+'), slot(0, 1, 'Controller')] },
  { name: 'Elite Enemies', xp: 120, maxPacifists: 1, slots: [slot(0, 1, 'Any'), slot(0, 1, 'Any'), slot(0, 1, 'Any')] },
  pair('Melee', 'Melee+', 'Melee+'),
  pair('Heal Me', 'Melee+', 'Pacifist'),
  pair('Duo', 'Melee+', 'Ranged+'),
  { name: 'Troop : Melee', xp: 80, slots: [slot(0, 1, 'Melee+'), slot(-2, 2, 'Melee+')] },
  { name: 'Troop : Ranged', xp: 80, slots: [slot(0, 1, 'Ranged+'), slot(-2, 2, 'Ranged+')] },
  { name: 'Troop : Strike Force', xp: 80, slots: [slot(0, 1, 'Pacifist'), slot(-2, 2, 'Melee+')] },
  { name: 'Troop : Medic', xp: 80, slots: [slot(0, 1, 'Pacifist'), slot(-2, 2, 'Ranged+')] },
  { name: 'Mook Squad : Controller', xp: 60, slots: [slot(-4, 6, 'Controller')] },
  { name: 'Mook Squad : Striker', xp: 60, slots: [slot(-4, 6, 'Striker')] },
  { name: 'Mook Squad : Defender', xp: 60, slots: [slot(-4, 6, 'Defender')] },
]

export const validPartyLevels = (template: EncounterTemplate) =>
  Array.from({ length: 26 }, (_, index) => index - 1)
    .filter((level) => template.slots.every((entry) => level + entry.levelOffset >= -1 && level + entry.levelOffset <= 24))

export function matchesEncounterCategory(archetype: EncounterArchetype, category: EncounterCategory): boolean {
  const traits = archetype.traits
  if (category === 'Any') return true
  if (category === 'Pacifist') return traits.includes('Pacifist')
  if (traits.includes('Pacifist')) return false
  if (category === 'Melee+') return traits.some((trait) => ['Melee', 'Flexible', 'Modal'].includes(trait))
  if (category === 'Ranged+') return traits.includes('Ranged') || traits.includes('Modal')
  return archetype.role === category
}

export function rollEncounter(template: EncounterTemplate, partyLevel: number, archetypes: EncounterArchetype[], random = Math.random): EncounterGroup[] {
  if (!validPartyLevels(template).includes(partyLevel)) throw new Error('Unsupported party level for this template')
  const remaining = [...archetypes]
  let pacifists = 0
  return template.slots.map((entry) => {
    const candidates = remaining.filter((archetype) => matchesEncounterCategory(archetype, entry.category) &&
      (template.maxPacifists === undefined || pacifists < template.maxPacifists || !archetype.traits.includes('Pacifist')))
    if (!candidates.length) throw new Error(`No archetypes available for ${entry.category} in ${template.name}`)
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
    const chosen = candidates[index]
    remaining.splice(remaining.indexOf(chosen), 1)
    if (chosen.traits.includes('Pacifist')) pacifists++
    const mode = chosen.traits.includes('Modal') ? (entry.category === 'Ranged+' ? 'Ranged' : 'Melee') : undefined
    return { name: chosen.name, count: entry.count, level: partyLevel + entry.levelOffset, ...(mode ? { mode } : {}) }
  })
}

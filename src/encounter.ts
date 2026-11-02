export type EncounterCategory = 'Any' | 'Melee+' | 'Ranged+' | 'Ability' | 'Controller' | 'Striker' | 'Defender'
export type EncounterSlot = { levelOffset: number; count: number; category: EncounterCategory }
export type EncounterTemplate = { name: string; xp: number; slots: EncounterSlot[]; recipe: string; maxPacifists?: number }
export type EncounterArchetype = { name: string; role: string; traits: string[] }
export type EncounterGroup = { name: string; count: number; level: number; mode?: 'Melee' | 'Ranged' }

const slot = (levelOffset: number, count: number, category: EncounterCategory): EncounterSlot => ({ levelOffset, count, category })
const pair = (name: string, first: EncounterCategory, second: EncounterCategory, recipe: string): EncounterTemplate => ({
  name: `Mated Pair : ${name}`, xp: 80, slots: [slot(0, 1, first), slot(0, 1, second)], recipe,
})
const lackeyPlans = [
  { name: 'Fray', leader: 'Melee+' as const, followers: 'Melee+' as const, leaderText: 'melee', followerText: 'melee', tactic: 'Press the front line from several sides.' },
  { name: 'Brute', leader: 'Melee+' as const, followers: 'Ranged+' as const, leaderText: 'melee', followerText: 'ranged', tactic: 'Let the leader engage up close while the lackeys fire from behind.' },
  { name: 'Protected', leader: 'Ranged+' as const, followers: 'Melee+' as const, leaderText: 'ranged', followerText: 'melee', tactic: 'Use the lackeys to screen the leader and contest approaches.' },
  { name: 'Sorcerer', leader: 'Ranged+' as const, followers: 'Ranged+' as const, leaderText: 'ranged', followerText: 'ranged', tactic: 'Keep the leader behind the lackeys and pressure the party at a distance.' },
  { name: 'Overlord', leader: 'Ability' as const, followers: 'Melee+' as const, leaderText: 'ability-focused', followerText: 'melee', tactic: 'Have the leader use its special abilities while the lackeys engage up close.' },
]
const lackeys = (original: string, xp: number, leaderOffset: number, plan: typeof lackeyPlans[number]): EncounterTemplate => ({
  name: `${original} : ${plan.name}`, xp, slots: [slot(leaderOffset, 1, plan.leader), slot(-4, 4, plan.followers)],
  recipe: `One ${plan.leaderText} leader ${leaderOffset === 2 ? 'two levels above the party' : 'at party level'} leads four ${plan.followerText} lackeys four levels below the party. ${plan.tactic}`,
})

export const encounterCategoryDefinitions: { category: EncounterCategory; definition: string }[] = [
  { category: 'Any', definition: 'Any archetype can fill the slot, including a pacifist if the template allows one.' },
  { category: 'Melee+', definition: 'An archetype tagged Melee, Flexible, or Modal, excluding Ability.' },
  { category: 'Ranged+', definition: 'An archetype tagged Ranged or Modal, excluding Ability.' },
  { category: 'Ability', definition: 'An archetype tagged Ability, whose main power comes from its special abilities rather than its attacks.' },
  { category: 'Controller', definition: 'A non-pacifist archetype whose role is Controller.' },
  { category: 'Striker', definition: 'A non-pacifist archetype whose role is Striker.' },
  { category: 'Defender', definition: 'A non-pacifist archetype whose role is Defender.' },
]

export const encounterTemplates: EncounterTemplate[] = [
  ...(['Boss and Lackeys', 'Lieutenant and Lackeys'] as const).flatMap((original) => {
    const boss = original === 'Boss and Lackeys'
    return lackeyPlans.map((plan) => lackeys(original, boss ? 120 : 80, boss ? 2 : 0, plan))
  }),
  { name: 'Boss and Lieutenant : Heal Me', xp: 120, slots: [slot(2, 1, 'Melee+'), slot(0, 1, 'Ability')], recipe: 'Pair one melee boss two levels above the party with a party-level ability-focused lieutenant. The boss holds the front while the lieutenant uses its special abilities to shape the fight.' },
  { name: 'Boss and Lieutenant : Backup', xp: 120, slots: [slot(2, 1, 'Melee+'), slot(0, 1, 'Ranged+')], recipe: 'Pair one melee boss two levels above the party with a party-level ranged lieutenant. The boss draws attention while the lieutenant attacks from behind.' },
  { name: 'Boss and Lieutenant : Controller', xp: 120, slots: [slot(2, 1, 'Ranged+'), slot(0, 1, 'Controller')], recipe: 'Pair one ranged boss two levels above the party with a party-level controller. The controller limits approaches while the boss attacks at range.' },
  { name: 'Elite Enemies', xp: 120, maxPacifists: 1, slots: [slot(0, 1, 'Any'), slot(0, 1, 'Any'), slot(0, 1, 'Any')], recipe: 'Use three distinct party-level creatures, with at most one pacifist. Look for ways their different abilities can support each other.' },
  pair('Melee', 'Melee+', 'Melee+', 'Use two different party-level melee creatures. Send them in together so the party must handle two close threats.'),
  pair('Heal Me', 'Melee+', 'Ability', 'Use one party-level melee creature and one party-level ability-focused creature. Put the melee creature in front while its partner uses special abilities to influence the fight.'),
  pair('Duo', 'Melee+', 'Ranged+', 'Use one party-level melee creature and one party-level ranged creature. The melee partner contests space while the ranged partner attacks from behind.'),
  { name: 'Troop : Melee', xp: 80, slots: [slot(0, 1, 'Melee+'), slot(-2, 2, 'Melee+')], recipe: 'Put one party-level melee leader beside two melee followers two levels below the party. Use the followers to crowd the front while the leader picks a target.' },
  { name: 'Troop : Ranged', xp: 80, slots: [slot(0, 1, 'Ranged+'), slot(-2, 2, 'Ranged+')], recipe: 'Put one party-level ranged leader beside two ranged followers two levels below the party. Spread their firing positions so the party has to choose which to pursue.' },
  { name: 'Troop : Strike Force', xp: 80, slots: [slot(0, 1, 'Ability'), slot(-2, 2, 'Melee+')], recipe: 'Use one party-level ability-focused leader with two melee followers two levels below the party. The leader uses special abilities while the followers engage up close.' },
  { name: 'Troop : Medic', xp: 80, slots: [slot(0, 1, 'Ability'), slot(-2, 2, 'Ranged+')], recipe: 'Use one party-level ability-focused leader with two ranged followers two levels below the party. The leader uses special abilities while the followers attack from range.' },
  { name: 'Mook Squad : Controller', xp: 60, slots: [slot(-4, 6, 'Controller')], recipe: 'Use six copies of one controller four levels below the party. Let their numbers complicate movement and target selection.' },
  { name: 'Mook Squad : Striker', xp: 60, slots: [slot(-4, 6, 'Striker')], recipe: 'Use six copies of one striker four levels below the party. Send them after exposed targets in several small groups.' },
  { name: 'Mook Squad : Defender', xp: 60, slots: [slot(-4, 6, 'Defender')], recipe: 'Use six copies of one defender four levels below the party. Place them where they can hold lanes and delay an advance.' },
]

export const validPartyLevels = (template: EncounterTemplate) =>
  Array.from({ length: 26 }, (_, index) => index - 1)
    .filter((level) => template.slots.every((entry) => level + entry.levelOffset >= -1 && level + entry.levelOffset <= 24))

export function matchesEncounterCategory(archetype: EncounterArchetype, category: EncounterCategory): boolean {
  const traits = archetype.traits
  if (category === 'Any') return true
  if (category === 'Ability') return traits.includes('Ability')
  if (category === 'Melee+') return !traits.includes('Ability') && traits.some((trait) => ['Melee', 'Flexible', 'Modal'].includes(trait))
  if (category === 'Ranged+') return !traits.includes('Ability') && (traits.includes('Ranged') || traits.includes('Modal'))
  if (traits.includes('Pacifist')) return false
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

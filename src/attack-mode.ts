import type { AbilityCard, Archetype } from './archetype.ts'

export type AttackMode = 'Melee' | 'Ranged'

export function isAttackDisabled(creature: Archetype, card: AbilityCard, mode: AttackMode): boolean {
  if (card.type !== 'attack') return false
  if (creature.archetypeTraits?.includes('Flexible')) return card.attackType === 'Ranged'
  if (!creature.archetypeTraits?.includes('Modal')) return false
  const attackMode = card.attackType ?? (card.symbol === 'sword' ? 'Melee' : card.symbol === 'bow' ? 'Ranged' : undefined)
  return attackMode !== undefined && attackMode !== mode
}

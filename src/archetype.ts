export type AbilityCard = {
  name: string
  type: 'attack' | 'spell' | 'passive' | 'reaction' | 'status' | 'action'
  symbol?: 'sword' | 'bow' | 'circle' | 'starburst' | 'reaction' | 'heart' | 'status'
  actionCost: 1 | 2 | 3 | '1–3' | 'free' | 'reaction' | 'passive'
  requirements?: string
  trigger?: string
  targets?: string
  area?: string
  savingThrow?: string
  targetDC?: string
  dc?: number
  basicSave?: boolean
  attackType?: 'Ranged' | 'Melee'
  range?: string
  attack?: string
  damage?: string
  damageType?: string
  traits?: readonly string[]
  frequency?: string
  duration?: string
  text?: string
}

export type Archetype = {
  name: string
  level: number
  role: string
  size: string
  description: string
  statGroups: { label: string; value: string }[][]
  attack?: AbilityCard
  secondaryAttacks?: AbilityCard[]
  skills?: Record<string, string>
  archetypeTags?: string[]
  spellRank?: number
  tactics: string
  abilities: AbilityCard[]
  references?: AbilityCard[]
  minions: Archetype[]
}


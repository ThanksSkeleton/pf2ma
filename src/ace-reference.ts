import type { Archetype } from './archetype.ts'

// Preserved hardcoded reference for comparing the CSV builder.
export const ace: Archetype = {
  name: 'Ace', level: 1, role: 'Striker', size: 'Medium',
  description: 'placeholder',
  statGroups: [
    [{ label: 'Perception', value: '+10' }],
    [
      { label: 'AC', value: '13' },
      { label: 'HP', value: '15' },
    ],
    [
      { label: 'Fort', value: '+4' },
      { label: 'Reflex', value: '+10' },
      { label: 'Will', value: '+7' },
    ],
    [{ label: 'Speed', value: '40 feet' }],
  ],
  attack: { name: 'Ranged Strike', type: 'attack', actionCost: 1, attackType: 'Ranged', range: '60 feet', attack: '+9', damage: '1d6+2', damageType: 'piercing' },
  tactics: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  abilities: [
    { name: 'Mirror Image', type: 'spell', actionCost: 2, traits: ['Illusion'], frequency: 'once per encounter', duration: '1 minute', text: 'Three illusory copies surround the Ace. When an attack would hit, it hits the Ace only on a 1 in 4 chance with three copies, 1 in 3 with two, or 1 in 2 with one; otherwise it destroys a copy. A miss that is not a critical failure also destroys a copy. A critical hit assigned to a copy destroys it and hits the Ace as a normal success.' },
  ],
  minions: [],
}


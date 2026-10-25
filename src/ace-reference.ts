import type { Archetype } from './archetype.ts'

// Accepted level 1 reference, updated after review of the CSV comparison.
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
      { label: 'Reflex', value: '+7' },
      { label: 'Will', value: '+7' },
    ],
    [{ label: 'Speed', value: '40 feet' }],
  ],
  attack: { name: 'Ranged Strike', type: 'attack', actionCost: 1, symbol: 'bow', attackType: 'Ranged', range: '30 feet', attack: '+9', damage: '1d6+2', damageType: 'piercing' },
  tactics: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  abilities: [
    { name: 'Mirror Image', type: 'spell', actionCost: 2, traits: ['Concentrate', 'Illusion', 'Manipulate', 'Visual'], frequency: 'Once per day', duration: '1 minute', targets: 'You.', text: 'Create three illusory doubles in your space. When an attack would hit you, randomly determine whether it hits you or a remaining double, with each equally likely. A double struck by an attack disappears. A failed attack that is not a critical failure removes one double and has no other effect. If a critical hit is assigned to a double, remove that double and resolve a normal hit against you instead. The spell ends when the last double disappears.' },
  ],
  minions: [],
  skills: { Athletics: '+4', 'Stealth/Acrobatics': '+4', Escape: '+4' },
  spellRank: 1,
}


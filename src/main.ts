import './style.css'

type AbilityCard = {
  name: string
  type: 'attack' | 'spell' | 'passive' | 'reaction'
  actionCount: number
  meta?: string
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

type Archetype = {
  name: string
  level: number
  role: string
  size: string
  description: string
  statGroups: { label: string; value: string }[][]
  attack: AbilityCard
  tactics: string
  abilities: AbilityCard[]
  minions: Archetype[]
}

const engineerLevel = 1

// Retained as a reference example; the Engineer is the only creature rendered.
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
  attack: { name: 'Ranged Strike', type: 'attack', actionCount: 1, attackType: 'Ranged', range: '60 feet', attack: '+9', damage: '1d6+2', damageType: 'piercing' },
  tactics: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  abilities: [
    { name: 'Mirror Image', type: 'spell', actionCount: 2, traits: ['Illusion'], frequency: 'once per encounter', duration: '1 minute', text: 'Three illusory copies surround the Ace. When an attack would hit, it hits the Ace only on a 1 in 4 chance with three copies, 1 in 3 with two, or 1 in 2 with one; otherwise it destroys a copy. A miss that is not a critical failure also destroys a copy. A critical hit assigned to a copy destroys it and hits the Ace as a normal success.' },
  ],
  minions: [],
}

const rangedMinion: Archetype = {
  name: 'Ranged Minion', level: engineerLevel, role: 'Minion', size: 'Small',
  description: 'A stationary, fragile minion that attacks from a short distance.',
  statGroups: [
    [{ label: 'Perception', value: '+2' }],
    [
      { label: 'AC', value: '13' },
      { label: 'HP', value: '3' },
    ],
    [
      { label: 'Fort', value: '+2' },
      { label: 'Reflex', value: '+2' },
      { label: 'Will', value: '+2' },
    ],
    [{ label: 'Speed', value: '0 feet' }],
  ],
  attack: { name: 'Ranged Strike', type: 'attack', actionCount: 1, attackType: 'Ranged', range: '30 feet', attack: '+7', damage: '2' },
  tactics: 'The Ranged Minion cannot move. It attacks a creature within 30 feet.',
  abilities: [],
  minions: [],
}

const meleeMinion: Archetype = {
  name: 'Melee Minion', level: engineerLevel, role: 'Minion', size: 'Small',
  description: 'A fragile minion that closes on nearby enemies to attack.',
  statGroups: [
    [{ label: 'Perception', value: '+2' }],
    [
      { label: 'AC', value: '13' },
      { label: 'HP', value: '7' },
    ],
    [
      { label: 'Fort', value: '+2' },
      { label: 'Reflex', value: '+2' },
      { label: 'Will', value: '+2' },
    ],
    [{ label: 'Speed', value: '15 feet' }],
  ],
  attack: { name: 'Melee Strike', type: 'attack', actionCount: 1, attackType: 'Melee', attack: '+7', damage: '2' },
  tactics: 'The Melee Minion moves toward an enemy and attacks when it can reach one.',
  abilities: [],
  minions: [],
}

// A single NPC example, using the same recursive shape as all archetypes.
const engineer: Archetype = {
  name: 'Engineer', level: engineerLevel, role: 'Striker', size: 'Medium',
  description: 'A battlefield technician who creates ranged minions to pressure enemies and support a position.',
  statGroups: [
    [{ label: 'Perception', value: '+7' }],
    [
      { label: 'AC', value: '13' },
      { label: 'HP', value: '15' },
    ],
    [
      { label: 'Fort', value: '+4' },
      { label: 'Reflex', value: '+7' },
      { label: 'Will', value: '+10' },
    ],
    [{ label: 'Speed', value: '25 feet' }],
  ],
  attack: { name: 'Ranged Strike', type: 'attack', actionCount: 1, attackType: 'Ranged', range: '30 feet', attack: '+5', damage: '1d4+2', damageType: 'piercing' },
  tactics: 'The Engineer uses cover and creates ranged minions in nearby open spaces. Each minion acts immediately after the Engineer, adding attacks while the Engineer makes ranged Strikes or creates more minions, up to the limit of six.',
  abilities: [
    { name: 'Minion Master', type: 'spell', actionCount: 1, meta: 'Requires fewer than six active minions', traits: ['Concentrate', 'Manipulate'], frequency: 'once per turn', text: 'Create one minion in an unoccupied square adjacent to you. The minion uses the Ranged Minion roadmap at your level. You can have up to six minions created by this ability at a time. All of them take their turns immediately after yours, including a minion created this turn.' },
  ],
  minions: [rangedMinion, meleeMinion],
}

// Presentation mappings stay separate from the creature content.
const attackIconBySubtype = {
  Ranged: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Ranged attack" focusable="false"><path d="M8 3c10 3 10 15 0 18M8 3v18M3 12h18m-4-4 4 4-4 4M5 10l3 2-3 2" fill="none" stroke="#f2e8c3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  Melee: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Melee attack" focusable="false"><path d="m15 2 7 7-11 11-5-5L17 4l-2-2ZM6 14l4 4m-6-1-2 2 3 3 2-2" fill="#f2e8c3"/></svg>',
} as const

const cardPresentationByType = {
  attack: {
    style: 'ability--strike',
    icon: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Attack" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="#f2e8c3" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#f2e8c3"/></svg>',
  },
  spell: {
    style: 'ability--spell',
    icon: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Spell" focusable="false"><path d="m12 2 2.2 7.4L22 12l-7.8 2.6L12 22l-2.2-7.4L2 12l7.8-2.6L12 2Z" fill="#f2e8c3"/></svg>',
  },
  passive: {
    style: 'ability--passive',
    icon: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Passive ability" focusable="false"><path d="M12 21s-9-5.6-9-12a4.8 4.8 0 0 1 9-2.4A4.8 4.8 0 0 1 21 9c0 6.4-9 12-9 12Z" fill="#f2e8c3"/></svg>',
  },
  reaction: {
    style: 'ability--reaction',
    icon: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Reaction" focusable="false"><path d="M12 4V1L7 6l5 5V8a6 6 0 1 1-5.7 8H3.2A9 9 0 1 0 12 4Z" fill="#f2e8c3"/></svg>',
  },
} as const

const actionMarkByCount: Record<number, string> = {
  1: '◆',
  2: '◆◆',
  3: '◆◆◆',
}

const statStyleByLabel: Record<string, string> = {
  Perception: 'black',
  AC: 'blue',
  HP: 'red',
  Fort: 'green',
  Reflex: 'yellow',
  Will: 'purple',
  Speed: 'black',
  Size: 'black',
}

const renderCard = (card: {
  name: string
  type: keyof typeof cardPresentationByType
  actionCount: number
  meta?: string
  attackType?: 'Ranged' | 'Melee'
  range?: string
  attack?: string
  damage?: string
  damageType?: string
  traits?: readonly string[]
  frequency?: string
  duration?: string
  text?: string
}) => {
  const actionMark = actionMarkByCount[card.actionCount] ?? ''
  const actionLabel = `${card.actionCount} ${card.actionCount === 1 ? 'action' : 'actions'}`
  const metaItems = [card.meta, card.range ? `Range ${card.range}` : undefined, card.traits?.join(', '), card.frequency, card.duration].filter(Boolean)
  const presentation = cardPresentationByType[card.type]
  const icon = card.type === 'attack' && card.attackType
    ? attackIconBySubtype[card.attackType]
    : presentation.icon
  const attackAndDamage = [
    card.attack ? `<span class="ability-line"><strong>Attack</strong> ${card.attack}</span>` : '',
    card.damage ? `<span class="ability-line"><strong>Damage</strong> ${card.damage}${card.damageType ? ` ${card.damageType}` : ''}</span>` : '',
  ].join('')
  return `
  <section class="ability ${presentation.style}" aria-label="${card.name}">
    <div class="ability-head"><div class="ability-name-row"><div class="ability-title">${icon}<h3>${card.name}</h3></div><span class="action-mark" role="img" aria-label="${actionLabel}">${actionMark}</span></div>${metaItems.length ? `<p class="ability-meta">${metaItems.join(' · ')}</p>` : ''}</div>
    <p class="ability-text">${attackAndDamage}${card.text ?? ''}</p>
  </section>`
}

const renderCreatureSheet = (creature: Archetype, depth = 0, parentId = ''): string => {
  const slug = creature.name.toLowerCase().replaceAll(' ', '-')
  const id = parentId ? `${parentId}-${slug}` : slug
  return `
  <article class="creature-sheet${depth > 0 ? ' creature-sheet--minion' : ''}" aria-labelledby="${id}-name">
    <div class="top-grid">
      <header class="identity">
        <div class="role-row">
          <svg class="crest" viewBox="0 0 48 54" fill="none" aria-hidden="true">
            <path d="M24 2C17 7 9 8 3 8v18c0 13 9 21 21 26 12-5 21-13 21-26V8C39 8 31 7 24 2Z" fill="currentColor"/>
            <path d="M24 9v35c-9-5-14-11-14-20V14c5-.5 10-2 14-5Z" fill="white"/>
          </svg>
          <p class="role">${creature.role}</p>
        </div>
        <h1 id="${id}-name">${creature.name}</h1>
        <dl class="size-row"><div class="stat-row stat-row--${statStyleByLabel.Size}"><dt>Size</dt><dd>${creature.size}</dd></div></dl>
      </header>

      <section class="base-block" aria-label="Base stats">
        <div class="stat-list">${creature.statGroups.map((group) => `
          <dl class="stat-group">${group.map((stat) => `
            <div class="stat-row stat-row--${statStyleByLabel[stat.label] ?? 'black'}"><dt>${stat.label}</dt><dd>${stat.value}</dd></div>
          `).join('')}</dl>
        `).join('')}</div>
      </section>
    </div>

    <div class="sheet-body">
      <section class="description" aria-labelledby="${id}-description-heading"><div class="section-heading"><h2 id="${id}-description-heading">Description</h2></div><p>${creature.description}</p></section>

      <section class="tactics" aria-labelledby="${id}-tactics-heading"><div class="section-heading"><h2 id="${id}-tactics-heading">Tactics</h2></div><p>${creature.tactics}</p></section>

      <section class="abilities" aria-labelledby="${id}-abilities-heading">
        <div class="section-heading"><h2 id="${id}-abilities-heading">Abilities</h2></div>
        <div class="ability-list">${[creature.attack, ...creature.abilities].map(renderCard).join('')}</div>
      </section>
    </div>
    ${creature.minions.length ? `
    <section class="minions-section" aria-labelledby="${id}-minions-heading">
      <div class="section-heading"><h2 id="${id}-minions-heading">Minions</h2></div>
      <div class="minion-list">${creature.minions.map((minion) => renderCreatureSheet(minion, depth + 1, id)).join('')}</div>
    </section>` : ''}
  </article>
  `
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root is missing')

app.innerHTML = `
  <div class="archetype-tabs" role="tablist" aria-label="Choose archetype">
    <button class="archetype-tab" id="tab-ace" type="button" role="tab" aria-selected="false" aria-controls="archetype-panel" tabindex="-1" data-archetype="ace">Ace</button>
    <button class="archetype-tab" id="tab-engineer" type="button" role="tab" aria-selected="true" aria-controls="archetype-panel" tabindex="0" data-archetype="engineer">Engineer</button>
  </div>
  <div id="archetype-panel" role="tabpanel" aria-labelledby="tab-engineer" tabindex="0">
    <div class="monster-box">${renderCreatureSheet(engineer)}</div>
  </div>
`

const panel = app.querySelector<HTMLDivElement>('#archetype-panel')
if (!panel) throw new Error('Archetype panel is missing')

const tabs = Array.from(app.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
const selectTab = (tab: HTMLButtonElement, moveFocus = false) => {
  const archetype = tab.dataset.archetype === 'ace' ? ace : engineer
  panel.innerHTML = `<div class="monster-box">${renderCreatureSheet(archetype)}</div>`
  panel.setAttribute('aria-labelledby', tab.id)
  tabs.forEach((candidate) => {
    const selected = candidate === tab
    candidate.setAttribute('aria-selected', String(selected))
    candidate.tabIndex = selected ? 0 : -1
  })
  if (moveFocus) tab.focus()
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab))
  tab.addEventListener('keydown', (event) => {
    let nextIndex: number | undefined
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex !== undefined) {
      event.preventDefault()
      selectTab(tabs[nextIndex], true)
    }
  })
})

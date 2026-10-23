import './style.css'

import type { AbilityCard, Archetype } from './archetype.ts'
import { ace } from './ace-reference.ts'

const engineerLevel = 1

// Reference archetype available through the archetype tabs.

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
  attack: { name: 'Ranged Strike', type: 'attack', actionCost: 1, attackType: 'Ranged', range: '30 feet', attack: '+7', damage: '2' },
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
  attack: { name: 'Melee Strike', type: 'attack', actionCost: 1, attackType: 'Melee', attack: '+7', damage: '2' },
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
  attack: { name: 'Ranged Strike', type: 'attack', actionCost: 1, attackType: 'Ranged', range: '30 feet', attack: '+5', damage: '1d4+2', damageType: 'piercing' },
  tactics: 'The Engineer uses cover and creates ranged minions in nearby open spaces. Each minion acts immediately after the Engineer, adding attacks while the Engineer makes ranged Strikes or creates more minions, up to the limit of six.',
  abilities: [
    { name: 'Minion Master', type: 'spell', actionCost: 1, requirements: 'Fewer than six active minions', traits: ['Concentrate', 'Manipulate'], frequency: 'once per turn', text: 'Create one minion in an unoccupied square adjacent to you. The minion uses the Ranged Minion roadmap at your level. You can have up to six minions created by this ability at a time. All of them take their turns immediately after yours, including a minion created this turn.' },
  ],
  minions: [rangedMinion, meleeMinion],
}

// Display examples only; these abilities are not a balanced creature.
const demo: Archetype = {
  name: 'Ability Demo', level: 1, role: 'Demo', size: 'Medium',
  description: 'A collection of varied abilities for reviewing the ability box.',
  statGroups: engineer.statGroups,
  attack: { name: 'Practice Strike', type: 'attack', actionCost: 1, attackType: 'Melee', traits: ['Agile'], attack: '+7', damage: '1d6+2', damageType: 'slashing' },
  tactics: 'Review the action symbols and optional fields across the examples below.',
  abilities: [
    { name: 'Flame Fan', type: 'spell', actionCost: 2, traits: ['Fire', 'Manipulate'], requirements: 'Holding a charged focus', frequency: 'once per encounter', area: '15-foot cone', savingThrow: 'Reflex', basicSave: true, dc: 17, damage: '2d6', damageType: 'fire', text: 'Release a fan of flame through the area.' },
    { name: 'Binding Field', type: 'spell', actionCost: 3, traits: ['Concentrate'], range: '60 feet', area: '10-foot burst', targets: 'Up to three creatures in the area', savingThrow: 'Fortitude', dc: 18, duration: '1 minute', text: 'On a failed save, a target is immobilized until the end of its next turn.' },
    { name: 'Protective Interruption', type: 'reaction', actionCost: 'reaction', traits: ['Concentrate'], trigger: 'An ally within range takes damage', requirements: 'You can see the ally', range: '30 feet', targets: 'The triggering ally', frequency: 'once per round', duration: 'Until the triggering damage is resolved', text: 'Reduce the triggering damage by 3.' },
    { name: 'Quick Calibration', type: 'spell', actionCost: 'free', trigger: 'Your turn begins', requirements: 'Holding a weapon', frequency: 'once per turn', duration: 'Until the end of your turn', text: 'Your next Strike gains a +1 circumstance bonus to its attack roll.' },
    { name: 'Steady Presence', type: 'passive', actionCost: 'passive', traits: ['Aura'], area: '10-foot emanation', targets: 'Allies in the aura', text: 'Affected allies gain a +1 circumstance bonus to saves against fear.' },
    { name: 'Shared Defense', type: 'spell', actionCost: 1, range: '30 feet', targets: 'One ally', duration: '1 round', text: 'The target can use DC 16 in place of its own DC against attempts to Shove it.' },
    { name: 'Borrowed Element', type: 'spell', actionCost: 1, text: 'Your next damaging ability deals cold damage instead of its normal damage type.' },
  ],
  minions: [],
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

const actionPresentation: Record<AbilityCard['actionCost'], { symbol: string; label: string } | null> = {
  1: { symbol: '◆', label: '1 action' },
  2: { symbol: '◆◆', label: '2 actions' },
  3: { symbol: '◆◆◆', label: '3 actions' },
  free: { symbol: '◇', label: 'Free action' },
  reaction: { symbol: '↶', label: 'Reaction' },
  passive: null,
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

const renderCard = (card: AbilityCard) => {
  const action = actionPresentation[card.actionCost]
  const targetingLine = [
    card.range ? `Range: ${card.range}` : undefined,
    card.targets ? `Targets: ${card.targets}` : undefined,
    card.area ? `Area: ${card.area}` : undefined,
  ].filter(Boolean).join(' · ')
  const metaLines = [
    card.traits?.join(', '),
    card.frequency,
    targetingLine,
    card.duration ? `Duration ${card.duration}` : undefined,
  ].filter(Boolean)
  const presentation = cardPresentationByType[card.type]
  const icon = card.type === 'attack' && card.attackType
    ? attackIconBySubtype[card.attackType]
    : presentation.icon
  const details: [string, string | number | undefined][] = [
    ['Requirements', card.requirements],
    ['Trigger', card.trigger],
    ['Saving Throw', card.savingThrow ? `${card.dc !== undefined ? `DC ${card.dc} ` : ''}${card.basicSave ? 'Basic ' : ''}${card.savingThrow}` : undefined],
    ['DC', card.savingThrow ? undefined : card.dc],
    ['Attack', card.attack],
    ['Damage', card.damage ? `${card.damage}${card.damageType ? ` ${card.damageType}` : ''}` : undefined],
    ['Damage Type', card.damage ? undefined : card.damageType],
  ]
  const detailLines = details
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([label, value]) => `<span class="ability-line"><strong>${label}</strong> ${value}</span>`)
    .join('')
  return `
  <section class="ability ${presentation.style}" aria-label="${card.name}">
    <div class="ability-head"><div class="ability-name-row"><div class="ability-title">${icon}<h3>${card.name}</h3></div>${action ? `<span class="action-mark" role="img" aria-label="${action.label}">${action.symbol}</span>` : ''}</div>${metaLines.map((line) => `<p class="ability-meta">${line}</p>`).join('')}</div>
    <p class="ability-text">${detailLines}${card.text ?? ''}</p>
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
    <button class="archetype-tab" id="tab-demo" type="button" role="tab" aria-selected="false" aria-controls="archetype-panel" tabindex="-1" data-archetype="demo">Ability Demo</button>
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
  const archetype = tab.dataset.archetype === 'ace' ? ace : tab.dataset.archetype === 'demo' ? demo : engineer
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

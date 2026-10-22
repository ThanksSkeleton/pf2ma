import './style.css'

// The only creature in this presentation prototype.
const ace = {
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
  attack: { name: 'Ranged Strike', kind: 'attack', actionCount: 1, attackType: 'Ranged', range: '60 feet', attack: '+9', damage: '1d6+2', damageType: 'piercing' },
  tactics: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  abilities: [
    { name: 'Mirror Image', kind: 'spell', actionCount: 2, traits: ['Illusion'], frequency: 'once per encounter', duration: '1 minute', text: 'Three illusory copies surround the Ace. When an attack would hit, it hits the Ace only on a 1 in 4 chance with three copies, 1 in 3 with two, or 1 in 2 with one; otherwise it destroys a copy. A miss that is not a critical failure also destroys a copy. A critical hit assigned to a copy destroys it and hits the Ace as a normal success.' },
  ],
} as const

// Presentation mappings stay separate from the creature content.
const abilityStyleByKind = {
  attack: 'ability--strike',
  spell: 'ability--spell',
  passive: 'ability--passive',
} as const

const attackIconByType = {
  Ranged: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Ranged attack" focusable="false"><path d="M8 3c10 3 10 15 0 18M8 3v18M3 12h18m-4-4 4 4-4 4M5 10l3 2-3 2" fill="none" stroke="#f2e8c3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  Melee: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Melee attack" focusable="false"><path d="m15 2 7 7-11 11-5-5L17 4l-2-2ZM6 14l4 4m-6-1-2 2 3 3 2-2" fill="#f2e8c3"/></svg>',
} as const

const abilityIconByKind = {
  spell: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Spell" focusable="false"><path d="m12 2 2.2 7.4L22 12l-7.8 2.6L12 22l-2.2-7.4L2 12l7.8-2.6L12 2Z" fill="#f2e8c3"/></svg>',
  passive: '<svg class="ability-icon" viewBox="0 0 24 24" role="img" aria-label="Passive ability" focusable="false"><path d="M12 21s-9-5.6-9-12a4.8 4.8 0 0 1 9-2.4A4.8 4.8 0 0 1 21 9c0 6.4-9 12-9 12Z" fill="#f2e8c3"/></svg>',
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

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root is missing')

const renderCard = (card: {
  name: string
  kind: keyof typeof abilityStyleByKind
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
  const icon = card.kind === 'attack'
    ? card.attackType ? attackIconByType[card.attackType] : ''
    : abilityIconByKind[card.kind]
  const attackAndDamage = [
    card.attack ? `<span class="ability-line"><strong>Attack</strong> ${card.attack}</span>` : '',
    card.damage ? `<span class="ability-line"><strong>Damage</strong> ${card.damage}${card.damageType ? ` ${card.damageType}` : ''}</span>` : '',
  ].join('')
  return `
  <section class="ability ${abilityStyleByKind[card.kind]}" aria-label="${card.name}">
    <div class="ability-head"><div class="ability-name-row"><div class="ability-title">${icon}<h3>${card.name}</h3></div><span class="action-mark" role="img" aria-label="${actionLabel}">${actionMark}</span></div>${metaItems.length ? `<p class="ability-meta">${metaItems.join(' · ')}</p>` : ''}</div>
    <p class="ability-text">${attackAndDamage}${card.text ?? ''}</p>
  </section>`
}

app.innerHTML = `
  <article class="creature-sheet" aria-labelledby="creature-name">
    <div class="top-grid">
      <header class="identity">
        <div class="role-row">
          <svg class="crest" viewBox="0 0 48 54" fill="none" aria-hidden="true">
            <path d="M24 2C17 7 9 8 3 8v18c0 13 9 21 21 26 12-5 21-13 21-26V8C39 8 31 7 24 2Z" fill="currentColor"/>
            <path d="M24 9v35c-9-5-14-11-14-20V14c5-.5 10-2 14-5Z" fill="white"/>
          </svg>
          <p class="role">${ace.role}</p>
        </div>
        <h1 id="creature-name">${ace.name}</h1>
        <dl class="size-row"><div class="stat-row stat-row--${statStyleByLabel.Size}"><dt>Size</dt><dd>${ace.size}</dd></div></dl>
      </header>

      <section class="base-block" aria-label="Base stats">
        <div class="stat-list">${ace.statGroups.map((group) => `
          <dl class="stat-group">${group.map((stat) => `
            <div class="stat-row stat-row--${statStyleByLabel[stat.label] ?? 'black'}"><dt>${stat.label}</dt><dd>${stat.value}</dd></div>
          `).join('')}</dl>
        `).join('')}</div>
      </section>
    </div>

    <div class="sheet-body">
      <section class="description" aria-labelledby="description-heading"><div class="section-heading"><h2 id="description-heading">Description</h2></div><p>${ace.description}</p></section>

      <section class="tactics" aria-labelledby="tactics-heading"><div class="section-heading"><h2 id="tactics-heading">Tactics</h2></div><p>${ace.tactics}</p></section>

      <section class="abilities" aria-labelledby="abilities-heading">
        <div class="section-heading"><h2 id="abilities-heading">Abilities</h2></div>
        <div class="ability-list">${[ace.attack, ...ace.abilities].map(renderCard).join('')}</div>
      </section>
    </div>
  </article>
`

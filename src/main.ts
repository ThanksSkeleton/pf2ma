import './style.css'

import type { AbilityCard, Archetype } from './archetype.ts'
import { buildArchetype, listArchetypes } from './data-builder.ts'
import { buildEngineerMinions } from './engineer-minions.ts'

const rawCsv = import.meta.glob<string>('../csv/*.csv', { query: '?raw', import: 'default', eager: true })
const sources = Object.fromEntries(Object.entries(rawCsv).map(([path, contents]) => [path.split('/').pop()!, contents]))
const names = listArchetypes(sources)
const escapeHtml = (value: string | number) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!)

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
  '1–3': { symbol: '◆–◆◆◆', label: '1 to 3 actions' },
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
    ['Target DC', card.targetDC],
    ['Saving Throw', card.savingThrow ? `${card.dc !== undefined ? `DC ${card.dc} ` : ''}${card.basicSave ? 'Basic ' : ''}${card.savingThrow}` : undefined],
    ['DC', card.savingThrow ? undefined : card.dc],
    ['Attack', card.attack],
    ['Damage', card.damage ? `${card.damage}${card.damageType ? ` ${card.damageType}` : ''}` : undefined],
    ['Damage Type', card.damage ? undefined : card.damageType],
  ]
  const detailLines = details
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([label, value]) => `<span class="ability-line"><strong>${label}</strong> ${escapeHtml(value!)}</span>`)
    .join('')
  return `
  <section class="ability ${presentation.style}" aria-label="${escapeHtml(card.name)}">
    <div class="ability-head"><div class="ability-name-row"><div class="ability-title">${icon}<h3>${escapeHtml(card.name)}</h3></div>${action ? `<span class="action-mark" role="img" aria-label="${action.label}">${action.symbol}</span>` : ''}</div>${metaLines.map((line) => `<p class="ability-meta">${escapeHtml(line ?? '')}</p>`).join('')}</div>
    <p class="ability-text">${detailLines}${escapeHtml(card.text ?? '')}</p>
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
          <p class="role">${escapeHtml(creature.role)}</p>
        </div>
        <p class="creature-level">Level ${creature.level}${creature.spellRank ? ` · Spell rank ${creature.spellRank}` : ''}</p>
        <h1 id="${id}-name">${escapeHtml(creature.name)}</h1>
        <dl class="size-row"><div class="stat-row stat-row--${statStyleByLabel.Size}"><dt>Size</dt><dd>${escapeHtml(creature.size)}</dd></div></dl>
      </header>

      <section class="base-block" aria-label="Base stats">
        <div class="stat-list">${creature.statGroups.map((group) => `
          <dl class="stat-group">${group.map((stat) => `
            <div class="stat-row stat-row--${statStyleByLabel[stat.label] ?? 'black'}"><dt>${escapeHtml(stat.label)}</dt><dd>${escapeHtml(stat.value)}</dd></div>
          `).join('')}</dl>
        `).join('')}</div>
      </section>
    </div>

    <div class="sheet-body">
      ${creature.skills ? `<dl class="skills" aria-label="Skills">${Object.entries(creature.skills).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>` : ''}
      <section class="description" aria-labelledby="${id}-description-heading"><div class="section-heading"><h2 id="${id}-description-heading">Description</h2></div><p>${escapeHtml(creature.description)}</p></section>

      <section class="tactics" aria-labelledby="${id}-tactics-heading"><div class="section-heading"><h2 id="${id}-tactics-heading">Tactics</h2></div><p>${escapeHtml(creature.tactics)}</p></section>

      <section class="abilities" aria-labelledby="${id}-abilities-heading">
        <div class="section-heading"><h2 id="${id}-abilities-heading">Abilities</h2></div>
        <div class="ability-list">${[...(creature.attack ? [creature.attack] : []), ...(creature.secondaryAttacks ?? []), ...creature.abilities].map(renderCard).join('')}</div>
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

const damageTypes = ['piercing', 'slashing', 'bludgeoning', 'acid', 'cold', 'electricity', 'fire', 'sonic', 'force', 'mental', 'poison', 'bleed', 'spirit', 'vitality', 'void']
let selectedIndex = 0

app.innerHTML = `
  <div class="builder-controls" aria-label="Creature options">
    <label for="damage-type">Damage type<select id="damage-type">${damageTypes.map((type) => `<option value="${type}">${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select></label>
    <label for="creature-level">Level<select id="creature-level">${Array.from({ length: 26 }, (_, index) => index - 1).map((level) => `<option value="${level}"${level === 1 ? ' selected' : ''}>${level}</option>`).join('')}</select></label>
  </div>
  <section class="archetype-carousel" aria-roledescription="carousel" aria-label="Archetypes" tabindex="0">
    <div class="carousel-heading"><h2>Choose archetype</h2><p id="carousel-position" role="status" aria-live="polite" aria-atomic="true"></p></div>
    <div class="carousel-navigation">
      <button type="button" id="previous-archetype" class="carousel-arrow" aria-label="Previous archetype" aria-controls="archetype-panel">‹</button>
      <div class="carousel-track">${names.map((name, index) => `<button type="button" class="archetype-choice" data-index="${index}" aria-controls="archetype-panel" aria-pressed="${index === 0}">${escapeHtml(name)}</button>`).join('')}</div>
      <button type="button" id="next-archetype" class="carousel-arrow" aria-label="Next archetype" aria-controls="archetype-panel">›</button>
    </div>
  </section>
  <div id="archetype-panel" role="region" aria-label="Selected creature"></div>
`

const panel = app.querySelector<HTMLDivElement>('#archetype-panel')!
const levelInput = app.querySelector<HTMLSelectElement>('#creature-level')!
const damageInput = app.querySelector<HTMLSelectElement>('#damage-type')!
const choices = Array.from(app.querySelectorAll<HTMLButtonElement>('.archetype-choice'))
const carousel = app.querySelector<HTMLElement>('.archetype-carousel')!
const position = app.querySelector<HTMLElement>('#carousel-position')!

const renderSelected = () => {
  const level = Number(levelInput.value)
  const creature = buildArchetype(sources, names[selectedIndex], level, damageInput.value)
  if (creature.name === 'Engineer') creature.minions = buildEngineerMinions(sources, level, damageInput.value)
  panel.innerHTML = `<div class="monster-box">${renderCreatureSheet(creature)}</div>`
  panel.setAttribute('aria-label', `${creature.name}, level ${level}`)
  document.title = `${creature.name} · Level ${level} | PF2E Monster Archetype Bank`
  position.textContent = `${creature.name} · ${selectedIndex + 1} of ${names.length}`
  choices.forEach((choice, index) => choice.setAttribute('aria-pressed', String(index === selectedIndex)))
}
const selectArchetype = (index: number, focus = false) => {
  selectedIndex = (index + names.length) % names.length
  renderSelected()
  choices[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  if (focus) choices[selectedIndex].focus({ preventScroll: true })
}
choices.forEach((choice, index) => choice.addEventListener('click', () => selectArchetype(index)))
app.querySelector('#previous-archetype')!.addEventListener('click', () => selectArchetype(selectedIndex - 1))
app.querySelector('#next-archetype')!.addEventListener('click', () => selectArchetype(selectedIndex + 1))
carousel.addEventListener('keydown', (event) => {
  const index = event.key === 'ArrowLeft' ? selectedIndex - 1
    : event.key === 'ArrowRight' ? selectedIndex + 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? names.length - 1 : undefined
  if (index === undefined) return
  event.preventDefault()
  selectArchetype(index, true)
})
levelInput.addEventListener('change', renderSelected)
damageInput.addEventListener('change', renderSelected)
renderSelected()

import './style.css'

import type { AbilityCard, Archetype } from './archetype.ts'
import { buildArchetype, listArchetypes } from './data-builder.ts'
import { buildEngineerMinions } from './engineer-minions.ts'
import { buildTraps } from './traps.ts'

const rawCsv = import.meta.glob<string>('../csv/*.csv', { query: '?raw', import: 'default', eager: true })
const sources = Object.fromEntries(Object.entries(rawCsv).map(([path, contents]) => [path.split('/').pop()!, contents]))
const names = listArchetypes(sources)
const escapeHtml = (value: string | number) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!)

// Generated transparent raster symbols replace the former inline SVG artwork.
const symbolAssets = {
  roleDefender: new URL('../symbols/role-defender.png', import.meta.url).href,
  sword: new URL('../symbols/sword.png', import.meta.url).href,
  bow: new URL('../symbols/bow.png', import.meta.url).href,
  starburst: new URL('../symbols/starburst.png', import.meta.url).href,
  circle: new URL('../symbols/circle.png', import.meta.url).href,
  heart: new URL('../symbols/heart.png', import.meta.url).href,
  reaction: new URL('../symbols/reaction.png', import.meta.url).href,
  status: new URL('../symbols/status.png', import.meta.url).href,
  action: new URL('../symbols/action.png', import.meta.url).href,
  freeAction: new URL('../symbols/free-action.png', import.meta.url).href,
  roleStriker: new URL('../symbols/role-striker.png', import.meta.url).href,
  roleSupport: new URL('../symbols/role-support.png', import.meta.url).href,
  roleController: new URL('../symbols/role-controller.png', import.meta.url).href,
  roleArtillery: new URL('../symbols/role-artillery.png', import.meta.url).href,
} as const

const iconBySymbol = {
  sword: symbolAssets.sword,
  bow: symbolAssets.bow,
  circle: symbolAssets.circle,
  starburst: symbolAssets.starburst,
  heart: symbolAssets.heart,
  reaction: symbolAssets.reaction,
  status: symbolAssets.status,
} as const

const cardPresentationByType = {
  attack: { style: 'ability--strike' },
  spell: { style: 'ability--spell' },
  passive: { style: 'ability--passive' },
  action: { style: 'ability--action' },
  status: { style: 'ability--status' },
  reaction: { style: 'ability--reaction' },
} as const

const fallbackSymbolByType: Record<AbilityCard['type'], keyof typeof iconBySymbol> = {
  attack: 'circle', spell: 'starburst', passive: 'heart', action: 'starburst',
  status: 'status', reaction: 'reaction',
}

const roleIconByName: Record<string, string> = {
  Striker: symbolAssets.roleStriker,
  Support: symbolAssets.roleSupport,
  Controller: symbolAssets.roleController,
  Defender: symbolAssets.roleDefender,
  Artillery: symbolAssets.roleArtillery,
}

const actionPresentation: Record<AbilityCard['actionCost'], { symbols: ('action' | 'freeAction' | 'reaction' | 'range')[]; label: string } | null> = {
  1: { symbols: ['action'], label: '1 action' },
  2: { symbols: ['action', 'action'], label: '2 actions' },
  3: { symbols: ['action', 'action', 'action'], label: '3 actions' },
  '1–3': { symbols: ['action', 'range', 'action', 'action', 'action'], label: '1 to 3 actions' },
  free: { symbols: ['freeAction'], label: 'Free action' },
  reaction: { symbols: ['reaction'], label: 'Reaction' },
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
  const symbol = card.type === 'reaction' ? 'reaction'
    : card.type === 'passive' ? 'heart'
      : card.type === 'status' ? 'status'
        : card.symbol ?? (card.type === 'attack' && card.attackType
          ? card.attackType === 'Melee' ? 'sword' : 'bow'
          : fallbackSymbolByType[card.type])
  const icon = `<img class="ability-icon" src="${iconBySymbol[symbol]}" alt="" aria-hidden="true">`
  const actionMark = action?.symbols.map((item) => item === 'range'
    ? '–'
    : `<img class="action-mark__icon" src="${symbolAssets[item]}" alt="" aria-hidden="true">`).join('')
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
    <div class="ability-head"><div class="ability-name-row"><div class="ability-title">${icon}<h3>${escapeHtml(card.name)}</h3></div>${action ? `<span class="action-mark" role="img" aria-label="${action.label}">${actionMark}</span>` : ''}</div>${metaLines.map((line) => `<p class="ability-meta">${escapeHtml(line ?? '')}</p>`).join('')}</div>
    <p class="ability-text">${detailLines}${escapeHtml(card.text ?? '')}</p>
  </section>`
}

const renderCreatureSheet = (creature: Archetype, depth = 0, parentId = ''): string => {
  const slug = creature.name.toLowerCase().replaceAll(' ', '-')
  const id = parentId ? `${parentId}-${slug}` : slug
  const roleIcon = roleIconByName[creature.role]
  return `
  <article class="creature-sheet${depth > 0 ? ' creature-sheet--minion' : ''}" aria-labelledby="${id}-name">
    <div class="top-grid">
      <header class="identity">
        <div class="role-row">
          ${roleIcon ? `<img class="crest" src="${roleIcon}" alt="" aria-hidden="true">` : ''}
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

const physicalDamageTypes = ['piercing', 'slashing', 'bludgeoning']
const nonphysicalDamageTypes = ['acid', 'cold', 'electricity', 'fire', 'sonic', 'force', 'mental', 'poison', 'bleed', 'spirit', 'vitality', 'void']
let selectedIndex = 0

app.innerHTML = `
  <div class="builder-controls" aria-label="Creature options">
    <label for="physical-damage-type">Physical damage<select id="physical-damage-type">${physicalDamageTypes.map((type) => `<option value="${type}">${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select></label>
    <label for="nonphysical-damage-type">Nonphysical damage<select id="nonphysical-damage-type">${nonphysicalDamageTypes.map((type) => `<option value="${type}"${type === 'fire' ? ' selected' : ''}>${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select></label>
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
const physicalDamageInput = app.querySelector<HTMLSelectElement>('#physical-damage-type')!
const nonphysicalDamageInput = app.querySelector<HTMLSelectElement>('#nonphysical-damage-type')!
const choices = Array.from(app.querySelectorAll<HTMLButtonElement>('.archetype-choice'))
const carousel = app.querySelector<HTMLElement>('.archetype-carousel')!
const position = app.querySelector<HTMLElement>('#carousel-position')!

const renderSelected = () => {
  const level = Number(levelInput.value)
  const creature = buildArchetype(sources, names[selectedIndex], level, physicalDamageInput.value, nonphysicalDamageInput.value)
  if (creature.name === 'Engineer') creature.minions = buildEngineerMinions(sources, level, physicalDamageInput.value)
  if (creature.name === 'Trapper' || creature.name === 'Saboteur') creature.minions = buildTraps(sources, creature.name, level, physicalDamageInput.value, nonphysicalDamageInput.value)
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
physicalDamageInput.addEventListener('change', renderSelected)
nonphysicalDamageInput.addEventListener('change', renderSelected)
renderSelected()

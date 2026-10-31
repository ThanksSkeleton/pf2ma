import './style.css'

import type { AbilityCard, Archetype } from './archetype.ts'
import { buildArchetype, listArchetypes, parseCsv } from './data-builder.ts'
import { buildEngineerMinions } from './engineer-minions.ts'
import { buildTraps } from './traps.ts'
import { encounterTemplates, rollEncounter, validPartyLevels } from './encounter.ts'

const rawCsv = import.meta.glob<string>('../csv/*.csv', { query: '?raw', import: 'default', eager: true })
const sources = Object.fromEntries(Object.entries(rawCsv).map(([path, contents]) => [path.split('/').pop()!, contents]))
const archetypeRows = parseCsv(sources['RoadMaps_Prod.csv'])
const archetypeNames = listArchetypes(sources)
const roleByName = new Map(archetypeRows.map((row) => [row['Road Map'], row.Role]))
const alphaSort = (items: string[]) => [...items].sort((a, b) => a.localeCompare(b))
const sortRoleFor = (name: string) => roleByName.get(name) === 'Artillery' ? 'Bombard' : roleByName.get(name) ?? ''
const preferredRoleOrder = ['Striker', 'Defender', 'Support', 'Controller', 'Bombard']
const roleOrder = [...preferredRoleOrder, ...new Set(archetypeNames.map(sortRoleFor))]
  .filter((role, index, roles) => roles.indexOf(role) === index)
const roleRank = new Map(roleOrder.map((role, index) => [role, index]))
const roleSort = (items: string[]) => [...items].sort((a, b) =>
  (roleRank.get(sortRoleFor(a)) ?? 0) - (roleRank.get(sortRoleFor(b)) ?? 0) || a.localeCompare(b))
let sortMode: 'alpha' | 'role' = 'alpha'
let names = alphaSort(archetypeNames)
const physicalDamageTypes = ['piercing', 'slashing', 'bludgeoning']
const nonphysicalDamageTypes = ['acid', 'cold', 'electricity', 'fire', 'sonic', 'force', 'mental', 'poison', 'bleed', 'spirit', 'vitality', 'void']
let selectedLevel = 1
let selectedPhysicalDamageType = 'piercing'
let selectedNonphysicalDamageType = 'fire'
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

const renderCard = (card: AbilityCard, spellRank: number) => {
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
    <div class="ability-head"><div class="ability-name-row"><div class="ability-title">${icon}<h3>${escapeHtml(card.name)}</h3></div><div class="ability-cost">${card.type === 'spell' ? `<span class="ability-rank">Rank ${spellRank}</span>` : ''}${action ? `<span class="action-mark" role="img" aria-label="${action.label}">${actionMark}</span>` : ''}</div></div>${metaLines.map((line) => `<p class="ability-meta">${escapeHtml(line ?? '')}</p>`).join('')}</div>
    <p class="ability-text">${detailLines}${escapeHtml(card.text ?? '')}</p>
  </section>`
}

const renderCreatureSheet = (creature: Archetype, depth = 0, parentId = '', showReferences = true, showControls = true): string => {
  const slug = creature.name.toLowerCase().replaceAll(' ', '-')
  const id = parentId ? `${parentId}-${slug}` : slug
  const roleIcon = roleIconByName[creature.role]
  const speed = creature.statGroups.flat().find((stat) => stat.label === 'Speed')
  const baseStatGroups = creature.statGroups.map((group) => group.filter((stat) => stat.label !== 'Speed')).filter((group) => group.length)
  const spellRank = creature.spellRank ?? Math.max(1, Math.ceil(creature.level / 2))
  const builderControls = depth === 0 && showControls ? `
      <div class="builder-controls builder-controls--sheet" aria-label="Creature options">
        <label for="physical-damage-type">Physical damage<select id="physical-damage-type">${physicalDamageTypes.map((type) => `<option value="${type}"${type === selectedPhysicalDamageType ? ' selected' : ''}>${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select></label>
        <label for="nonphysical-damage-type">Nonphysical damage<select id="nonphysical-damage-type">${nonphysicalDamageTypes.map((type) => `<option value="${type}"${type === selectedNonphysicalDamageType ? ' selected' : ''}>${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select></label>
        <label for="creature-level">Level<select id="creature-level">${Array.from({ length: 26 }, (_, index) => index - 1).map((level) => `<option value="${level}"${level === selectedLevel ? ' selected' : ''}>${level}</option>`).join('')}</select></label>
      </div>` : ''
  return `
  <article class="creature-sheet${depth > 0 ? ' creature-sheet--minion' : ''}" aria-labelledby="${id}-name">
    <div class="top-grid">
      <header class="identity">
        <div class="role-row">
          ${roleIcon ? `<img class="crest" src="${roleIcon}" alt="" aria-hidden="true">` : ''}
          <p class="role">${escapeHtml(creature.role)}</p>
        </div>
        <h1 id="${id}-name">${escapeHtml(creature.name)}</h1>
        <dl class="size-row">
          <div class="stat-row stat-row--${statStyleByLabel.Size}"><dt>Size</dt><dd>${escapeHtml(creature.size)}</dd></div>
          ${speed ? `<div class="stat-row stat-row--${statStyleByLabel.Speed}"><dt>Speed</dt><dd>${escapeHtml(speed.value)}</dd></div>` : ''}
        </dl>
      </header>

      <section class="base-block" aria-label="Base stats">
        <div class="stat-list">${baseStatGroups.map((group) => `
          <dl class="stat-group">${group.map((stat) => `
            <div class="stat-row stat-row--${statStyleByLabel[stat.label] ?? 'black'}"><dt>${escapeHtml(stat.label)}</dt><dd>${escapeHtml(stat.value)}</dd></div>
          `).join('')}</dl>
        `).join('')}</div>
      </section>
    </div>

    <div class="sheet-body">
      ${creature.skills ? `<div class="skills-row">${creature.archetypeTags?.length ? `<div class="archetype-tags" aria-label="Archetype tags">${creature.archetypeTags.map(escapeHtml).join(', ')}</div>` : ''}<dl class="skills" aria-label="Skills">${Object.entries(creature.skills).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></div>` : ''}
      ${builderControls}
      <section class="description" aria-labelledby="${id}-description-heading"><div class="section-heading"><h2 id="${id}-description-heading">Description</h2></div><p>${escapeHtml(creature.description)}</p></section>

      <section class="tactics" aria-labelledby="${id}-tactics-heading"><div class="section-heading"><h2 id="${id}-tactics-heading">Tactics</h2></div><p>${escapeHtml(creature.tactics)}</p></section>

      <section class="abilities" aria-labelledby="${id}-abilities-heading">
        <div class="section-heading"><h2 id="${id}-abilities-heading">Abilities</h2></div>
        <div class="ability-list">${[...(creature.attack ? [creature.attack] : []), ...(creature.secondaryAttacks ?? []), ...creature.abilities].map((card) => renderCard(card, spellRank)).join('')}</div>
      </section>
      ${showReferences && creature.references?.length ? `<section class="references" aria-labelledby="${id}-references-heading">
        <div class="section-heading"><h2 id="${id}-references-heading">Conditions &amp; PC Responses</h2></div>
        <div class="ability-list">${creature.references.map((card) => renderCard(card, spellRank)).join('')}</div>
      </section>` : ''}
    </div>
    ${creature.minions.length ? `
    <section class="minions-section" aria-labelledby="${id}-minions-heading">
      <div class="section-heading"><h2 id="${id}-minions-heading">Minions</h2></div>
      <div class="minion-list">${creature.minions.map((minion) => renderCreatureSheet(minion, depth + 1, id, showReferences, false)).join('')}</div>
    </section>` : ''}
  </article>
  `
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root is missing')

let selectedIndex = 0
let selectedTemplateIndex = 0
let encounterLevel = 5
let activeTab: 'encounter' | 'monster' = 'encounter'

const buildCreature = (name: string, level: number) => {
  const creature = buildArchetype(sources, name, level, selectedPhysicalDamageType, selectedNonphysicalDamageType)
  if (name === 'Engineer') creature.minions = buildEngineerMinions(sources, level, selectedPhysicalDamageType)
  if (name === 'Trapper' || name === 'Saboteur') creature.minions = buildTraps(sources, name, level, selectedPhysicalDamageType, selectedNonphysicalDamageType)
  return creature
}

const collectReferences = (creature: Archetype): AbilityCard[] => [
  ...(creature.references ?? []), ...creature.minions.flatMap(collectReferences),
]

app.innerHTML = `
  <nav class="main-tabs" role="tablist" aria-label="Main views">
    <button type="button" id="encounter-tab" role="tab" aria-selected="true" aria-controls="encounter-view">Encounter</button>
    <button type="button" id="monster-tab" role="tab" aria-selected="false" aria-controls="monster-view" tabindex="-1">Monster</button>
  </nav>
  <section id="encounter-view" role="tabpanel" aria-labelledby="encounter-tab">
    <div class="builder-controls encounter-controls">
      <label for="encounter-template">Quick adventure group<select id="encounter-template">${encounterTemplates.map((template, index) => `<option value="${index}">${escapeHtml(template.name)} (${template.xp} XP)</option>`).join('')}</select></label>
      <label for="encounter-level">Party level<select id="encounter-level"></select></label>
      <button type="button" id="roll-encounter">Roll encounter</button>
    </div>
    <div id="encounter-result" role="region" aria-live="polite" aria-label="Encounter result"><p class="encounter-prompt">Choose a group and party level, then roll an encounter.</p></div>
  </section>
  <section id="monster-view" role="tabpanel" aria-labelledby="monster-tab" hidden>
  <div class="builder-controls builder-controls--top" aria-label="Archetype options">
    <div class="carousel-sort" role="radiogroup" aria-label="Sort archetypes">
      <span>Sort</span>
      <label><input type="radio" name="archetype-sort" value="alpha" checked>ABC</label>
      <label><input type="radio" name="archetype-sort" value="role">Role</label>
    </div>
  </div>
  <section class="archetype-carousel" aria-roledescription="carousel" aria-label="Archetypes" tabindex="0">
    <div class="carousel-navigation">
      <button type="button" id="previous-archetype" class="carousel-arrow" aria-label="Previous archetype" aria-controls="archetype-panel">‹</button>
      <div class="carousel-track"></div>
      <button type="button" id="next-archetype" class="carousel-arrow" aria-label="Next archetype" aria-controls="archetype-panel">›</button>
    </div>
  </section>
  <div id="archetype-panel" role="region" aria-label="Selected creature"></div>
  </section>
`

const panel = app.querySelector<HTMLDivElement>('#archetype-panel')!
const carouselTrack = app.querySelector<HTMLDivElement>('.carousel-track')!
const carousel = app.querySelector<HTMLElement>('.archetype-carousel')!
const carouselNavigation = app.querySelector<HTMLElement>('.carousel-navigation')!
const encounterTemplateSelect = app.querySelector<HTMLSelectElement>('#encounter-template')!
const encounterLevelSelect = app.querySelector<HTMLSelectElement>('#encounter-level')!
const encounterResult = app.querySelector<HTMLDivElement>('#encounter-result')!
let choices: HTMLButtonElement[] = []

const renderEncounterLevels = () => {
  const levels = validPartyLevels(encounterTemplates[selectedTemplateIndex])
  if (!levels.includes(encounterLevel)) encounterLevel = levels.reduce((closest, level) =>
    Math.abs(level - encounterLevel) < Math.abs(closest - encounterLevel) ? level : closest)
  encounterLevelSelect.innerHTML = levels.map((level) => `<option value="${level}"${level === encounterLevel ? ' selected' : ''}>${level}</option>`).join('')
}

const clearEncounter = () => {
  encounterResult.innerHTML = '<p class="encounter-prompt">Choose a group and party level, then roll an encounter.</p>'
  if (activeTab === 'encounter') document.title = 'Encounter | PF2E Monster Archetype Bank'
}

const renderEncounter = () => {
  const template = encounterTemplates[selectedTemplateIndex]
  const groups = rollEncounter(template, encounterLevel, archetypeNames)
  const creatures = groups.map((group) => buildCreature(group.name, group.level))
  const references = [...new Map(creatures.flatMap(collectReferences).map((card) => [card.name, card])).values()]
  encounterResult.innerHTML = `
    <div class="encounter-summary">
      <h1>${escapeHtml(template.name)}</h1>
      <p>Party level ${encounterLevel} · ${template.xp} XP</p>
      <table><thead><tr><th scope="col">Monster name</th><th scope="col">Count</th><th scope="col">Level</th></tr></thead>
        <tbody>${groups.map((group) => `<tr><th scope="row">${escapeHtml(group.name)}</th><td>${group.count}</td><td>${group.level}</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="encounter-monsters">${creatures.map((creature, index) => `<section class="encounter-monster" aria-label="${escapeHtml(creature.name)} level ${creature.level}"><h2>${escapeHtml(creature.name)} · ${groups[index].count} × level ${creature.level}</h2><div class="monster-box">${renderCreatureSheet(creature, 0, '', false, false)}</div></section>`).join('')}</div>
    <section class="encounter-references" aria-label="Statuses and reminders"><div class="section-heading"><h2>Statuses &amp; reminders</h2></div>
      ${references.length ? `<div class="ability-list">${references.map((card) => renderCard(card, Math.max(1, Math.ceil(encounterLevel / 2)))).join('')}</div>` : '<p>None for this encounter.</p>'}
    </section>
  `
  document.title = `${template.name} · Level ${encounterLevel} | PF2E Monster Archetype Bank`
}

const setTab = (tab: 'encounter' | 'monster', focus = false) => {
  activeTab = tab
  for (const name of ['encounter', 'monster'] as const) {
    const button = app.querySelector<HTMLButtonElement>(`#${name}-tab`)!
    button.setAttribute('aria-selected', String(name === tab))
    button.tabIndex = name === tab ? 0 : -1
    app.querySelector<HTMLElement>(`#${name}-view`)!.hidden = name !== tab
  }
  if (focus) app.querySelector<HTMLButtonElement>(`#${tab}-tab`)!.focus()
  if (tab === 'monster') renderSelected()
  else if (encounterResult.querySelector('.encounter-summary')) document.title = `${encounterTemplates[selectedTemplateIndex].name} · Level ${encounterLevel} | PF2E Monster Archetype Bank`
  else document.title = 'Encounter | PF2E Monster Archetype Bank'
}

app.querySelectorAll<HTMLButtonElement>('.main-tabs [role="tab"]').forEach((button) => {
  button.addEventListener('click', () => setTab(button.id === 'encounter-tab' ? 'encounter' : 'monster'))
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setTab(activeTab === 'encounter' ? 'monster' : 'encounter', true)
  })
})
encounterTemplateSelect.addEventListener('change', () => {
  selectedTemplateIndex = Number(encounterTemplateSelect.value)
  renderEncounterLevels()
  clearEncounter()
})
encounterLevelSelect.addEventListener('change', () => {
  encounterLevel = Number(encounterLevelSelect.value)
  clearEncounter()
})
app.querySelector('#roll-encounter')!.addEventListener('click', renderEncounter)

const renderChoices = () => {
  carouselTrack.innerHTML = names.map((name, index) => {
    const role = roleByName.get(name) ?? ''
    const roleIcon = sortMode === 'role' && roleIconByName[role]
      ? `<img class="archetype-role-icon" src="${roleIconByName[role]}" alt="" aria-hidden="true">`
      : ''
    return `<button type="button" class="archetype-choice${sortMode === 'role' ? ' archetype-choice--role' : ''}" data-index="${index}" aria-controls="archetype-panel" aria-pressed="${index === selectedIndex}">${roleIcon}${escapeHtml(name)}</button>`
  }).join('')
  choices = Array.from(carouselTrack.querySelectorAll<HTMLButtonElement>('.archetype-choice'))
  choices.forEach((choice, index) => choice.addEventListener('click', () => selectArchetype(index)))
}

const renderSelected = () => {
  const level = selectedLevel
  const creature = buildCreature(names[selectedIndex], level)
  panel.innerHTML = `<div class="monster-box">${renderCreatureSheet(creature)}</div>`
  panel.setAttribute('aria-label', `${creature.name}, level ${level}`)
  document.title = `${creature.name} · Level ${level} | PF2E Monster Archetype Bank`
  carouselNavigation.classList.toggle('fade-left', selectedIndex > 0)
  carouselNavigation.classList.toggle('fade-right', selectedIndex < names.length - 1)
  choices.forEach((choice, index) => choice.setAttribute('aria-pressed', String(index === selectedIndex)))
}
const selectArchetype = (index: number, focus = false) => {
  selectedIndex = (index + names.length) % names.length
  renderSelected()
  choices[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  if (focus) choices[selectedIndex].focus({ preventScroll: true })
}
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
panel.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  if (target.id === 'creature-level') selectedLevel = Number(target.value)
  else if (target.id === 'physical-damage-type') selectedPhysicalDamageType = target.value
  else if (target.id === 'nonphysical-damage-type') selectedNonphysicalDamageType = target.value
  else return
  renderSelected()
})
app.querySelectorAll<HTMLInputElement>('input[name="archetype-sort"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (!input.checked) return
    const selectedName = names[selectedIndex]
    sortMode = input.value as 'alpha' | 'role'
    names = sortMode === 'alpha' ? alphaSort(archetypeNames) : roleSort(archetypeNames)
    selectedIndex = names.indexOf(selectedName)
    renderChoices()
    renderSelected()
    choices[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  })
})
renderChoices()
renderSelected()
renderEncounterLevels()
setTab('encounter')

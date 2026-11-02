import './style.css'

import type { AbilityCard, Archetype } from './archetype.ts'
import { buildArchetype, listArchetypes, parseCsv } from './data-builder.ts'
import { buildSummonerMinions } from './summoner-minions.ts'
import { buildTraps } from './traps.ts'
import { encounterCategoryDefinitions, encounterTemplates, rollEncounter, validPartyLevels } from './encounter.ts'
import { isAttackDisabled, type AttackMode } from './attack-mode.ts'
import { benchmarkBand, comparisonAttack, damageAverage, damageBand, matchingPublishedMonster, rankColors, winnerFor, type RankBand, type RankName } from './monster-comparison.ts'
import { createGraphAnalysis, graphMetrics, maxPreviewBump, type GraphMetric, type GraphPoint, type GraphSeries } from './monster-compare-graphs.ts'
import officialMonsters from '../csv/official_monsters.json'

const rawCsv = import.meta.glob<string>('../csv/*.csv', { query: '?raw', import: 'default', eager: true })
const sources = Object.fromEntries(Object.entries(rawCsv).map(([path, contents]) => [path.split('/').pop()!, contents]))
const archetypeRows = parseCsv(sources['RoadMaps_Prod.csv'])
const archetypeNames = listArchetypes(sources)
const encounterArchetypes = archetypeRows.filter((row) => archetypeNames.includes(row['Road Map'])).map((row) => ({
  name: row['Road Map'], role: row.Role, traits: row.ArchetypeTraits?.split(',').map((trait) => trait.trim()).filter(Boolean) ?? [],
}))
type ComparisonChoice = { name: string; mode?: AttackMode }
const comparisonChoices = [...archetypeNames].sort((a, b) => a.localeCompare(b)).flatMap((name): ComparisonChoice[] => {
  const archetype = encounterArchetypes.find((candidate) => candidate.name === name)!
  return archetype.traits.includes('Modal')
    ? [{ name, mode: 'Melee' }, { name, mode: 'Ranged' }]
    : [{ name }]
})
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
let selectedMode: AttackMode = 'Melee'
const escapeHtml = (value: string | number) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!)

const renderAbilityText = (value: string) => escapeHtml(value)
  .replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/g, '<strong>$1</strong>')
  .replace(/(^|\n)(Critical Success|Critical Failure|Success|Failure):/g, '$1<strong>$2:</strong>')

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

const renderCard = (card: AbilityCard, spellRank: number, disabled = false) => {
  const action = actionPresentation[card.actionCost]
  const basicStrike = card.type === 'attack' && /^(Melee|Ranged) Strike$/.test(card.name)
  const selfTargetedSpell = card.type === 'spell' && /^(you|self)\.?$/i.test(card.targets?.trim() ?? '')
  const metaLines: [string, string][] = [
    ...(card.traits?.length ? [['', card.traits.join(', ')] as [string, string]] : []),
    ...(card.frequency ? [['Frequency', card.frequency === 'At Will' ? 'At will' : card.frequency === 'Once per turn, required every turn' ? 'Once per turn (required every turn)' : card.frequency] as [string, string]] : []),
    ...(card.targets && !basicStrike && !selfTargetedSpell ? [['Targets', card.targets] as [string, string]] : []),
    ...(card.range && !(basicStrike && card.attackType === 'Melee') && !selfTargetedSpell ? [['Range', card.range] as [string, string]] : []),
    ...(card.area ? [['Area', card.area] as [string, string]] : []),
    ...(card.duration && !/^instantaneous\.?$/i.test(card.duration.trim()) ? [['Duration', card.duration] as [string, string]] : []),
  ]
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
    ['Properties', card.properties?.join(', ')],
  ]
  const detailLines = details
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([label, value]) => `<span class="ability-line"><strong>${label}</strong> ${escapeHtml(value!)}</span>`)
    .join('')
  return `
  <section class="ability ${presentation.style}${card.name === 'Cover Screen' ? ' ability--terrain-feature' : ''}${disabled ? ' ability--disabled' : ''}" aria-label="${escapeHtml(card.name)}">
    <div class="ability-head"><div class="ability-name-row"><div class="ability-title">${icon}<h3>${escapeHtml(card.name)}</h3></div><div class="ability-cost">${card.type === 'spell' ? `<span class="ability-rank">Rank ${spellRank}</span>` : ''}${action ? `<span class="action-mark" role="img" aria-label="${action.label}">${actionMark}</span>` : ''}</div></div>${metaLines.map(([label, value]) => `<p class="ability-meta">${label ? `<strong>${label}:</strong> ${escapeHtml(value)}` : `<strong>${escapeHtml(value)}</strong>`}</p>`).join('')}</div>
    <p class="ability-text">${detailLines}${renderAbilityText(card.text ?? '')}</p>
  </section>`
}

const renderCreatureSheet = (creature: Archetype, depth = 0, parentId = '', showReferences = true, showControls = true, mode: AttackMode = selectedMode): string => {
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
        <label for="creature-mode">Mode<select id="creature-mode"><option value="Melee"${selectedMode === 'Melee' ? ' selected' : ''}>Melee</option><option value="Ranged"${selectedMode === 'Ranged' ? ' selected' : ''}>Ranged</option></select></label>
      </div>` : ''
  return `
  <article class="creature-sheet${depth > 0 ? ' creature-sheet--minion' : ''}${creature.statFormat === 'object' ? ' creature-sheet--object' : ''}" aria-labelledby="${id}-name">
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
      ${creature.skills ? `<div class="skills-row">${creature.archetypeTraits?.length ? `<div class="archetype-traits" aria-label="Archetype traits">${creature.archetypeTraits.map(escapeHtml).join(', ')}</div>` : ''}<dl class="skills" aria-label="Skills">${Object.entries(creature.skills).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></div>` : ''}
      ${builderControls}
      <section class="description" aria-labelledby="${id}-description-heading"><div class="section-heading"><h2 id="${id}-description-heading">Description</h2></div><p>${escapeHtml(creature.description)}</p></section>

      ${creature.tactics ? `<section class="tactics" aria-labelledby="${id}-tactics-heading"><div class="section-heading"><h2 id="${id}-tactics-heading">Tactics</h2></div><p>${escapeHtml(creature.tactics)}</p></section>` : ''}

      <section class="abilities" aria-labelledby="${id}-abilities-heading">
        <div class="section-heading"><h2 id="${id}-abilities-heading">Abilities</h2></div>
        <div class="ability-list">${[...(creature.attack ? [creature.attack] : []), ...(creature.secondaryAttacks ?? []), ...creature.abilities].map((card) => renderCard(card, spellRank, isAttackDisabled(creature, card, mode))).join('')}</div>
      </section>
      ${showReferences && creature.references?.length ? `<section class="references" aria-labelledby="${id}-references-heading">
        <div class="section-heading"><h2 id="${id}-references-heading">Conditions &amp; PC Responses</h2></div>
        <div class="ability-list">${creature.references.map((card) => renderCard(card, spellRank)).join('')}</div>
      </section>` : ''}
    </div>
    ${creature.minions.length ? `
    <section class="minions-section" aria-labelledby="${id}-minions-heading">
      <div class="section-heading"><h2 id="${id}-minions-heading">${creature.minions.some((minion) => minion.statFormat === 'object') ? 'Minions &amp; Objects' : 'Minions'}</h2></div>
      <div class="minion-list">${creature.minions.map((minion) => renderCreatureSheet(minion, depth + 1, id, showReferences, false, mode)).join('')}</div>
    </section>` : ''}
  </article>
  `
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root is missing')

let selectedIndex = 0
let selectedTemplateIndex = 0
let encounterLevel = 5
const tabNames = ['encounter', 'monster', 'comparison', 'graphs'] as const
type TabName = typeof tabNames[number]
let activeTab: TabName = 'encounter'
let comparisonChoiceIndex = Math.max(0, comparisonChoices.findIndex((choice) => choice.name === 'Hornet'))
let comparisonLevel = 1
let graphAnalysisCache: ReturnType<typeof createGraphAnalysis> | null = null
const graphBumps = new Map<string, number>()

const buildCreature = (name: string, level: number) => {
  const creature = buildArchetype(sources, name, level, selectedPhysicalDamageType, selectedNonphysicalDamageType)
  if (name === 'Summoner') creature.minions = buildSummonerMinions(sources, level, selectedPhysicalDamageType)
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
    <button type="button" id="comparison-tab" role="tab" aria-selected="false" aria-controls="comparison-view" tabindex="-1">Monster Compare</button>
    <button type="button" id="graphs-tab" role="tab" aria-selected="false" aria-controls="graphs-view" tabindex="-1">Monster Compare Graphs</button>
  </nav>
  <section id="encounter-view" role="tabpanel" aria-labelledby="encounter-tab">
    <div class="builder-controls encounter-controls">
      <label for="encounter-template">Encounter<select id="encounter-template">${encounterTemplates.map((template, index) => `<option value="${index}">${escapeHtml(template.name)} (${template.xp} XP)</option>`).join('')}</select></label>
      <label for="encounter-level">Party level<select id="encounter-level"></select></label>
      <button type="button" id="roll-encounter">Roll encounter</button>
    </div>
    <div id="encounter-result" role="region" aria-live="polite" aria-label="Encounter result"><p class="encounter-prompt">Choose an encounter and party level, then roll it.</p></div>
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
  <section id="comparison-view" role="tabpanel" aria-labelledby="comparison-tab" hidden>
    <div class="builder-controls comparison-controls" aria-label="Monster comparison options">
      <label for="comparison-archetype">Archetype<select id="comparison-archetype">${comparisonChoices.map((choice, index) => `<option value="${index}">${escapeHtml(choice.name)}${choice.mode ? ` (${choice.mode.toLowerCase()})` : ''}</option>`).join('')}</select></label>
      <label for="comparison-level">Level<select id="comparison-level">${Array.from({ length: 26 }, (_, index) => index - 1).map((level) => `<option value="${level}">${level}</option>`).join('')}</select></label>
    </div>
    <div id="comparison-result" class="comparison-result" aria-live="polite"></div>
  </section>
  <section id="graphs-view" role="tabpanel" aria-labelledby="graphs-tab" hidden>
    <div class="graphs-intro">
      <h1>Monster Compare Graphs</h1>
      <p>Each level compares one curated published monster per type with the average of matching archetypes. AC and attack bonus show published minus archetype average; HP and damage show published divided by archetype average. Zero or 1× means equal. Preview Bump changes each archetype by that many creature-building ranks without changing its data; ranks stop at the table limits. Missing attacks are excluded.</p>
    </div>
    <div id="graphs-result" class="graphs-grid" aria-label="Published monster advantage graphs"></div>
  </section>
`

const panel = app.querySelector<HTMLDivElement>('#archetype-panel')!
const carouselTrack = app.querySelector<HTMLDivElement>('.carousel-track')!
const carousel = app.querySelector<HTMLElement>('.archetype-carousel')!
const carouselNavigation = app.querySelector<HTMLElement>('.carousel-navigation')!
const encounterTemplateSelect = app.querySelector<HTMLSelectElement>('#encounter-template')!
const encounterLevelSelect = app.querySelector<HTMLSelectElement>('#encounter-level')!
const encounterResult = app.querySelector<HTMLDivElement>('#encounter-result')!
const comparisonArchetypeSelect = app.querySelector<HTMLSelectElement>('#comparison-archetype')!
const comparisonLevelSelect = app.querySelector<HTMLSelectElement>('#comparison-level')!
const comparisonResult = app.querySelector<HTMLDivElement>('#comparison-result')!
const graphsResult = app.querySelector<HTMLDivElement>('#graphs-result')!
let choices: HTMLButtonElement[] = []

const renderEncounterLevels = () => {
  const levels = validPartyLevels(encounterTemplates[selectedTemplateIndex])
  if (!levels.includes(encounterLevel)) encounterLevel = levels.reduce((closest, level) =>
    Math.abs(level - encounterLevel) < Math.abs(closest - encounterLevel) ? level : closest)
  encounterLevelSelect.innerHTML = levels.map((level) => `<option value="${level}"${level === encounterLevel ? ' selected' : ''}>${level}</option>`).join('')
}

const clearEncounter = () => {
  encounterResult.innerHTML = '<p class="encounter-prompt">Choose an encounter and party level, then roll it.</p>'
  if (activeTab === 'encounter') document.title = 'Encounter | PF2E Monster Archetype Bank'
}

const renderEncounter = () => {
  const template = encounterTemplates[selectedTemplateIndex]
  const groups = rollEncounter(template, encounterLevel, encounterArchetypes)
  const creatures = groups.map((group) => buildCreature(group.name, group.level))
  const references = [...new Map(creatures.flatMap(collectReferences).map((card) => [card.name, card])).values()]
  encounterResult.innerHTML = `
    <div class="encounter-summary">
      <h1>${escapeHtml(template.name)}</h1>
      <p>Party level ${encounterLevel} · ${template.xp} XP</p>
      <table><thead><tr><th scope="col">Monster name</th><th scope="col">Count</th><th scope="col">Level</th></tr></thead>
        <tbody>${groups.map((group) => `<tr><th scope="row">${escapeHtml(group.name)}</th><td>${group.count}</td><td>${group.level}</td></tr>`).join('')}</tbody></table>
      <p class="encounter-recipe"><strong>Recipe:</strong> ${escapeHtml(template.recipe)}</p>
      <details class="encounter-category-details">
        <summary>Slot category definitions</summary>
        <dl>${encounterCategoryDefinitions.map(({ category, definition }) => `<div><dt>${escapeHtml(category)}</dt><dd>${escapeHtml(definition)}</dd></div>`).join('')}</dl>
        <p>Modal creatures use ranged mode in Ranged+ slots and melee mode otherwise. Flexible counts for Melee+ only. Melee+ and Ranged+ exclude Ability; Controller, Striker, and Defender exclude Pacifist. Unusual Attack marks fighters whose main attack is nontraditional. Support and Artillery can fill attack categories or Any.</p>
      </details>
    </div>
    <div class="encounter-monsters">${creatures.map((creature, index) => `<section class="encounter-monster" aria-label="${escapeHtml(creature.name)} level ${creature.level}"><h2>${escapeHtml(creature.name)} · ${groups[index].count} × level ${creature.level}${groups[index].mode ? ` · ${groups[index].mode} mode` : ''}</h2><div class="monster-box">${renderCreatureSheet(creature, 0, '', false, false, groups[index].mode ?? 'Melee')}</div></section>`).join('')}</div>
    <section class="encounter-references" aria-label="Statuses and reminders"><div class="section-heading"><h2>Statuses &amp; reminders</h2></div>
      ${references.length ? `<div class="ability-list">${references.map((card) => renderCard(card, Math.max(1, Math.ceil(encounterLevel / 2)))).join('')}</div>` : '<p>None for this encounter.</p>'}
    </section>
  `
  document.title = `${template.name} · Level ${encounterLevel} | PF2E Monster Archetype Bank`
}

const modifier = (value: number) => value >= 0 ? `+${value}` : String(value)
const statValue = (creature: Archetype, label: string) => creature.statGroups.flat().find((stat) => stat.label === label)?.value
const numericStat = (value: string | undefined) => value === undefined ? null : Number(value.replace(/[^\d.+-]/g, ''))
const displayDamage = (formula: string | undefined) => {
  if (!formula) return '—'
  const average = damageAverage(formula)
  return average === null ? formula : `${average} (${formula})`
}
const comparisonRankKey: RankName[] = ['Superterrible', 'Terrible', 'Low', 'Moderate', 'High', 'Extreme', 'Minimum', 'Maximum']

const renderRankCell = (band: RankBand | null, side: string, wins: boolean) => {
  const winnerClass = wins ? ' comparison-winner-end' : ''
  if (!band) return `<td class="comparison-rank-missing${winnerClass}" aria-label="${side} rank unavailable">—</td>`
  const description = band.lower === band.upper ? band.lower : `Between ${band.lower} and ${band.upper}`
  const background = band.lower === band.upper ? rankColors[band.lower]
    : `linear-gradient(to right, ${rankColors[band.lower]} 0 50%, ${rankColors[band.upper]} 50% 100%)`
  return `<td class="comparison-rank${winnerClass}" aria-label="${side} rank: ${description}"><span class="comparison-rank-swatch" style="background:${background}" aria-hidden="true"></span></td>`
}

const renderComparison = () => {
  const choice = comparisonChoices[comparisonChoiceIndex]
  const encounterArchetype = encounterArchetypes.find((candidate) => candidate.name === choice.name)!
  const mode = choice.mode
  const official = matchingPublishedMonster(encounterArchetype, comparisonLevel, officialMonsters, mode)
  const officialStrike = official?.strike
  const archetype = buildCreature(choice.name, comparisonLevel)
  const strike = comparisonAttack(archetype, mode)
  const rank = (file: string, value: number | null, suffix = '') => value === null ? null : benchmarkBand(sources, file, comparisonLevel, value, suffix)
  const rows: { label: string; own: string; ownNumber: number | null; ownBand: RankBand | null; published: string; publishedNumber: number | null; publishedBand: RankBand | null }[] = []
  const addStat = (label: string, file: string, published: number | undefined, signed = false) => {
    const own = statValue(archetype, label === 'Fortitude' ? 'Fort' : label === 'Reflex' ? 'Reflex' : label === 'Will' ? 'Will' : label)
    const ownNumber = numericStat(own)
    rows.push({
      label, own: own ?? '—', ownNumber, ownBand: rank(file, ownNumber),
      published: published === undefined ? '—' : signed ? modifier(published) : String(published),
      publishedNumber: published ?? null,
      publishedBand: published === undefined ? null : rank(file, published),
    })
  }
  addStat('Perception', 'table-2-2-perception.csv', official?.perception, true)
  addStat('HP', 'table-2-7-hit-points.csv', official?.hp)
  addStat('AC', 'table-2-5-armor-class.csv', official?.ac)
  addStat('Fortitude', 'table-2-6-saving-throws.csv', official?.fortitude, true)
  addStat('Reflex', 'table-2-6-saving-throws.csv', official?.reflex, true)
  addStat('Will', 'table-2-6-saving-throws.csv', official?.will, true)
  rows.push({
    label: 'Attack Bonus', own: strike?.attack ?? '—', ownNumber: numericStat(strike?.attack),
    ownBand: strike?.attack ? rank('table-2-9-strike-attack-bonus.csv', numericStat(strike.attack)) : null,
    published: officialStrike ? modifier(officialStrike.attackBonus) : '—',
    publishedNumber: officialStrike?.attackBonus ?? null,
    publishedBand: officialStrike ? rank('table-2-9-strike-attack-bonus.csv', officialStrike.attackBonus) : null,
  })
  rows.push({
    label: 'Average Damage (Damage Roll)', own: displayDamage(strike?.damage), ownNumber: strike?.damage ? damageAverage(strike.damage) : null,
    ownBand: strike?.damage ? damageBand(sources, comparisonLevel, strike.damage) : null,
    published: displayDamage(officialStrike?.damage),
    publishedNumber: officialStrike ? damageAverage(officialStrike.damage) : null,
    publishedBand: officialStrike ? damageBand(sources, comparisonLevel, officialStrike.damage) : null,
  })
  const ownSpeed = statValue(archetype, 'Speed')
  rows.push({
    label: 'Speed', own: ownSpeed ?? '—', ownNumber: numericStat(ownSpeed),
    ownBand: rank('speed-feet.csv', numericStat(ownSpeed)),
    published: official ? `${official.speed.feet} feet (${official.speed.type})` : '—',
    publishedNumber: official?.speed.feet ?? null,
    publishedBand: official ? rank('speed-feet.csv', official.speed.feet) : null,
  })
  const ownAbilityNames = archetype.abilities.map((ability) => ability.name)
  const abilityList = (names: readonly string[]) => names.length
    ? `<ul>${names.map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul>` : '<p>None listed.</p>'
  comparisonResult.innerHTML = `
    <div class="comparison-rank-key" aria-label="Rank color key"><strong>Rank key</strong>
      ${comparisonRankKey.map((name) => `<span class="comparison-key-item"><span class="comparison-key-color" style="background:${rankColors[name]}"></span>${name}</span>`).join('')}
      <span class="comparison-key-note">Split boxes: left is the lower rank, right is the higher rank.</span>
    </div>
    <div class="comparison-table-scroll"><table class="comparison-table">
      <colgroup><col class="comparison-stat-col"><col class="comparison-value-col"><col class="comparison-rank-col"><col class="comparison-value-col"><col class="comparison-rank-col"></colgroup>
      <thead>
        <tr class="comparison-monster-headings"><th scope="col" rowspan="2">Statistic</th>
          <th scope="colgroup" colspan="2"><strong>${escapeHtml(archetype.name)}${mode ? ` (${mode.toLowerCase()})` : ''}</strong><span>Archetype · Level ${comparisonLevel}${strike ? ` · ${escapeHtml(strike.name)}` : ' · No Attack'}</span></th>
          <th scope="colgroup" colspan="2">${official ? `<strong>${escapeHtml(official.name)}</strong><span>${escapeHtml(official.role)} · ${escapeHtml(official.publication)} · Level ${comparisonLevel} · ${officialStrike ? `${escapeHtml(officialStrike.name)} Strike` : 'No Strike'}</span>` : '<strong>No monsters</strong><span>No published monster selected for this level.</span>'}</th>
        </tr>
        <tr><th scope="col" aria-label="Archetype Realized">Realized</th><th scope="col" aria-label="Archetype Rank">Rank</th><th scope="col" aria-label="Official Realized">Realized</th><th scope="col" aria-label="Official Rank">Rank</th></tr>
      </thead>
      <tbody>${rows.map((row) => {
        const winner = winnerFor(row.ownNumber, row.publishedNumber)
        return `<tr><th scope="row">${row.label}</th><td class="${winner === 'archetype' ? 'comparison-winner-start' : ''}">${escapeHtml(row.own)}</td>${renderRankCell(row.ownBand, 'Archetype', winner === 'archetype')}<td class="${winner === 'official' ? 'comparison-winner-start' : ''}">${escapeHtml(row.published)}</td>${renderRankCell(row.publishedBand, 'Official', winner === 'official')}</tr>`
      }).join('')}</tbody>
      <tfoot><tr><th scope="row">Special abilities</th>
        <td colspan="2"><div class="comparison-ability-box">${abilityList(ownAbilityNames)}</div></td>
        <td colspan="2"><div class="comparison-ability-box">${official ? abilityList(official.abilities) : '<p>No monsters</p>'}</div></td>
      </tr></tfoot>
    </table></div>
  `
  document.title = `${archetype.name}${mode ? ` (${mode.toLowerCase()})` : ''} vs ${official?.name ?? 'No monsters'} · Level ${comparisonLevel} | PF2E Monster Archetype Bank`
}

const graphBaseline = (metric: GraphMetric) => metric === 'AC' || metric === 'Attack Bonus' ? 0 : 1
const graphValue = (value: number, metric: GraphMetric) =>
  `${Number(value.toFixed(2))}${metric === 'HP' || metric === 'Damage' ? '×' : ''}`

const graphKey = (series: Pick<GraphSeries, 'category' | 'metric'>) => `${series.category}\u0000${series.metric}`

const renderGraph = (series: GraphSeries, preview: GraphSeries | null, bump: number,
  domain: { min: number; max: number }, detailsOpen: boolean) => {
  const { category, metric, points } = series
  const left = 47, right = 308, top = 12, bottom = 159
  const x = (level: number) => left + (level + 1) / 25 * (right - left)
  const y = (value: number) => bottom - (value - domain.min) / (domain.max - domain.min) * (bottom - top)
  const absoluteMetric = metric === 'AC' || metric === 'Attack Bonus'
  const yTicks = absoluteMetric
    ? Array.from({ length: Math.floor(domain.max) - Math.ceil(domain.min) + 1 },
      (_, index) => Math.ceil(domain.min) + index)
    : Array.from({ length: 4 }, (_, index) => domain.min + (domain.max - domain.min) * index / 3)
  const lines = (values: GraphPoint[], className: string) => {
    const segments: GraphPoint[][] = []
    let segment: GraphPoint[] = []
    for (const point of values) {
      if (point.value === null) {
        if (segment.length) segments.push(segment)
        segment = []
      } else segment.push(point)
    }
    if (segment.length) segments.push(segment)
    return segments.map((run) => `<polyline class="${className}" points="${run.map((point) => `${x(point.level)},${y(point.value!)}`).join(' ')}"/>`).join('')
  }
  const label = `${category} ${metric} published advantage by level`
  return `<figure class="graph-card" data-category="${category}" data-metric="${metric}">
    <figcaption><strong>${category === 'Ability' ? 'Ability+' : category}</strong><span>${metric}</span></figcaption>
    <div class="graph-preview-controls"><span>Preview Bump</span>
      <button type="button" data-preview-step="-1" aria-label="Decrease ${label} preview by one rank"${bump <= -maxPreviewBump(metric) ? ' disabled' : ''}>−</button>
      <output aria-label="Preview rank change">${bump > 0 ? '+' : ''}${bump}</output>
      <button type="button" data-preview-step="1" aria-label="Increase ${label} preview by one rank"${bump >= maxPreviewBump(metric) ? ' disabled' : ''}>+</button>
    </div>
    <div class="graph-legend"><span class="graph-legend-original">Original</span>${preview ? '<span class="graph-legend-preview">Preview</span>' : ''}</div>
    <svg viewBox="0 0 325 190" role="img" aria-label="${label}">
      <title>${label}</title>
      ${yTicks.map((value) => `<line class="graph-gridline" x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}"/><text class="graph-tick" x="${left - 7}" y="${y(value) + 3}" text-anchor="end">${graphValue(value, metric)}</text>`).join('')}
      ${Array.from({ length: 5 }, (_, index) => index + 8).map((level) => `<line class="graph-level-guide" x1="${x(level)}" y1="${top}" x2="${x(level)}" y2="${bottom}" aria-hidden="true"/>`).join('')}
      <line class="graph-baseline" x1="${left}" y1="${y(graphBaseline(metric))}" x2="${right}" y2="${y(graphBaseline(metric))}"/>
      <line class="graph-axis" x1="${left}" y1="${top}" x2="${left}" y2="${bottom}"/>
      <line class="graph-axis" x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"/>
      ${[-1, 4, 9, 14, 19, 24].map((level) => `<text class="graph-tick" x="${x(level)}" y="${bottom + 16}" text-anchor="middle">${level}</text>`).join('')}
      ${lines(points, 'graph-line')}
      ${preview ? lines(preview.points, 'graph-preview-line') : ''}
      ${points.filter((point) => point.value !== null).map((point) => `<circle class="graph-point" cx="${x(point.level)}" cy="${y(point.value!)}" r="3"><title>Level ${point.level}: ${graphValue(point.value!, metric)}; ${point.count} archetypes</title></circle>`).join('')}
      ${preview ? preview.points.filter((point) => point.value !== null).map((point) => `<circle class="graph-preview-point" cx="${x(point.level)}" cy="${y(point.value!)}" r="3"><title>Preview ${bump > 0 ? '+' : ''}${bump} ranks, level ${point.level}: ${graphValue(point.value!, metric)}; ${point.count} archetypes</title></circle>`).join('') : ''}
    </svg>
    <details class="graph-values"${detailsOpen ? ' open' : ''}><summary>Values by level</summary><div><table><thead><tr><th>Level</th><th>Original</th>${preview ? '<th>Preview</th>' : ''}<th>Archetypes</th></tr></thead><tbody>${points.map((point, index) => `<tr><td>${point.level}</td><td>${point.value === null ? '—' : graphValue(point.value, metric)}</td>${preview ? `<td>${preview.points[index].value === null ? '—' : graphValue(preview.points[index].value!, metric)}</td>` : ''}<td>${point.count || '—'}</td></tr>`).join('')}</tbody></table></div></details>
  </figure>`
}

const renderGraphs = () => {
  graphAnalysisCache ??= createGraphAnalysis(sources, encounterArchetypes, officialMonsters)
  const openDetails = new Set([...graphsResult.querySelectorAll<HTMLDetailsElement>('.graph-values[open]')]
    .map((details) => {
      const card = details.closest<HTMLElement>('.graph-card')!
      return graphKey({ category: card.dataset.category as GraphSeries['category'], metric: card.dataset.metric as GraphMetric })
    }))
  const rendered = graphAnalysisCache.baseSeries.map((series) => {
    const bump = graphBumps.get(graphKey(series)) ?? 0
    return { series, bump, preview: bump ? graphAnalysisCache!.seriesFor(series.category, series.metric, bump) : null }
  })
  const domains = new Map(graphMetrics.map((metric) => {
    const values = rendered.filter((item) => item.series.metric === metric)
      .flatMap((item) => [...item.series.points, ...(item.preview?.points ?? [])]
        .map((point) => point.value).filter((value): value is number => value !== null))
    values.push(graphBaseline(metric))
    const min = Math.min(...values), max = Math.max(...values)
    const padding = Math.max((max - min) * 0.08, metric === 'HP' || metric === 'Damage' ? 0.05 : 0.5)
    return [metric, { min: min - padding, max: max + padding }] as const
  }))
  graphsResult.innerHTML = rendered.map(({ series, preview, bump }) =>
    renderGraph(series, preview, bump, domains.get(series.metric)!, openDetails.has(graphKey(series)))).join('')
  document.title = 'Monster Compare Graphs | PF2E Monster Archetype Bank'
}

graphsResult.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-preview-step]')
  if (!button) return
  const card = button.closest<HTMLElement>('.graph-card')!
  const category = card.dataset.category as GraphSeries['category']
  const metric = card.dataset.metric as GraphMetric
  const key = graphKey({ category, metric })
  const current = graphBumps.get(key) ?? 0
  const next = Math.max(-maxPreviewBump(metric), Math.min(maxPreviewBump(metric), current + Number(button.dataset.previewStep)))
  if (next === current) return
  graphBumps.set(key, next)
  renderGraphs()
  const controls = [...graphsResult.querySelectorAll<HTMLButtonElement>('[data-preview-step]')]
    .filter((candidate) => candidate.closest('.graph-card')?.getAttribute('data-category') === category &&
      candidate.closest('.graph-card')?.getAttribute('data-metric') === metric)
  const updated = controls.find((candidate) => candidate.dataset.previewStep === button.dataset.previewStep)
  const focusTarget = updated?.disabled ? controls.find((candidate) => !candidate.disabled) : updated
  focusTarget?.focus()
})

const setTab = (tab: TabName, focus = false) => {
  activeTab = tab
  for (const name of tabNames) {
    const button = app.querySelector<HTMLButtonElement>(`#${name}-tab`)!
    button.setAttribute('aria-selected', String(name === tab))
    button.tabIndex = name === tab ? 0 : -1
    app.querySelector<HTMLElement>(`#${name}-view`)!.hidden = name !== tab
  }
  if (focus) app.querySelector<HTMLButtonElement>(`#${tab}-tab`)!.focus()
  if (tab === 'monster') renderSelected()
  else if (tab === 'comparison') renderComparison()
  else if (tab === 'graphs') renderGraphs()
  else if (encounterResult.querySelector('.encounter-summary')) document.title = `${encounterTemplates[selectedTemplateIndex].name} · Level ${encounterLevel} | PF2E Monster Archetype Bank`
  else document.title = 'Encounter | PF2E Monster Archetype Bank'
}

app.querySelectorAll<HTMLButtonElement>('.main-tabs [role="tab"]').forEach((button) => {
  button.addEventListener('click', () => setTab(button.id.replace('-tab', '') as TabName))
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    setTab(tabNames[(tabNames.indexOf(activeTab) + direction + tabNames.length) % tabNames.length], true)
  })
})
comparisonArchetypeSelect.value = String(comparisonChoiceIndex)
comparisonLevelSelect.value = String(comparisonLevel)
comparisonArchetypeSelect.addEventListener('change', () => { comparisonChoiceIndex = Number(comparisonArchetypeSelect.value); renderComparison() })
comparisonLevelSelect.addEventListener('change', () => { comparisonLevel = Number(comparisonLevelSelect.value); renderComparison() })
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
  else if (target.id === 'creature-mode') selectedMode = target.value as AttackMode
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

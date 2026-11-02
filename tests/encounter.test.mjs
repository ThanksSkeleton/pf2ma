import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseCsv } from '../src/data-builder.ts'
import { encounterTemplates, matchesEncounterCategory, rollEncounter, validPartyLevels } from '../src/encounter.ts'

const rows = parseCsv(readFileSync(new URL('../csv/RoadMaps_Prod.csv', import.meta.url), 'utf8'))
const archetypes = rows.filter((row) => !row['Road Map'].startsWith('Special:')).map((row) => ({
  name: row['Road Map'], role: row.Role, traits: row.ArchetypeTraits.split(',').filter(Boolean),
}))
const byName = new Map(archetypes.map((archetype) => [archetype.name, archetype]))
const xpByOffset = new Map([[2, 80], [0, 40], [-2, 20], [-4, 10]])

test('all variations have valid budgets, levels, and matching archetype pools', () => {
  assert.equal(encounterTemplates.length, 24)
  assert.equal(new Set(encounterTemplates.map((template) => template.name)).size, 24)
  for (const template of encounterTemplates) {
    assert.equal(template.slots.reduce((sum, entry) => sum + entry.count * xpByOffset.get(entry.levelOffset), 0), template.xp)
    assert.ok(validPartyLevels(template).length)
    for (const entry of template.slots) assert.ok(archetypes.some((archetype) => matchesEncounterCategory(archetype, entry.category)))
    for (const random of [() => 0, () => 0.999]) {
      const level = validPartyLevels(template)[0]
      const groups = rollEncounter(template, level, archetypes, random)
      assert.equal(groups.length, template.slots.length)
      assert.equal(new Set(groups.map((group) => group.name)).size, groups.length)
      assert.ok(groups.filter((group) => byName.get(group.name).traits.includes('Pacifist')).length <= (template.maxPacifists ?? groups.length))
      groups.forEach((group, index) => {
        const entry = template.slots[index]
        assert.equal(group.count, entry.count)
        assert.equal(group.level, level + entry.levelOffset)
        assert.ok(matchesEncounterCategory(byName.get(group.name), entry.category), `${template.name}: ${group.name}`)
        if (byName.get(group.name).traits.includes('Modal') && ['Melee+', 'Ranged+'].includes(entry.category)) {
          assert.equal(group.mode, entry.category === 'Melee+' ? 'Melee' : 'Ranged')
        }
      })
    }
  }
})

test('pacifists are exclusive and Elite Enemies uses at most one', () => {
  assert.ok(matchesEncounterCategory(byName.get('Priest'), 'Pacifist'))
  assert.ok(!matchesEncounterCategory(byName.get('Priest'), 'Ranged+'))
  assert.ok(matchesEncounterCategory(byName.get('Specter'), 'Melee+'))
  assert.ok(!matchesEncounterCategory(byName.get('Specter'), 'Ranged+'))
  const elite = encounterTemplates.find((template) => template.name === 'Elite Enemies')
  const candidates = ['Mirage', 'Priest', 'Support', 'Ace', 'Bastion'].map((name) => byName.get(name))
  const groups = rollEncounter(elite, 5, candidates, () => 0)
  assert.deepEqual(groups.map((group) => group.name), ['Mirage', 'Ace', 'Bastion'])
})

test('role-only encounters record the default mode for Modal archetypes', () => {
  const controller = encounterTemplates.find((template) => template.name === 'Mook Squad : Controller')
  assert.deepEqual(rollEncounter(controller, 5, [byName.get('Hornet')]),
    [{ name: 'Hornet', count: 6, level: 1, mode: 'Melee' }])
})

test('unsupported levels and empty category pools fail clearly', () => {
  assert.throws(() => rollEncounter(encounterTemplates[0], 2, archetypes), /Unsupported party level/)
  assert.throws(() => rollEncounter(encounterTemplates[0], 5, []), /No archetypes available for Melee\+/)
})

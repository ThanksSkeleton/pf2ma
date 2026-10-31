import assert from 'node:assert/strict'
import test from 'node:test'
import { encounterTemplates, rollEncounter, validPartyLevels } from '../src/encounter.ts'

const xpByOffset = new Map([[2, 80], [0, 40], [-2, 20], [-4, 10]])

test('quick adventure groups match their XP budgets and stay within supported creature levels', () => {
  assert.equal(encounterTemplates.length, 7)
  for (const template of encounterTemplates) {
    assert.equal(template.slots.reduce((sum, slot) => sum + slot.count * xpByOffset.get(slot.levelOffset), 0), template.xp)
    for (const level of validPartyLevels(template)) {
      assert.ok(template.slots.every((slot) => level + slot.levelOffset >= -1 && level + slot.levelOffset <= 24))
    }
  }
  assert.deepEqual(validPartyLevels(encounterTemplates[0]), Array.from({ length: 20 }, (_, index) => index + 3))
})

test('rolling assigns a distinct monster to each template slot and preserves counts', () => {
  const names = ['Ace', 'Bastion', 'Cataphract']
  const result = rollEncounter(encounterTemplates[2], 5, names, () => 0)
  assert.deepEqual(result, [
    { name: 'Ace', count: 1, level: 5 },
    { name: 'Bastion', count: 1, level: 5 },
    { name: 'Cataphract', count: 1, level: 5 },
  ])
  assert.throws(() => rollEncounter(encounterTemplates[0], 2, names), /Unsupported party level/)
})

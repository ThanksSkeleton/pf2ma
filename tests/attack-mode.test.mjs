import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { isAttackDisabled } from '../src/attack-mode.ts'
import { buildArchetype } from '../src/data-builder.ts'

const directory = new URL('../csv/', import.meta.url)
const sources = Object.fromEntries(await Promise.all(
  (await readdir(directory)).filter((name) => name.endsWith('.csv'))
    .map(async (name) => [name, await readFile(new URL(name, directory), 'utf8')]),
))

test('mode selects the active attack on Modal monsters', () => {
  const soldier = buildArchetype(sources, 'Soldier')
  const blow = soldier.abilities.find((card) => card.name === 'Glancing Blow')
  const shot = soldier.abilities.find((card) => card.name === 'Glancing Shot')
  assert.equal(isAttackDisabled(soldier, blow, 'Melee'), false)
  assert.equal(isAttackDisabled(soldier, shot, 'Melee'), true)
  assert.equal(isAttackDisabled(soldier, blow, 'Ranged'), true)
  assert.equal(isAttackDisabled(soldier, shot, 'Ranged'), false)

  const hornet = buildArchetype(sources, 'Hornet')
  const melee = hornet.attack
  const ranged = hornet.secondaryAttacks[0]
  assert.equal(isAttackDisabled(hornet, melee, 'Melee'), false)
  assert.equal(isAttackDisabled(hornet, ranged, 'Melee'), true)
  assert.equal(isAttackDisabled(hornet, melee, 'Ranged'), true)
  assert.equal(isAttackDisabled(hornet, ranged, 'Ranged'), false)
})

test('Flexible ranged strikes stay disabled regardless of mode', () => {
  const kidnapper = buildArchetype(sources, 'Kidnapper')
  const ranged = kidnapper.secondaryAttacks[0]
  for (const mode of ['Melee', 'Ranged']) {
    assert.equal(isAttackDisabled(kidnapper, kidnapper.attack, mode), false)
    assert.equal(isAttackDisabled(kidnapper, ranged, mode), true)
    assert.equal(isAttackDisabled(kidnapper, kidnapper.abilities.find((card) => card.name === 'Kidnap'), mode), false)
  }
  const pyro = buildArchetype(sources, 'Pyro')
  assert.equal(isAttackDisabled(pyro, pyro.attack, 'Melee'), true)
  assert.equal(isAttackDisabled(pyro, pyro.attack, 'Ranged'), true)
  const ace = buildArchetype(sources, 'Ace')
  assert.equal(isAttackDisabled(ace, ace.attack, 'Melee'), false)
  assert.equal(isAttackDisabled(ace, ace.attack, 'Ranged'), false)
})

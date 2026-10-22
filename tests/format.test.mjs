import assert from 'node:assert/strict'
import test from 'node:test'
import { format, formatFields, MissingVariablesError } from '../src/format.ts'

test('formats damage, saves, and movement from supplied values', () => {
  assert.deepEqual(formatFields({
    damage: '$lowDamage $damageType',
    save: 'DC $abilityDC Basic Reflex',
    effect: 'Stride up to $speed. Reduce damage by $reduction.',
  }, {
    lowDamage: '1d4+2', damageType: 'fire', abilityDC: 17,
    speed: '25 feet', reduction: 0,
  }), {
    damage: '1d4+2 fire', save: 'DC 17 Basic Reflex',
    effect: 'Stride up to 25 feet. Reduce damage by 0.',
  })
})

test('handles repeated tokens, overlapping names, punctuation, and multiline text', () => {
  assert.equal(format('$speed / $speedBonus.\n$speed!', { speed: '25 feet', speedBonus: '+5 feet' }),
    '25 feet / +5 feet.\n25 feet!')
})

test('reports every distinct missing token and rejects inherited values', () => {
  assert.throws(() => format('$damage, $dc, $damage, $toString', {}), (error) => {
    assert.ok(error instanceof MissingVariablesError)
    assert.deepEqual(error.variables, ['damage', 'dc', 'toString'])
    return true
  })
})

test('inserts values literally without recursive substitution', () => {
  assert.equal(format('$value', { value: '$other $& <text>', other: 'unused' }), '$other $& <text>')
})

test('supports literal dollars, empty values, and templates without tokens', () => {
  assert.equal(format('$$damage costs $$5; $empty', { empty: '' }), '$damage costs $5; ')
  assert.equal(format('No variables.', {}), 'No variables.')
})

test('accepts a precomputed dart count without level or lookup data', () => {
  assert.equal(format('Choose targets for $dartCount darts.', { dartCount: 4 }), 'Choose targets for 4 darts.')
})

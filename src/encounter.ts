export type EncounterSlot = { levelOffset: number; count: number }
export type EncounterTemplate = { name: string; xp: number; slots: EncounterSlot[] }
export type EncounterGroup = { name: string; count: number; level: number }

export const encounterTemplates: EncounterTemplate[] = [
  { name: 'Boss and Lackeys', xp: 120, slots: [{ levelOffset: 2, count: 1 }, { levelOffset: -4, count: 4 }] },
  { name: 'Boss and Lieutenant', xp: 120, slots: [{ levelOffset: 2, count: 1 }, { levelOffset: 0, count: 1 }] },
  { name: 'Elite Enemies', xp: 120, slots: [{ levelOffset: 0, count: 1 }, { levelOffset: 0, count: 1 }, { levelOffset: 0, count: 1 }] },
  { name: 'Lieutenant and Lackeys', xp: 80, slots: [{ levelOffset: 0, count: 1 }, { levelOffset: -4, count: 4 }] },
  { name: 'Mated Pair', xp: 80, slots: [{ levelOffset: 0, count: 1 }, { levelOffset: 0, count: 1 }] },
  { name: 'Troop', xp: 80, slots: [{ levelOffset: 0, count: 1 }, { levelOffset: -2, count: 2 }] },
  { name: 'Mook Squad', xp: 60, slots: [{ levelOffset: -4, count: 6 }] },
]

export const validPartyLevels = (template: EncounterTemplate) =>
  Array.from({ length: 26 }, (_, index) => index - 1)
    .filter((level) => template.slots.every((slot) => level + slot.levelOffset >= -1 && level + slot.levelOffset <= 24))

export function rollEncounter(template: EncounterTemplate, partyLevel: number, names: string[], random = Math.random): EncounterGroup[] {
  if (!validPartyLevels(template).includes(partyLevel)) throw new Error('Unsupported party level for this template')
  if (names.length < template.slots.length) throw new Error('Not enough monster archetypes')
  const remaining = [...names]
  return template.slots.map((slot) => {
    const index = Math.min(remaining.length - 1, Math.floor(random() * remaining.length))
    return { name: remaining.splice(index, 1)[0], count: slot.count, level: partyLevel + slot.levelOffset }
  })
}

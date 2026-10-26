import type { EventType, Symptoms } from '../types'

export const symptomFields = [
  { key: 'bloating', label: 'Вздутие', poopOnly: false },
  { key: 'straining', label: 'Пришлось тужиться', poopOnly: true },
  { key: 'incomplete', label: 'Неполное опорожнение', poopOnly: true },
  { key: 'blood', label: 'Кровь в стуле', poopOnly: true },
  { key: 'laxative', label: 'Принимала слабительное', poopOnly: true },
] as const

export function parseSymptoms(value: unknown, type: EventType): Symptoms | null {
  if (value == null) return null
  if (typeof value !== 'object' || Array.isArray(value))
    throw new Error('Некорректные отметки самочувствия.')
  const result: Symptoms = {}
  for (const [key, item] of Object.entries(value)) {
    if (key === 'pain') {
      if (item == null) continue
      if (!Number.isInteger(item) || item < 0 || item > 3)
        throw new Error('Боль должна быть от 0 до 3.')
      result.pain = item as Symptoms['pain']
    } else {
      const field = symptomFields.find((field) => field.key === key)
      if (!field || (field.poopOnly && type !== 'poop' && item != null))
        throw new Error('Недопустимое поле самочувствия.')
      if (item == null) continue
      if (typeof item !== 'boolean')
        throw new Error('Отметка симптома должна быть «да», «нет» или не указана.')
      result[field.key] = item
    }
  }
  return Object.keys(result).length ? result : null
}

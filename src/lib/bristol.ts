import type { BristolType, DiaryEvent } from '../types'

export const bristolTypes: { type: BristolType; name: string; description: string }[] = [
  { type: 1, name: 'Твёрдые комочки', description: 'Отдельные плотные комочки, как орешки' },
  { type: 2, name: 'Комковатый', description: 'Колбаска из соединённых комочков' },
  { type: 3, name: 'С трещинками', description: 'Колбаска с трещинами на поверхности' },
  { type: 4, name: 'Гладкий и мягкий', description: 'Гладкая мягкая колбаска или змейка' },
  { type: 5, name: 'Мягкие кусочки', description: 'Мягкие кусочки с чёткими краями' },
  { type: 6, name: 'Кашицеобразный', description: 'Рыхлые кусочки с неровными краями' },
  { type: 7, name: 'Жидкий', description: 'Жидкий стул без твёрдых кусочков' },
]

export function bristolLabel(type?: BristolType | null): string {
  const entry = bristolTypes.find((item) => item.type === type)
  return entry ? `Тип ${entry.type} · ${entry.name.toLowerCase()}` : 'Тип не указан'
}

export function bristolBreakdown(events: Pick<DiaryEvent, 'type' | 'bristol_type'>[]) {
  const counts = new Map<number | null, number>()
  let total = 0
  for (const event of events) {
    if (event.type !== 'poop') continue
    const type = bristolTypes.some((item) => item.type === event.bristol_type)
      ? event.bristol_type!
      : null
    counts.set(type, (counts.get(type) ?? 0) + 1)
    total++
  }
  return [
    ...bristolTypes,
    { type: null, name: 'Тип не указан', description: 'Записи без выбранного типа' },
  ].map((item) => {
    const count = counts.get(item.type) ?? 0
    return { ...item, count, percentage: total ? Math.round((count / total) * 100) : 0 }
  })
}

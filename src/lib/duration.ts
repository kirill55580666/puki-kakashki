export function parseDuration(value: unknown): number | null {
  if (value == null) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 1440)
    throw new Error('Укажите длительность от 1 до 1440 минут или оставьте её неуказанной.')
  return value
}

export function durationLabel(value: number): string {
  const last = value % 10
  const teen = value % 100 >= 11 && value % 100 <= 14
  return `${value} ${teen ? 'минут' : last === 1 ? 'минута' : last >= 2 && last <= 4 ? 'минуты' : 'минут'}`
}

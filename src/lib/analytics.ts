import type { DiaryEvent, EventType } from '../types'

type Row = Pick<DiaryEvent, 'type' | 'occurred_at'>
export const dayParts = [
  { name: 'Ночь', when: 'ночью', icon: '☾', start: 0, end: 6, hours: '00–06' },
  { name: 'Утро', when: 'утром', icon: '☀', start: 6, end: 12, hours: '06–12' },
  { name: 'День', when: 'днём', icon: '✦', start: 12, end: 18, hours: '12–18' },
  { name: 'Вечер', when: 'вечером', icon: '☽', start: 18, end: 24, hours: '18–24' },
] as const

export function hourlyCounts(rows: Row[]) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, poop: 0, fart: 0 }))
  for (const row of rows) {
    const hour = new Date(row.occurred_at).getHours()
    if (Number.isFinite(hour)) hours[hour]![row.type]++
  }
  return hours
}

export function timeOfDayStats(rows: Row[]) {
  const hours = hourlyCounts(rows)
  const totals = {
    poop: rows.filter((row) => row.type === 'poop').length,
    fart: rows.filter((row) => row.type === 'fart').length,
  }
  return dayParts.map((part) => {
    const selected = hours.slice(part.start, part.end)
    const poop = selected.reduce((sum, hour) => sum + hour.poop, 0)
    const fart = selected.reduce((sum, hour) => sum + hour.fart, 0)
    return {
      ...part,
      poop,
      fart,
      poopPercent: totals.poop ? Math.round((poop / totals.poop) * 100) : 0,
      fartPercent: totals.fart ? Math.round((fart / totals.fart) * 100) : 0,
    }
  })
}

export function timeObservation(rows: Row[], type: EventType): string {
  const total = rows.filter((row) => row.type === type).length
  if (!total) return 'Пока нет записей этого типа за выбранное время.'
  const stats = timeOfDayStats(rows)
  const max = Math.max(...stats.map((part) => part[type]))
  const leaders = stats.filter((part) => part[type] === max)
  if (leaders.length === 4) return `Записи распределены поровну: по ${max} в каждую часть суток.`
  if (leaders.length > 1)
    return `Одинаково часто ${leaders.map((part) => part.when).join(' и ')}: по ${max} из ${total} записей.`
  return `Больше всего ${leaders[0]!.when}: ${max} из ${total} записей (${Math.round((max / total) * 100)}%).`
}

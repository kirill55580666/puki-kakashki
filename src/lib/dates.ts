export function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function fromDay(key: string): Date { const [y, m, d] = key.split('-').map(Number); return new Date(y!, m! - 1, d!) }
export function monthDays(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  return [...Array.from({ length: (first.getDay() + 6) % 7 }, () => null), ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]
}
export function recentDays(count: number, now = new Date()): string[] { return Array.from({ length: count }, (_, i) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - count + 1 + i))) }
export function localInput(date: Date | string): string { const d = new Date(date); return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
export const prettyDate = (value: string) => fromDay(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
export const timeOf = (value: string) => new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

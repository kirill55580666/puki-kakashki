import type { EventInput } from '../types'
export function parseImport(text: string): EventInput[] {
  const parsed: unknown = JSON.parse(text)
  const rows = Array.isArray(parsed) ? parsed : (parsed as { events?: unknown } | null)?.events
  if (!Array.isArray(rows) || !rows.length || rows.length > 5000)
    throw new Error('В файле должно быть от 1 до 5000 записей.')
  return rows.map((row: unknown) => {
    if (!row || typeof row !== 'object') throw new Error('Некорректная запись в файле.')
    const r = row as Record<string, unknown>
    if (
      (r.type !== 'poop' && r.type !== 'fart') ||
      typeof r.occurred_at !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(r.occurred_at) ||
      !Number.isFinite(Date.parse(r.occurred_at))
    )
      throw new Error('Проверьте тип события и дату ISO с часовым поясом.')
    const calendarDate = r.occurred_at.slice(0, 10)
    const calendarCheck = new Date(`${calendarDate}T00:00:00Z`)
    if (
      !Number.isFinite(calendarCheck.getTime()) ||
      calendarCheck.toISOString().slice(0, 10) !== calendarDate ||
      Number(r.occurred_at.slice(11, 13)) > 23
    )
      throw new Error('В файле есть несуществующая календарная дата.')
    return { type: r.type, occurred_at: new Date(r.occurred_at).toISOString() }
  })
}

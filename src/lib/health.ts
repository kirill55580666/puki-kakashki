import type { DiaryEvent } from '../types'
import { dayKey, fromDay, recentDays } from './dates.ts'

const constipation =
  'https://www.niddk.nih.gov/health-information/digestive-diseases/constipation/symptoms-causes'
const diarrhea =
  'https://www.niddk.nih.gov/health-information/digestive-diseases/diarrhea/symptoms-causes'
const gas =
  'https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/symptoms-causes'

export interface HealthInsight {
  id: string
  level: 'attention' | 'watch' | 'info'
  title: string
  evidence: string
  advice: string
  rule: string
  source: string
}

export function healthInsights(
  events: DiaryEvent[],
  today: string,
  completeWeek = false,
  now = new Date(),
) {
  const dates = recentDays(7, fromDay(today))
  const rows = events.filter(
    (row) => dates.includes(dayKey(row.occurred_at)) && new Date(row.occurred_at) <= now,
  )
  const poops = rows.filter((row) => row.type === 'poop')
  const insights: HealthInsight[] = []
  const blood = poops.filter((row) => row.symptoms?.blood === true)
  const severe = rows.filter((row) => row.symptoms?.pain === 3)
  if (blood.length)
    insights.push({
      id: 'blood',
      level: 'attention',
      title: 'Отмечена кровь в стуле',
      evidence: `Таких записей за 7 дней: ${blood.length}.`,
      advice:
        'Обсудите кровь в стуле с врачом, особенно если она появляется повторно. При большом количестве крови, продолжающемся кровотечении или сильной боли нужна срочная медицинская помощь.',
      rule: 'Срабатывает только на явную отметку крови, а не на тип стула или число записей.',
      source: 'https://www.nhs.uk/symptoms/bleeding-from-the-bottom-rectal-bleeding/',
    })
  if (severe.length)
    insights.push({
      id: 'pain',
      level: 'attention',
      title: 'Отмечена сильная боль',
      evidence: `Сильная боль указана в ${severe.length} записях.`,
      advice:
        'Если боль сильная сейчас или не проходит, обратитесь за медицинской помощью без промедления. Дневник не определяет её причину.',
      rule: 'Срабатывает на выбранную пользователем сильную боль (3 из 3).',
      source: diarrhea,
    })
  const looseByDay = new Map<string, number>()
  for (const row of poops.filter((row) => row.bristol_type === 6 || row.bristol_type === 7)) {
    const key = dayKey(row.occurred_at)
    looseByDay.set(key, (looseByDay.get(key) ?? 0) + 1)
  }
  const mostLoose = [...looseByDay.entries()].sort((a, b) => b[1] - a[1])[0]
  let consecutive = 0
  let longest = 0
  for (const date of dates) {
    consecutive = (looseByDay.get(date) ?? 0) >= 3 ? consecutive + 1 : 0
    longest = Math.max(longest, consecutive)
  }
  if (mostLoose && mostLoose[1] >= 3)
    insights.push({
      id: 'loose',
      level: mostLoose[1] >= 6 ? 'attention' : 'watch',
      title: 'Возможные признаки диареи',
      evidence: `${mostLoose[0]}: ${mostLoose[1]} записей типов 6–7.${longest >= 3 ? ` Повторялось ${longest} дня подряд.` : ''}`,
      advice:
        mostLoose[1] >= 6
          ? 'Если симптомы актуальны, свяжитесь с врачом без промедления. Важно сообщить о боли, температуре и признаках обезвоживания.'
          : 'Частый жидкий или кашицеобразный стул может соответствовать диарее. Если это длится больше двух дней или состояние ухудшается, обратитесь к врачу. При беременности, возрасте старше 65 лет, ослабленном иммунитете или приёме антибиотиков свяжитесь с врачом раньше.',
      rule: 'Не менее трёх записей типов 6–7 за один местный календарный день. Шесть за день повышают внимание. Записи на нескольких датах сами по себе не доказывают непрерывную диарею. Причина по дневнику не устанавливается.',
      source: diarrhea,
    })
  const hard = poops.filter((row) => row.bristol_type === 1 || row.bristol_type === 2)
  const difficult = poops.filter(
    (row) => row.symptoms?.straining === true || row.symptoms?.incomplete === true,
  )
  if (hard.length || difficult.length)
    insights.push({
      id: 'hard',
      level: 'watch',
      title: 'Есть признаки затруднённой дефекации',
      evidence: `Твёрдый стул: ${hard.length} записей. Натуживание или неполное опорожнение: ${difficult.length}.`,
      advice:
        'Эти признаки могут встречаться при запоре, даже если стул бывает каждый день. Если они повторяются или беспокоят, обсудите их с врачом.',
      rule: 'Отмечен тип 1–2, натуживание или неполное опорожнение. Это признаки, а не подтверждение диагноза.',
      source: constipation,
    })
  if (
    rows.some(
      (row) =>
        row.type === 'fart' && (row.symptoms?.bloating === true || (row.symptoms?.pain ?? 0) > 0),
    )
  )
    insights.push({
      id: 'gas',
      level: 'info',
      title: 'Газы сопровождаются дискомфортом',
      evidence: 'В записях о пуках отмечены вздутие или боль.',
      advice:
        'Если дискомфорт мешает повседневной жизни, появился внезапно или сохраняется, обсудите его с врачом. Само число пуков не определяет заболевание.',
      rule: 'Учитываются явные отметки боли или вздутия; порога «слишком много пуков» в приложении нет.',
      source: gas,
    })
  const end = fromDay(today)
  end.setDate(end.getDate() - 1)
  const completedDates = recentDays(7, end)
  const completedPoops = events.filter(
    (row) => row.type === 'poop' && completedDates.includes(dayKey(row.occurred_at)),
  )
  if (completeWeek && completedPoops.length < 3)
    insights.push({
      id: 'frequency',
      level: 'watch',
      title: 'Редкий стул за подтверждённую неделю',
      evidence: `${completedDates[0]} — ${completedDates[6]}: ${completedPoops.length} записей. Вы подтвердили полноту дневника.`,
      advice:
        'Менее трёх дефекаций в неделю — один из возможных признаков запора. Учитывайте свой обычный ритм; при сохраняющихся изменениях или дискомфорте обратитесь к врачу.',
      rule: 'Только семь завершённых дней и только после подтверждения, что все дефекации записаны. Без подтверждения пропуски не считаются отсутствием стула.',
      source: constipation,
    })
  if (rows.some((row) => row.symptoms?.laxative === true))
    insights.push({
      id: 'medication',
      level: 'info',
      title: 'Есть отметки приёма слабительного',
      evidence: 'Это важно учитывать при оценке частоты и формы стула.',
      advice:
        'Включите эти отметки в разговор с врачом. Не меняйте препарат или дозу на основании графика.',
      rule: 'Приложение учитывает указанное лекарственное воздействие как контекст, но не определяет его причину и не назначает лечение.',
      source: diarrhea,
    })
  const priority = { attention: 0, watch: 1, info: 2 }
  return insights.sort((a, b) => priority[a.level] - priority[b.level])
}

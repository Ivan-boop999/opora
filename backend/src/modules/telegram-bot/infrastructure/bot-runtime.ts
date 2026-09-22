import type { DbClient } from '../../../db'
import { localMinutesOfDay, localWeekday } from '../../../local-date'
import { kindTexts } from '../../notifications'

/**
 * Живой бот: long polling getUpdates и воркер напоминаний, оба — фоновые циклы
 * внутри веб-процесса (Render free даёт один процесс). Повторная доставка не
 * страшна: /start идемпотентен, напоминания расходуют только nextRunAt.
 */

const WEBAPP_URL = 'https://opora-5mdx.onrender.com'

type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number }
    from?: { id: number; first_name?: string }
    text?: string
  }
}

export function startBotRuntime(input: { botToken: string; db: DbClient }) {
  const { botToken, db } = input
  let offset = 0
  let stopped = false

  const call = async (method: string, body: Record<string, unknown>) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(35_000),
    })
    return res
  }

  async function handleUpdate(update: TelegramUpdate) {
    const message = update.message
    if (!message?.text) return
    const text = message.text.trim().toLowerCase()
    const chatId = message.chat.id

    if (text === '/start' || text === '/app') {
      await call('sendMessage', {
        chat_id: chatId,
        text: [
          'Здравствуй! Это «ТвояОпора» — место, где можно выдохнуть.',
          '',
          'Приложение открывается кнопкой меню — левая нижняя кнопка поля ввода (иконка с четырьмя квадратиками).',
          'Внутри: отметка состояния, посильный шаг на день, сад, дневник и наблюдения.',
          '',
          'Напоминания по умолчанию выключены — включить можно в приложении, в разделе «Я».',
        ].join('\n'),
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Открыть приложение',
                url: WEBAPP_URL,
              },
            ],
          ],
        },
      })
      return
    }

    if (text === '/help') {
      await call('sendMessage', {
        chat_id: chatId,
        text: [
          'Как этим пользоваться:',
          '• Кнопка меню (слева внизу) открывает приложение.',
          '• Отметь состояние — получишь один посильный шаг.',
          '• «Нужна поддержка» всегда видна на главном экране.',
          '• /stop — выключить все напоминания.',
        ].join('\n'),
      })
      return
    }

    if (text === '/stop') {
      const owner = await db.user.findUnique({ where: { telegramId: String(message.from?.id ?? chatId) } })
      if (owner) {
        await db.notificationPreference.updateMany({
          where: { userId: owner.id },
          data: { enabled: false },
        })
        await db.notificationJob.updateMany({
          where: { userId: owner.id },
          data: { status: 'paused' },
        })
      }
      await call('sendMessage', {
        chat_id: chatId,
        text: 'Напоминания выключены. Приложение по-прежнему доступно через кнопку меню.',
      })
      return
    }

    await call('sendMessage', {
      chat_id: chatId,
      text: 'Я здесь, чтобы открывать приложение. Нажми кнопку меню слева внизу — или /help.',
    })
  }

  async function pollLoop() {
    while (!stopped) {
      try {
        const res = await call('getUpdates', {
          offset,
          timeout: 25,
          allowed_updates: ['message'],
        })
        const json = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] }
        if (json.ok && json.result) {
          for (const update of json.result) {
            offset = Math.max(offset, update.update_id + 1)
            await handleUpdate(update).catch((error) =>
              console.log('[bot] handler error', (error as Error).message),
            )
          }
        }
      } catch {
        // Сеть/пауза Render — просто продолжаем.
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }
  }

  async function reminderLoop() {
    while (!stopped) {
      try {
        await dispatchDueReminders(db, call)
      } catch (error) {
        console.log('[bot] reminder error', (error as Error).message)
      }
      await new Promise((resolve) => setTimeout(resolve, 30_000))
    }
  }

  void pollLoop()
  void reminderLoop()
  console.log('[bot] runtime started')

  return () => {
    stopped = true
  }
}

async function dispatchDueReminders(
  db: DbClient,
  call: (method: string, body: Record<string, unknown>) => Promise<Response>,
) {
  const now = new Date()
  const due = await db.notificationJob.findMany({
    where: { status: 'active', nextRunAt: { lte: now } },
    take: 20,
  })
  if (due.length === 0) return

  for (const job of due) {
    const preference = await db.notificationPreference.findFirst({
      where: { userId: job.userId, kind: job.kind },
    })
    const timezone =
      (
        await db.userPreferences.findUnique({
          where: { userId: job.userId },
          select: { timezone: true },
        })
      )?.timezone ?? 'Europe/Moscow'
    const weekday = localWeekday(now, timezone)
    const minutes = localMinutesOfDay(now, timezone)

    const allowed =
      preference?.enabled !== false &&
      (preference?.weekdays ?? [1, 2, 3, 4, 5, 6, 7]).includes(weekday) &&
      Math.abs(minutes - (preference?.timeMinutes ?? job.kind === 'evening' ? 21 * 60 : 10 * 60)) < 45

    if (!allowed) {
      // Пропущенное окно (сон сервера, смена настроек) не догоняем пачкой.
      await db.notificationJob.update({
        where: { id: job.id },
        data: { nextRunAt: tomorrowAt(preference?.timeMinutes ?? 600, timezone) },
      })
      continue
    }

    const user = await db.user.findUnique({ where: { id: job.userId } })
    if (!user?.telegramId) {
      await db.notificationJob.update({
        where: { id: job.id },
        data: { status: 'paused', lastError: 'no-telegram-link' },
      })
      continue
    }

    try {
      const res = await call('sendMessage', {
        chat_id: Number(user.telegramId),
        text: kindTexts[job.kind as keyof typeof kindTexts] ?? kindTexts.anchor,
      })
      if (!res.ok && (res.status === 403 || res.status === 434)) {
        await db.notificationJob.update({
          where: { id: job.id },
          data: { status: 'bot-blocked', lastError: `http-${res.status}` },
        })
        continue
      }
    } catch (error) {
      await db.notificationJob.update({
        where: { id: job.id },
        data: { lastError: (error as Error).message.slice(0, 200) },
      })
      continue
    }

    await db.notificationJob.update({
      where: { id: job.id },
      data: {
        lastAttemptAt: now,
        lastError: null,
        nextRunAt: tomorrowAt(preference?.timeMinutes ?? 600, timezone),
      },
    })
  }
}

function tomorrowAt(timeMinutes: number, timezone: string): Date {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayKey = formatter.format(now)
  const tomorrow = new Date(`${todayKey}T00:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return new Date(tomorrow.getTime() + timeMinutes * 60_000)
}

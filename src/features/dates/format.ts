import type { DateItem, DateStatus } from '../../shared/api/types'

// Цвет статуса: точка и текст. На светлом фоне -500 бледные — там берём оттенок темнее
export const statusTone: Record<DateStatus, { text: string; dot: string }> = {
	proposed: {
		text: 'text-amber-700 dark:text-amber-400',
		dot: 'bg-amber-500'
	},
	planned: { text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
	declined: { text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
	done: {
		text: 'text-emerald-700 dark:text-emerald-400',
		dot: 'bg-emerald-500'
	},
	cancelled: { text: 'text-zinc-600 dark:text-zinc-400', dot: 'bg-zinc-500' }
}

/** Статус от лица пользователя: сразу видно, чей ход */
export function statusText(date: DateItem, meId?: number) {
	const iAmInvitee = date.invitee.id === meId
	switch (date.status) {
		case 'proposed':
			return iAmInvitee
				? 'Ждёт вашего ответа'
				: `Ждёт ответа: ${date.invitee.first_name}`
		case 'planned':
			return 'Запланировано'
		case 'declined':
			return iAmInvitee
				? 'Вы отказались'
				: `${date.invitee.first_name} отказал(ась)`
		case 'done':
			return 'Состоялось'
		case 'cancelled':
			return 'Отменено'
	}
}

export const partnerOf = (date: DateItem, meId?: number) =>
	date.creator.id === meId ? date.invitee : date.creator

// Лимит бэка на причину отмены
export const CANCEL_REASON_MAX = 500

/** Как на бэке: предложенное или принятое, пока не началось */
export const canCancel = (date: DateItem) =>
	(date.status === 'proposed' || date.status === 'planned') &&
	new Date(date.starts_at) > new Date()

/** Кто отменил; cancelled_by пуст у старых отмен и если пользователь удалён */
export function cancelledByText(date: DateItem, meId?: number) {
	if (date.cancelled_by === null) return 'Свидание отменено'
	if (date.cancelled_by === meId) return 'Вы отменили'
	const who =
		date.cancelled_by === date.creator.id ? date.creator : date.invitee
	return `${who.first_name} отменил(а)`
}

// Бэк отдаёт UTC — всё ниже показывает время в часовом поясе пользователя из профиля

const fmt = (
	iso: string,
	timeZone: string | undefined,
	o: Intl.DateTimeFormatOptions
) => new Intl.DateTimeFormat('ru', { ...o, timeZone }).format(new Date(iso))

/** «сб, 18 октября, 19:00» */
export const formatDateTime = (iso: string, timeZone?: string) =>
	fmt(iso, timeZone, {
		day: 'numeric',
		month: 'long',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit'
	})

/** «19:00» */
export const formatTime = (iso: string, timeZone?: string) =>
	fmt(iso, timeZone, { hour: '2-digit', minute: '2-digit' })

/** «суббота, 18 октября» */
export const formatDay = (iso: string, timeZone?: string) =>
	fmt(iso, timeZone, { weekday: 'long', day: 'numeric', month: 'long' })

/** Для «листка календаря»: число, день недели, месяц */
export const dateLeaf = (iso: string, timeZone?: string) => ({
	day: fmt(iso, timeZone, { day: 'numeric' }),
	weekday: fmt(iso, timeZone, { weekday: 'short' }),
	month: fmt(iso, timeZone, { month: 'short' }).replace('.', '')
})

/** Заголовок группы в списке: «Октябрь», для другого года — «Октябрь 2027» */
export function monthTitle(iso: string, timeZone?: string) {
	const sameYear =
		ymd(iso, timeZone).slice(0, 4) === ymd(nowIso(), timeZone).slice(0, 4)
	const title = fmt(iso, timeZone, {
		month: 'long',
		...(!sameYear && { year: 'numeric' })
	}).replace(' г.', '')
	return title[0].toUpperCase() + title.slice(1)
}

/** Ключ группы по месяцу в часовом поясе пользователя: «2026-10» */
export const monthKey = (iso: string, timeZone?: string) =>
	ymd(iso, timeZone).slice(0, 7)

/** «сегодня», «завтра», «через 5 дней», «3 дня назад» — по календарным дням */
export function relativeDay(iso: string, timeZone?: string) {
	const days = Math.round(
		(Date.parse(ymd(iso, timeZone)) - Date.parse(ymd(nowIso(), timeZone))) /
			86_400_000
	)
	if (days === 0) return 'сегодня'
	if (days === 1) return 'завтра'
	if (days === 2) return 'послезавтра'
	if (days === -1) return 'вчера'
	const n = Math.abs(days)
	const word = `${n} ${plural(n, ['день', 'дня', 'дней'])}`
	return days > 0 ? `через ${word}` : `${word} назад`
}

export function plural(n: number, [one, few, many]: [string, string, string]) {
	const mod10 = n % 10
	const mod100 = n % 100
	if (mod10 === 1 && mod100 !== 11) return one
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
	return many
}

const nowIso = () => new Date().toISOString()

// en-CA даёт YYYY-MM-DD — удобно сравнивать календарные дни
const ymd = (iso: string, timeZone?: string) =>
	new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso))

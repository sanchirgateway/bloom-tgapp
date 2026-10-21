import type {
	FlowerGift,
	FlowerOccasion,
	FlowerReaction
} from '../../shared/api/types'

// Подписи и эмодзи — как в боте (bloomy_bot/app/feature/flowers/keyboards.py)

export const OCCASIONS: Record<FlowerOccasion, string> = {
	no_reason: 'Без повода',
	date: 'Свидание',
	birthday: 'День рождения',
	anniversary: 'Годовщина',
	holiday: 'Праздник',
	apology: 'Извинение'
}

// Реакция — сама по себе эмодзи, тут линейные иконки не нужны
export const REACTIONS: Record<FlowerReaction, string> = {
	loved: '😍',
	touched: '🥹',
	happy: '😊',
	meh: '😐'
}

// Лимиты бэка (flowers/service.py, flowers/models.py)
export const FLOWERS_MAX = 200
export const TEXT_MAX = 2000
export const PRICE_MAX = 10_000_000
/** От каждого участника */
export const MAX_FLOWER_PHOTOS = 10

export const isGiven = (gift: FlowerGift) => gift.given_at !== null

/** Когда показывать букет в ленте: невручённый — по дате записи */
export const giftTime = (gift: FlowerGift) => gift.given_at ?? gift.created_at

export const formatPrice = (rub: number) =>
	new Intl.NumberFormat('ru', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0
	}).format(rub)

/** «18 октября» в часовом поясе пользователя */
export const formatShortDay = (iso: string, timeZone?: string) =>
	new Intl.DateTimeFormat('ru', {
		day: 'numeric',
		month: 'long',
		timeZone
	}).format(new Date(iso))

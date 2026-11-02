/** Вкладки вишлиста: неисполненное у каждого из пары и всё исполненное */
export type WishTab = 'mine' | 'partner' | 'done'

// Лимиты бэка (wishlist/service.py)
export const TITLE_MAX = 200
export const URL_MAX = 1000
export const TEXT_MAX = 2000
export const PRICE_MAX = 10_000_000

/** Та же проверка, что на бэке, — чтобы не ждать ответа сервера */
export const isValidUrl = (url: string) => /^https?:\/\/\S+$/.test(url)

/** «ozon.ru» вместо длинной ссылки */
export const linkHost = (url: string) => {
	try {
		return new URL(url).hostname.replace(/^www\./, '')
	} catch {
		return url
	}
}

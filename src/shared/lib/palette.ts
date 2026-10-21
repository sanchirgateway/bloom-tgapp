// Цвета палитры из index.css (:root / [data-theme='dark']) — для того, что рисует сам Telegram

type RGB = `#${string}`

export type PaletteColor = 'page' | 'accent' | 'on-accent' | 'danger'

/** Текущее значение цвета; читать после смены data-theme */
export function paletteColor(name: PaletteColor): RGB {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(`--${name}`)
		.trim() as RGB
}

import {
	init as initSDK,
	setDebug,
	backButton,
	mainButton,
	secondaryButton,
	swipeBehavior,
	miniApp,
	themeParams,
	viewport,
	initData
} from '@tma.js/sdk-react'
import { paletteColor } from '../shared/lib/palette'

export async function init(debug: boolean) {
	setDebug(debug)
	initSDK()

	backButton.mount.ifAvailable()
	mainButton.mount.ifAvailable()
	secondaryButton.mount.ifAvailable()
	// Вторая кнопка — под главной, а не слева от неё
	secondaryButton.setPosition.ifAvailable('bottom')
	swipeBehavior.mount.ifAvailable() // формы отключают свайп-закрытие: shared/lib/swipe.ts
	initData.restore()

	if (miniApp.mount.isAvailable()) {
		themeParams.mount()
		miniApp.mount()
		themeParams.bindCssVars() // → --tg-theme-bg-color, --tg-theme-text-color ...
		miniApp.bindCssVars() // → --tg-bg-color, --tg-header-color ...

		// <html data-theme="dark|light"> — по нему index.css выбирает фон и палитру
		const applyTheme = (dark: boolean) => {
			document.documentElement.dataset.theme = dark ? 'dark' : 'light'
			// Шапка и нижняя панель Telegram — в цвет страницы под фоном
			const page = paletteColor('page')
			if (miniApp.setHeaderColor.isAvailable()) {
				miniApp.setHeaderColor(
					miniApp.setHeaderColor.supports('rgb') ? page : 'secondary_bg_color'
				)
			}
			miniApp.setBgColor.ifAvailable(page)
			miniApp.setBottomBarColor.ifAvailable(page)
		}
		applyTheme(themeParams.isDark())
		themeParams.isDark.sub(applyTheme)
	}

	if (viewport.mount.isAvailable()) {
		await viewport.mount()
		viewport.bindCssVars() // → --tg-viewport-height, --tg-viewport-safe-area-inset-top ...
		viewport.expand.ifAvailable()
	}

	miniApp.ready.ifAvailable() // убрать лоадер Telegram
}

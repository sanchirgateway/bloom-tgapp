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

		// <html data-theme="dark|light"> — для тёмного/светлого фона в CSS
		const applyTheme = (dark: boolean) => {
			document.documentElement.dataset.theme = dark ? 'dark' : 'light'
		}
		applyTheme(themeParams.isDark())
		themeParams.isDark.sub(applyTheme)

		// Шапка и нижняя панель Telegram — в цвет страницы (см. --color-page в index.css)
		miniApp.setHeaderColor.ifAvailable('secondary_bg_color')
		miniApp.setBgColor.ifAvailable('secondary_bg_color')
		miniApp.setBottomBarColor.ifAvailable('secondary_bg_color')
	}

	if (viewport.mount.isAvailable()) {
		await viewport.mount()
		viewport.bindCssVars() // → --tg-viewport-height, --tg-viewport-safe-area-inset-top ...
		viewport.expand.ifAvailable()
	}

	miniApp.ready.ifAvailable() // убрать лоадер Telegram
}

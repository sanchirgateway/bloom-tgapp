import { emitEvent, isTMA, mockTelegramEnv } from '@tma.js/sdk-react'

/** Открыто в обычном браузере с замоканным Telegram — нативных кнопок не будет */
export const isMockedEnv = import.meta.env.DEV && !(await isTMA('complete'))

if (isMockedEnv) {
	const darkTheme = {
		bg_color: '#17212b',
		text_color: '#f5f5f5',
		hint_color: '#708499',
		link_color: '#6ab3f3',
		button_color: '#5288c1',
		button_text_color: '#ffffff',
		secondary_bg_color: '#232e3c',
		section_bg_color: '#17212b',
		section_header_text_color: '#6ab2f2',
		section_separator_color: '#0e1621',
		destructive_text_color: '#ec3942'
	} as const
	const lightTheme = {
		bg_color: '#ffffff',
		text_color: '#000000',
		hint_color: '#999999',
		link_color: '#2481cc',
		button_color: '#2481cc',
		button_text_color: '#ffffff',
		secondary_bg_color: '#efeff3',
		section_bg_color: '#ffffff',
		section_header_text_color: '#6d6d72',
		section_separator_color: '#e7e7e7',
		destructive_text_color: '#e53935'
	} as const
	// Тема как в системе; ?theme=light / ?theme=dark — принудительно
	const forced = new URLSearchParams(location.search).get('theme')
	const dark = forced
		? forced === 'dark'
		: matchMedia('(prefers-color-scheme: dark)').matches
	const themeParams = dark ? darkTheme : lightTheme
	const noInsets = { left: 0, top: 0, bottom: 0, right: 0 } as const

	mockTelegramEnv({
		onEvent(e) {
			if (e.name === 'web_app_request_theme')
				return emitEvent('theme_changed', { theme_params: themeParams })
			if (e.name === 'web_app_request_viewport')
				return emitEvent('viewport_changed', {
					height: window.innerHeight,
					width: window.innerWidth,
					is_expanded: true,
					is_state_stable: true
				})
			if (e.name === 'web_app_request_content_safe_area')
				return emitEvent('content_safe_area_changed', noInsets)
			if (e.name === 'web_app_request_safe_area')
				return emitEvent('safe_area_changed', noInsets)
		},
		launchParams: new URLSearchParams([
			['tgWebAppThemeParams', JSON.stringify(themeParams)],
			[
				'tgWebAppData',
				new URLSearchParams([
					['auth_date', String((Date.now() / 1000) | 0)],
					['hash', 'some-hash'],
					['signature', 'some-signature'],
					['user', JSON.stringify({ id: 1, first_name: 'Dev' })]
				]).toString()
			],
			['tgWebAppVersion', '8.4'],
			['tgWebAppPlatform', 'tdesktop']
		])
	})
}

import { hapticFeedback, themeParams, useSignal } from '@tma.js/sdk-react'
import { toggleDevTheme } from '../mockEnv'
import { MoonIcon, SunIcon } from './icons'

/** Только в dev: переключить светлую/тёмную тему, чтобы проверить фон и палитру */
export function DevThemeToggle() {
	const dark = useSignal(themeParams.isDark)
	return (
		<button
			type='button'
			aria-label={dark ? 'Светлая тема' : 'Тёмная тема'}
			onClick={() => {
				hapticFeedback.selectionChanged.ifAvailable()
				toggleDevTheme()
			}}
			className='glass fixed right-3 z-40 flex size-10 items-center justify-center rounded-full text-hint'
			// Ниже выреза и кнопок Telegram в полноэкранном режиме
			style={{
				top: 'calc(var(--tg-viewport-safe-area-inset-top, 0px) + var(--tg-viewport-content-safe-area-inset-top, 0px) + 12px)'
			}}
		>
			{dark ? <SunIcon /> : <MoonIcon />}
		</button>
	)
}

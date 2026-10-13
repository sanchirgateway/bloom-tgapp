import { useEffect } from 'react'
import { swipeBehavior } from '@tma.js/sdk-react'

/**
 * На экранах с формами свайп вниз не сворачивает мини-апп: на iOS иначе
 * прокрутка пикера или textarea закрывает приложение вместе с введённым
 */
export function useNoVerticalSwipe() {
	useEffect(() => {
		swipeBehavior.disableVertical.ifAvailable()
		return () => {
			swipeBehavior.enableVertical.ifAvailable()
		}
	}, [])
}

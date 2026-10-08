import { useEffect } from 'react'
import {
	useSignal,
	initData,
	miniApp,
	mainButton,
	hapticFeedback
} from '@tma.js/sdk-react'

export default function App() {
	const user = useSignal(initData.user)
	const isDark = useSignal(miniApp.isDark)

	// Главная кнопка
	useEffect(() => {
		mainButton.setParams.ifAvailable({
			text: 'Оформить заказ',
			isVisible: true,
			isEnabled: true
		})
		const off = mainButton.onClick(() => {
			hapticFeedback.impactOccurred.ifAvailable('medium')
			// ...
		})
		return () => {
			off()
			mainButton.setParams.ifAvailable({ isVisible: false })
		}
	}, [])

	return (
		<h1>
			Привет, {user?.first_name}! Тема: {isDark ? 'тёмная' : 'светлая'}
		</h1>
	)
}

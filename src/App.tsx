import { useEffect, useState } from 'react'
import { backButton } from '@tma.js/sdk-react'
import { DatesList } from './features/dates/DatesList'
import { DateDetails } from './features/dates/DateDetails'
import { DateForm } from './features/dates/DateForm'
import { ReviewForm } from './features/reviews/ReviewForm'
import { FlowersList } from './features/flowers/FlowersList'
import { FlowerDetails } from './features/flowers/FlowerDetails'
import { FlowerForm } from './features/flowers/FlowerForm'
import { DevThemeToggle } from './shared/ui/DevThemeToggle'

type Screen =
	| { name: 'list' }
	| { name: 'date'; id: string }
	| { name: 'new' }
	| { name: 'review'; dateId: string }
	| { name: 'flowers' }
	| { name: 'flower'; id: string }
	| { name: 'newFlower' }

/** Куда ведёт «Назад»: с отзыва — в карточку, с букета — в цветы, с остального — в список */
function parentOf(screen: Screen): Screen | null {
	switch (screen.name) {
		case 'list':
			return null
		case 'review':
			return { name: 'date', id: screen.dateId }
		case 'flower':
		case 'newFlower':
			return { name: 'flowers' }
		default:
			return { name: 'list' }
	}
}

export default function App() {
	return (
		<>
			<Screens />
			{import.meta.env.DEV && <DevThemeToggle />}
		</>
	)
}

function Screens() {
	const [screen, setScreen] = useState<Screen>({ name: 'list' })

	// Системная кнопка «Назад» Telegram — на всех экранах, кроме списка
	useEffect(() => {
		const parent = parentOf(screen)
		if (!parent) return
		backButton.show.ifAvailable()
		const off = backButton.onClick(() => setScreen(parent))
		return () => {
			off()
			backButton.hide.ifAvailable()
		}
	}, [screen])

	switch (screen.name) {
		case 'list':
			return (
				<DatesList
					onOpen={id => setScreen({ name: 'date', id })}
					onCreate={() => setScreen({ name: 'new' })}
					onReview={dateId => setScreen({ name: 'review', dateId })}
					onFlowers={() => setScreen({ name: 'flowers' })}
				/>
			)
		case 'date':
			return (
				<DateDetails
					id={screen.id}
					onReview={() => setScreen({ name: 'review', dateId: screen.id })}
				/>
			)
		case 'new':
			return <DateForm onCreated={id => setScreen({ name: 'date', id })} />
		case 'review':
			return (
				<ReviewForm
					dateId={screen.dateId}
					onDone={() => setScreen({ name: 'date', id: screen.dateId })}
				/>
			)
		case 'flowers':
			return (
				<FlowersList
					onOpen={id => setScreen({ name: 'flower', id })}
					onCreate={() => setScreen({ name: 'newFlower' })}
				/>
			)
		case 'flower':
			return (
				<FlowerDetails
					id={screen.id}
					onOpenDate={id => setScreen({ name: 'date', id })}
					onDeleted={() => setScreen({ name: 'flowers' })}
				/>
			)
		case 'newFlower':
			return <FlowerForm onCreated={id => setScreen({ name: 'flower', id })} />
	}
}

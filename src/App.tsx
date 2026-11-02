import { useEffect, useState } from 'react'
import { backButton } from '@tma.js/sdk-react'
import { DatesList } from './features/dates/DatesList'
import { DateDetails } from './features/dates/DateDetails'
import { DateForm } from './features/dates/DateForm'
import { ReviewForm } from './features/reviews/ReviewForm'
import { FlowersList } from './features/flowers/FlowersList'
import { FlowerDetails } from './features/flowers/FlowerDetails'
import { FlowerForm } from './features/flowers/FlowerForm'
import { WishlistList } from './features/wishlist/WishlistList'
import { WishDetails } from './features/wishlist/WishDetails'
import { EditWishForm, NewWishForm } from './features/wishlist/WishForm'
import type { WishTab } from './features/wishlist/format'
import { DevThemeToggle } from './shared/ui/DevThemeToggle'

type Screen =
	| { name: 'list' }
	| { name: 'date'; id: string }
	| { name: 'new' }
	| { name: 'review'; dateId: string }
	| { name: 'flowers' }
	| { name: 'flower'; id: string }
	| { name: 'newFlower' }
	| { name: 'wishlist'; tab: WishTab }
	| { name: 'wish'; id: string; tab: WishTab }
	| { name: 'newWish' }
	| { name: 'editWish'; id: string; tab: WishTab }

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
		case 'wish':
			return { name: 'wishlist', tab: screen.tab }
		case 'newWish':
			return { name: 'wishlist', tab: 'mine' }
		case 'editWish':
			return { name: 'wish', id: screen.id, tab: screen.tab }
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
					onWishlist={() => setScreen({ name: 'wishlist', tab: 'mine' })}
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
		case 'wishlist':
			return (
				<WishlistList
					tab={screen.tab}
					onTab={tab => setScreen({ name: 'wishlist', tab })}
					onOpen={id => setScreen({ name: 'wish', id, tab: screen.tab })}
					onCreate={() => setScreen({ name: 'newWish' })}
				/>
			)
		case 'wish':
			return (
				<WishDetails
					id={screen.id}
					onEdit={() =>
						setScreen({ name: 'editWish', id: screen.id, tab: screen.tab })
					}
					onDeleted={() => setScreen({ name: 'wishlist', tab: screen.tab })}
				/>
			)
		case 'newWish':
			return (
				<NewWishForm
					onSaved={() => setScreen({ name: 'wishlist', tab: 'mine' })}
				/>
			)
		case 'editWish':
			return (
				<EditWishForm
					id={screen.id}
					onSaved={() =>
						setScreen({ name: 'wish', id: screen.id, tab: screen.tab })
					}
				/>
			)
	}
}

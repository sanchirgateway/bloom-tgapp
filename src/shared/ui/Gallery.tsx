import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import { hapticFeedback } from '@tma.js/sdk-react'
import { useNoVerticalSwipe } from '../lib/swipe'
import { ChevronIcon, CloseIcon } from './icons'

/**
 * Фото на весь экран с листанием свайпом (scroll-snap — нативная инерция на телефоне).
 * Через портал в body: у плашек glass есть backdrop-filter, и position: fixed внутри
 * них считается от плашки, а не от экрана.
 */
export function Gallery<T extends { id: string }>({
	photos,
	start,
	title,
	renderPhoto,
	onClose
}: {
	photos: T[]
	start: number
	/** Подпись сверху, например «Фото от Регины» */
	title?: string
	renderPhoto: (photo: T, className: string) => ReactNode
	onClose: () => void
}) {
	const trackRef = useRef<HTMLDivElement>(null)
	const [index, setIndex] = useState(start)
	useNoVerticalSwipe()

	// Сразу на нужном фото, без прокрутки от первого
	useLayoutEffect(() => {
		const track = trackRef.current
		if (track) track.scrollLeft = start * track.clientWidth
	}, [start])

	// Страница под галереей не прокручивается
	useEffect(() => {
		const { overflow } = document.body.style
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = overflow
		}
	}, [])

	const goTo = (i: number) => {
		const track = trackRef.current
		if (!track || i < 0 || i >= photos.length) return
		track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
	}

	// Клавиатура — для десктопного Telegram
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
			if (e.key === 'ArrowLeft') goTo(index - 1)
			if (e.key === 'ArrowRight') goTo(index + 1)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	})

	const onScroll = () => {
		const track = trackRef.current
		if (!track) return
		const i = Math.round(track.scrollLeft / track.clientWidth)
		if (i !== index) {
			hapticFeedback.selectionChanged.ifAvailable()
			setIndex(i)
		}
	}

	return createPortal(
		<div
			role='dialog'
			aria-modal='true'
			aria-label={title ?? 'Фото'}
			className='fixed inset-0 z-50 flex flex-col bg-black text-white'
		>
			<div
				className='flex items-center gap-3 px-2 pb-2'
				// Ниже выреза и кнопок Telegram в полноэкранном режиме
				style={{
					paddingTop:
						'calc(var(--tg-viewport-safe-area-inset-top, 0px) + var(--tg-viewport-content-safe-area-inset-top, 0px) + 8px)'
				}}
			>
				<button
					type='button'
					aria-label='Закрыть'
					onClick={onClose}
					className='flex size-11 items-center justify-center'
				>
					<CloseIcon className='size-6' />
				</button>
				<div className='flex min-w-0 flex-1 flex-col'>
					{title && <span className='truncate font-semibold'>{title}</span>}
					{photos.length > 1 && (
						<span className='text-[13px] text-white/60'>
							{index + 1} из {photos.length}
						</span>
					)}
				</div>
			</div>

			<div
				ref={trackRef}
				onScroll={onScroll}
				className='flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
			>
				{photos.map(photo => (
					<div
						key={photo.id}
						className='flex w-full shrink-0 snap-center items-center justify-center p-2'
					>
						{renderPhoto(photo, 'max-h-full max-w-full object-contain')}
					</div>
				))}
			</div>

			{photos.length > 1 && (
				<div
					className='flex items-center justify-center gap-6 pt-2'
					style={{
						paddingBottom:
							'calc(var(--tg-viewport-safe-area-inset-bottom, 0px) + 12px)'
					}}
				>
					<button
						type='button'
						aria-label='Предыдущее фото'
						disabled={index === 0}
						onClick={() => goTo(index - 1)}
						className='flex size-11 items-center justify-center rounded-full bg-white/10 disabled:opacity-30'
					>
						<ChevronIcon className='size-6 rotate-180' />
					</button>
					<div className='flex gap-1.5'>
						{photos.map((photo, i) => (
							<span
								key={photo.id}
								className={`size-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/30'}`}
							/>
						))}
					</div>
					<button
						type='button'
						aria-label='Следующее фото'
						disabled={index === photos.length - 1}
						onClick={() => goTo(index + 1)}
						className='flex size-11 items-center justify-center rounded-full bg-white/10 disabled:opacity-30'
					>
						<ChevronIcon className='size-6' />
					</button>
				</div>
			)}
		</div>,
		document.body
	)
}

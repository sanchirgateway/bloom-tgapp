import { useCallback, useEffect, useRef, useState } from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import type { WishItem, WishOwner } from '../../shared/api/types'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import {
	ChevronIcon,
	GiftIcon,
	HeartIcon,
	LockIcon
} from '../../shared/ui/icons'
import { EmptyState, SkeletonRows } from '../../shared/ui/Section'
import { plural } from '../dates/format'
import { formatPrice, formatShortDay } from '../flowers/format'
import { useMe, usePartnerName } from '../user/api'
import { PairInvite } from '../user/PairInvite'
import { useWishes } from './api'
import type { WishTab } from './format'
import { WishPhoto } from './WishPhoto'

const isActive = (wish: WishItem) => wish.received_at === null

/** В каждой полке — от самого старого желания к самому новому */
const byOldest = (a: WishItem, b: WishItem) =>
	Date.parse(a.created_at) - Date.parse(b.created_at)

/** Полки по бюджету: партнёру проще выбрать подарок. Пустые не показываем */
const priceShelves: {
	title: string
	fits: (price: number | null) => boolean
}[] = [
	{ title: 'До 2 000 ₽', fits: p => p !== null && p <= 2_000 },
	{ title: 'До 10 000 ₽', fits: p => p !== null && p > 2_000 && p <= 10_000 },
	{ title: 'Мечты', fits: p => p !== null && p > 10_000 },
	{ title: 'Без цены', fits: p => p === null }
]

/** Строка над списком. Считаем только по полям ответа: у владельца reserved_by_me всегда false */
function summary(wishes: WishItem[], partnerName: string | null) {
	const reserved = wishes.filter(w => w.reserved_by_me).length
	if (reserved > 0) {
		return `Вы дарите ${reserved} из ${wishes.length}. ${partnerName ?? 'Партнёр'} об этом не узнает`
	}
	const count = `${wishes.length} ${plural(wishes.length, ['желание', 'желания', 'желаний'])}`
	const priced = wishes.filter(w => w.price !== null)
	if (priced.length === 0) return count
	const total = priced.reduce((sum, w) => sum + w.price!, 0)
	return `${count}, примерно ${formatPrice(total)}`
}

export function WishlistList({
	tab,
	onTab,
	onOpen,
	onCreate
}: {
	/** Живёт в App: иначе при возврате из карточки вкладка сбрасывалась бы */
	tab: WishTab
	onTab: (tab: WishTab) => void
	onOpen: (id: string) => void
	onCreate: () => void
}) {
	const { data: me, isPending, error } = useMe()
	const partnerName = usePartnerName()

	if (isPending) {
		return (
			<div className='p-4'>
				<SkeletonRows />
			</div>
		)
	}
	if (error) {
		return (
			<EmptyState
				icon={<GiftIcon className='size-7' />}
				title='Не удалось загрузить профиль'
				text={error.message}
			/>
		)
	}
	// Вишлист — для пары: без неё все ручки отвечают 409
	if (me.partner_id === null) {
		return (
			<div className='p-4'>
				<PairInvite title='Сначала добавьте пару' />
			</div>
		)
	}

	const partnerLabel = partnerName ?? 'Партнёра'
	const tabLabels: Record<WishTab, string> = {
		mine: 'Мои',
		partner: partnerLabel,
		done: 'Исполнено'
	}

	const changeTab = (t: WishTab) => {
		if (t === tab) return
		hapticFeedback.selectionChanged.ifAvailable()
		onTab(t)
	}

	return (
		<div className='flex flex-col gap-5 p-4'>
			<h1 className='text-[22px] font-bold'>Вишлист</h1>

			<div className='glass flex gap-1 rounded-xl p-0.75'>
				{(['mine', 'partner', 'done'] as const).map(t => (
					<button
						key={t}
						onClick={() => changeTab(t)}
						aria-pressed={tab === t}
						className={`min-h-11 min-w-0 flex-1 truncate rounded-[10px] px-2 text-sm font-semibold transition-colors ${
							tab === t ? 'bg-accent text-on-accent shadow-sm' : 'text-hint'
						}`}
					>
						{tabLabels[t]}
					</button>
				))}
			</div>

			{tab === 'done' ? (
				<DoneWishes
					partnerLabel={partnerLabel}
					timeZone={me.timezone}
					onOpen={onOpen}
				/>
			) : (
				<ActiveWishes
					owner={tab}
					partnerName={partnerName}
					timeZone={me.timezone}
					onOpen={onOpen}
				/>
			)}

			<BottomButtons
				main={
					tab === 'mine'
						? { text: 'Добавить желание', onClick: onCreate }
						: null
				}
			/>
		</div>
	)
}

function LoadError({
	message,
	onRetry
}: {
	message: string
	onRetry: () => void
}) {
	return (
		<EmptyState
			icon={<GiftIcon className='size-7' />}
			title='Не удалось загрузить вишлист'
			text={message}
			action={
				<button
					onClick={onRetry}
					className='mt-1 min-h-11 px-4 font-medium text-link'
				>
					Повторить
				</button>
			}
		/>
	)
}

function ActiveWishes({
	owner,
	partnerName,
	timeZone,
	onOpen
}: {
	owner: WishOwner
	partnerName: string | null
	timeZone: string
	onOpen: (id: string) => void
}) {
	const { data, isPending, error, refetch } = useWishes(owner)

	if (isPending) return <SkeletonRows />
	if (error) {
		return <LoadError message={error.message} onRetry={() => refetch()} />
	}

	const active = data.filter(isActive)
	if (active.length === 0) {
		return (
			<EmptyState
				icon={<GiftIcon className='size-7' />}
				title={owner === 'mine' ? 'Желаний пока нет' : 'Список партнёра пуст'}
				text={
					owner === 'mine'
						? 'Добавьте, что хотите получить, — партнёр сможет тайно это забронировать'
						: 'Когда появятся новые желания, вам придёт уведомление в боте'
				}
			/>
		)
	}

	return (
		<>
			<p className='-mb-1 mx-1 text-sm font-medium text-section-title'>
				{summary(active, partnerName)}
			</p>
			{priceShelves.map(shelf => {
				const wishes = active.filter(w => shelf.fits(w.price))
				return (
					wishes.length > 0 && (
						<Shelf
							key={shelf.title}
							title={shelf.title}
							wishes={wishes}
							timeZone={timeZone}
							onOpen={onOpen}
						/>
					)
				)
			})}
		</>
	)
}

/** Исполненное у обоих: бэк отдаёт его в тех же списках, вперемешку не показываем */
function DoneWishes({
	partnerLabel,
	timeZone,
	onOpen
}: {
	partnerLabel: string
	timeZone: string
	onOpen: (id: string) => void
}) {
	const mine = useWishes('mine')
	const partner = useWishes('partner')

	if (mine.isPending || partner.isPending) return <SkeletonRows />
	const error = mine.error ?? partner.error
	if (error) {
		return (
			<LoadError
				message={error.message}
				onRetry={() => {
					void mine.refetch()
					void partner.refetch()
				}}
			/>
		)
	}

	const groups = [
		{ title: 'Мои', items: mine.data?.filter(w => !isActive(w)) ?? [] },
		{
			title: partnerLabel,
			items: partner.data?.filter(w => !isActive(w)) ?? []
		}
	].filter(group => group.items.length > 0)

	if (groups.length === 0) {
		return (
			<EmptyState
				icon={<GiftIcon className='size-7' />}
				title='Пока ничего не исполнено'
				text='Здесь будут желания, которые вы отметили полученными'
			/>
		)
	}

	return groups.map(group => (
		<Shelf
			key={group.title}
			title={group.title}
			wishes={group.items}
			timeZone={timeZone}
			onOpen={onOpen}
		/>
	))
}

/** Полка: заголовок и ряд карточек с горизонтальной прокруткой до краёв экрана */
function Shelf({
	title,
	wishes,
	timeZone,
	onOpen
}: {
	title: string
	wishes: WishItem[]
	timeZone: string
	onOpen: (id: string) => void
}) {
	const trackRef = useRef<HTMLDivElement>(null)
	const [edges, setEdges] = useState({ start: true, end: true })
	const sorted = [...wishes].sort(byOldest)

	// Можно ли листать дальше — для стрелок; пересчёт при прокрутке и смене ширины
	const updateEdges = useCallback(() => {
		const track = trackRef.current
		if (!track) return
		const max = track.scrollWidth - track.clientWidth
		setEdges({ start: track.scrollLeft <= 1, end: track.scrollLeft >= max - 1 })
	}, [])

	useEffect(() => {
		const track = trackRef.current
		if (!track) return
		updateEdges()
		const observer = new ResizeObserver(updateEdges)
		observer.observe(track)
		return () => observer.disconnect()
	}, [updateEdges, wishes.length])

	const scrollBy = (dir: 1 | -1) => {
		const track = trackRef.current
		track?.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' })
	}

	const arrow =
		'flex size-8 items-center justify-center rounded-full glass text-text disabled:opacity-30'

	return (
		<section className='flex flex-col gap-2.5'>
			<div className='mx-1 flex items-center justify-between gap-3'>
				<h2 className='truncate text-[13px] font-medium tracking-wide text-section-title uppercase'>
					{title}
				</h2>
				<div className='flex items-center gap-2'>
					<span className='text-[13px] text-hint'>{wishes.length}</span>
					{/* С мышью колесо листает страницу, а не ряд — стрелки только там, где нет пальца */}
					{!(edges.start && edges.end) && (
						<div className='hidden gap-1 pointer-fine:flex'>
							<button
								aria-label='Листать назад'
								disabled={edges.start}
								onClick={() => scrollBy(-1)}
								className={arrow}
							>
								<ChevronIcon className='size-4.5 rotate-180' />
							</button>
							<button
								aria-label='Листать вперёд'
								disabled={edges.end}
								onClick={() => scrollBy(1)}
								className={arrow}
							>
								<ChevronIcon className='size-4.5' />
							</button>
						</div>
					)}
				</div>
			</div>
			<div
				ref={trackRef}
				onScroll={updateEdges}
				className='-mx-4 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
			>
				{sorted.map(w => (
					<WishCard
						key={w.id}
						wish={w}
						timeZone={timeZone}
						onOpen={() => onOpen(w.id)}
					/>
				))}
			</div>
		</section>
	)
}

function WishCard({
	wish,
	timeZone,
	onOpen
}: {
	wish: WishItem
	timeZone: string
	onOpen: () => void
}) {
	return (
		<button
			onClick={onOpen}
			className='flex w-34.5 shrink-0 snap-start flex-col gap-1.5 text-left'
		>
			{/* Фото — absolute: в потоке вертикальное фото растягивало бы квадрат (min-height: auto у aspect-ratio) */}
			<span className='relative block aspect-square w-full'>
				{wish.has_photo ? (
					<WishPhoto
						wish={wish}
						className='absolute inset-0 size-full rounded-[18px] object-cover'
					/>
				) : (
					<span className='glass absolute inset-0 flex items-center justify-center rounded-[18px] text-hint'>
						<GiftIcon className='size-8' />
					</span>
				)}
				<CardBadge wish={wish} timeZone={timeZone} />
				{wish.reserved_by_me && wish.received_at === null && (
					<span className='absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-gift text-on-gift'>
						<LockIcon className='size-3.5' />
						<span className='sr-only'>Дарите вы</span>
					</span>
				)}
			</span>
			<span className='line-clamp-2 px-0.5 text-sm leading-snug font-semibold wrap-anywhere'>
				{wish.title}
			</span>
		</button>
	)
}

/** Плашка на фото: цена, а у исполненного — когда получено. Бронь не сбрасывается при получении: так партнёр видит свой подарок */
function CardBadge({ wish, timeZone }: { wish: WishItem; timeZone: string }) {
	const chip =
		'glass absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 truncate rounded-full px-2 py-1 text-xs'

	if (wish.received_at !== null) {
		return wish.reserved_by_me ? (
			<span className={`${chip} font-semibold text-gift`}>
				<HeartIcon className='size-3.5 shrink-0' />
				Вы подарили
			</span>
		) : (
			<span className={`${chip} font-medium`}>
				{formatShortDay(wish.received_at, timeZone)}
			</span>
		)
	}
	return wish.price !== null ? (
		<span className={`${chip} font-bold`}>{formatPrice(wish.price)}</span>
	) : null
}

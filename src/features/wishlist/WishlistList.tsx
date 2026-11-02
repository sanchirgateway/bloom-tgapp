import { hapticFeedback } from '@tma.js/sdk-react'
import type { WishItem, WishOwner } from '../../shared/api/types'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import { GiftIcon, HeartIcon, LockIcon } from '../../shared/ui/icons'
import { EmptyState, SkeletonRows } from '../../shared/ui/Section'
import { plural } from '../dates/format'
import { formatPrice, formatShortDay } from '../flowers/format'
import { useMe, usePartnerName } from '../user/api'
import { PairInvite } from '../user/PairInvite'
import { useWishes } from './api'
import { linkHost, type WishTab } from './format'

const isActive = (wish: WishItem) => wish.received_at === null

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
		<div className='flex flex-col gap-2.5'>
			<p className='mx-1 text-sm font-medium text-section-title'>
				{summary(active, partnerName)}
			</p>
			{active.map(w => (
				<WishTag
					key={w.id}
					wish={w}
					timeZone={timeZone}
					onOpen={() => onOpen(w.id)}
				/>
			))}
		</div>
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
		<section key={group.title} className='flex flex-col gap-2.5'>
			<h2 className='mx-4 text-[13px] font-medium tracking-wide text-section-title uppercase'>
				{group.title}
			</h2>
			{group.items.map(w => (
				<WishTag
					key={w.id}
					wish={w}
					timeZone={timeZone}
					onOpen={() => onOpen(w.id)}
				/>
			))}
		</section>
	))
}

function WishTag({
	wish,
	timeZone,
	onOpen
}: {
	wish: WishItem
	timeZone: string
	onOpen: () => void
}) {
	const subtitle = wish.url ? linkHost(wish.url) : wish.note

	return (
		<button
			onClick={onOpen}
			className='wish-tag glass flex min-h-21 w-full items-stretch overflow-hidden rounded-[18px] text-left'
		>
			<span className='flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 pl-3.5'>
				<span
					aria-hidden='true'
					className='size-3 shrink-0 rounded-full border-2 border-perforation'
				/>
				<span className='flex min-w-0 flex-col gap-0.5'>
					<span className='line-clamp-2 leading-snug font-semibold wrap-anywhere'>
						{wish.title}
					</span>
					{subtitle && (
						<span className='truncate text-[13px] text-hint'>{subtitle}</span>
					)}
				</span>
			</span>
			<WishStub wish={wish} timeZone={timeZone} />
		</button>
	)
}

/** Корешок бирки — состояние желания. Бронь не сбрасывается при получении: так партнёр видит свой подарок */
function WishStub({ wish, timeZone }: { wish: WishItem; timeZone: string }) {
	const stub =
		'flex w-24 shrink-0 flex-col items-center justify-center gap-1 p-2 text-center'
	const perforated = `${stub} border-l-2 border-dashed border-perforation`
	const price = wish.price !== null ? formatPrice(wish.price) : null

	if (wish.received_at !== null) {
		return wish.reserved_by_me ? (
			<span className={`${perforated} text-gift`}>
				<HeartIcon className='size-4' />
				<span className='text-xs font-semibold'>Вы подарили</span>
			</span>
		) : (
			<span className={`${perforated} text-hint`}>
				<span className='text-xs'>Получено</span>
				<span className='text-[13px] leading-tight font-semibold'>
					{formatShortDay(wish.received_at, timeZone)}
				</span>
			</span>
		)
	}
	if (wish.reserved_by_me) {
		return (
			<span className={`${stub} bg-gift text-on-gift`}>
				<LockIcon className='size-4' />
				<span className='text-xs font-semibold'>Дарите вы</span>
				{price && <span className='text-xs'>{price}</span>}
			</span>
		)
	}
	return price ? (
		<span className={`${perforated} text-[15px] font-bold`}>{price}</span>
	) : (
		<span className={`${perforated} text-[13px] leading-tight text-hint`}>
			Цена не указана
		</span>
	)
}

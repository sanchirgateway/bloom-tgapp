import { useState, type ReactNode } from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import type { DateItem, User } from '../../shared/api/types'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import {
	CalendarIcon,
	ChevronIcon,
	HeartIcon,
	MailIcon,
	StarIcon
} from '../../shared/ui/icons'
import { EmptyState, Section, SkeletonRows } from '../../shared/ui/Section'
import { usePendingReviews } from '../reviews/api'
import { useMe } from '../user/api'
import { useDates, useRespondDate } from './api'
import {
	cancelledByText,
	dateLeaf,
	formatDateTime,
	formatTime,
	monthKey,
	monthTitle,
	partnerOf,
	relativeDay,
	statusText,
	statusTone
} from './format'

type Tab = 'upcoming' | 'all'

export function DatesList({
	onOpen,
	onCreate,
	onReview
}: {
	onOpen: (id: string) => void
	onCreate: () => void
	onReview: (id: string) => void
}) {
	const [tab, setTab] = useState<Tab>('upcoming')
	const { data: me } = useMe()
	const { data, isPending, error, refetch } = useDates(tab === 'upcoming')
	const { data: pending = [] } = usePendingReviews()
	// Приглашения и шапка — из предстоящих при любой вкладке
	const { data: upcoming = [] } = useDates(true)
	const respond = useRespondDate()

	// Бэк сортирует по возрастанию; во «Все» удобнее видеть свежие сверху
	const dates = tab === 'all' ? data?.toReversed() : data
	// Ответить может только приглашённый — свои предложения остаются в общем списке
	const invites = upcoming.filter(
		d => d.status === 'proposed' && d.invitee.id === me?.id
	)
	const next = upcoming.find(
		d => d.status === 'planned' || d.status === 'proposed'
	)
	const partnerName = findPartnerName(me, [
		...upcoming,
		...(data ?? []),
		...pending
	])

	const onRespond = (id: string, accept: boolean) =>
		respond.mutate(
			{ id, accept },
			{
				onSuccess: () =>
					hapticFeedback.notificationOccurred.ifAvailable('success'),
				onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
			}
		)

	const onTab = (t: Tab) => {
		if (t === tab) return
		hapticFeedback.selectionChanged.ifAvailable()
		setTab(t)
	}

	return (
		<div className='flex flex-col gap-5 p-4'>
			<PairHeader
				me={me}
				partnerName={partnerName}
				next={
					next && `Ближайшее — ${relativeDay(next.starts_at, me?.timezone)}`
				}
			/>

			{(invites.length > 0 || pending.length > 0) && (
				<Section title='Нужно ваше действие'>
					{invites.map(d => (
						<InviteRow
							key={d.id}
							date={d}
							timeZone={me?.timezone}
							busy={respond.isPending && respond.variables?.id === d.id}
							onOpen={() => onOpen(d.id)}
							onRespond={accept => onRespond(d.id, accept)}
						/>
					))}
					{pending.map(d => (
						<button
							key={d.id}
							onClick={() => onReview(d.id)}
							className='flex w-full items-center gap-3 p-3.5 text-left'
						>
							<Tile className='bg-sky-500/15 text-sky-700 dark:text-sky-400'>
								<StarIcon className='size-5.5' />
							</Tile>
							<span className='flex min-w-0 flex-1 flex-col'>
								<span className='truncate font-semibold'>
									Как прошло «{d.title}»?
								</span>
								<span className='text-sm text-hint'>
									{formatDateTime(d.starts_at, me?.timezone)} · оставьте отзыв
								</span>
							</span>
							<ChevronIcon className='size-5 shrink-0 text-hint' />
						</button>
					))}
				</Section>
			)}

			{respond.error && (
				<p className='-mt-3 text-center text-sm text-danger'>
					{respond.error.message}
				</p>
			)}

			<div className='glass flex gap-1 rounded-xl p-0.75'>
				{(['upcoming', 'all'] as const).map(t => (
					<button
						key={t}
						onClick={() => onTab(t)}
						aria-pressed={tab === t}
						className={`min-h-9 flex-1 rounded-[10px] text-sm font-semibold transition-colors ${
							tab === t ? 'bg-accent text-on-accent shadow-sm' : 'text-hint'
						}`}
					>
						{t === 'upcoming' ? 'Предстоящие' : 'Все'}
					</button>
				))}
			</div>

			{isPending && <SkeletonRows />}

			{error && (
				<EmptyState
					icon={<CalendarIcon className='size-7' />}
					title='Не удалось загрузить свидания'
					text={error.message}
					action={
						<button
							onClick={() => refetch()}
							className='mt-1 min-h-11 px-4 font-medium text-link'
						>
							Повторить
						</button>
					}
				/>
			)}

			{dates?.length === 0 && (
				<EmptyState
					icon={<HeartIcon className='size-7' />}
					title={
						tab === 'upcoming'
							? 'Нет предстоящих свиданий'
							: 'Свиданий пока не было'
					}
					text={
						me?.partner_id !== null &&
						'Нажмите «Предложить свидание» внизу — партнёр получит приглашение в боте'
					}
				/>
			)}

			{dates &&
				groupByMonth(dates, me?.timezone).map(group => (
					<Section key={group.key} title={group.title}>
						{group.items.map(d => (
							<DateRow
								key={d.id}
								date={d}
								me={me}
								onOpen={() => onOpen(d.id)}
							/>
						))}
					</Section>
				))}

			<BottomButtons
				main={
					me?.partner_id != null
						? { text: 'Предложить свидание', onClick: onCreate }
						: null
				}
			/>
		</div>
	)
}

function PairHeader({
	me,
	partnerName,
	next
}: {
	me?: User
	partnerName: string | null
	next?: string
}) {
	if (!me) return <div className='h-11' />

	if (me.partner_id === null) {
		return (
			<div className='flex flex-col gap-1'>
				<h1 className='text-xl font-bold'>Пары пока нет</h1>
				<p className='text-sm text-hint'>
					Отправьте боту /pair и перешлите ссылку партнёру — после этого можно
					предлагать свидания
				</p>
			</div>
		)
	}

	return (
		<div className='flex items-center gap-3'>
			<div className='flex'>
				<Avatar name={me.first_name} className='bg-accent text-on-accent' />
				<Avatar
					name={partnerName ?? '♥'}
					className='-ml-2.5 bg-partner text-white ring-2 ring-page'
				/>
			</div>
			<div className='flex min-w-0 flex-col'>
				<h1 className='truncate text-xl font-bold'>
					{partnerName ? `Вы и ${partnerName}` : 'Вы и ваша пара'}
				</h1>
				<p className='text-[13px] text-hint'>
					{next ?? 'Запланированных свиданий нет'}
				</p>
			</div>
		</div>
	)
}

function Avatar({ name, className }: { name: string; className: string }) {
	return (
		<div
			aria-hidden='true'
			className={`flex size-11 items-center justify-center rounded-full text-base font-semibold ${className}`}
		>
			{name[0].toUpperCase()}
		</div>
	)
}

function InviteRow({
	date,
	timeZone,
	busy,
	onOpen,
	onRespond
}: {
	date: DateItem
	timeZone?: string
	busy: boolean
	onOpen: () => void
	onRespond: (accept: boolean) => void
}) {
	return (
		<div className='flex flex-col gap-3 p-3.5'>
			<button onClick={onOpen} className='flex items-center gap-3 text-left'>
				<Tile className='bg-amber-500/15 text-amber-700 dark:text-amber-400'>
					<MailIcon className='size-5.5' />
				</Tile>
				<span className='flex min-w-0 flex-1 flex-col'>
					<span className='text-[13px] text-hint'>
						{date.creator.first_name} приглашает
					</span>
					<span className='truncate font-semibold'>{date.title}</span>
					<span className='text-sm text-hint'>
						{formatDateTime(date.starts_at, timeZone)}
						{date.place && ` · ${date.place}`}
					</span>
				</span>
			</button>
			<div className='flex gap-2'>
				<button
					disabled={busy}
					onClick={() => onRespond(true)}
					className='min-h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-on-accent disabled:opacity-50'
				>
					Принять
				</button>
				<button
					disabled={busy}
					onClick={() => onRespond(false)}
					className='min-h-11 flex-1 rounded-xl bg-fill text-[15px] font-semibold text-danger disabled:opacity-50'
				>
					Отказаться
				</button>
			</div>
		</div>
	)
}

function DateRow({
	date,
	me,
	onOpen
}: {
	date: DateItem
	me?: User
	onOpen: () => void
}) {
	const leaf = dateLeaf(date.starts_at, me?.timezone)
	const tone = statusTone[date.status]
	const inactive = date.status === 'cancelled' || date.status === 'declined'

	return (
		<button
			onClick={onOpen}
			className='flex w-full items-center gap-3.5 p-3.5 text-left'
		>
			<span
				className={`flex w-12 shrink-0 flex-col items-center rounded-xl bg-fill py-1.5 ${inactive ? 'opacity-60' : ''}`}
			>
				<span className='text-xl leading-tight font-bold'>{leaf.day}</span>
				<span className='text-[11px] text-hint uppercase'>{leaf.weekday}</span>
			</span>
			<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<span
					className={`truncate font-semibold ${inactive ? 'text-hint line-through' : ''}`}
				>
					{date.title}
				</span>
				<span className='truncate text-sm text-hint'>
					{formatTime(date.starts_at, me?.timezone)}
					{date.place && ` · ${date.place}`}
				</span>
				<span className={`flex items-center gap-1.5 text-[13px] ${tone.text}`}>
					<span className={`size-1.75 shrink-0 rounded-full ${tone.dot}`} />
					{statusText(date, me?.id)}
				</span>
				{date.status === 'cancelled' && (
					<span className='line-clamp-1 text-[13px] text-hint'>
						{cancelledByText(date, me?.id)}
						{date.cancel_reason && `: ${date.cancel_reason}`}
					</span>
				)}
			</span>
			<ChevronIcon className='size-5 shrink-0 text-hint' />
		</button>
	)
}

function Tile({
	className,
	children
}: {
	className: string
	children: ReactNode
}) {
	return (
		<span
			className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${className}`}
		>
			{children}
		</span>
	)
}

/** Имени партнёра нет в профиле — берём из любого общего свидания */
function findPartnerName(me: User | undefined, dates: DateItem[]) {
	if (!me?.partner_id) return null
	for (const d of dates) {
		const p = partnerOf(d, me.id)
		if (p.id === me.partner_id) return p.first_name
	}
	return null
}

function groupByMonth(dates: DateItem[], timeZone?: string) {
	const groups: { key: string; title: string; items: DateItem[] }[] = []
	for (const d of dates) {
		const key = monthKey(d.starts_at, timeZone)
		const last = groups.at(-1)
		if (last?.key === key) last.items.push(d)
		else
			groups.push({
				key,
				title: monthTitle(d.starts_at, timeZone),
				items: [d]
			})
	}
	return groups
}

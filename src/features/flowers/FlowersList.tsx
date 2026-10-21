import { useState } from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import type { FlowerGift, User } from '../../shared/api/types'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import { Gallery } from '../../shared/ui/Gallery'
import {
	CameraIcon,
	ChevronIcon,
	FlowerIcon,
	GiftIcon
} from '../../shared/ui/icons'
import { EmptyState, Section, SkeletonRows } from '../../shared/ui/Section'
import { usePartnerName } from '../dates/api'
import { monthKey, monthTitle, plural } from '../dates/format'
import { useMe } from '../user/api'
import { useFlowerPhotos, useFlowers } from './api'
import { PhotoImg } from './PhotoImg'
import {
	OCCASIONS,
	REACTIONS,
	formatShortDay,
	giftTime,
	isGiven
} from './format'

type Tab = 'gifts' | 'photos'

export function FlowersList({
	onOpen,
	onCreate
}: {
	onOpen: (id: string) => void
	onCreate: () => void
}) {
	const { data: me } = useMe()
	const partnerName = usePartnerName()
	const { data, isPending, error, refetch } = useFlowers()
	const [tab, setTab] = useState<Tab>('gifts')

	// Невручённые видит только даритель — это всегда наши сюрпризы
	const surprises = data?.filter(g => !isGiven(g)) ?? []
	const given = data?.filter(isGiven) ?? []
	const fromMe = given.filter(g => g.giver_id === me?.id).length

	const onTab = (t: Tab) => {
		if (t === tab) return
		hapticFeedback.selectionChanged.ifAvailable()
		setTab(t)
	}

	return (
		<div className='flex flex-col gap-5 p-4'>
			<div className='flex flex-col gap-1'>
				<h1 className='text-[22px] font-bold'>Цветы</h1>
				{data && data.length > 0 && (
					<p className='text-sm text-hint'>
						Вы подарили {fromMe}{' '}
						{plural(fromMe, ['букет', 'букета', 'букетов'])} · вам —{' '}
						{given.length - fromMe}
					</p>
				)}
			</div>

			<div className='glass flex gap-1 rounded-xl p-0.75'>
				{(['gifts', 'photos'] as const).map(t => (
					<button
						key={t}
						onClick={() => onTab(t)}
						aria-pressed={tab === t}
						className={`min-h-9 min-w-0 flex-1 truncate rounded-[10px] px-2 text-sm font-semibold transition-colors ${
							tab === t ? 'bg-accent text-on-accent shadow-sm' : 'text-hint'
						}`}
					>
						{t === 'gifts' ? 'Букеты' : 'Мои фото'}
					</button>
				))}
			</div>

			{tab === 'photos' && <MyPhotos />}

			{tab === 'gifts' && isPending && <SkeletonRows />}

			{tab === 'gifts' && error && (
				<EmptyState
					icon={<FlowerIcon className='size-7' />}
					title='Не удалось загрузить букеты'
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

			{tab === 'gifts' && data?.length === 0 && (
				<EmptyState
					icon={<FlowerIcon className='size-7' />}
					title='Букетов пока нет'
					text={
						me?.partner_id != null &&
						'Запишите подаренный букет — партнёр получит фото в боте и сможет отреагировать'
					}
				/>
			)}

			{tab === 'gifts' && surprises.length > 0 && (
				<Section title='Ещё не вручены'>
					{surprises.map(g => (
						<FlowerRow
							key={g.id}
							gift={g}
							me={me}
							partnerName={partnerName}
							onOpen={() => onOpen(g.id)}
						/>
					))}
				</Section>
			)}

			{tab === 'gifts' &&
				groupByMonth(given, me?.timezone).map(group => (
					<Section key={group.key} title={group.title}>
						{group.items.map(g => (
							<FlowerRow
								key={g.id}
								gift={g}
								me={me}
								partnerName={partnerName}
								onOpen={() => onOpen(g.id)}
							/>
						))}
					</Section>
				))}

			<BottomButtons
				main={
					me?.partner_id != null
						? { text: 'Подарить цветы', onClick: onCreate }
						: null
				}
			/>
		</div>
	)
}

/** Свои фото из всех букетов — и подаренных, и полученных (например, букет в вазе). Свежие сверху */
function MyPhotos() {
	const { data: photos, isPending, error, refetch } = useFlowerPhotos('mine')
	const [opened, setOpened] = useState<number | null>(null)

	if (isPending) {
		return (
			<div className='grid grid-cols-3 gap-1.5'>
				{Array.from({ length: 6 }, (_, i) => (
					<div
						key={i}
						className='aspect-square animate-pulse rounded-lg bg-hint/15'
					/>
				))}
			</div>
		)
	}
	if (error) {
		return (
			<EmptyState
				icon={<CameraIcon className='size-7' />}
				title='Не удалось загрузить фото'
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
		)
	}
	if (photos.length === 0) {
		return (
			<EmptyState
				icon={<CameraIcon className='size-7' />}
				title='Фото пока нет'
				text='Здесь будут фото, которые вы прикладываете к букетам — и к подаренным, и к полученным'
			/>
		)
	}

	return (
		<>
			<div className='grid grid-cols-3 gap-1.5'>
				{photos.map((photo, i) => (
					<button
						key={photo.id}
						onClick={() => setOpened(i)}
						className='aspect-square'
					>
						<PhotoImg
							id={photo.id}
							className='size-full rounded-lg object-cover'
						/>
					</button>
				))}
			</div>

			{opened !== null && (
				<Gallery
					photos={photos}
					start={opened}
					title='Мои фото'
					renderPhoto={(photo, className) => (
						<PhotoImg id={photo.id} className={className} />
					)}
					onClose={() => setOpened(null)}
				/>
			)}
		</>
	)
}

function FlowerRow({
	gift,
	me,
	partnerName,
	onOpen
}: {
	gift: FlowerGift
	me?: User
	partnerName: string | null
	onOpen: () => void
}) {
	const mine = gift.giver_id === me?.id
	const given = isGiven(gift)
	const who = mine ? 'От вас' : `От ${partnerName ?? 'партнёра'}`

	return (
		<button
			onClick={onOpen}
			className='flex w-full items-center gap-3.5 p-3.5 text-left'
		>
			<span
				className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
					!given
						? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
						: mine
							? 'bg-accent/15 text-accent'
							: 'bg-partner/15 text-partner'
				}`}
			>
				{given ? (
					<FlowerIcon className='size-6' />
				) : (
					<GiftIcon className='size-6' />
				)}
			</span>
			<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<span className='truncate font-semibold'>{gift.flowers}</span>
				<span className='truncate text-sm text-hint'>
					{given
						? `${who} · ${formatShortDay(giftTime(gift), me?.timezone)}`
						: 'Сюрприз — партнёр пока не видит'}
				</span>
				{gift.occasion && (
					<span className='text-[13px] text-hint'>
						{OCCASIONS[gift.occasion]}
					</span>
				)}
			</span>
			{gift.reaction ? (
				<span
					role='img'
					aria-label='Реакция'
					className='shrink-0 text-2xl leading-none'
				>
					{REACTIONS[gift.reaction]}
				</span>
			) : (
				<ChevronIcon className='size-5 shrink-0 text-hint' />
			)}
		</button>
	)
}

function groupByMonth(gifts: FlowerGift[], timeZone?: string) {
	const groups: { key: string; title: string; items: FlowerGift[] }[] = []
	for (const g of gifts) {
		const iso = giftTime(g)
		const key = monthKey(iso, timeZone)
		const last = groups.at(-1)
		if (last?.key === key) last.items.push(g)
		else groups.push({ key, title: monthTitle(iso, timeZone), items: [g] })
	}
	return groups
}

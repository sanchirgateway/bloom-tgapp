import { useState, type ReactNode } from 'react'
import { hapticFeedback, openLink } from '@tma.js/sdk-react'
import type { DateItem } from '../../shared/api/types'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import {
	BanIcon,
	CalendarIcon,
	ChevronIcon,
	PinIcon,
	UserIcon
} from '../../shared/ui/icons'
import { EmptyState, Section, SkeletonRows } from '../../shared/ui/Section'
import { ReviewsSection } from '../reviews/ReviewsSection'
import { useMe } from '../user/api'
import { useCancelDate, useDate, useRespondDate } from './api'
import {
	CANCEL_REASON_MAX,
	canCancel,
	cancelledByText,
	dateLeaf,
	formatDateTime,
	formatDay,
	formatTime,
	partnerOf,
	relativeDay,
	statusText,
	statusTone
} from './format'

export function DateDetails({
	id,
	onReview
}: {
	id: string
	onReview: () => void
}) {
	const { data: me } = useMe()
	const { data: date, isPending, error } = useDate(id)
	const respond = useRespondDate()

	if (isPending) {
		return (
			<div className='flex flex-col gap-5 p-4'>
				<div className='mx-auto my-2 size-18 animate-pulse rounded-2xl bg-hint/15' />
				<SkeletonRows count={3} />
			</div>
		)
	}
	if (error) {
		return (
			<EmptyState
				icon={<CalendarIcon className='size-7' />}
				title='Не удалось открыть свидание'
				text={error.message}
			/>
		)
	}

	const tz = me?.timezone
	const partner = partnerOf(date, me?.id)
	const leaf = dateLeaf(date.starts_at, tz)
	const tone = statusTone[date.status]
	// Ответить на приглашение может только приглашённый
	const canRespond = date.status === 'proposed' && date.invitee.id === me?.id
	const iCreated = date.creator.id === me?.id

	const onRespond = (accept: boolean) =>
		respond.mutate(
			{ id: date.id, accept },
			{
				onSuccess: () =>
					hapticFeedback.notificationOccurred.ifAvailable('success'),
				onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
			}
		)
	const answering = respond.isPending ? respond.variables?.accept : undefined

	return (
		<div className='flex flex-col gap-5 p-4'>
			<header className='flex flex-col items-center gap-2.5 py-2 text-center'>
				<div className='flex w-18 flex-col items-center overflow-hidden glass rounded-2xl shadow-sm'>
					<span className='w-full bg-accent py-0.5 text-xs font-semibold text-on-accent uppercase'>
						{leaf.month}
					</span>
					<span className='pt-1 pb-1.5 text-3xl leading-tight font-bold'>
						{leaf.day}
					</span>
				</div>
				<h1 className='text-[22px] leading-tight font-bold'>{date.title}</h1>
				<span
					className={`inline-flex items-center gap-1.5 glass rounded-full px-2.5 py-1 text-[13px] font-medium ${tone.text}`}
				>
					<span className={`size-1.75 rounded-full ${tone.dot}`} />
					{statusText(date, me?.id)}
				</span>
			</header>

			<Section>
				<Row
					icon={<CalendarIcon />}
					title={
						<>
							<span className='first-letter:uppercase'>
								{formatDay(date.starts_at, tz)}
							</span>
							, {formatTime(date.starts_at, tz)}
							{date.ends_at && `–${formatTime(date.ends_at, tz)}`}
						</>
					}
					subtitle={relativeDay(date.starts_at, tz)}
				/>
				{(date.place || date.address) && (
					<button onClick={() => openMap(date)} className='w-full text-left'>
						<Row
							icon={<PinIcon />}
							title={date.place ?? date.address}
							subtitle={
								<span className='text-link'>
									{date.place && date.address && `${date.address} · `}
									открыть на карте
								</span>
							}
							chevron
						/>
					</button>
				)}
				<Row
					icon={<UserIcon />}
					title={
						<>
							{partner.first_name}
							{partner.username && (
								<span className='text-hint'> @{partner.username}</span>
							)}
						</>
					}
					subtitle={
						iCreated
							? `Вы предложили ${relativeDay(date.created_at, tz)}`
							: `Предложил(а) ${relativeDay(date.created_at, tz)}`
					}
				/>
			</Section>

			{date.status === 'cancelled' && (
				<Section title='Отмена'>
					<div className='flex flex-col gap-1 p-3.5'>
						<p className='flex items-center gap-2 font-semibold'>
							<BanIcon className='size-5 text-danger' />
							{cancelledByText(date, me?.id)}
							{date.cancelled_at &&
								` · ${formatDateTime(date.cancelled_at, tz)}`}
						</p>
						{date.cancel_reason && (
							<p className='whitespace-pre-line'>{date.cancel_reason}</p>
						)}
					</div>
				</Section>
			)}

			{date.description && (
				<Section title='Описание'>
					<p className='p-3.5 leading-relaxed whitespace-pre-line'>
						{date.description}
					</p>
				</Section>
			)}

			{respond.error && (
				<p className='text-center text-sm text-danger'>
					{respond.error.message}
				</p>
			)}

			{/* Приглашённый на предложенное отвечает «Отказаться», а не отменой */}
			{canCancel(date) && !canRespond && <CancelDate date={date} />}

			{/* Отзывы бывают только у состоявшихся свиданий; их кнопку ставит ReviewsSection */}
			{date.status === 'done' && (
				<ReviewsSection date={date} onWrite={onReview} />
			)}

			{canRespond && (
				<BottomButtons
					main={{
						text: 'Принять',
						onClick: () => onRespond(true),
						loading: answering === true,
						disabled: answering === false
					}}
					secondary={{
						text: 'Отказаться',
						destructive: true,
						onClick: () => onRespond(false),
						loading: answering === false,
						disabled: answering === true
					}}
				/>
			)}
		</div>
	)
}

function Row({
	icon,
	title,
	subtitle,
	chevron
}: {
	icon: ReactNode
	title: ReactNode
	subtitle?: ReactNode
	chevron?: boolean
}) {
	return (
		<div className='flex min-h-14 items-center gap-3.5 px-3.5 py-2.5'>
			<span className='shrink-0 text-hint'>{icon}</span>
			<span className='flex min-w-0 flex-1 flex-col'>
				<span>{title}</span>
				{subtitle && <span className='text-[13px] text-hint'>{subtitle}</span>}
			</span>
			{chevron && <ChevronIcon className='size-5 shrink-0 text-hint' />}
		</div>
	)
}

function openMap(date: DateItem) {
	const query = [date.place, date.address].filter(Boolean).join(', ')
	const url = `https://yandex.ru/maps/?text=${encodeURIComponent(query)}`
	if (!openLink.ifAvailable(url).ok) window.open(url, '_blank')
}

function CancelDate({ date }: { date: DateItem }) {
	const cancel = useCancelDate()
	const [open, setOpen] = useState(false)
	const [reason, setReason] = useState('')

	if (!open) {
		return (
			<Section>
				<button
					onClick={() => setOpen(true)}
					className='flex min-h-12 w-full items-center gap-3.5 px-3.5 font-medium text-danger'
				>
					<BanIcon />
					Отменить свидание
				</button>
			</Section>
		)
	}

	const onConfirm = () =>
		cancel.mutate(
			{ id: date.id, reason: reason.trim() },
			{
				onSuccess: () =>
					hapticFeedback.notificationOccurred.ifAvailable('success'),
				onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
			}
		)

	return (
		<Section title='Почему отменяете?'>
			<div className='flex flex-col gap-3 p-3.5'>
				<textarea
					autoFocus
					rows={3}
					maxLength={CANCEL_REASON_MAX}
					value={reason}
					onChange={e => setReason(e.target.value)}
					placeholder='Партнёр увидит причину в боте'
					className='w-full resize-none rounded-xl bg-fill px-3 py-2.5 outline-none placeholder:text-hint focus:ring-2 focus:ring-accent'
				/>
				{cancel.error && (
					<p className='text-center text-sm text-danger'>
						{cancel.error.message}
					</p>
				)}
				<div className='flex gap-2'>
					<button
						disabled={cancel.isPending}
						onClick={() => setOpen(false)}
						className='min-h-11 flex-1 rounded-xl bg-fill text-[15px] font-semibold disabled:opacity-50'
					>
						Не отменять
					</button>
					<button
						disabled={cancel.isPending || !reason.trim()}
						onClick={onConfirm}
						className='min-h-11 flex-1 rounded-xl bg-fill text-[15px] font-semibold text-danger disabled:opacity-50'
					>
						{cancel.isPending ? 'Отменяем…' : 'Отменить'}
					</button>
				</div>
			</div>
		</Section>
	)
}

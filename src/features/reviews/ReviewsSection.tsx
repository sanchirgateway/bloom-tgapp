import { useState } from 'react'
import type { DateItem, Review, ReviewPhoto } from '../../shared/api/types'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import { LockIcon, StarIcon } from '../../shared/ui/icons'
import { SkeletonRows } from '../../shared/ui/Section'
import { formatDateTime } from '../dates/format'
import { useMe } from '../user/api'
import { useDateReviews, usePhotoUrl } from './api'

const LONG_TEXT = 300

export function ReviewsSection({
	date,
	onWrite
}: {
	date: DateItem
	onWrite: () => void
}) {
	const { data: me } = useMe()
	const { data, isPending, error } = useDateReviews(date.id, true)

	if (isPending) {
		return <SkeletonRows count={2} />
	}
	if (error) {
		return <p className='text-center text-sm text-danger'>{error.message}</p>
	}

	const partner = date.creator.id === me?.id ? date.invitee : date.creator
	const nameOf = (authorId: number) =>
		authorId === me?.id ? 'Ваш отзыв' : partner.first_name
	const revealAt = formatDateTime(data.reveal_at, me?.timezone)

	const mine = data.reviews.some(r => r.author_id === me?.id)
	const partnerWrote = [...data.reviews, ...data.locked].some(
		r => r.author_id === partner.id
	)
	// Свой написан, партнёр — ещё нет: он увидит наш отзыв, когда напишет свой
	const waitingPartner =
		mine && !partnerWrote && new Date() < new Date(data.reveal_at)

	return (
		<section className='flex flex-col gap-3'>
			<h2 className='mx-4 text-[13px] font-medium tracking-wide text-section-title uppercase'>
				Отзывы
			</h2>

			{data.reviews.length === 0 &&
				data.locked.length === 0 &&
				!data.can_review && (
					<p className='rounded-2xl bg-card p-3.5 text-sm text-hint'>
						Отзывов пока нет
					</p>
				)}

			{data.reviews.map(review => (
				<ReviewCard
					key={review.id}
					author={nameOf(review.author_id)}
					review={review}
				/>
			))}

			{data.locked.map(locked => (
				<div
					key={locked.author_id}
					className='flex gap-3 rounded-2xl bg-card p-3.5 text-sm'
				>
					<LockIcon className='size-5 shrink-0 text-hint' />
					<div>
						<p className='font-semibold'>{nameOf(locked.author_id)}</p>
						<p className='mt-0.5 text-hint'>
							Отзыв оставлен. Напишите свой — и отзывы откроются вам обоим.
							Иначе откроется {revealAt}
						</p>
					</div>
				</div>
			))}

			{waitingPartner && (
				<p className='flex gap-2 px-1 text-sm text-hint'>
					<LockIcon className='size-4 shrink-0 translate-y-0.5' />
					{partner.first_name} увидит ваш отзыв, когда напишет свой (или{' '}
					{revealAt})
				</p>
			)}

			<BottomButtons
				main={
					data.can_review ? { text: 'Оставить отзыв', onClick: onWrite } : null
				}
			/>
		</section>
	)
}

function ReviewCard({ author, review }: { author: string; review: Review }) {
	const [opened, setOpened] = useState<ReviewPhoto | null>(null)
	const fields = [
		['Понравилось', review.liked],
		['Не понравилось', review.disliked],
		['Еда и напитки', review.food],
		['Впечатления', review.comment]
	] as const

	return (
		<div className='flex flex-col gap-2.5 rounded-2xl bg-card p-3.5 text-sm'>
			<div className='flex items-center justify-between'>
				<span className='font-semibold'>{author}</span>
				<span
					role='img'
					aria-label={`${review.rating} из 5`}
					className='flex gap-0.5'
				>
					{[1, 2, 3, 4, 5].map(n => (
						<StarIcon
							key={n}
							filled={n <= review.rating}
							className={`size-4 ${n <= review.rating ? 'text-amber-500' : 'text-hint/40'}`}
						/>
					))}
				</span>
			</div>

			{fields.map(
				([label, text]) =>
					text && <LongText key={label} label={label} text={text} />
			)}

			{review.photos.length > 0 && (
				<div className='grid grid-cols-4 gap-2'>
					{review.photos.map(photo => (
						<button
							key={photo.id}
							onClick={() => setOpened(photo)}
							className='aspect-square'
						>
							<PhotoImg
								id={photo.id}
								className='size-full rounded-lg object-cover'
							/>
						</button>
					))}
				</div>
			)}

			{opened && (
				<button
					aria-label='Закрыть'
					onClick={() => setOpened(null)}
					className='fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4'
				>
					<PhotoImg
						id={opened.id}
						className='max-h-full max-w-full object-contain'
					/>
				</button>
			)}
		</div>
	)
}

function LongText({ label, text }: { label: string; text: string }) {
	const [expanded, setExpanded] = useState(false)
	const isLong = text.length > LONG_TEXT

	return (
		<div>
			<p className='text-hint'>{label}</p>
			<p className='whitespace-pre-line'>
				{isLong && !expanded ? `${text.slice(0, LONG_TEXT)}…` : text}
			</p>
			{isLong && (
				<button
					onClick={() => setExpanded(v => !v)}
					className='min-h-8 text-link'
				>
					{expanded ? 'Свернуть' : 'Читать полностью'}
				</button>
			)}
		</div>
	)
}

function PhotoImg({ id, className }: { id: string; className: string }) {
	const url = usePhotoUrl(id)
	return url ? (
		<img src={url} alt='' className={className} />
	) : (
		<div className={`${className} animate-pulse bg-hint/20`} />
	)
}

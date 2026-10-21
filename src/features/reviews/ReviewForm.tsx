import {
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type ReactNode,
	type SubmitEvent
} from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import { compressImage } from '../../shared/lib/image'
import { useNoVerticalSwipe } from '../../shared/lib/swipe'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import { CloseIcon, PlusIcon, StarIcon } from '../../shared/ui/icons'
import { useDate } from '../dates/api'
import { useCreateReview } from './api'

// Столько влезает в один альбом Telegram — то же ограничение на бэке
const MAX_PHOTOS = 10
// Лимит бэка на каждое текстовое поле
const MAX_TEXT = 2000

const inputClass =
	'w-full resize-none glass rounded-xl px-3.5 py-3 outline-none placeholder:text-hint focus:ring-2 focus:ring-accent'

interface Photo {
	blob: Blob
	url: string
}

export function ReviewForm({
	dateId,
	onDone
}: {
	dateId: string
	onDone: () => void
}) {
	const { data: date } = useDate(dateId)
	const create = useCreateReview(dateId)
	// Отправка — нативной кнопкой Telegram, она вне формы
	const formRef = useRef<HTMLFormElement>(null)
	useNoVerticalSwipe()

	const [rating, setRating] = useState(0)
	const [liked, setLiked] = useState('')
	const [disliked, setDisliked] = useState('')
	const [food, setFood] = useState('')
	const [comment, setComment] = useState('')
	const [photos, setPhotos] = useState<Photo[]>([])
	const [processing, setProcessing] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)

	// Превью живут как blob: URL — освобождаем при уходе с экрана
	const photosRef = useRef(photos)
	useEffect(() => {
		photosRef.current = photos
	}, [photos])
	useEffect(
		() => () => photosRef.current.forEach(p => URL.revokeObjectURL(p.url)),
		[]
	)

	const onPickPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
		const files = [...(e.target.files ?? [])]
		e.target.value = '' // чтобы можно было выбрать те же файлы ещё раз
		const free = MAX_PHOTOS - photos.length
		if (files.length > free) {
			setFormError(`Можно прикрепить не больше ${MAX_PHOTOS} фото`)
		}

		setProcessing(true)
		try {
			const added = await Promise.all(
				files.slice(0, free).map(async file => {
					const blob = await compressImage(file)
					return { blob, url: URL.createObjectURL(blob) }
				})
			)
			setPhotos(prev => [...prev, ...added])
		} catch {
			setFormError('Не удалось обработать фото')
		} finally {
			setProcessing(false)
		}
	}

	const removePhoto = (url: string) => {
		URL.revokeObjectURL(url)
		setPhotos(prev => prev.filter(p => p.url !== url))
	}

	const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!rating) return setFormError('Поставьте оценку')
		setFormError(null)

		create.mutate(
			{
				rating,
				liked: liked.trim() || undefined,
				disliked: disliked.trim() || undefined,
				food: food.trim() || undefined,
				comment: comment.trim() || undefined,
				photos: photos.map(p => p.blob)
			},
			{
				onSuccess: () => {
					hapticFeedback.notificationOccurred.ifAvailable('success')
					onDone()
				},
				onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
			}
		)
	}

	const errorText = formError ?? create.error?.message

	return (
		<form ref={formRef} onSubmit={onSubmit} className='flex flex-col gap-4 p-4'>
			<div>
				<h1 className='text-[22px] font-bold'>Отзыв о свидании</h1>
				{date && <p className='text-sm text-hint'>{date.title}</p>}
			</div>

			<Field label='Оценка'>
				<div className='flex justify-between glass rounded-2xl px-3 py-1.5'>
					{[1, 2, 3, 4, 5].map(n => (
						<button
							key={n}
							type='button'
							aria-label={`${n} из 5`}
							aria-pressed={n === rating}
							onClick={() => {
								hapticFeedback.selectionChanged.ifAvailable()
								setRating(n)
							}}
							className={`flex size-12 items-center justify-center transition-transform active:scale-90 ${
								n <= rating ? 'text-amber-500' : 'text-hint/40'
							}`}
						>
							<StarIcon filled={n <= rating} className='size-8' />
						</button>
					))}
				</div>
			</Field>

			<Field label='Что понравилось'>
				<textarea
					rows={2}
					maxLength={MAX_TEXT}
					value={liked}
					onChange={e => setLiked(e.target.value)}
					placeholder='Необязательно'
					className={inputClass}
				/>
			</Field>

			<Field label='Что не понравилось'>
				<textarea
					rows={2}
					maxLength={MAX_TEXT}
					value={disliked}
					onChange={e => setDisliked(e.target.value)}
					placeholder='Необязательно'
					className={inputClass}
				/>
			</Field>

			<Field label='Еда и напитки'>
				<textarea
					rows={2}
					maxLength={MAX_TEXT}
					value={food}
					onChange={e => setFood(e.target.value)}
					placeholder='Необязательно'
					className={inputClass}
				/>
			</Field>

			<Field label='Общие впечатления'>
				<textarea
					rows={3}
					maxLength={MAX_TEXT}
					value={comment}
					onChange={e => setComment(e.target.value)}
					placeholder='Необязательно'
					className={inputClass}
				/>
			</Field>

			<Field label={`Фото · ${photos.length}/${MAX_PHOTOS}`}>
				<div className='grid grid-cols-4 gap-2'>
					{photos.map(p => (
						<div key={p.url} className='relative aspect-square'>
							<img
								src={p.url}
								alt=''
								className='size-full rounded-lg object-cover'
							/>
							<button
								type='button'
								aria-label='Убрать фото'
								onClick={() => removePhoto(p.url)}
								className='absolute top-0 right-0 flex size-9 items-center justify-center'
							>
								<span className='flex size-6 items-center justify-center rounded-full bg-black/60 text-white'>
									<CloseIcon className='size-3.5' />
								</span>
							</button>
						</div>
					))}
					{photos.length < MAX_PHOTOS && (
						<label className='flex aspect-square cursor-pointer items-center justify-center glass rounded-lg text-hint'>
							{processing ? (
								<span className='size-6 animate-spin rounded-full border-2 border-hint/30 border-t-hint' />
							) : (
								<PlusIcon className='size-7' />
							)}
							<input
								type='file'
								accept='image/*'
								multiple
								disabled={processing}
								onChange={onPickPhotos}
								className='hidden'
							/>
						</label>
					)}
				</div>
			</Field>

			{errorText && (
				<p className='text-center text-sm text-danger'>{errorText}</p>
			)}

			<BottomButtons
				main={{
					text: 'Оставить отзыв',
					loading: create.isPending,
					disabled: processing,
					onClick: () => formRef.current?.requestSubmit()
				}}
			/>
		</form>
	)
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className='flex flex-col gap-1.5'>
			<span className='px-1 text-[13px] font-medium tracking-wide text-section-title uppercase'>
				{label}
			</span>
			{children}
		</div>
	)
}

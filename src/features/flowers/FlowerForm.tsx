import {
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type ReactNode,
	type SubmitEvent
} from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import type { FlowerOccasion } from '../../shared/api/types'
import { compressImage } from '../../shared/lib/image'
import { useNoVerticalSwipe } from '../../shared/lib/swipe'
import {
	isoToWallClock,
	maskDate,
	parseDateTime,
	wallClockToIso
} from '../../shared/lib/time'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import {
	CloseIcon,
	FlowerIcon,
	PlusIcon,
	UserIcon
} from '../../shared/ui/icons'
import { EmptyState, SkeletonRows } from '../../shared/ui/Section'
import { useMe } from '../user/api'
import { useCreateFlowers } from './api'
import {
	FLOWERS_MAX,
	MAX_FLOWER_PHOTOS,
	OCCASIONS,
	PRICE_MAX,
	TEXT_MAX
} from './format'

const inputClass =
	'min-h-12 w-full glass rounded-xl px-3.5 py-3 outline-none placeholder:text-hint focus:ring-2 focus:ring-accent'

/** Когда вручили; surprise — ещё нет, партнёр запись не увидит до «Вручено» */
type When = 'today' | 'yesterday' | 'other' | 'surprise'

const WHEN: Record<When, string> = {
	today: 'Сегодня',
	yesterday: 'Вчера',
	other: 'Другой день',
	surprise: 'Ещё не вручили'
}

interface Photo {
	blob: Blob
	url: string
}

export function FlowerForm({ onCreated }: { onCreated: (id: string) => void }) {
	const { data: me, isPending, error } = useMe()
	const create = useCreateFlowers()
	// Отправка — нативной кнопкой Telegram, она вне формы
	const formRef = useRef<HTMLFormElement>(null)
	useNoVerticalSwipe()

	const [flowers, setFlowers] = useState('')
	const [occasion, setOccasion] = useState<FlowerOccasion | null>(null)
	const [when, setWhen] = useState<When>('today')
	// Как вводит человек: "18.10.2026"
	const [day, setDay] = useState('')
	const [comment, setComment] = useState('')
	const [price, setPrice] = useState('')
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

	if (isPending) {
		return (
			<div className='p-4'>
				<SkeletonRows count={4} />
			</div>
		)
	}
	if (error) {
		return (
			<EmptyState
				icon={<FlowerIcon className='size-7' />}
				title='Не удалось загрузить профиль'
				text={error.message}
			/>
		)
	}
	if (me.partner_id === null) {
		return (
			<EmptyState
				icon={<UserIcon className='size-7' />}
				title='Сначала добавьте пару'
				text='Отправьте боту /pair и перешлите ссылку партнёру'
			/>
		)
	}

	const tz = me.timezone

	const onPickPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
		const files = [...(e.target.files ?? [])]
		e.target.value = '' // чтобы можно было выбрать те же файлы ещё раз
		const free = MAX_FLOWER_PHOTOS - photos.length
		if (files.length > free) {
			setFormError(`Можно прикрепить не больше ${MAX_FLOWER_PHOTOS} фото`)
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

	/** given_at для бэка; null — ошибка уже показана */
	const givenAt = (): string | undefined | null => {
		const now = Date.now()
		switch (when) {
			case 'surprise':
				return undefined
			case 'today':
				return new Date(now).toISOString()
			case 'yesterday':
				return new Date(now - 86_400_000).toISOString()
			case 'other': {
				const wallClock = parseDateTime(day, '12:00')
				if (!wallClock) {
					setFormError('Проверьте дату: ДД.ММ.ГГГГ')
					return null
				}
				// День — в поясе пользователя; сегодняшний «полдень» может быть ещё впереди
				const today = isoToWallClock(new Date(now), tz).slice(0, 10)
				if (wallClock.slice(0, 10) === today) return new Date(now).toISOString()
				const iso = wallClockToIso(wallClock, tz)
				// Та же проверка, что на бэке, — чтобы не ждать ответа сервера
				if (new Date(iso).getTime() > now) {
					setFormError('Нельзя отметить вручение в будущем')
					return null
				}
				return iso
			}
		}
	}

	const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		setFormError(null)

		const given_at = givenAt()
		if (given_at === null) return

		create.mutate(
			{
				flowers: flowers.trim(),
				occasion: occasion ?? undefined,
				comment: comment.trim() || undefined,
				price: price ? Number(price) : undefined,
				given_at,
				photos: photos.map(p => p.blob)
			},
			{
				onSuccess: gift => {
					hapticFeedback.notificationOccurred.ifAvailable('success')
					onCreated(gift.id)
				},
				onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
			}
		)
	}

	const errorText = formError ?? create.error?.message

	return (
		<form ref={formRef} onSubmit={onSubmit} className='flex flex-col gap-4 p-4'>
			<h1 className='text-[22px] font-bold'>Подарить цветы</h1>

			<Field label='Какие цветы'>
				<input
					required
					maxLength={FLOWERS_MAX}
					value={flowers}
					onChange={e => setFlowers(e.target.value)}
					placeholder='15 белых роз'
					className={inputClass}
				/>
			</Field>

			<Field label='Повод'>
				<Chips
					options={OCCASIONS}
					value={occasion}
					// Повторное нажатие снимает выбор — повод необязателен
					onChange={o => setOccasion(o === occasion ? null : o)}
				/>
			</Field>

			<Field label='Когда вручили'>
				<Chips options={WHEN} value={when} onChange={setWhen} />
				{when === 'other' && (
					<input
						required
						inputMode='numeric'
						autoComplete='off'
						placeholder='ДД.ММ.ГГГГ'
						value={day}
						onChange={e => setDay(maskDate(e.target.value))}
						className={inputClass}
					/>
				)}
				{when === 'surprise' && (
					<p className='px-1 text-xs text-hint'>
						Партнёр не увидит запись, пока вы не нажмёте «Вручено» в карточке
						букета
					</p>
				)}
			</Field>

			<Field label='Комментарий'>
				<textarea
					rows={3}
					maxLength={TEXT_MAX}
					value={comment}
					onChange={e => setComment(e.target.value)}
					placeholder='Необязательно'
					className={`${inputClass} resize-none`}
				/>
			</Field>

			<Field label='Цена, ₽'>
				<input
					inputMode='numeric'
					autoComplete='off'
					value={price}
					onChange={e => {
						const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
						setPrice(digits && String(Math.min(Number(digits), PRICE_MAX)))
					}}
					placeholder='Необязательно'
					className={inputClass}
				/>
				<p className='px-1 text-xs text-hint'>Цену видите только вы</p>
			</Field>

			<Field label={`Фото · ${photos.length}/${MAX_FLOWER_PHOTOS}`}>
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
					{photos.length < MAX_FLOWER_PHOTOS && (
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
					text: when === 'surprise' ? 'Сохранить сюрприз' : 'Подарить',
					loading: create.isPending,
					disabled: processing,
					// requestSubmit — с проверкой required, как у обычной кнопки submit
					onClick: () => formRef.current?.requestSubmit()
				}}
			/>
		</form>
	)
}

function Chips<T extends string>({
	options,
	value,
	onChange
}: {
	options: Record<T, string>
	value: T | null
	onChange: (value: T) => void
}) {
	return (
		<div className='flex flex-wrap gap-2'>
			{(Object.entries(options) as [T, string][]).map(([key, label]) => (
				<button
					key={key}
					type='button'
					aria-pressed={key === value}
					onClick={() => {
						hapticFeedback.selectionChanged.ifAvailable()
						onChange(key)
					}}
					className={`min-h-9 rounded-full px-3.5 text-sm font-medium transition-colors ${
						key === value ? 'bg-accent text-on-accent' : 'glass'
					}`}
				>
					{label}
				</button>
			))}
		</div>
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

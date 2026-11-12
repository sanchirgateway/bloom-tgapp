import {
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type ReactNode,
	type SubmitEvent
} from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import type { WishItem } from '../../shared/api/types'
import { compressImage } from '../../shared/lib/image'
import { useNoVerticalSwipe } from '../../shared/lib/swipe'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import { CloseIcon, GiftIcon, PlusIcon } from '../../shared/ui/icons'
import { EmptyState, SkeletonRows } from '../../shared/ui/Section'
import {
	useCreateWish,
	useDeleteWishPhoto,
	useSetWishPhoto,
	useUpdateWish,
	useWish
} from './api'
import { PRICE_MAX, TEXT_MAX, TITLE_MAX, URL_MAX, isValidUrl } from './format'
import { WishPhoto } from './WishPhoto'

const inputClass =
	'min-h-12 w-full glass rounded-xl px-3.5 py-3 outline-none placeholder:text-hint focus:ring-2 focus:ring-accent'

const haptic = {
	onSuccess: () => hapticFeedback.notificationOccurred.ifAvailable('success'),
	onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
}

export function NewWishForm({ onSaved }: { onSaved: () => void }) {
	return <WishFields onSaved={onSaved} />
}

export function EditWishForm({
	id,
	onSaved
}: {
	id: string
	onSaved: () => void
}) {
	const { data: wish, isPending, error } = useWish(id)

	if (error) {
		return (
			<EmptyState
				icon={<GiftIcon className='size-7' />}
				title='Не удалось открыть желание'
				text={error.message}
			/>
		)
	}
	if (isPending) {
		return (
			<div className='p-4'>
				<SkeletonRows count={4} />
			</div>
		)
	}
	return <WishFields wish={wish} onSaved={onSaved} />
}

function WishFields({
	wish,
	onSaved
}: {
	wish?: WishItem
	onSaved: () => void
}) {
	const create = useCreateWish()
	const update = useUpdateWish()
	const setPhoto = useSetWishPhoto()
	const deletePhoto = useDeleteWishPhoto()
	// Отправка — нативной кнопкой Telegram, она вне формы
	const formRef = useRef<HTMLFormElement>(null)
	useNoVerticalSwipe()

	const [title, setTitle] = useState(wish?.title ?? '')
	const [url, setUrl] = useState(wish?.url ?? '')
	const [price, setPrice] = useState(wish?.price?.toString() ?? '')
	const [note, setNote] = useState(wish?.note ?? '')
	// Новое фото (ещё не загружено) и «убрать текущее»
	const [photo, setPhotoFile] = useState<{ blob: Blob; url: string } | null>(
		null
	)
	const [removePhoto, setRemovePhoto] = useState(false)
	const [processing, setProcessing] = useState(false)
	const [saving, setSaving] = useState(false)
	// Желание создано, а фото не загрузилось: повторная отправка не должна создать дубль
	const [created, setCreated] = useState<WishItem | null>(null)
	const [formError, setFormError] = useState<string | null>(null)

	// Превью живёт как blob: URL — освобождаем при замене и уходе с экрана
	useEffect(
		() => () => {
			if (photo) URL.revokeObjectURL(photo.url)
		},
		[photo]
	)

	const onPickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		e.target.value = ''
		if (!file) return
		setFormError(null)
		setProcessing(true)
		try {
			const blob = await compressImage(file)
			setPhotoFile({ blob, url: URL.createObjectURL(blob) })
			setRemovePhoto(false)
		} catch {
			setFormError('Не удалось открыть фото — выберите JPEG или PNG')
		} finally {
			setProcessing(false)
		}
	}

	const clearPhoto = () => {
		setPhotoFile(null)
		setRemovePhoto(true)
	}

	const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (saving) return
		setFormError(null)

		const fields = { title: title.trim(), url: url.trim(), note: note.trim() }
		if (!fields.title) {
			setFormError('Напишите, что хотите получить')
			return
		}
		if (fields.url && !isValidUrl(fields.url)) {
			setFormError('Ссылка должна начинаться с http:// или https://')
			return
		}

		setSaving(true)
		let createdNow: WishItem | null = null
		try {
			const existing = wish ?? created
			let saved: WishItem
			if (existing) {
				// Пустые значения стирают поле: без них бэк оставил бы старое
				saved = await update.mutateAsync({
					id: existing.id,
					...fields,
					price: price ? Number(price) : null
				})
			} else {
				saved = createdNow = await create.mutateAsync({
					title: fields.title,
					url: fields.url || undefined,
					note: fields.note || undefined,
					price: price ? Number(price) : undefined
				})
				setCreated(saved)
			}

			// Фото — отдельной ручкой: POST /wishlist его не принимает
			if (photo) {
				await setPhoto.mutateAsync({ id: saved.id, photo: photo.blob })
			} else if (removePhoto && saved.has_photo) {
				await deletePhoto.mutateAsync(saved.id)
			}

			haptic.onSuccess()
			onSaved()
		} catch (err) {
			haptic.onError()
			const message =
				err instanceof Error ? err.message : 'Не удалось сохранить'
			setFormError(
				createdNow
					? `Желание добавлено, но фото не загрузилось: ${message}`
					: message
			)
		} finally {
			setSaving(false)
		}
	}

	const showCurrent = wish?.has_photo && !removePhoto && !photo

	return (
		<form ref={formRef} onSubmit={onSubmit} className='flex flex-col gap-4 p-4'>
			<h1 className='text-[22px] font-bold'>
				{wish ? 'Изменить желание' : 'Новое желание'}
			</h1>

			<Field label='Что хотите получить'>
				<input
					required
					maxLength={TITLE_MAX}
					value={title}
					onChange={e => setTitle(e.target.value)}
					placeholder='Плёночный фотоаппарат'
					className={inputClass}
				/>
			</Field>

			<Field label='Примерная цена, ₽'>
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
			</Field>

			<Field label='Ссылка'>
				<input
					inputMode='url'
					autoComplete='off'
					autoCapitalize='none'
					maxLength={URL_MAX}
					value={url}
					onChange={e => setUrl(e.target.value)}
					placeholder='https://…'
					className={inputClass}
				/>
			</Field>

			<Field label='Комментарий'>
				<textarea
					rows={3}
					maxLength={TEXT_MAX}
					value={note}
					onChange={e => setNote(e.target.value)}
					placeholder='Размер, цвет, где купить'
					className={`${inputClass} resize-none`}
				/>
			</Field>

			<Field label='Фото'>
				{photo || showCurrent ? (
					<div className='relative w-32'>
						{photo ? (
							<img
								src={photo.url}
								alt=''
								className='aspect-square w-full rounded-xl object-cover'
							/>
						) : (
							<WishPhoto
								wish={wish!}
								className='aspect-square w-full rounded-xl object-cover'
							/>
						)}
						<button
							type='button'
							aria-label='Убрать фото'
							onClick={clearPhoto}
							className='absolute top-0 right-0 flex size-9 items-center justify-center'
						>
							<span className='flex size-6 items-center justify-center rounded-full bg-black/60 text-white'>
								<CloseIcon className='size-3.5' />
							</span>
						</button>
					</div>
				) : (
					<label className='glass flex aspect-square w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-hint'>
						{processing ? (
							<span className='size-6 animate-spin rounded-full border-2 border-hint/30 border-t-hint' />
						) : (
							<>
								<PlusIcon className='size-7' />
								<span className='text-xs'>Картинка товара</span>
							</>
						)}
						<input
							type='file'
							accept='image/*'
							disabled={processing}
							onChange={onPickPhoto}
							className='hidden'
						/>
					</label>
				)}
			</Field>

			{!wish && (
				<p className='px-1 text-xs text-hint'>
					Партнёр получит уведомление и сможет тайно забронировать подарок
				</p>
			)}

			{formError && (
				<p className='text-center text-sm text-danger'>{formError}</p>
			)}

			<BottomButtons
				main={{
					text: wish ? 'Сохранить' : 'Добавить',
					loading: saving || processing,
					// requestSubmit — с проверкой required, как у обычной кнопки submit
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

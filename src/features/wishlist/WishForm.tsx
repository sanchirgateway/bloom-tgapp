import { useRef, useState, type ReactNode, type SubmitEvent } from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import type { WishItem } from '../../shared/api/types'
import { useNoVerticalSwipe } from '../../shared/lib/swipe'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import { GiftIcon } from '../../shared/ui/icons'
import { EmptyState, SkeletonRows } from '../../shared/ui/Section'
import { useCreateWish, useUpdateWish, useWish } from './api'
import { PRICE_MAX, TEXT_MAX, TITLE_MAX, URL_MAX, isValidUrl } from './format'

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
	const mutation = wish ? update : create
	// Отправка — нативной кнопкой Telegram, она вне формы
	const formRef = useRef<HTMLFormElement>(null)
	useNoVerticalSwipe()

	const [title, setTitle] = useState(wish?.title ?? '')
	const [url, setUrl] = useState(wish?.url ?? '')
	const [price, setPrice] = useState(wish?.price?.toString() ?? '')
	const [note, setNote] = useState(wish?.note ?? '')
	const [formError, setFormError] = useState<string | null>(null)

	const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
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

		const options = {
			onSuccess: () => {
				haptic.onSuccess()
				onSaved()
			},
			onError: haptic.onError
		}
		if (wish) {
			// Пустые значения стирают поле: без них бэк оставил бы старое
			update.mutate(
				{ id: wish.id, ...fields, price: price ? Number(price) : null },
				options
			)
		} else {
			create.mutate(
				{
					title: fields.title,
					url: fields.url || undefined,
					note: fields.note || undefined,
					price: price ? Number(price) : undefined
				},
				options
			)
		}
	}

	const errorText = formError ?? mutation.error?.message

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

			{!wish && (
				<p className='px-1 text-xs text-hint'>
					Партнёр получит уведомление и сможет тайно забронировать подарок
				</p>
			)}

			{errorText && (
				<p className='text-center text-sm text-danger'>{errorText}</p>
			)}

			<BottomButtons
				main={{
					text: wish ? 'Сохранить' : 'Добавить',
					loading: mutation.isPending,
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

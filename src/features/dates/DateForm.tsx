import { useRef, useState, type SubmitEvent, type ReactNode } from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import { useNoVerticalSwipe } from '../../shared/lib/swipe'
import {
	maskDate,
	maskTime,
	parseDateTime,
	wallClockToIso
} from '../../shared/lib/time'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import { HeartIcon, UserIcon } from '../../shared/ui/icons'
import { EmptyState, SkeletonRows } from '../../shared/ui/Section'
import { useMe } from '../user/api'
import { useCreateDate } from './api'

const inputClass =
	'min-h-12 w-full rounded-xl bg-card px-3.5 py-3 outline-none placeholder:text-hint focus:ring-2 focus:ring-accent'

export function DateForm({ onCreated }: { onCreated: (id: string) => void }) {
	const { data: me, isPending, error } = useMe()
	const create = useCreateDate()
	// Отправка — нативной кнопкой Telegram, она вне формы
	const formRef = useRef<HTMLFormElement>(null)
	useNoVerticalSwipe()

	const [title, setTitle] = useState('')
	// Как вводит человек: "18.10.2026" и "19:30"
	const [date, setDate] = useState('')
	const [time, setTime] = useState('')
	const [place, setPlace] = useState('')
	const [address, setAddress] = useState('')
	const [description, setDescription] = useState('')
	const [formError, setFormError] = useState<string | null>(null)

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
				icon={<HeartIcon className='size-7' />}
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

	const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		setFormError(null)

		const wallClock = parseDateTime(date, time)
		if (!wallClock) {
			return setFormError('Проверьте дату и время: ДД.ММ.ГГГГ и ЧЧ:ММ')
		}
		const startsIso = wallClockToIso(wallClock, tz)
		// Та же проверка, что на бэке, — чтобы не ждать ответа сервера
		if (new Date(startsIso) <= new Date()) {
			return setFormError('Нельзя назначить свидание в прошлом')
		}

		create.mutate(
			{
				title: title.trim(),
				starts_at: startsIso,
				place: place.trim() || null,
				address: address.trim() || null,
				description: description.trim() || null
			},
			{
				onSuccess: date => {
					hapticFeedback.notificationOccurred.ifAvailable('success')
					onCreated(date.id)
				},
				onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
			}
		)
	}

	const errorText = formError ?? create.error?.message

	return (
		<form ref={formRef} onSubmit={onSubmit} className='flex flex-col gap-4 p-4'>
			<h1 className='text-[22px] font-bold'>Новое свидание</h1>

			<Field label='Название'>
				<input
					required
					maxLength={200}
					value={title}
					onChange={e => setTitle(e.target.value)}
					placeholder='Ужин в итальянском ресторане'
					className={inputClass}
				/>
			</Field>

			<div className='flex gap-3'>
				<Field label='Дата'>
					<input
						required
						inputMode='numeric'
						autoComplete='off'
						enterKeyHint='next'
						placeholder='ДД.ММ.ГГГГ'
						value={date}
						onChange={e => setDate(maskDate(e.target.value))}
						className={inputClass}
					/>
				</Field>
				<Field label='Время' className='w-28 shrink-0'>
					<input
						required
						inputMode='numeric'
						autoComplete='off'
						enterKeyHint='next'
						placeholder='ЧЧ:ММ'
						value={time}
						onChange={e => setTime(maskTime(e.target.value))}
						className={inputClass}
					/>
				</Field>
			</div>
			<p className='-mt-2 px-1 text-xs text-hint'>Часовой пояс: {tz}</p>

			<Field label='Место'>
				<input
					maxLength={200}
					value={place}
					onChange={e => setPlace(e.target.value)}
					placeholder='Необязательно'
					className={inputClass}
				/>
			</Field>

			<Field label='Адрес'>
				<input
					maxLength={300}
					value={address}
					onChange={e => setAddress(e.target.value)}
					placeholder='Необязательно'
					className={inputClass}
				/>
			</Field>

			<Field label='Описание'>
				<textarea
					rows={3}
					value={description}
					onChange={e => setDescription(e.target.value)}
					placeholder='Необязательно'
					className={`${inputClass} resize-none`}
				/>
			</Field>

			{errorText && (
				<p className='text-center text-sm text-danger'>{errorText}</p>
			)}

			<BottomButtons
				main={{
					text: 'Предложить свидание',
					loading: create.isPending,
					// requestSubmit — с проверкой required, как у обычной кнопки submit
					onClick: () => formRef.current?.requestSubmit()
				}}
			/>
		</form>
	)
}

function Field({
	label,
	children,
	className = ''
}: {
	label: string
	children: ReactNode
	className?: string
}) {
	return (
		<label className={`flex min-w-0 flex-1 flex-col gap-1.5 ${className}`}>
			<span className='px-1 text-[13px] font-medium tracking-wide text-section-title uppercase'>
				{label}
			</span>
			{children}
		</label>
	)
}

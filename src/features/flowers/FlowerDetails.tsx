import { useState, type ChangeEvent, type ReactNode } from 'react'
import { hapticFeedback } from '@tma.js/sdk-react'
import type {
	FlowerGift,
	FlowerPhoto,
	FlowerReaction
} from '../../shared/api/types'
import { compressImage } from '../../shared/lib/image'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import {
	CalendarIcon,
	CameraIcon,
	ChevronIcon,
	FlowerIcon,
	GiftIcon,
	HeartIcon,
	TrashIcon
} from '../../shared/ui/icons'
import { Gallery } from '../../shared/ui/Gallery'
import { EmptyState, Section, SkeletonRows } from '../../shared/ui/Section'
import { useDate, usePartnerName } from '../dates/api'
import { formatDay, relativeDay } from '../dates/format'
import { useMe } from '../user/api'
import {
	useAddFlowerPhotos,
	useDeleteFlowers,
	useFlower,
	useGiveFlowers,
	useReactFlowers
} from './api'
import { PhotoImg } from './PhotoImg'
import {
	MAX_FLOWER_PHOTOS,
	OCCASIONS,
	REACTIONS,
	formatPrice,
	isGiven
} from './format'

const haptic = {
	onSuccess: () => hapticFeedback.notificationOccurred.ifAvailable('success'),
	onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
}

export function FlowerDetails({
	id,
	onOpenDate,
	onDeleted
}: {
	id: string
	onOpenDate: (id: string) => void
	onDeleted: () => void
}) {
	const { data: me } = useMe()
	const partnerName = usePartnerName() ?? 'Партнёр'
	const { data: gift, isPending, error } = useFlower(id)
	const give = useGiveFlowers()

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
				icon={<FlowerIcon className='size-7' />}
				title='Не удалось открыть букет'
				text={error.message}
			/>
		)
	}

	const tz = me?.timezone
	const mine = gift.giver_id === me?.id
	const given = isGiven(gift)
	const myPhotos = gift.photos.filter(p => p.author_id === me?.id)
	const partnerPhotos = gift.photos.filter(p => p.author_id !== me?.id)

	return (
		<div className='flex flex-col gap-5 p-4'>
			<header className='flex flex-col items-center gap-2.5 py-2 text-center'>
				<div
					className={`flex size-18 items-center justify-center rounded-2xl ${
						!given
							? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
							: mine
								? 'bg-accent/15 text-accent'
								: 'bg-partner/15 text-partner'
					}`}
				>
					{given ? (
						<FlowerIcon className='size-9' />
					) : (
						<GiftIcon className='size-9' />
					)}
				</div>
				<h1 className='text-[22px] leading-tight font-bold'>{gift.flowers}</h1>
				<span className='glass rounded-full px-2.5 py-1 text-[13px] font-medium'>
					{mine ? `Вы → ${partnerName}` : `${partnerName} → вам`}
					{gift.occasion && ` · ${OCCASIONS[gift.occasion]}`}
				</span>
			</header>

			<Section>
				<Row
					icon={<CalendarIcon />}
					title={
						given ? (
							<span className='first-letter:uppercase'>
								{formatDay(gift.given_at!, tz)}
							</span>
						) : (
							'Ещё не вручён'
						)
					}
					subtitle={
						given
							? `Вручили ${relativeDay(gift.given_at!, tz)}`
							: `${partnerName} не увидит запись, пока вы не отметите вручение`
					}
				/>
				{gift.price !== null && (
					<Row
						icon={
							<span className='flex size-5 items-center justify-center font-semibold'>
								₽
							</span>
						}
						title={formatPrice(gift.price)}
						subtitle='Видите только вы'
					/>
				)}
				{gift.date_id && (
					<LinkedDate
						id={gift.date_id}
						onOpen={() => onOpenDate(gift.date_id!)}
					/>
				)}
			</Section>

			{gift.comment && (
				<Section title='Комментарий'>
					<p className='p-3.5 leading-relaxed whitespace-pre-line'>
						{gift.comment}
					</p>
				</Section>
			)}

			{given && (
				<ReactionSection gift={gift} mine={mine} partnerName={partnerName} />
			)}

			<Album
				title={mine ? 'Ваши фото' : `Фото от ${partnerName}`}
				photos={mine ? myPhotos : partnerPhotos}
			/>
			<Album
				title={mine ? `Фото от ${partnerName}` : 'Ваши фото'}
				photos={mine ? partnerPhotos : myPhotos}
			/>

			<AddPhotos
				gift={gift}
				left={MAX_FLOWER_PHOTOS - myPhotos.length}
				// Получателю — например, букет в вазе
				label={mine ? 'Добавить фото' : 'Прислать фото в вазе'}
			/>

			{mine && <DeleteGift id={gift.id} onDeleted={onDeleted} />}

			{give.error && (
				<p className='text-center text-sm text-danger'>{give.error.message}</p>
			)}

			{mine && !given && (
				<BottomButtons
					main={{
						text: 'Вручено!',
						loading: give.isPending,
						onClick: () => give.mutate(gift.id, haptic)
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

function LinkedDate({ id, onOpen }: { id: string; onOpen: () => void }) {
	const { data: date } = useDate(id)
	return (
		<button onClick={onOpen} className='w-full text-left'>
			<Row
				icon={<HeartIcon />}
				title={date?.title ?? 'Свидание'}
				subtitle='Подарено на свидании'
				chevron
			/>
		</button>
	)
}

function ReactionSection({
	gift,
	mine,
	partnerName
}: {
	gift: FlowerGift
	mine: boolean
	partnerName: string
}) {
	const react = useReactFlowers()
	// Пока запрос идёт — сразу подсвечиваем выбранную
	const current =
		(react.isPending ? react.variables?.reaction : undefined) ?? gift.reaction

	if (mine) {
		return (
			<Section title='Реакция'>
				<p className='flex min-h-14 items-center gap-3 p-3.5'>
					{gift.reaction ? (
						<>
							<span className='text-3xl leading-none'>
								{REACTIONS[gift.reaction]}
							</span>
							{partnerName} так отреагировал(а)
						</>
					) : (
						<span className='text-hint'>
							{partnerName} ещё не отреагировал(а)
						</span>
					)}
				</p>
			</Section>
		)
	}

	return (
		<Section title='Ваша реакция'>
			<div className='flex justify-between px-3 py-2'>
				{(Object.entries(REACTIONS) as [FlowerReaction, string][]).map(
					([reaction, emoji]) => (
						<button
							key={reaction}
							aria-pressed={reaction === current}
							disabled={react.isPending}
							onClick={() => {
								hapticFeedback.selectionChanged.ifAvailable()
								react.mutate({ id: gift.id, reaction }, haptic)
							}}
							className={`flex size-14 items-center justify-center rounded-2xl text-3xl transition-transform active:scale-90 ${
								reaction === current
									? 'bg-accent/20'
									: current
										? 'opacity-40'
										: ''
							}`}
						>
							{emoji}
						</button>
					)
				)}
			</div>
			{react.error && (
				<p className='p-3.5 text-center text-sm text-danger'>
					{react.error.message}
				</p>
			)}
		</Section>
	)
}

function Album({ title, photos }: { title: string; photos: FlowerPhoto[] }) {
	const [opened, setOpened] = useState<number | null>(null)
	if (photos.length === 0) return null

	return (
		<Section title={title}>
			<div className='grid grid-cols-4 gap-2 p-2'>
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
					title={title}
					renderPhoto={(photo, className) => (
						<PhotoImg id={photo.id} className={className} />
					)}
					onClose={() => setOpened(null)}
				/>
			)}
		</Section>
	)
}

/** Фото уходят сразу после выбора — второму участнику они приходят в Telegram */
function AddPhotos({
	gift,
	left,
	label
}: {
	gift: FlowerGift
	left: number
	label: string
}) {
	const add = useAddFlowerPhotos()
	const [processing, setProcessing] = useState(false)
	const [pickError, setPickError] = useState<string | null>(null)

	if (left <= 0) return null

	const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
		const files = [...(e.target.files ?? [])]
		e.target.value = '' // чтобы можно было выбрать те же файлы ещё раз
		if (files.length === 0) return
		setPickError(files.length > left ? `Можно добавить ещё ${left} фото` : null)

		setProcessing(true)
		try {
			const photos = await Promise.all(files.slice(0, left).map(compressImage))
			add.mutate({ id: gift.id, photos }, haptic)
		} catch {
			setPickError('Не удалось обработать фото')
		} finally {
			setProcessing(false)
		}
	}

	const busy = processing || add.isPending
	const errorText = pickError ?? add.error?.message

	return (
		<Section>
			<label
				className={`flex min-h-12 w-full cursor-pointer items-center gap-3.5 px-3.5 font-medium text-accent ${busy ? 'opacity-50' : ''}`}
			>
				{busy ? (
					<span className='size-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent' />
				) : (
					<CameraIcon />
				)}
				{busy ? 'Загружаем…' : label}
				<input
					type='file'
					accept='image/*'
					multiple
					disabled={busy}
					onChange={onPick}
					className='hidden'
				/>
			</label>
			{errorText && (
				<p className='p-3.5 text-center text-sm text-danger'>{errorText}</p>
			)}
		</Section>
	)
}

function DeleteGift({ id, onDeleted }: { id: string; onDeleted: () => void }) {
	const remove = useDeleteFlowers()
	const [confirm, setConfirm] = useState(false)

	if (!confirm) {
		return (
			<Section>
				<button
					onClick={() => setConfirm(true)}
					className='flex min-h-12 w-full items-center gap-3.5 px-3.5 font-medium text-danger'
				>
					<TrashIcon />
					Удалить запись
				</button>
			</Section>
		)
	}

	return (
		<Section title='Удалить букет вместе с фото?'>
			<div className='flex flex-col gap-3 p-3.5'>
				{remove.error && (
					<p className='text-center text-sm text-danger'>
						{remove.error.message}
					</p>
				)}
				<div className='flex gap-2'>
					<button
						disabled={remove.isPending}
						onClick={() => setConfirm(false)}
						className='min-h-11 flex-1 rounded-xl bg-fill text-[15px] font-semibold disabled:opacity-50'
					>
						Оставить
					</button>
					<button
						disabled={remove.isPending}
						onClick={() =>
							remove.mutate(id, {
								onSuccess: () => {
									haptic.onSuccess()
									onDeleted()
								},
								onError: haptic.onError
							})
						}
						className='min-h-11 flex-1 rounded-xl bg-fill text-[15px] font-semibold text-danger disabled:opacity-50'
					>
						{remove.isPending ? 'Удаляем…' : 'Удалить'}
					</button>
				</div>
			</div>
		</Section>
	)
}

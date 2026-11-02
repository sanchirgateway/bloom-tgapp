import { useState, type ReactNode } from 'react'
import { hapticFeedback, openLink } from '@tma.js/sdk-react'
import { BottomButtons } from '../../shared/ui/BottomButtons'
import {
	ChevronIcon,
	GiftIcon,
	HeartIcon,
	LinkIcon,
	LockIcon,
	PencilIcon,
	TrashIcon
} from '../../shared/ui/icons'
import { EmptyState, Section, SkeletonRows } from '../../shared/ui/Section'
import { formatPrice, formatShortDay } from '../flowers/format'
import { useMe, usePartnerName } from '../user/api'
import { useDeleteWish, useReceiveWish, useReserveWish, useWish } from './api'
import { linkHost } from './format'

const haptic = {
	onSuccess: () => hapticFeedback.notificationOccurred.ifAvailable('success'),
	onError: () => hapticFeedback.notificationOccurred.ifAvailable('error')
}

export function WishDetails({
	id,
	onEdit,
	onDeleted
}: {
	id: string
	onEdit: () => void
	onDeleted: () => void
}) {
	const { data: me } = useMe()
	const partnerName = usePartnerName() ?? 'партнёр'
	const { data: wish, isPending, error } = useWish(id)
	const receive = useReceiveWish()
	const reserve = useReserveWish()

	if (error) {
		return (
			<EmptyState
				icon={<GiftIcon className='size-7' />}
				title='Не удалось открыть желание'
				text={error.message}
			/>
		)
	}
	// Без me нельзя понять, чьё желание, — и какую кнопку показать
	if (isPending || !me) {
		return (
			<div className='flex flex-col gap-5 p-4'>
				<div className='h-44 animate-pulse rounded-3xl bg-hint/15' />
				<SkeletonRows count={2} />
			</div>
		)
	}

	const mine = wish.owner_id === me.id
	const received = wish.received_at !== null
	const reserved = wish.reserved_by_me && !received
	const actionError = receive.error ?? reserve.error
	// Цена — на полосе бирки, пока полоса не занята бронью или датой получения
	const priceInRow = wish.price !== null && (reserved || received)

	const main = mine
		? {
				text: received ? 'Снова хочу' : 'Уже получил(а)',
				loading: receive.isPending,
				onClick: () => receive.mutate({ id, received: !received }, haptic)
			}
		: received || reserved
			? null
			: {
					text: 'Подарю я',
					loading: reserve.isPending,
					onClick: () => reserve.mutate({ id, reserve: true }, haptic)
				}
	// Снять бронь — не главное действие на экране
	const secondary = reserved
		? {
				text: 'Снять бронь',
				loading: reserve.isPending,
				onClick: () => reserve.mutate({ id, reserve: false }, haptic)
			}
		: null

	return (
		<div className='flex flex-col gap-4 p-4'>
			<section className='wish-ticket glass mt-2 flex flex-col overflow-hidden rounded-3xl'>
				<div className='flex flex-col items-center gap-3 px-5 pt-6 pb-5 text-center'>
					<span
						aria-hidden='true'
						className='size-4.5 rounded-full border-3 border-perforation'
					/>
					<h1 className='text-[26px] leading-tight font-bold wrap-anywhere'>
						{wish.title}
					</h1>
					<p className='text-sm text-hint'>
						{mine ? 'Ваше желание' : `Хочет ${partnerName}`}
					</p>
				</div>
				<TicketBand
					price={wish.price}
					reserved={reserved}
					receivedOn={
						wish.received_at && formatShortDay(wish.received_at, me.timezone)
					}
					gifted={wish.reserved_by_me}
				/>
			</section>

			{(priceInRow || wish.url) && (
				<Section>
					{priceInRow && (
						<Row
							icon={
								<span className='flex size-5 items-center justify-center font-semibold'>
									₽
								</span>
							}
							title={formatPrice(wish.price!)}
							subtitle='Примерная цена'
						/>
					)}
					{wish.url && (
						<button
							onClick={() => openUrl(wish.url!)}
							className='w-full text-left'
						>
							<Row
								icon={<LinkIcon />}
								title={linkHost(wish.url)}
								subtitle='Открыть ссылку'
								chevron
							/>
						</button>
					)}
				</Section>
			)}

			{wish.note && (
				<Section title='Комментарий'>
					<p className='p-3.5 leading-relaxed wrap-anywhere whitespace-pre-line'>
						{wish.note}
					</p>
				</Section>
			)}

			{!mine && !received && !reserved && (
				<Section>
					<Row
						icon={<LockIcon />}
						title='Бронь тайная'
						subtitle={`${partnerName} не увидит, что вы это забронировали`}
					/>
				</Section>
			)}

			{mine && (
				<Section>
					<button
						onClick={onEdit}
						className='flex min-h-12 w-full items-center gap-3.5 px-3.5 font-medium text-accent'
					>
						<PencilIcon />
						Изменить
					</button>
				</Section>
			)}

			{mine && <DeleteWish id={id} onDeleted={onDeleted} />}

			{actionError && (
				<p className='text-center text-sm text-danger'>{actionError.message}</p>
			)}

			<BottomButtons main={main} secondary={secondary} />
		</div>
	)
}

/** Нижняя полоса бирки — состояние желания. Бронь не сбрасывается при получении: так партнёр видит свой подарок */
function TicketBand({
	price,
	reserved,
	receivedOn,
	gifted
}: {
	price: number | null
	reserved: boolean
	receivedOn: string | null
	gifted: boolean
}) {
	const band = 'flex h-18 items-center justify-center gap-2 px-5 text-center'
	const perforated = `${band} border-t-2 border-dashed border-perforation`

	if (reserved) {
		return (
			<div className={`${band} bg-gift font-semibold text-on-gift`}>
				<LockIcon className='size-4.5' />
				Дарите вы, это секрет
			</div>
		)
	}
	if (receivedOn) {
		return gifted ? (
			<div className={`${perforated} font-semibold text-gift`}>
				<HeartIcon className='size-4.5' />
				Вы подарили {receivedOn}
			</div>
		) : (
			<div className={`${perforated} font-semibold text-hint`}>
				Получено {receivedOn}
			</div>
		)
	}
	return price !== null ? (
		<div className={`${perforated} text-xl font-bold`}>
			{formatPrice(price)}
		</div>
	) : (
		<div className={`${perforated} text-sm text-hint`}>Цена не указана</div>
	)
}

function openUrl(url: string) {
	if (!openLink.ifAvailable(url).ok) window.open(url, '_blank')
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
				<span className='truncate'>{title}</span>
				{subtitle && <span className='text-[13px] text-hint'>{subtitle}</span>}
			</span>
			{chevron && <ChevronIcon className='size-5 shrink-0 text-hint' />}
		</div>
	)
}

function DeleteWish({ id, onDeleted }: { id: string; onDeleted: () => void }) {
	const remove = useDeleteWish()
	const [confirm, setConfirm] = useState(false)

	if (!confirm) {
		return (
			<Section>
				<button
					onClick={() => setConfirm(true)}
					className='flex min-h-12 w-full items-center gap-3.5 px-3.5 font-medium text-danger'
				>
					<TrashIcon />
					Удалить желание
				</button>
			</Section>
		)
	}

	return (
		<Section title='Удалить желание?'>
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

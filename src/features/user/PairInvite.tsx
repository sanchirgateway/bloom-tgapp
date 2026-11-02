import { useState } from 'react'
import {
	copyTextToClipboard,
	hapticFeedback,
	shareURL
} from '@tma.js/sdk-react'
import { usePair } from './api'

const SHARE_TEXT = 'Давай вести наши свидания вместе в Bloomy 💐'

/** Приглашение в пару: партнёр открывает ссылку и жмёт «Старт» в боте */
export function PairInvite({ title = 'Пары пока нет' }: { title?: string }) {
	const { data: pair, error, refetch } = usePair()
	const [copied, setCopied] = useState(false)
	const link = pair?.invite_link

	const onShare = () => {
		if (!link) return
		hapticFeedback.impactOccurred.ifAvailable('light')
		// Вне Telegram — нативный шаринг или копирование
		if (shareURL.ifAvailable(link, SHARE_TEXT).ok) return
		if (navigator.share) {
			navigator.share({ url: link, text: SHARE_TEXT }).catch(() => {})
		} else onCopy()
	}

	const onCopy = () => {
		if (!link) return
		copyTextToClipboard(link)
			.then(() => {
				hapticFeedback.notificationOccurred.ifAvailable('success')
				setCopied(true)
				setTimeout(() => setCopied(false), 2000)
			})
			.catch(() => hapticFeedback.notificationOccurred.ifAvailable('error'))
	}

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex flex-col gap-1'>
				<h1 className='text-xl font-bold'>{title}</h1>
				<p className='text-sm text-hint'>
					Отправьте ссылку партнёру: когда партнёр нажмёт «Старт» в боте, можно
					будет предлагать свидания
				</p>
			</div>

			{error ? (
				<p className='text-sm text-danger'>
					{error.message}{' '}
					<button onClick={() => refetch()} className='font-medium text-link'>
						Повторить
					</button>
				</p>
			) : (
				<div className='flex gap-2'>
					<button
						disabled={!link}
						onClick={onShare}
						className='min-h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-on-accent disabled:opacity-50'
					>
						Пригласить
					</button>
					<button
						disabled={!link}
						onClick={onCopy}
						className='glass min-h-11 flex-1 rounded-xl text-[15px] font-semibold text-link disabled:opacity-50'
					>
						{copied ? 'Скопировано' : 'Скопировать ссылку'}
					</button>
				</div>
			)}
		</div>
	)
}

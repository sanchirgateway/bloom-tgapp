import { Children, type ReactNode } from 'react'

/** Группа строк на одной плашке, как в настройках Telegram */
export function Section({
	title,
	children,
	className = ''
}: {
	title?: ReactNode
	children: ReactNode
	className?: string
}) {
	// Разделители — только между реальными строками (false/null не в счёт)
	const rows = Children.toArray(children)
	return (
		<section className={`flex flex-col gap-1.5 ${className}`}>
			{title && (
				<h2 className='mx-4 text-[13px] font-medium tracking-wide text-section-title uppercase'>
					{title}
				</h2>
			)}
			<div className='glass overflow-hidden rounded-2xl'>
				{rows.map((row, i) => (
					<div key={i}>
						{i > 0 && <div className='ml-16 h-px bg-separator' />}
						{row}
					</div>
				))}
			</div>
		</section>
	)
}

/** Скелетон строки списка, пока грузится */
export function SkeletonRows({ count = 3 }: { count?: number }) {
	return (
		<Section>
			{Array.from({ length: count }, (_, i) => (
				<div key={i} className='flex animate-pulse items-center gap-3.5 p-3.5'>
					<div className='size-12 shrink-0 rounded-xl bg-hint/15' />
					<div className='flex flex-1 flex-col gap-2'>
						<div className='h-4 w-3/4 rounded bg-hint/15' />
						<div className='h-3 w-1/2 rounded bg-hint/15' />
					</div>
				</div>
			))}
		</Section>
	)
}

/** Пустое состояние или ошибка — по центру, с иконкой и действием */
export function EmptyState({
	icon,
	title,
	text,
	action
}: {
	icon: ReactNode
	title: string
	text?: ReactNode
	action?: ReactNode
}) {
	return (
		<div className='flex flex-col items-center gap-2 px-6 py-10 text-center'>
			<div className='mb-1 flex size-14 items-center justify-center glass rounded-2xl text-hint'>
				{icon}
			</div>
			<p className='font-semibold'>{title}</p>
			{text && <p className='text-sm text-hint'>{text}</p>}
			{action}
		</div>
	)
}

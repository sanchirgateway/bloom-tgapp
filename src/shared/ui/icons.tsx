import type { ReactNode, SVGProps } from 'react'

// Линейные иконки вместо эмодзи: эмодзи на iOS, Android и десктопе выглядят по-разному

type IconProps = { className?: string }

function Svg({
	className = 'size-5',
	children,
	...rest
}: IconProps & { children: ReactNode } & SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth={2}
			strokeLinecap='round'
			strokeLinejoin='round'
			aria-hidden='true'
			className={className}
			{...rest}
		>
			{children}
		</svg>
	)
}

export const CalendarIcon = (p: IconProps) => (
	<Svg {...p}>
		<rect x='3' y='4' width='18' height='17' rx='2' />
		<path d='M16 2v4M8 2v4M3 10h18' />
	</Svg>
)

export const PinIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z' />
		<circle cx='12' cy='9.5' r='2.5' />
	</Svg>
)

export const UserIcon = (p: IconProps) => (
	<Svg {...p}>
		<circle cx='12' cy='8' r='4' />
		<path d='M4 21a8 8 0 0 1 16 0' />
	</Svg>
)

export const MailIcon = (p: IconProps) => (
	<Svg {...p}>
		<rect x='3' y='5' width='18' height='14' rx='2' />
		<path d='m3 7 9 6 9-6' />
	</Svg>
)

const STAR =
	'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'

export const StarIcon = ({
	filled,
	...p
}: IconProps & { filled?: boolean }) => (
	<Svg {...p} fill={filled ? 'currentColor' : 'none'}>
		<path d={STAR} />
	</Svg>
)

export const ChevronIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='m9 6 6 6-6 6' />
	</Svg>
)

export const LockIcon = (p: IconProps) => (
	<Svg {...p}>
		<rect x='4' y='11' width='16' height='10' rx='2' />
		<path d='M8 11V7a4 4 0 0 1 8 0v4' />
	</Svg>
)

export const BanIcon = (p: IconProps) => (
	<Svg {...p}>
		<circle cx='12' cy='12' r='9' />
		<path d='m5.6 5.6 12.8 12.8' />
	</Svg>
)

export const CloseIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='M18 6 6 18M6 6l12 12' />
	</Svg>
)

export const PlusIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='M12 5v14M5 12h14' />
	</Svg>
)

export const HeartIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z' />
	</Svg>
)

export const SunIcon = (p: IconProps) => (
	<Svg {...p}>
		<circle cx='12' cy='12' r='4' />
		<path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' />
	</Svg>
)

export const MoonIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' />
	</Svg>
)

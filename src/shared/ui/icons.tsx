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

export const FlowerIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='M12 13c-3 0-5-2.5-5-7 2 0 3.6 1 5 3 1.4-2 3-3 5-3 0 4.5-2 7-5 7z' />
		<path d='M12 13v8M12 18c-1-2-2.8-3-5-3 .4 2.3 2.2 3 5 3zM12 19c1-1.6 2.6-2.5 4.5-2.5-.4 1.9-2 2.5-4.5 2.5z' />
	</Svg>
)

export const GiftIcon = (p: IconProps) => (
	<Svg {...p}>
		<rect x='3' y='8' width='18' height='4' rx='1' />
		<path d='M12 8v13M5 12v9h14v-9M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5' />
	</Svg>
)

export const CameraIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z' />
		<circle cx='12' cy='13' r='3.5' />
	</Svg>
)

export const TrashIcon = (p: IconProps) => (
	<Svg {...p}>
		<path d='M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' />
	</Svg>
)

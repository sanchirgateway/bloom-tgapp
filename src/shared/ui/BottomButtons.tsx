import { useEffect, useRef } from 'react'
import {
	mainButton,
	secondaryButton,
	themeParams,
	useSignal
} from '@tma.js/sdk-react'
import { paletteColor } from '../lib/palette'
import { isMockedEnv } from '../mockEnv'

export interface BottomButton {
	text: string
	onClick: () => void
	disabled?: boolean
	loading?: boolean
	/** Красный текст — для «Отказаться» и подобных */
	destructive?: boolean
}

/**
 * Нативные кнопки Telegram под мини-аппом: главная и вторая под ней.
 * На экране в один момент — один BottomButtons, иначе они перебивают друг друга.
 * В браузере с замоканным Telegram рисует их обычной разметкой.
 */
export function BottomButtons({
	main,
	secondary
}: {
	main?: BottomButton | null
	secondary?: BottomButton | null
}) {
	useNativeButton(mainButton, isMockedEnv ? null : main)
	useNativeButton(secondaryButton, isMockedEnv ? null : secondary)

	if (!isMockedEnv || (!main && !secondary)) return null
	return (
		<>
			{/* Место под фиксированной панелью, чтобы она не закрывала конец страницы */}
			<div className={secondary && main ? 'h-32' : 'h-18'} />
			<div className='fixed inset-x-0 bottom-0 flex flex-col gap-2 glass px-4 pt-2.5 pb-4'>
				{main && <FallbackButton {...main} />}
				{secondary && <FallbackButton {...secondary} secondary />}
			</div>
		</>
	)
}

type NativeButton = typeof mainButton | typeof secondaryButton

function useNativeButton(button: NativeButton, config?: BottomButton | null) {
	const visible = !!config
	const text = config?.text ?? ''
	const enabled = !config?.disabled && !config?.loading
	const loading = !!config?.loading
	const destructive = !!config?.destructive
	// Цвета — из палитры под фон; при смене темы перекрашиваем
	const dark = useSignal(themeParams.isDark)

	// Подписка одна на всё время показа, а обработчик — всегда свежий
	const onClickRef = useRef(config?.onClick)
	useEffect(() => {
		onClickRef.current = config?.onClick
	})

	useEffect(() => {
		if (!visible) return
		const sub = button.onClick.ifAvailable(() => onClickRef.current?.())
		return () => {
			if (sub.ok) sub.data()
		}
	}, [button, visible])

	useEffect(() => {
		if (!visible) return
		button.setParams.ifAvailable({
			text,
			isVisible: true,
			isEnabled: enabled,
			isLoaderVisible: loading,
			bgColor: paletteColor(button === mainButton ? 'accent' : 'page'),
			textColor: destructive
				? paletteColor('danger')
				: button === mainButton
					? paletteColor('on-accent')
					: paletteColor('accent')
		})
	}, [button, visible, text, enabled, loading, destructive, dark])

	useEffect(() => {
		if (!visible) return
		return () => {
			button.setParams.ifAvailable({ isVisible: false })
		}
	}, [button, visible])
}

function FallbackButton({
	text,
	onClick,
	disabled,
	loading,
	destructive,
	secondary
}: BottomButton & { secondary?: boolean }) {
	return (
		<button
			type='button'
			disabled={disabled || loading}
			onClick={onClick}
			className={`min-h-12 rounded-xl font-semibold disabled:opacity-50 ${
				secondary ? 'bg-fill' : 'bg-accent text-on-accent'
			} ${destructive ? 'text-danger' : secondary ? 'text-accent' : ''}`}
		>
			{loading ? '…' : text}
		</button>
	)
}

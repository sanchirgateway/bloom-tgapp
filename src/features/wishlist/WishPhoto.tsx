import type { WishItem } from '../../shared/api/types'
import { useWishPhotoUrl } from './api'

/** Фото желания; пока грузится — пульсирующая заглушка того же размера. Без фото не вызывать */
export function WishPhoto({
	wish,
	className
}: {
	wish: WishItem
	className: string
}) {
	const url = useWishPhotoUrl(wish)
	return url ? (
		<img src={url} alt='' className={className} />
	) : (
		<div className={`${className} animate-pulse bg-hint/20`} />
	)
}

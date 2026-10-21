import { useFlowerPhotoUrl } from './api'

/** Фото букета; пока грузится — пульсирующая заглушка того же размера */
export function PhotoImg({ id, className }: { id: string; className: string }) {
	const url = useFlowerPhotoUrl(id)
	return url ? (
		<img src={url} alt='' className={className} />
	) : (
		<div className={`${className} animate-pulse bg-hint/20`} />
	)
}

const MAX_SIDE = 2048
const QUALITY = 0.85

/**
 * Уменьшает фото и перекодирует в JPEG перед отправкой: снимки с телефона весят
 * по 5–10 МБ, а бэк хранит фото как .jpg (как и после сжатия Telegram в боте).
 */
export async function compressImage(file: File): Promise<Blob> {
	// createImageBitmap учитывает EXIF-поворот — фото не ляжет на бок
	const bitmap = await createImageBitmap(file)
	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
	const width = Math.round(bitmap.width * scale)
	const height = Math.round(bitmap.height * scale)

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
	bitmap.close()

	return new Promise((resolve, reject) =>
		canvas.toBlob(
			blob =>
				blob ? resolve(blob) : reject(new Error('Не удалось обработать фото')),
			'image/jpeg',
			QUALITY
		)
	)
}

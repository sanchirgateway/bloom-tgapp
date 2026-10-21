import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlob, apiEmpty } from '../../shared/api/client'
import type {
	FlowerCreate,
	FlowerGift,
	FlowerPhotoAuthor,
	FlowerPhotoListItem,
	FlowerReaction
} from '../../shared/api/types'

export const flowersKeys = {
	list: ['flowers', 'list'] as const,
	detail: (id: string) => ['flowers', 'detail', id] as const,
	photos: ['flowers', 'photos'] as const,
	photosBy: (author: FlowerPhotoAuthor) =>
		['flowers', 'photos', { author }] as const,
	photo: (photoId: string) => ['flowers', 'photo', photoId] as const
}

/** Свои букеты (включая невручённые) и врученные пользователю. Сначала невручённые, потом свежие */
export const useFlowers = () =>
	useQuery({
		queryKey: flowersKeys.list,
		queryFn: () => api<FlowerGift[]>('/flowers')
	})

export const useFlower = (id: string) => {
	const qc = useQueryClient()
	return useQuery({
		queryKey: flowersKeys.detail(id),
		queryFn: () => api<FlowerGift>(`/flowers/${id}`),
		// Пока грузится — показываем то, что уже есть в списке
		placeholderData: () =>
			qc.getQueryData<FlowerGift[]>(flowersKeys.list)?.find(g => g.id === id)
	})
}

/**
 * Фото из всех видимых букетов, свежие первыми. Фильтр по автору — на бэке;
 * фото партнёра из ещё не врученного вам букета не придут
 */
export const useFlowerPhotos = (author: FlowerPhotoAuthor) =>
	useQuery({
		queryKey: flowersKeys.photosBy(author),
		queryFn: () =>
			api<FlowerPhotoListItem[]>(`/flowers/photos?author=${author}`)
	})

/** Обновлённый букет — в кэш карточки, списки перезапрашиваем: порядок зависит от given_at, фото могли добавиться */
function useGiftMutation<V>(mutationFn: (vars: V) => Promise<FlowerGift>) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn,
		onSuccess: gift => {
			qc.setQueryData(flowersKeys.detail(gift.id), gift)
			return Promise.all([
				qc.invalidateQueries({ queryKey: flowersKeys.list }),
				qc.invalidateQueries({ queryKey: flowersKeys.photos })
			])
		}
	})
}

const toForm = (photos: Blob[], fields: Record<string, unknown> = {}) => {
	const form = new FormData()
	for (const [key, value] of Object.entries(fields)) {
		if (value !== undefined) form.append(key, String(value))
	}
	photos.forEach((photo, i) => form.append('photos', photo, `${i}.jpg`))
	return form
}

/** С given_at партнёру сразу приходят фото в Telegram, без него — сюрприз до «Вручено» */
export const useCreateFlowers = () =>
	useGiftMutation(({ photos, ...fields }: FlowerCreate) =>
		api<FlowerGift>('/flowers', {
			method: 'POST',
			body: toForm(photos, fields)
		})
	)

/** Только даритель: с этого момента букет видит получатель */
export const useGiveFlowers = () =>
	useGiftMutation((id: string) =>
		api<FlowerGift>(`/flowers/${id}/give`, { method: 'POST' })
	)

/** Только получатель; реакцию можно поменять */
export const useReactFlowers = () =>
	useGiftMutation(
		({ id, reaction }: { id: string; reaction: FlowerReaction }) =>
			api<FlowerGift>(`/flowers/${id}/reaction`, {
				method: 'PUT',
				body: JSON.stringify({ reaction })
			})
	)

/** Дослать фото: получатель — букет в вазе, даритель — то, что не приложил сразу */
export const useAddFlowerPhotos = () =>
	useGiftMutation(({ id, photos }: { id: string; photos: Blob[] }) =>
		api<FlowerGift>(`/flowers/${id}/photos`, {
			method: 'POST',
			body: toForm(photos)
		})
	)

/** Только даритель; запись удаляется вместе с фото */
export const useDeleteFlowers = () => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			apiEmpty(`/flowers/${id}`, { method: 'DELETE' }).then(() => id),
		onSuccess: id => {
			qc.removeQueries({ queryKey: flowersKeys.detail(id) })
			qc.setQueryData<FlowerGift[]>(flowersKeys.list, list =>
				list?.filter(g => g.id !== id)
			)
			qc.setQueriesData<FlowerPhotoListItem[]>(
				{ queryKey: flowersKeys.photos },
				photos => photos?.filter(p => p.gift_id !== id)
			)
		}
	})
}

/** URL фото для <img>, как у отзывов: файл за авторизацией, отдаём blob: URL из кэша */
export const useFlowerPhotoUrl = (photoId: string) =>
	useQuery({
		queryKey: flowersKeys.photo(photoId),
		queryFn: async () =>
			URL.createObjectURL(await apiBlob(`/flowers/photos/${photoId}`)),
		staleTime: Infinity,
		gcTime: Infinity
	}).data

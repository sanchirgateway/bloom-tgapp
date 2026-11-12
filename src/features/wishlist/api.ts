import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlob, apiEmpty } from '../../shared/api/client'
import type {
	WishCreate,
	WishItem,
	WishOwner,
	WishUpdate
} from '../../shared/api/types'

export const wishlistKeys = {
	lists: ['wishlist', 'list'] as const,
	list: (owner: WishOwner) => ['wishlist', 'list', owner] as const,
	detail: (id: string) => ['wishlist', 'detail', id] as const,
	photos: (id: string) => ['wishlist', 'photo', id] as const,
	/** URL на бэке один и тот же, поэтому версия фото — updated_at */
	photo: (id: string, version: string) =>
		['wishlist', 'photo', id, version] as const
}

/** Без пары бэк отвечает 409 — вызывать только при me.partner_id !== null */
export const useWishes = (owner: WishOwner) =>
	useQuery({
		queryKey: wishlistKeys.list(owner),
		queryFn: () => api<WishItem[]>(`/wishlist/${owner}`)
	})

export const useWish = (id: string) => {
	const qc = useQueryClient()
	return useQuery({
		queryKey: wishlistKeys.detail(id),
		queryFn: () => api<WishItem>(`/wishlist/${id}`),
		// Пока грузится — показываем то, что уже есть в списках
		placeholderData: () =>
			qc
				.getQueriesData<WishItem[]>({ queryKey: wishlistKeys.lists })
				.flatMap(([, list]) => list ?? [])
				.find(w => w.id === id)
	})
}

/** Обновлённое желание — в кэш карточки, списки перезапрашиваем: порядок зависит от received_at */
function useWishMutation<V>(mutationFn: (vars: V) => Promise<WishItem>) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn,
		onSuccess: wish => {
			qc.setQueryData(wishlistKeys.detail(wish.id), wish)
			return qc.invalidateQueries({ queryKey: wishlistKeys.lists })
		}
	})
}

/** Партнёру приходит уведомление с кнопкой брони */
export const useCreateWish = () =>
	useWishMutation((body: WishCreate) =>
		api<WishItem>('/wishlist', { method: 'POST', body: JSON.stringify(body) })
	)

/** Только владелец */
export const useUpdateWish = () =>
	useWishMutation(({ id, ...body }: WishUpdate & { id: string }) =>
		api<WishItem>(`/wishlist/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(body)
		})
	)

/** Только партнёр: бронь тайная, владелец её не видит */
export const useReserveWish = () =>
	useWishMutation(({ id, reserve }: { id: string; reserve: boolean }) =>
		api<WishItem>(`/wishlist/${id}/reserve`, {
			method: reserve ? 'POST' : 'DELETE'
		})
	)

/** Только владелец. «Снова хочу» (received: false) сбрасывает бронь партнёра */
export const useReceiveWish = () =>
	useWishMutation(({ id, received }: { id: string; received: boolean }) =>
		api<WishItem>(`/wishlist/${id}/receive`, {
			method: received ? 'POST' : 'DELETE'
		})
	)

/** Только владелец. Бэк сам сжимает в JPEG, но с телефона шлём уже уменьшенное */
export const useSetWishPhoto = () =>
	useWishMutation(({ id, photo }: { id: string; photo: Blob }) => {
		const form = new FormData()
		form.append('photo', photo, 'photo.jpg')
		return api<WishItem>(`/wishlist/${id}/photo`, { method: 'PUT', body: form })
	})

/** Только владелец */
export const useDeleteWishPhoto = () =>
	useWishMutation((id: string) =>
		api<WishItem>(`/wishlist/${id}/photo`, { method: 'DELETE' })
	)

/** URL фото для <img>: файл за авторизацией, отдаём blob: URL из кэша. Без фото — undefined */
export const useWishPhotoUrl = (wish: WishItem) =>
	useQuery({
		queryKey: wishlistKeys.photo(wish.id, wish.updated_at),
		queryFn: async () =>
			URL.createObjectURL(await apiBlob(`/wishlist/${wish.id}/photo`)),
		enabled: wish.has_photo,
		staleTime: Infinity
	}).data

/** Только владелец */
export const useDeleteWish = () => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			apiEmpty(`/wishlist/${id}`, { method: 'DELETE' }).then(() => id),
		onSuccess: id => {
			qc.removeQueries({ queryKey: wishlistKeys.detail(id) })
			qc.removeQueries({ queryKey: wishlistKeys.photos(id) })
			qc.setQueriesData<WishItem[]>({ queryKey: wishlistKeys.lists }, list =>
				list?.filter(w => w.id !== id)
			)
		}
	})
}

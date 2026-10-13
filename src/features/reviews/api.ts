import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlob } from '../../shared/api/client'
import type {
	DateItem,
	DateReviews,
	ReviewCreate,
	ReviewCreated
} from '../../shared/api/types'

export const reviewsKeys = {
	forDate: (dateId: string) => ['reviews', 'date', dateId] as const,
	pending: ['reviews', 'pending'] as const,
	photo: (photoId: string) => ['reviews', 'photo', photoId] as const
}

/** Что скрыть, решает бэк: отзыв партнёра приходит в locked, пока свой не написан */
export const useDateReviews = (dateId: string, enabled: boolean) =>
	useQuery({
		queryKey: reviewsKeys.forDate(dateId),
		queryFn: () => api<DateReviews>(`/dates/${dateId}/reviews`),
		enabled
	})

/** Состоявшиеся свидания, на которые пользователь ещё не оставил отзыв */
export const usePendingReviews = () =>
	useQuery({
		queryKey: reviewsKeys.pending,
		queryFn: () => api<DateItem[]>('/reviews/pending')
	})

export const useCreateReview = (dateId: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ photos, ...fields }: ReviewCreate) => {
			const form = new FormData()
			for (const [key, value] of Object.entries(fields)) {
				if (value !== undefined) form.append(key, String(value))
			}
			photos.forEach((photo, i) => form.append('photos', photo, `${i}.jpg`))
			return api<ReviewCreated>(`/dates/${dateId}/reviews`, {
				method: 'POST',
				body: form
			})
		},
		// Свой отзыв открывает отзыв партнёра — список нужно перезапросить целиком
		onSuccess: () =>
			Promise.all([
				qc.invalidateQueries({ queryKey: reviewsKeys.forDate(dateId) }),
				qc.invalidateQueries({ queryKey: reviewsKeys.pending })
			])
	})
}

/**
 * URL фото для <img>: картинка грузится с авторизацией и отдаётся как blob: URL.
 * URL живёт в кэше до закрытия Mini App — фото у свидания не больше 20, а повторный
 * показ (миниатюра → полный экран) не скачивает файл заново.
 */
export const usePhotoUrl = (photoId: string) =>
	useQuery({
		queryKey: reviewsKeys.photo(photoId),
		queryFn: async () =>
			URL.createObjectURL(await apiBlob(`/reviews/photos/${photoId}`)),
		staleTime: Infinity,
		gcTime: Infinity
	}).data

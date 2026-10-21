import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import type { DateCreate, DateItem } from '../../shared/api/types'
import { useMe } from '../user/api'
import { findPartnerName } from './format'

export const datesKeys = {
	all: ['dates'] as const,
	list: (upcoming: boolean) => ['dates', 'list', { upcoming }] as const,
	detail: (id: string) => ['dates', 'detail', id] as const
}

/** upcoming=true — только будущие, false — все свидания пользователя */
export const useDates = (upcoming: boolean) =>
	useQuery({
		queryKey: datesKeys.list(upcoming),
		queryFn: () => api<DateItem[]>(`/dates?upcoming=${upcoming}`)
	})

export const useDate = (id: string) => {
	const qc = useQueryClient()
	return useQuery({
		queryKey: datesKeys.detail(id),
		queryFn: () => api<DateItem>(`/dates/${id}`),
		// Пока грузится — показываем то, что уже есть в списке
		placeholderData: () =>
			qc
				.getQueriesData<DateItem[]>({ queryKey: ['dates', 'list'] })
				.flatMap(([, list]) => list ?? [])
				.find(d => d.id === id)
	})
}

/** Партнёру уходит приглашение в боте, свидание создаётся в статусе proposed */
export const useCreateDate = () => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: DateCreate) =>
			api<DateItem>('/dates', { method: 'POST', body: JSON.stringify(body) }),
		onSuccess: date => {
			qc.setQueryData(datesKeys.detail(date.id), date)
			return qc.invalidateQueries({ queryKey: ['dates', 'list'] })
		}
	})
}

/** Отменить может любой участник — партнёру уходит уведомление с причиной */
export const useCancelDate = () => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api<DateItem>(`/dates/${id}/cancel`, {
				method: 'POST',
				body: JSON.stringify({ reason })
			}),
		onSuccess: date => {
			qc.setQueryData(datesKeys.detail(date.id), date)
			return qc.invalidateQueries({ queryKey: ['dates', 'list'] })
		}
	})
}

export const useRespondDate = () => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
			api<DateItem>(`/dates/${id}/${accept ? 'accept' : 'decline'}`, {
				method: 'POST'
			}),
		onSuccess: date => {
			qc.setQueryData(datesKeys.detail(date.id), date)
			return qc.invalidateQueries({ queryKey: ['dates', 'list'] })
		}
	})
}

/** Имени партнёра нет в профиле — берём из общих свиданий (тот же запрос, что вкладка «Все») */
export const usePartnerName = () => {
	const { data: me } = useMe()
	const { data = [] } = useDates(false)
	return findPartnerName(me, data)
}

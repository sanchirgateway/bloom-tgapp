import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import type { Pair, User } from '../../shared/api/types'

export const useMe = () =>
	useQuery({
		queryKey: ['me'],
		queryFn: () => api<User>('/me'),
		staleTime: Infinity
	})

/** Без пары — ссылка-приглашение; пока её не приняли, опрашиваем бэк */
export const usePair = () => {
	const qc = useQueryClient()
	return useQuery({
		queryKey: ['pair'],
		queryFn: async () => {
			const pair = await api<Pair>('/pair')
			// Партнёр принял приглашение — /me не перезапрашивается сам (staleTime: Infinity)
			const partnerId = pair.partner?.id ?? null
			qc.setQueryData<User>(['me'], me =>
				me && me.partner_id !== partnerId
					? { ...me, partner_id: partnerId }
					: me
			)
			return pair
		},
		staleTime: 60_000,
		refetchInterval: q => (q.state.data?.partner ? false : 5_000)
	})
}

export const usePartnerName = () => usePair().data?.partner?.first_name ?? null

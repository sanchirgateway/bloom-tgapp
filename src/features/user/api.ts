import { useQuery } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import type { User } from '../../shared/api/types'

export const useMe = () =>
	useQuery({
		queryKey: ['me'],
		queryFn: () => api<User>('/me'),
		staleTime: Infinity
	})

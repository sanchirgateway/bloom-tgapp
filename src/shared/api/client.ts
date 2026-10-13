import { initData } from '@tma.js/sdk-react'

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

export class ApiError extends Error {
	readonly status: number

	constructor(status: number, message: string) {
		super(message)
		this.status = status
	}
}

function authHeaders(): Record<string, string> {
	// В dev initData замокана с фейковой подписью — бэк её не примет
	const debugUserId = import.meta.env.VITE_DEBUG_USER_ID
	if (import.meta.env.DEV && debugUserId) {
		return { 'X-Debug-User-Id': debugUserId }
	}
	const raw = initData.raw()
	return raw ? { Authorization: `tma ${raw}` } : {}
}

async function request(path: string, init: RequestInit = {}) {
	const res = await fetch(BASE + path, {
		...init,
		headers: {
			// Для FormData заголовок с boundary браузер ставит сам
			...(typeof init.body === 'string' && {
				'Content-Type': 'application/json'
			}),
			...authHeaders(),
			...init.headers
		}
	})

	if (!res.ok) {
		// FastAPI и AppError отвечают { detail: string }, ошибки валидации — { detail: [...] }
		const body = await res.json().catch(() => null)
		const detail =
			typeof body?.detail === 'string' ? body.detail : `Ошибка ${res.status}`
		throw new ApiError(res.status, detail)
	}

	return res
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await request(path, init)
	return res.json() as Promise<T>
}

/** Файлы за авторизацией: <img src> не умеет слать Authorization */
export async function apiBlob(path: string): Promise<Blob> {
	const res = await request(path)
	return res.blob()
}

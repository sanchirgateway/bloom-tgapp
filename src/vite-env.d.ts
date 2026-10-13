/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Только для dev: id пользователя для X-Debug-User-Id (бэк с APP_DEBUG=true) */
	readonly VITE_DEBUG_USER_ID?: string
	/** Адрес API, по умолчанию /api/v1 (через прокси Vite) */
	readonly VITE_API_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

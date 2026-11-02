import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		babel({ presets: [reactCompilerPreset()] })
	],
	server: {
		host: true,
		allowedHosts: [
			'.free.pinggy.net',
			'https://jiboc-88-218-248-103.run.pinggy-free.link'
		],
		proxy: {
			// Не localhost: он может разрешиться в ::1, а там порт 8000 занят другим бэкендом
			'/api': 'http://127.0.0.1:8000'
		}
	}
})

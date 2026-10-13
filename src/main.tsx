import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { retrieveLaunchParams } from '@tma.js/sdk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ApiError } from './shared/api/client'
import { init } from './app/init'
import './shared/mockEnv'
import './index.css'

const root = createRoot(document.getElementById('root')!)

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: (count, error) =>
				!(error instanceof ApiError && error.status < 500) && count < 2
		}
	}
})

try {
	const lp = retrieveLaunchParams()
	const debug =
		import.meta.env.DEV || (lp.tgWebAppStartParam ?? '').includes('debug')

	if (debug && ['ios', 'android'].includes(lp.tgWebAppPlatform)) {
		import('eruda').then(({ default: eruda }) => eruda.init())
	}

	await init(debug)
	root.render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<App />
			</QueryClientProvider>
		</StrictMode>
	)
} catch {
	root.render(<div>Откройте приложение в Telegram</div>)
}

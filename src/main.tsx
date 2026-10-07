import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { retrieveLaunchParams } from '@tma.js/sdk-react'
import App from './App'
import { init } from './app/init'
import './shared/mockEnv'
import './index.css'

const root = createRoot(document.getElementById('root')!)

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
			<App />
		</StrictMode>
	)
} catch {
	root.render(<div>Откройте приложение в Telegram</div>)
}

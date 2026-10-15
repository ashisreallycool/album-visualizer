import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/space-grotesk'
import '@fontsource/space-mono'
import '@fontsource/space-mono/700.css'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/caveat'
import '@fontsource/special-elite'
import '@fontsource/instrument-serif'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/anton'
import '@fontsource/courier-prime'
import '@fontsource/parisienne'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/playfair-display/wght-italic.css'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/archivo'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/syne'
import '@fontsource/rubik-glitch'
import './styles/tokens.css'
import './styles/global.css'
import './styles/ui.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

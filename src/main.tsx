import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EmbedPage, parseEmbedName } from './EmbedPage.tsx'

// ?embed=<pipeline|generalist|sonic> renders a single chrome-less
// diagram for iframes; anything else renders the full essay.
const embed = parseEmbedName(new URLSearchParams(window.location.search))
if (embed) document.documentElement.classList.add('embed-mode')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {embed ? <EmbedPage name={embed} /> : <App />}
  </StrictMode>,
)

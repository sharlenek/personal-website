import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/cascadia-code/latin-400.css'
import '@fontsource/cascadia-code/latin-700.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/cossette-titre/latin-700.css'
import './index.css'
import App from './App.tsx'

import "@fontsource/cossette-titre/400.css";
import "@fontsource/cossette-titre/700.css";

import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";

import "@fontsource/cascadia-code/400.css";
import "@fontsource/cascadia-code/600.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

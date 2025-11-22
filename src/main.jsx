import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <--- IMPORT AJOUTÉ
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Enveloppe l'app pour activer le routage */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
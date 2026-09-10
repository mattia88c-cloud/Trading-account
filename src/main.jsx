import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { HintsProvider } from './useHints.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HintsProvider>
      <App />
    </HintsProvider>
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.jsx'
import './index.css'

import AuthProvider from './context/AuthContext.jsx'
import ThemeProvider from './context/ThemeContext'
import { CartProvider } from './context/CartContext.jsx'

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
)
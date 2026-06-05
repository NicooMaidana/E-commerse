import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'
import { CartProvider } from './context/CartContext.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1d1729',
                color:      '#d6d3d1',
                border:     '1px solid rgba(58,46,79,0.5)',
                fontSize:   '13px',
                fontWeight: 700,
              },
              success: { iconTheme: { primary: '#fbbf24', secondary: '#1d1729' } },
              error:   { iconTheme: { primary: '#f87171', secondary: '#1d1729' } },
            }}
          />
        </CartProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
)

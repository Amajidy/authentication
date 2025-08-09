import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), mkcert()],
  server: {
    https: true, // این خط، استفاده از HTTPS را فعال می‌کند
    host: '0.0.0.0' // برای دسترسی از دستگاه‌های دیگر در شبکه
  }
})

import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin(), tailwindcss()],
    server: {
        port: 60678,
        proxy: {
            '/chat': 'http://127.0.0.1:5000',
            '/api': 'http://127.0.0.1:3001',
        }
    }
})

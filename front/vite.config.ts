import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin(), tailwindcss()],
    server: {
        port: 60678,
        proxy: {
            '/chat': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
            '/api/sdi': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
            '/health': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
})

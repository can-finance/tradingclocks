import { defineConfig } from 'vite';

export default defineConfig({
    // Use the repository name as the base path for GitHub Pages
    base: '/tradingclocks/',
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                dst: 'dst.html',
                editor: 'editor.html',
                schedule: 'schedule.html',
                holidays: 'holidays-summary.html',
            },
        },
    },
});

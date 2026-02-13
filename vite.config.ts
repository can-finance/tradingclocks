import { defineConfig } from 'vite';

export default defineConfig({
    // Use root base path for custom domain
    base: '/',
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

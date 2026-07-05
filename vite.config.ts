/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
    // Use root base path for custom domain
    base: '/',
    test: {
        environment: 'node',
        // Pin the "local" timezone so tests that format in the browser/user
        // timezone are deterministic on any machine
        env: { TZ: 'America/New_York' },
    },
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

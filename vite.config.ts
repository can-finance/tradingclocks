/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
    // Use root base path for custom domain
    base: '/',
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    test: {
        environment: 'node',
        // Pin the "local" timezone so tests that format in the browser/user
        // timezone are deterministic on any machine
        env: { TZ: 'America/New_York' },
    },
    server: {
        watch: {
            // Docker's bind mount doesn't forward inotify events reliably,
            // so the default watcher misses host-side edits inside the
            // container. See docker-compose.yml's CHOKIDAR_USEPOLLING.
            usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                dst: 'dst.html',
                editor: 'editor.html',
                schedule: 'schedule.html',
                holidays: 'holidays-summary.html',
                holidays2027: 'holidays-2027.html',
            },
        },
    },
});

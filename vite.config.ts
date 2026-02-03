import { defineConfig } from 'vite';

export default defineConfig({
    // Use relative paths so it works on GitHub Pages
    base: './',
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                dst: 'dst.html',
                editor: 'editor.html',
            },
        },
    },
});

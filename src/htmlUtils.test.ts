import { describe, it, expect } from 'vitest';
import { escapeHtml } from './htmlUtils';

describe('escapeHtml', () => {
    it('escapes HTML metacharacters', () => {
        expect(escapeHtml(`<img src=x onerror="alert('&')">`))
            .toBe('&lt;img src=x onerror=&quot;alert(&#39;&amp;&#39;)&quot;&gt;');
    });

    it('leaves plain strings untouched', () => {
        expect(escapeHtml('Deutsche Börse (XETRA)')).toBe('Deutsche Börse (XETRA)');
    });
});

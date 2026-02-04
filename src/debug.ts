
import { timeService } from './timeService';
import './style.css'; // Re-use main styles for glassmorphism

export class DebugUI {
    private container: HTMLElement;
    private dateInput: HTMLInputElement;
    private timeInput: HTMLInputElement;
    private timezoneSelect: HTMLSelectElement;
    private nowDisplay: HTMLElement;
    private currentTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'debug-overlay';
        this.container.innerHTML = `
            <div class="debug-header">
                <h3>🐞 Time Travel</h3>
                <button id="debug-close" class="debug-close">×</button>
            </div>
            <div class="debug-content">
                <div class="debug-row">
                    <label>Simulated Date</label>
                    <input type="date" id="debug-date">
                </div>
                <div class="debug-row">
                    <label>Simulated Time</label>
                    <input type="time" id="debug-time" step="1">
                </div>
                <div class="debug-row">
                    <label>View Timezone</label>
                    <select id="debug-timezone">
                        <option value="local">Local Time</option>
                        <option value="America/New_York">New York (EST/EDT)</option>
                        <option value="America/Chicago">Chicago (CST/CDT)</option>
                        <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="Asia/Singapore">Singapore (SGT)</option>
                        <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                        <option value="UTC">UTC</option>
                    </select>
                </div>
                <div class="debug-actions">
                    <button id="debug-set" class="btn-debug-primary">Set Time</button>
                    <button id="debug-reset" class="btn-debug-secondary">Reset to Now</button>
                </div>
                <div class="debug-shortcuts">
                    <button class="btn-shortcut" data-jump="next-monday">Next Monday</button>
                    <button class="btn-shortcut" data-jump="dst-us">Jump to DST (US)</button>
                    <button class="btn-shortcut" data-jump="xmas">Jump to Christmas</button>
                </div>
                <div class="debug-status">
                    Current: <span id="debug-current-time">--</span>
                </div>
            </div>
        `;

        // Create styles dynamically
        const style = document.createElement('style');
        style.textContent = `
            .debug-overlay {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                background: rgba(20, 20, 30, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 1rem;
                z-index: 9999;
                color: #fff;
                font-family: 'Inter', sans-serif;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                display: none; /* Hidden by default */
            }
            .debug-overlay.visible {
                display: block;
            }
            .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            .debug-header h3 { margin: 0; font-size: 1rem; color: #a9a9ff; }
            .debug-close {
                background: none; border: none; color: #666; font-size: 1.5rem; cursor: pointer;
            }
            .debug-row {
                margin-bottom: 0.75rem;
            }
            .debug-row label {
                display: block; font-size: 0.75rem; margin-bottom: 0.25rem; color: #888;
            }
            .debug-row input, .debug-row select {
                width: 100%;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                color: #fff;
                padding: 0.5rem;
                border-radius: 4px;
            }
            .debug-row select option {
                background: #1a1a2e;
                color: #fff;
            }
            .debug-actions {
                display: flex; gap: 0.5rem; margin-bottom: 1rem;
            }
            .btn-debug-primary {
                flex: 1; background: #6366f1; border: none; color: white; padding: 0.5rem; border-radius: 4px; cursor: pointer;
            }
            .btn-debug-secondary {
                flex: 1; background: transparent; border: 1px solid #666; color: #ccc; padding: 0.5rem; border-radius: 4px; cursor: pointer;
            }
            .debug-shortcuts {
                display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;
            }
            .btn-shortcut {
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #aaa; font-size: 0.7rem; padding: 0.4rem; cursor: pointer; border-radius: 4px;
            }
            .btn-shortcut:hover {
                background: rgba(255,255,255,0.1);
            }
            .debug-status {
                font-size: 0.7rem; color: #666; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.container);

        // Get elements
        this.dateInput = this.container.querySelector('#debug-date') as HTMLInputElement;
        this.timeInput = this.container.querySelector('#debug-time') as HTMLInputElement;
        this.timezoneSelect = this.container.querySelector('#debug-timezone') as HTMLSelectElement;
        this.nowDisplay = this.container.querySelector('#debug-current-time') as HTMLElement;

        // Set default timezone
        this.timezoneSelect.value = 'local';

        this.setupListeners();

        // Start update loop for debug display
        setInterval(() => this.updateDisplay(), 1000);
    }

    private setupListeners(): void {
        document.getElementById('debug-close')?.addEventListener('click', () => {
            this.toggle(false);
        });

        document.getElementById('debug-set')?.addEventListener('click', () => {
            const dateStr = this.dateInput.value;
            const timeStr = this.timeInput.value;
            if (dateStr && timeStr) {
                const newTime = new Date(`${dateStr}T${timeStr}`);
                timeService.setTime(newTime);
                timeService.freeze(); // Auto-freeze when manually setting? Or let it flow. Let's start with flow. 
                // Actually user probably wants to see a specific moment.
                // Let's NOT freeze by default, let it flow from there.
                timeService.unfreeze(); // Ensure it runs
            }
        });

        if (this.container.style.display === 'none') {
            // When hidden, still ensuring default is clear could be good, but
            // let's wait until interaction.
        }

        document.getElementById('debug-reset')?.addEventListener('click', () => {
            timeService.reset();
            this.updateDisplay();
            // Reset dropdown too
            this.timezoneSelect.value = 'local';
        });

        this.timezoneSelect.addEventListener('change', () => {
            const selectedTz = this.timezoneSelect.value;
            // Update service
            timeService.setTimezone(selectedTz);

            // Also update local state for display format
            this.currentTimezone = selectedTz === 'local'
                ? Intl.DateTimeFormat().resolvedOptions().timeZone
                : selectedTz;

            this.updateDisplay();
        });

        this.container.querySelectorAll('.btn-shortcut').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jump = (e.target as HTMLElement).dataset.jump;
                this.handleJump(jump);
            });
        });

        // Global Keyboard Shortcut: Shift + D (Control + D might conflict)
        document.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key === 'D') {
                this.toggle();
            }
        });
    }

    private handleJump(jumpType: string | undefined): void {
        const now = timeService.getNow();
        let target = new Date(now);

        switch (jumpType) {
            case 'next-monday':
                // Find next Monday
                target.setDate(target.getDate() + (1 + 7 - target.getDay()) % 7 || 7);
                target.setHours(9, 30, 0, 0); // Open time rough
                break;
            case 'dst-us':
                // March 8, 2026 (2nd Sunday in March)
                target = new Date('2026-03-08T01:59:00'); // Valid test: just before switch
                break;
            case 'xmas':
                target = new Date('2026-12-25T10:00:00');
                break;
        }
        timeService.setTime(target);
    }

    private updateDisplay(): void {
        if (this.container.style.display === 'none') return;

        const now = timeService.getNow();

        // Format time in selected timezone
        const tzOptions: Intl.DateTimeFormatOptions = {
            timeZone: this.currentTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };

        const formatter = new Intl.DateTimeFormat('en-US', tzOptions);
        this.nowDisplay.textContent = formatter.format(now) + ' (' + this.getTimezoneAbbrev() + ')';

        // Update inputs only if not focused (to allow editing)
        if (document.activeElement !== this.dateInput && document.activeElement !== this.timeInput) {
            // Format for inputs
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');

            this.dateInput.value = `${yyyy}-${mm}-${dd}`;
            this.timeInput.value = `${hh}:${min}:${ss}`;
        }
    }

    private getTimezoneAbbrev(): string {
        if (this.currentTimezone === Intl.DateTimeFormat().resolvedOptions().timeZone) {
            return 'Local';
        }
        const tzMap: Record<string, string> = {
            'America/New_York': 'EST/EDT',
            'America/Chicago': 'CST/CDT',
            'America/Los_Angeles': 'PST/PDT',
            'Europe/London': 'GMT/BST',
            'Europe/Paris': 'CET/CEST',
            'Asia/Tokyo': 'JST',
            'Asia/Hong_Kong': 'HKT',
            'Asia/Shanghai': 'CST',
            'Asia/Singapore': 'SGT',
            'Australia/Sydney': 'AEDT/AEST',
            'UTC': 'UTC'
        };
        return tzMap[this.currentTimezone] || this.currentTimezone;
    }

    toggle(show?: boolean): void {
        const isVisible = this.container.classList.contains('visible');
        const shouldShow = show !== undefined ? show : !isVisible;

        this.container.classList.toggle('visible', shouldShow);

        if (shouldShow) {
            this.updateDisplay();
        }
    }
}

// Auto-init
new DebugUI();

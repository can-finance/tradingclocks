/**
 * TimeService - Centralized time management for Time Travel Debugging
 * Allows the application to simulate any date/time.
 */

class TimeService {
    private static instance: TimeService;
    private clockOffset: number = 0; // Difference between simulated time and real time
    private isPaused: boolean = false;
    private frozenTime: number = 0; // Timestamp when paused
    private timezoneOverride: string | null = null;

    private constructor() { }

    static getInstance(): TimeService {
        if (!TimeService.instance) {
            TimeService.instance = new TimeService();
        }
        return TimeService.instance;
    }

    /**
     * Get the current time (real or simulated)
     */
    getNow(): Date {
        if (this.isPaused) {
            return new Date(this.frozenTime);
        }
        return new Date(Date.now() + this.clockOffset);
    }

    /**
     * Set the simulated timezone (or null for local)
     */
    setTimezone(timezone: string | null): void {
        this.timezoneOverride = timezone === 'local' ? null : timezone;
    }

    /**
     * Get the active timezone (simulated or null)
     */
    getTimezone(): string | null {
        return this.timezoneOverride;
    }

    /**
     * Set the simulated time to a specific date
     */
    setTime(date: Date): void {
        const now = Date.now();
        this.clockOffset = date.getTime() - now;

        // If paused, update the frozen time too so it stays fixed at the new set time
        if (this.isPaused) {
            this.frozenTime = date.getTime();
        }
    }

    /**
     * Reset to real system time
     */
    reset(): void {
        this.clockOffset = 0;
        this.isPaused = false;
        this.timezoneOverride = null;
    }

    /**
     * Freeze the clock at the current simulated time
     */
    freeze(): void {
        if (!this.isPaused) {
            this.frozenTime = this.getNow().getTime();
            this.isPaused = true;
        }
    }

    /**
     * Unfreeze the clock
     */
    unfreeze(): void {
        if (this.isPaused) {
            // Adjust offset so that time resumes from the frozen point
            // New Offset = FrozenTime - RealTimeNow
            const now = Date.now();
            this.clockOffset = this.frozenTime - now;
            this.isPaused = false;
        }
    }

    isSimulationActive(): boolean {
        return this.clockOffset !== 0 || this.isPaused || this.timezoneOverride !== null;
    }
}

export const timeService = TimeService.getInstance();

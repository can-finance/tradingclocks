/**
 * Type definitions for Trading Clocks application
 */

export interface Market {
    id: string;
    name: string;
    code: string;
    country: string;
    countryCode: string;
    timezone: string;
    openTime: string;
    closeTime: string;
    region: 'Americas' | 'Europe' | 'Asia-Pacific';
    dstStart: string | null;
    dstEnd: string | null;
    lunchStart?: string | null;  // e.g. "11:30" - start of lunch break
    lunchEnd?: string | null;    // e.g. "12:30" - end of lunch break
}

export interface TimeOverride {
    openTime: string | null;
    closeTime: string | null;
}

export interface MarketStatus {
    isOpen: boolean;
    isWeekend: boolean;
    timeUntil: number;
    nextEvent: 'opens' | 'closes' | 'lunch-starts' | 'reopens';
    nextEventTime: Date;
    holidayName?: string;
    isTodayHoliday?: boolean;
    isOnLunch?: boolean;         // True if currently in lunch break
    lunchStart?: Date;           // Parsed lunchStart time for today
    lunchEnd?: Date;             // Parsed lunchEnd time for today
}

export interface FormattedTime {
    time: string;
    tzAbbrev: string;
}

export interface Country {
    code: string;
    name: string;
    region: string;
}

export interface MarketsByRegion {
    [region: string]: Market[];
}

export interface TimeOverrides {
    [marketId: string]: TimeOverride;
}

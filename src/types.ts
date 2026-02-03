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
}

export interface TimeOverride {
    openTime: string | null;
    closeTime: string | null;
}

export interface MarketStatus {
    isOpen: boolean;
    isWeekend: boolean;
    timeUntil: number;
    nextEvent: 'opens' | 'closes';
    nextEventTime: Date;
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

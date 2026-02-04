/**
 * Trading Clocks - Main Application (TypeScript)
 */

import './style.css';
import './debug'; // Initialize Debug UI
import { markets, getMarketsByRegion, loadMarketsConfig } from './markets';
import { loadHolidaysConfig } from './holidays';
import {
  getMarketStatus,
  formatCountdown,
  formatTimeInTimezone,
  getUserTimezone,
  parseTimeInTimezone
} from './timezone';
import { timeService } from './timeService';
import {
  getSelectedMarkets,
  saveSelectedMarkets,
  getTimeOverrides
} from './storage';
import type { TimeOverrides } from './types';

// ============ State ============
let selectedMarketIds: string[] = [];
let timeOverrides: TimeOverrides = {};

// Default markets to show on first visit
const DEFAULT_MARKETS = ['asx', 'tse', 'hkex', 'sgx', 'euronext-paris', 'lse', 'nyse', 'tsx'];

// ============ DOM Elements ============
interface Elements {
  clockGrid: HTMLElement;
  marketSelector: HTMLElement;
  localTime: HTMLElement;
  localDate: HTMLElement;
  localTz: HTMLElement;
  btnSelectAll: HTMLButtonElement;
  btnDeselectAll: HTMLButtonElement;
  menuToggle: HTMLButtonElement;
  themeToggle: HTMLButtonElement;
  sidebarToggle: HTMLButtonElement;
  sidebar: HTMLElement;
  sidebarOverlay: HTMLElement;
  timeTravelIndicator: HTMLElement;
}

function getElements(): Elements {
  return {
    clockGrid: document.getElementById('clock-grid')!,
    marketSelector: document.getElementById('market-selector')!,
    localTime: document.getElementById('local-time')!,
    localDate: document.getElementById('local-date')!,
    localTz: document.getElementById('local-tz')!,
    btnSelectAll: document.getElementById('btn-select-all') as HTMLButtonElement,
    btnDeselectAll: document.getElementById('btn-deselect-all') as HTMLButtonElement,
    menuToggle: document.getElementById('menu-toggle') as HTMLButtonElement,
    themeToggle: document.getElementById('theme-toggle') as HTMLButtonElement,
    sidebarToggle: document.getElementById('sidebar-toggle') as HTMLButtonElement,
    sidebar: document.getElementById('sidebar')!,
    sidebarOverlay: document.getElementById('sidebar-overlay')!,
    timeTravelIndicator: document.getElementById('time-travel-indicator')!
  };
}

let elements: Elements;

// ============ Theme ============
function initTheme(): void {
  const savedTheme = localStorage.getItem('trading-clocks-theme');
  const isDark = savedTheme === 'dark';
  document.documentElement.classList.toggle('dark-mode', isDark);
  updateThemeIcon(isDark);
}

function toggleTheme(): void {
  const isDark = document.documentElement.classList.toggle('dark-mode');
  localStorage.setItem('trading-clocks-theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark: boolean): void {
  if (elements?.themeToggle) {
    elements.themeToggle.textContent = isDark ? '☀️' : '🌙';
  }
}

// ============ Sidebar ============
function initSidebar(): void {
  const savedState = localStorage.getItem('trading-clocks-sidebar');
  const isCollapsed = savedState === 'collapsed';
  if (isCollapsed) {
    document.getElementById('sidebar')?.classList.add('is-collapsed');
  }
}

function toggleSidebar(): void {
  const sidebar = elements.sidebar;
  const isCollapsed = sidebar.classList.toggle('is-collapsed');
  localStorage.setItem('trading-clocks-sidebar', isCollapsed ? 'collapsed' : 'expanded');
}

// ============ Initialization ============
async function init(): Promise<void> {
  // Initialize theme before getting elements
  initTheme();
  initSidebar();

  elements = getElements();

  // Update theme icon after elements are loaded
  updateThemeIcon(document.documentElement.classList.contains('dark-mode'));

  // Load markets from config file
  await loadMarketsConfig();
  await loadHolidaysConfig(); // Added this line

  // Load persisted state
  selectedMarketIds = getSelectedMarkets(DEFAULT_MARKETS);
  timeOverrides = getTimeOverrides();

  // Render UI
  renderMarketSelector();
  renderClocks();
  updateLocalTime();

  // Set up event listeners
  setupEventListeners();

  // Start update loop
  setInterval(() => {
    renderClocks();
    updateLocalTime();
  }, 1000);
}

// ============ Rendering ============
function renderMarketSelector(): void {
  const grouped = getMarketsByRegion();
  const regionOrder: Array<'Americas' | 'Europe' | 'Asia-Pacific'> = ['Asia-Pacific', 'Europe', 'Americas'];

  let html = '';

  for (const region of regionOrder) {
    const regionMarkets = grouped[region] || [];
    if (regionMarkets.length === 0) continue;

    html += `<div class="region-group">`;
    html += `<div class="region-title">${region}</div>`;

    for (const market of regionMarkets) {
      const isChecked = selectedMarketIds.includes(market.id);
      const countryCode = market.countryCode.toLowerCase();
      html += `
        <label class="market-item">
          <input type="checkbox" 
                 data-market-id="${market.id}" 
                 ${isChecked ? 'checked' : ''} />
          <img class="market-item-flag" src="https://flagcdn.com/w40/${countryCode}.png" alt="${market.country}" />
          <span class="market-item-name">${market.country}</span>
          <span class="market-item-code">${market.code}</span>
        </label>
      `;
    }

    html += `</div>`;
  }

  elements.marketSelector.innerHTML = html;

  // Add change listeners to checkboxes
  elements.marketSelector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', handleMarketToggle);
  });
}

/**
 * Render progress bar for trading day
 */
function renderProgressBar(
  market: typeof markets[0],
  status: ReturnType<typeof getMarketStatus>,
  openDate: Date,
  closeDate: Date
): string {
  const now = timeService.getNow();

  // Don't show progress bar on weekends or holidays when closed
  if (status.isWeekend || status.isTodayHoliday) {
    return '';
  }

  // If market is closed, show filled bar (100%)
  // This represents the last completed trading session
  if (!status.isOpen && !status.isOnLunch) {
    return `<div class="progress-bar-container">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: 100%;"></div>
      </div>
    </div>`;
  }

  // Check if market has lunch break
  const hasLunch = market.lunchStart && market.lunchEnd && status.lunchStart && status.lunchEnd;

  if (hasLunch && status.lunchStart && status.lunchEnd) {
    // Segmented progress bar for markets with lunch
    const morningDuration = status.lunchStart.getTime() - openDate.getTime();
    const afternoonDuration = closeDate.getTime() - status.lunchEnd.getTime();
    const totalTradingTime = morningDuration + afternoonDuration;

    // Calculate segment widths as percentage of total trading time
    const morningPercent = (morningDuration / totalTradingTime) * 100;
    const afternoonPercent = (afternoonDuration / totalTradingTime) * 100;

    // Calculate fill percentages
    let morningFill = 0;
    let afternoonFill = 0;

    if (now >= openDate && now < status.lunchStart) {
      // During morning session
      const elapsed = now.getTime() - openDate.getTime();
      morningFill = Math.min(100, (elapsed / morningDuration) * 100);
    } else if (now >= status.lunchStart && now < status.lunchEnd) {
      // On lunch break
      morningFill = 100;
    } else if (now >= status.lunchEnd && now < closeDate) {
      // During afternoon session
      morningFill = 100;
      const elapsed = now.getTime() - status.lunchEnd.getTime();
      afternoonFill = Math.min(100, (elapsed / afternoonDuration) * 100);
    }

    return `<div class="progress-bar-container">
      <div class="progress-bar-track segmented">
        <div class="progress-bar-segment" style="width: ${morningPercent}%;">
          <div class="progress-bar-fill" style="width: ${morningFill}%;"></div>
        </div>
        <div class="progress-bar-gap"></div>
        <div class="progress-bar-segment" style="width: ${afternoonPercent}%;">
          <div class="progress-bar-fill" style="width: ${afternoonFill}%;"></div>
        </div>
      </div>
    </div>`;
  } else {
    // Single progress bar for markets without lunch
    const totalDuration = closeDate.getTime() - openDate.getTime();
    const elapsed = now.getTime() - openDate.getTime();
    const fillPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    return `<div class="progress-bar-container">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${fillPercent}%;"></div>
      </div>
    </div>`;
  }
}

function renderClocks(): void {
  const selectedMarkets = markets.filter(m => selectedMarketIds.includes(m.id));

  if (selectedMarkets.length === 0) {
    elements.clockGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌍</div>
        <div class="empty-state-text">
          Select markets from the sidebar to display trading clocks
        </div>
      </div>
    `;
    return;
  }

  // Sort markets: open first, then by time until next event (stable within same time)
  const sortedMarkets = selectedMarkets
    .map((market, originalIndex) => ({
      market,
      status: getMarketStatus(market, timeOverrides[market.id] || {}),
      originalIndex
    }))
    .sort((a, b) => {
      // Open markets first
      if (a.status.isOpen && !b.status.isOpen) return -1;
      if (!a.status.isOpen && b.status.isOpen) return 1;
      // Within same status, sort by time until next event
      // but only if difference is more than 1 minute to avoid constant swapping
      const timeDiff = a.status.timeUntil - b.status.timeUntil;
      if (Math.abs(timeDiff) > 60000) {
        return timeDiff;
      }
      // Same time bracket - preserve original order
      return a.originalIndex - b.originalIndex;
    });

  let html = '';

  for (const { market, status } of sortedMarkets) {
    const override = timeOverrides[market.id];
    const hasOverride = override && (override.openTime || override.closeTime);
    const effectiveOpenTime = override?.openTime || market.openTime;
    const effectiveCloseTime = override?.closeTime || market.closeTime;

    // Determine status class
    let statusClass = 'is-closed';
    let statusText = 'Closed';

    if (status.isOnLunch) {
      statusClass = 'is-on-lunch';
      statusText = 'Lunch Break';
    } else if (status.isOpen) {
      // Check if closing soon (within 30 minutes)
      if (status.timeUntil < 30 * 60 * 1000 && status.nextEvent === 'closes') {
        statusClass = 'is-closing-soon';
        statusText = 'Closing Soon';
      } else if (status.nextEvent === 'lunch-starts' && status.timeUntil < 30 * 60 * 1000) {
        statusClass = 'is-open';
        statusText = 'Lunch Soon';
      } else {
        statusClass = 'is-open';
        statusText = 'Open';
      }
    } else if (!status.isWeekend && status.timeUntil < 30 * 60 * 1000) {
      statusClass = 'is-opening-soon';
      statusText = 'Opening Soon';
    }

    // Format current times
    const now = timeService.getNow();
    const marketTime = formatTimeInTimezone(now, market.timezone);
    const userTz = getUserTimezone();

    // Format open/close times in both timezones
    const openDate = parseTimeInTimezone(effectiveOpenTime, market.timezone);
    const closeDate = parseTimeInTimezone(effectiveCloseTime, market.timezone);

    const openMarketTime = formatTimeInTimezone(openDate, market.timezone);
    const openUserTime = formatTimeInTimezone(openDate, userTz);
    const closeMarketTime = formatTimeInTimezone(closeDate, market.timezone);
    const closeUserTime = formatTimeInTimezone(closeDate, userTz);

    // Countdown label based on next event
    let countdownLabel = 'Opens in';
    if (status.nextEvent === 'closes') countdownLabel = 'Closes in';
    else if (status.nextEvent === 'lunch-starts') countdownLabel = 'Lunch in';
    else if (status.nextEvent === 'reopens') countdownLabel = 'Reopens in';

    const countryCode = market.countryCode.toLowerCase();

    // Calculate progress bar
    const progressBarHtml = renderProgressBar(market, status, openDate, closeDate);

    html += `
      <div class="clock-card ${statusClass}" data-market-id="${market.id}">
        ${hasOverride ? '<div class="override-badge">Custom</div>' : ''}
        <div class="clock-header">
          <div class="clock-identity">
            <div class="clock-info">
              <h3>${market.name}</h3>
              <div class="clock-meta">
                <img class="clock-flag" src="https://flagcdn.com/w80/${countryCode}.png" alt="${market.country}" />
                <div class="clock-code">${market.code}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="clock-status-row">
          <div class="clock-status">
            <div class="status-indicator"></div>
            <div class="status-text">
              ${status.isTodayHoliday
        ? `Holiday: ${status.holidayName}`
        : status.holidayName
          ? `${statusText} · Next: ${status.holidayName}`
          : statusText
      }
            </div>
          </div>
          <div class="market-now">
            <span class="market-now-time">${marketTime.time}</span>
            <span class="market-now-tz">${marketTime.tzAbbrev}</span>
          </div>
        </div>
        
        <div class="clock-countdown">
          <div class="countdown-label">${status.isTodayHoliday ? 'Reopens in' : countdownLabel}</div>
          <div class="countdown-value">${formatCountdown(status.timeUntil)}</div>
        </div>
        
        ${progressBarHtml}
        
        <div class="clock-schedule">
          <div class="schedule-column">
            <div class="schedule-label">Opens</div>
            <div class="schedule-times">
              <div class="schedule-row">
                <span class="schedule-time">${openMarketTime.time}</span>
                <span class="schedule-tz">${openMarketTime.tzAbbrev}</span>
              </div>
              <div class="schedule-row">
                <span class="schedule-time">${openUserTime.time}</span>
                <span class="schedule-tz">${openUserTime.tzAbbrev}</span>
              </div>
            </div>
          </div>
          <div class="schedule-column">
            <div class="schedule-label">Closes</div>
            <div class="schedule-times">
              <div class="schedule-row">
                <span class="schedule-time">${closeMarketTime.time}</span>
                <span class="schedule-tz">${closeMarketTime.tzAbbrev}</span>
              </div>
              <div class="schedule-row">
                <span class="schedule-time">${closeUserTime.time}</span>
                <span class="schedule-tz">${closeUserTime.tzAbbrev}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  elements.clockGrid.innerHTML = html;
}

function updateLocalTime(): void {
  const now = timeService.getNow();
  const userTz = getUserTimezone();
  const { time, tzAbbrev } = formatTimeInTimezone(now, userTz);

  // Add seconds
  const seconds = String(now.getSeconds()).padStart(2, '0');
  // Add seconds correctly (handling hh:mmam format)
  const period = time.slice(-2); // am or pm
  const timeStr = time.slice(0, -2); // hh:mm
  const timeWithSeconds = `${timeStr}:${seconds}${period}`;

  elements.localTime.textContent = timeWithSeconds;
  elements.localDate.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  elements.localTz.textContent = tzAbbrev;

  // Update Time Travel Indicator
  if (timeService.isSimulationActive()) {
    elements.timeTravelIndicator.classList.add('is-visible');
  } else {
    elements.timeTravelIndicator.classList.remove('is-visible');
  }
}

// ============ Event Handlers ============
function setupEventListeners(): void {
  // Quick actions
  elements.btnSelectAll.addEventListener('click', () => {
    selectedMarketIds = markets.map(m => m.id);
    saveSelectedMarkets(selectedMarketIds);
    renderMarketSelector();
    renderClocks();
  });

  elements.btnDeselectAll.addEventListener('click', () => {
    selectedMarketIds = [];
    saveSelectedMarkets(selectedMarketIds);
    renderMarketSelector();
    renderClocks();
  });

  // Mobile menu
  elements.menuToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('is-open');
    elements.sidebarOverlay.classList.toggle('is-active');
  });

  // Sidebar toggle
  elements.sidebarToggle.addEventListener('click', toggleSidebar);

  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);

  elements.sidebarOverlay.addEventListener('click', () => {
    elements.sidebar.classList.remove('is-open');
    elements.sidebarOverlay.classList.remove('is-active');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('settings-modal');
      if (modal?.classList.contains('is-active')) {
        modal.classList.remove('is-active');
      }
    }
  });
}

function handleMarketToggle(e: Event): void {
  const target = e.target as HTMLInputElement;
  const marketId = target.dataset.marketId;
  if (!marketId) return;

  if (target.checked) {
    if (!selectedMarketIds.includes(marketId)) {
      selectedMarketIds.push(marketId);
    }
  } else {
    selectedMarketIds = selectedMarketIds.filter(id => id !== marketId);
  }

  saveSelectedMarkets(selectedMarketIds);
  renderClocks();
}



// ============ Start ============
document.addEventListener('DOMContentLoaded', init);

/**
 * Trading Clocks - Main Application (TypeScript)
 */

import './style.css';
import { markets, getMarketsByRegion, loadMarketsConfig } from './markets';
import {
  getMarketStatus,
  formatCountdown,
  formatTimeInTimezone,
  getUserTimezone,
  parseTimeInTimezone
} from './timezone';
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
const DEFAULT_MARKETS = ['nyse', 'tsx', 'lse', 'xetra', 'tse', 'hkex', 'asx'];

// ============ DOM Elements ============
interface Elements {
  clockGrid: HTMLElement;
  marketSelector: HTMLElement;
  localTime: HTMLElement;
  localTz: HTMLElement;
  btnSelectAll: HTMLButtonElement;
  btnDeselectAll: HTMLButtonElement;
  menuToggle: HTMLButtonElement;
  themeToggle: HTMLButtonElement;
  sidebar: HTMLElement;
  sidebarOverlay: HTMLElement;
}

function getElements(): Elements {
  return {
    clockGrid: document.getElementById('clock-grid')!,
    marketSelector: document.getElementById('market-selector')!,
    localTime: document.getElementById('local-time')!,
    localTz: document.getElementById('local-tz')!,
    btnSelectAll: document.getElementById('btn-select-all') as HTMLButtonElement,
    btnDeselectAll: document.getElementById('btn-deselect-all') as HTMLButtonElement,
    menuToggle: document.getElementById('menu-toggle') as HTMLButtonElement,
    themeToggle: document.getElementById('theme-toggle') as HTMLButtonElement,
    sidebar: document.getElementById('sidebar')!,
    sidebarOverlay: document.getElementById('sidebar-overlay')!
  };
}

let elements: Elements;

// ============ Theme ============
function initTheme(): void {
  const savedTheme = localStorage.getItem('trading-clocks-theme');
  const isDark = savedTheme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  updateThemeIcon(isDark);
}

function toggleTheme(): void {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('trading-clocks-theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark: boolean): void {
  if (elements?.themeToggle) {
    elements.themeToggle.textContent = isDark ? '☀️' : '🌙';
  }
}

// ============ Initialization ============
async function init(): Promise<void> {
  // Initialize theme before getting elements
  initTheme();

  elements = getElements();

  // Update theme icon after elements are loaded
  updateThemeIcon(document.body.classList.contains('dark-mode'));

  // Load markets from config file
  await loadMarketsConfig();

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
          <img class="market-item-flag" src="https://flagcdn.com/16x12/${countryCode}.png" alt="${market.country}" />
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

    if (status.isOpen) {
      // Check if closing soon (within 30 minutes)
      if (status.timeUntil < 30 * 60 * 1000) {
        statusClass = 'is-closing-soon';
        statusText = 'Closing Soon';
      } else {
        statusClass = 'is-open';
        statusText = 'Open';
      }
    } else if (!status.isWeekend && status.timeUntil < 30 * 60 * 1000) {
      statusClass = 'is-opening-soon';
      statusText = 'Opening Soon';
    }

    // Format current times
    const now = new Date();
    const marketTime = formatTimeInTimezone(now, market.timezone);
    const userTz = getUserTimezone();

    // Format open/close times in both timezones
    const openDate = parseTimeInTimezone(effectiveOpenTime, market.timezone);
    const closeDate = parseTimeInTimezone(effectiveCloseTime, market.timezone);

    const openMarketTime = formatTimeInTimezone(openDate, market.timezone);
    const openUserTime = formatTimeInTimezone(openDate, userTz);
    const closeMarketTime = formatTimeInTimezone(closeDate, market.timezone);
    const closeUserTime = formatTimeInTimezone(closeDate, userTz);

    // Countdown label
    const countdownLabel = status.nextEvent === 'opens' ? 'Opens in' : 'Closes in';
    const countryCode = market.countryCode.toLowerCase();

    html += `
      <div class="clock-card ${statusClass}" data-market-id="${market.id}">
        ${hasOverride ? '<div class="override-badge">Custom</div>' : ''}
        <div class="clock-header">
          <div class="clock-identity">
            <img class="clock-flag" src="https://flagcdn.com/24x18/${countryCode}.png" alt="${market.country}" />
            <div class="clock-info">
              <h3>${market.name}</h3>
              <div class="clock-code">${market.code}</div>
            </div>
          </div>
        </div>
        
        <div class="clock-status-row">
          <div class="clock-status">
            <div class="status-indicator"></div>
            <div class="status-text">${statusText}</div>
          </div>
          <div class="market-now">
            <span class="market-now-time">${marketTime.time}</span>
            <span class="market-now-tz">${marketTime.tzAbbrev}</span>
          </div>
        </div>
        
        <div class="clock-countdown">
          <div class="countdown-label">${countdownLabel}</div>
          <div class="countdown-value">${formatCountdown(status.timeUntil)}</div>
        </div>
        
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
  const now = new Date();
  const userTz = getUserTimezone();
  const { time, tzAbbrev } = formatTimeInTimezone(now, userTz);

  // Add seconds
  const seconds = String(now.getSeconds()).padStart(2, '0');
  // Add seconds correctly (handling hh:mmam format)
  const period = time.slice(-2); // am or pm
  const timeStr = time.slice(0, -2); // hh:mm
  const timeWithSeconds = `${timeStr}:${seconds}${period}`;

  elements.localTime.textContent = timeWithSeconds;
  elements.localTz.textContent = tzAbbrev;
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

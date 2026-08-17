/**
 * Trading Clocks - Main Application (TypeScript)
 */

// style.css is linked from index.html so it render-blocks in dev too
if (import.meta.env.DEV) {
  import('./debug'); // Initialize Debug UI only in development
}
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
  getTimeOverrides,
  saveTheme,
  getSidebarCollapsed,
  saveSidebarCollapsed
} from './storage';
import { TIMING, REGIONS, getFlagUrl, type Region } from './constants';
import { escapeHtml } from './htmlUtils';
import type { FormattedTime, TimeOverrides } from './types';

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
function toggleTheme(): void {
  const isDark = document.documentElement.classList.toggle('dark-mode');
  saveTheme(isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark: boolean): void {
  if (elements?.themeToggle) {
    elements.themeToggle.innerHTML = isDark
      ? '<img src="/icons/sun.svg" class="site-icon" alt="Light mode">'
      : '<img src="/icons/moon.svg" class="site-icon" alt="Dark mode">';
  }
}

// ============ Sidebar ============
function initSidebar(): void {
  if (getSidebarCollapsed()) {
    document.getElementById('sidebar')?.classList.add('is-collapsed');
  }
}

function toggleSidebar(): void {
  const sidebar = elements.sidebar;
  const isCollapsed = sidebar.classList.toggle('is-collapsed');
  saveSidebarCollapsed(isCollapsed);
}

// ============ Initialization ============
async function init(): Promise<void> {
  elements = getElements();
  initSidebar();

  // Update theme icon after elements are loaded
  updateThemeIcon(document.documentElement.classList.contains('dark-mode'));

  // Load markets and holidays from config files
  await Promise.all([loadMarketsConfig(), loadHolidaysConfig()]);

  // Load persisted state
  selectedMarketIds = getSelectedMarkets(DEFAULT_MARKETS);
  timeOverrides = getTimeOverrides();

  // Render UI
  renderMarketSelector();
  renderClocks();
  updateLocalTime();
  renderVersionInfo();

  // Set up event listeners
  setupEventListeners();

  // Start update loop
  setInterval(() => {
    renderClocks();
    updateLocalTime();
  }, TIMING.UPDATE_INTERVAL);
}

function renderVersionInfo(): void {
  const el = document.getElementById('footer-version');
  if (el) {
    el.textContent = `v${__APP_VERSION__} · `;
  }
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = String(timeService.getNow().getFullYear());
  }
}

// ============ Rendering ============
function renderMarketSelector(): void {
  const grouped = getMarketsByRegion();

  let html = '';

  for (const region of REGIONS) {
    const regionMarkets = grouped[region] || [];
    if (regionMarkets.length === 0) continue;

    // Calculate region selection state
    const regionMarketIds = regionMarkets.map(m => m.id);
    const selectedInRegion = regionMarketIds.filter(id => selectedMarketIds.includes(id));
    const allSelected = selectedInRegion.length === regionMarketIds.length;
    const noneSelected = selectedInRegion.length === 0;
    const indeterminate = !allSelected && !noneSelected;

    html += `<div class="region-group">`;
    html += `
      <div class="region-header">
        <input type="checkbox" 
               class="custom-checkbox region-checkbox"
               data-region="${region}"
               ${allSelected ? 'checked' : ''}
               ${indeterminate ? 'data-indeterminate="true"' : ''} />
        <div class="region-title">${region}</div>
      </div>
    `;

    for (const market of regionMarkets) {
      const isChecked = selectedMarketIds.includes(market.id);
      html += `
        <label class="market-item">
          <input type="checkbox"
                 class="custom-checkbox market-checkbox"
                 data-market-id="${escapeHtml(market.id)}"
                 data-region="${region}"
                 ${isChecked ? 'checked' : ''} />
          <img class="market-item-flag" src="${getFlagUrl(market.countryCode)}" alt="${escapeHtml(market.country)}" />
          <span class="market-item-name">${escapeHtml(market.country)}</span>
          <span class="market-item-code">${escapeHtml(market.code)}</span>
        </label>
      `;
    }

    html += `</div>`;
  }

  elements.marketSelector.innerHTML = html;

  // Set indeterminate state for region checkboxes (must be done via JS, not HTML)
  elements.marketSelector.querySelectorAll('.region-checkbox[data-indeterminate="true"]').forEach(cb => {
    (cb as HTMLInputElement).indeterminate = true;
  });

  // Add change listeners to market checkboxes
  elements.marketSelector.querySelectorAll('.market-checkbox').forEach(cb => {
    cb.addEventListener('change', handleMarketToggle);
  });

  // Add change listeners to region checkboxes
  elements.marketSelector.querySelectorAll('.region-checkbox').forEach(cb => {
    cb.addEventListener('change', handleRegionToggle);
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

  // If market is closed, show an empty bar before today's open and a filled
  // bar (100%) after close, representing the last completed trading session
  if (!status.isOpen && !status.isOnLunch) {
    const fillPercent = now < openDate ? 0 : 100;
    return `<div class="progress-bar-container">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${fillPercent}%;"></div>
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

/**
 * Everything on a clock card that changes from one tick to the next,
 * precomputed so full builds and in-place updates render identically.
 */
interface CardView {
  statusClass: string;
  statusLine: string; // plain text; escape before embedding in HTML
  marketTime: FormattedTime;
  countdownLabel: string;
  countdownValue: string;
  openMarketTime: FormattedTime;
  openUserTime: FormattedTime;
  closeMarketTime: FormattedTime;
  closeUserTime: FormattedTime;
  progressBarHtml: string;
  hasOverride: boolean;
}

function computeCardView(
  market: typeof markets[0],
  status: ReturnType<typeof getMarketStatus>
): CardView {
  const override = timeOverrides[market.id];
  const hasOverride = !!(override && (override.openTime || override.closeTime));
  // Prefer the status's session times: they include holiday adjustments
  // (early close, late open) that the raw config/override values don't
  const effectiveOpenTime = status.effectiveOpenTime || override?.openTime || market.openTime;
  const effectiveCloseTime = status.effectiveCloseTime || override?.closeTime || market.closeTime;

  // Determine status class
  let statusClass = 'is-closed';
  let statusText = 'Closed';

  if (status.isOnLunch) {
    statusClass = 'is-on-lunch';
    statusText = 'Lunch Break';
  } else if (status.isOpen) {
    // Check if closing soon (within 30 minutes)
    if (status.timeUntil < TIMING.CLOSING_SOON_THRESHOLD && status.nextEvent === 'closes') {
      statusClass = 'is-closing-soon';
      statusText = 'Closing Soon';
    } else if (status.nextEvent === 'lunch-starts' && status.timeUntil < TIMING.CLOSING_SOON_THRESHOLD) {
      statusClass = 'is-open';
      statusText = 'Lunch Soon';
    } else {
      statusClass = 'is-open';
      statusText = 'Open';
    }
  } else if (!status.isWeekend && status.timeUntil < TIMING.OPENING_SOON_THRESHOLD) {
    statusClass = 'is-opening-soon';
    statusText = 'Opening Soon';
  }

  const statusLine = status.isTodayHoliday
    ? `Holiday: ${status.holidayName}`
    : status.isEarlyCloseToday && status.holidayName
      ? `${statusText} · Early close: ${status.holidayName}`
      : status.holidayName
        ? `${statusText} · Next: ${status.holidayName}`
        : statusText;

  // Format current times
  const now = timeService.getNow();
  const marketTime = formatTimeInTimezone(now, market.timezone);
  const userTz = getUserTimezone();

  // Format open/close times in both timezones
  const openDate = parseTimeInTimezone(effectiveOpenTime, market.timezone);
  const closeDate = parseTimeInTimezone(effectiveCloseTime, market.timezone);

  // Countdown label based on next event
  let countdownLabel = 'Opens in';
  if (status.nextEvent === 'closes') countdownLabel = 'Closes in';
  else if (status.nextEvent === 'lunch-starts') countdownLabel = 'Lunch in';
  else if (status.nextEvent === 'reopens') countdownLabel = 'Reopens in';
  if (status.isTodayHoliday) countdownLabel = 'Reopens in';

  return {
    statusClass,
    statusLine,
    marketTime,
    countdownLabel,
    countdownValue: formatCountdown(status.timeUntil),
    openMarketTime: formatTimeInTimezone(openDate, market.timezone),
    openUserTime: formatTimeInTimezone(openDate, userTz),
    closeMarketTime: formatTimeInTimezone(closeDate, market.timezone),
    closeUserTime: formatTimeInTimezone(closeDate, userTz),
    progressBarHtml: renderProgressBar(market, status, openDate, closeDate),
    hasOverride
  };
}

// The elements updateCard touches carry no surrounding whitespace in this
// template, so their textContent round-trips exactly
function buildCardHtml(market: typeof markets[0], view: CardView): string {
  return `
      <div class="clock-card ${view.statusClass}" data-market-id="${escapeHtml(market.id)}">
        ${view.hasOverride ? '<div class="override-badge">Custom</div>' : ''}
        <div class="clock-header">
          <div class="clock-identity">
            <div class="clock-info">
              <h3>${escapeHtml(market.name)}</h3>
              <div class="clock-meta">
                <img class="clock-flag" src="${getFlagUrl(market.countryCode, 80)}" alt="${escapeHtml(market.country)}" />
                <div class="clock-code">${escapeHtml(market.code)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="clock-status-row">
          <div class="clock-status">
            <div class="status-indicator"></div>
            <div class="status-text">${escapeHtml(view.statusLine)}</div>
          </div>
          <div class="market-now">
            <span class="market-now-time">${view.marketTime.time}</span>
            <span class="market-now-tz">${view.marketTime.tzAbbrev}</span>
          </div>
        </div>

        <div class="clock-countdown">
          <div class="countdown-label">${view.countdownLabel}</div>
          <div class="countdown-value">${view.countdownValue}</div>
        </div>

        <div class="progress-bar-slot">${view.progressBarHtml}</div>

        <div class="clock-schedule">
          <div class="schedule-column">
            <div class="schedule-label">Opens</div>
            <div class="schedule-times">
              <div class="schedule-row">
                <span class="schedule-time">${view.openMarketTime.time}</span>
                <span class="schedule-tz">${view.openMarketTime.tzAbbrev}</span>
              </div>
              <div class="schedule-row">
                <span class="schedule-time">${view.openUserTime.time}</span>
                <span class="schedule-tz">${view.openUserTime.tzAbbrev}</span>
              </div>
            </div>
          </div>
          <div class="schedule-column">
            <div class="schedule-label">Closes</div>
            <div class="schedule-times">
              <div class="schedule-row">
                <span class="schedule-time">${view.closeMarketTime.time}</span>
                <span class="schedule-tz">${view.closeMarketTime.tzAbbrev}</span>
              </div>
              <div class="schedule-row">
                <span class="schedule-time">${view.closeUserTime.time}</span>
                <span class="schedule-tz">${view.closeUserTime.tzAbbrev}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
}

function setText(root: Element, selector: string, value: string): void {
  const el = root.querySelector(selector);
  if (el && el.textContent !== value) el.textContent = value;
}

function updateCard(market: typeof markets[0], view: CardView): void {
  const card = elements.clockGrid.querySelector(
    `.clock-card[data-market-id="${CSS.escape(market.id)}"]`
  );
  if (!card) return;

  const className = `clock-card ${view.statusClass}`;
  if (card.className !== className) card.className = className;

  setText(card, '.status-text', view.statusLine);
  setText(card, '.market-now-time', view.marketTime.time);
  setText(card, '.market-now-tz', view.marketTime.tzAbbrev);
  setText(card, '.countdown-label', view.countdownLabel);
  setText(card, '.countdown-value', view.countdownValue);

  const slot = card.querySelector('.progress-bar-slot');
  if (slot && slot.innerHTML !== view.progressBarHtml) slot.innerHTML = view.progressBarHtml;

  const times = card.querySelectorAll('.schedule-time');
  const tzs = card.querySelectorAll('.schedule-tz');
  [view.openMarketTime, view.openUserTime, view.closeMarketTime, view.closeUserTime]
    .forEach((formatted, i) => {
      if (times[i] && times[i].textContent !== formatted.time) times[i].textContent = formatted.time;
      if (tzs[i] && tzs[i].textContent !== formatted.tzAbbrev) tzs[i].textContent = formatted.tzAbbrev;
    });
}

// Market ids currently in the grid, in display order; null when the grid shows
// the empty state (or nothing yet)
let renderedCardOrder: string[] | null = null;

function renderClocks(): void {
  const selectedMarkets = markets.filter(m => selectedMarketIds.includes(m.id));

  if (selectedMarkets.length === 0) {
    if (renderedCardOrder !== null || !elements.clockGrid.querySelector('.empty-state')) {
      elements.clockGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌍</div>
        <div class="empty-state-text">
          Select markets from the sidebar to display trading clocks
        </div>
      </div>
    `;
      renderedCardOrder = null;
    }
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

  const order = sortedMarkets.map(entry => entry.market.id);
  const sameOrder = renderedCardOrder !== null
    && order.length === renderedCardOrder.length
    && order.every((id, i) => id === renderedCardOrder![i]);

  if (!sameOrder) {
    // Card set or order changed: rebuild the grid
    elements.clockGrid.innerHTML = sortedMarkets
      .map(({ market, status }) => buildCardHtml(market, computeCardView(market, status)))
      .join('');
    renderedCardOrder = order;
    return;
  }

  // Same cards in the same order: update only the mutable text and the
  // progress bar in place, so the DOM (and any text selection or hover state)
  // survives the per-second tick instead of being rebuilt from scratch
  for (const { market, status } of sortedMarkets) {
    updateCard(market, computeCardView(market, status));
  }
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
  elements.localDate.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: userTz });
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

  // Close sidebar when clicking a nav link
  document.querySelectorAll('.sidebar-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      elements.sidebar.classList.remove('is-open');
      elements.sidebarOverlay.classList.remove('is-active');
    });
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
  renderMarketSelector(); // Re-render to update region checkbox state
  renderClocks();
}

function handleRegionToggle(e: Event): void {
  const target = e.target as HTMLInputElement;
  const region = target.dataset.region as Region;
  if (!region) return;

  const grouped = getMarketsByRegion();
  const regionMarkets = grouped[region] || [];
  const regionMarketIds = regionMarkets.map(m => m.id);

  if (target.checked) {
    // Select all markets in this region
    regionMarketIds.forEach(id => {
      if (!selectedMarketIds.includes(id)) {
        selectedMarketIds.push(id);
      }
    });
  } else {
    // Deselect all markets in this region
    selectedMarketIds = selectedMarketIds.filter(id => !regionMarketIds.includes(id));
  }

  saveSelectedMarkets(selectedMarketIds);
  renderMarketSelector();
  renderClocks();
}



// ============ Start ============
document.addEventListener('DOMContentLoaded', init);

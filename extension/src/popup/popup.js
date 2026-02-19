// Default settings
const DEFAULTS = {
  stickyAncestorsEnabled: true,
  stickyDepth: 20,
  stickyCompact: true,
  stickyTheme: 'dark',
  manualColors: {
    bg: '#1e3a5f',
    text: '#e8f1f5',
    accent: '#4ecdc4',
    author: '#7fdbda'
  }
};

// DOM elements
const elements = {
  stickyAncestors: document.getElementById('stickyAncestors'),
  stickyDepth: document.getElementById('stickyDepth'),
  depthValue: document.getElementById('depthValue'),
  depthRow: document.getElementById('depthRow'),
  stickyCompact: document.getElementById('stickyCompact'),
  compactRow: document.getElementById('compactRow'),
  stickyTheme: document.getElementById('stickyTheme'),
  themeRow: document.getElementById('themeRow'),
  manualColorsRow: document.getElementById('manualColorsRow'),
  colorBg: document.getElementById('colorBg'),
  colorText: document.getElementById('colorText'),
  colorAccent: document.getElementById('colorAccent'),
  colorAuthor: document.getElementById('colorAuthor'),
  status: document.getElementById('status')
};

// Load settings from storage and populate UI
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get(DEFAULTS);

    // Populate UI with current values
    elements.stickyAncestors.checked = settings.stickyAncestorsEnabled;
    elements.stickyDepth.value = settings.stickyDepth;
    elements.depthValue.textContent = settings.stickyDepth;
    elements.stickyCompact.checked = settings.stickyCompact;
    elements.stickyTheme.value = settings.stickyTheme;

    // Manual colors
    const colors = settings.manualColors || DEFAULTS.manualColors;
    elements.colorBg.value = colors.bg;
    elements.colorText.value = colors.text;
    elements.colorAccent.value = colors.accent;
    elements.colorAuthor.value = colors.author;

    // Update sub-setting visibility
    updateSubSettings();
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Error loading settings');
  }
}

// Save a single setting to storage
async function saveSetting(key, value) {
  try {
    await chrome.storage.sync.set({ [key]: value });
    showStatus('Saved');
  } catch (error) {
    console.error('Failed to save setting:', error);
    showStatus('Error saving');
  }
}

// Update sub-setting visibility based on parent toggles
function updateSubSettings() {
  // Sticky ancestors sub-settings
  if (elements.stickyAncestors.checked) {
    elements.depthRow.classList.remove('disabled');
    elements.compactRow.classList.remove('disabled');
    elements.themeRow.classList.remove('disabled');
  } else {
    elements.depthRow.classList.add('disabled');
    elements.compactRow.classList.add('disabled');
    elements.themeRow.classList.add('disabled');
    elements.manualColorsRow.classList.add('disabled');
    return;
  }

  // Manual colors visibility
  if (elements.stickyTheme.value === 'manual') {
    elements.manualColorsRow.classList.remove('disabled');
  } else {
    elements.manualColorsRow.classList.add('disabled');
  }
}

// Show status message briefly
function showStatus(message) {
  elements.status.textContent = message;
  elements.status.classList.add('visible');

  setTimeout(() => {
    elements.status.classList.remove('visible');
  }, 1500);
}

// Save manual colors
async function saveManualColors() {
  const colors = {
    bg: elements.colorBg.value,
    text: elements.colorText.value,
    accent: elements.colorAccent.value,
    author: elements.colorAuthor.value
  };
  await saveSetting('manualColors', colors);
}

// Wire up event listeners
function setupEventListeners() {
  // Sticky ancestors toggle
  elements.stickyAncestors.addEventListener('change', (e) => {
    saveSetting('stickyAncestorsEnabled', e.target.checked);
    updateSubSettings();
  });

  // Sticky depth slider
  elements.stickyDepth.addEventListener('input', (e) => {
    elements.depthValue.textContent = e.target.value;
  });

  elements.stickyDepth.addEventListener('change', (e) => {
    const value = parseInt(e.target.value, 10);
    saveSetting('stickyDepth', value);
  });

  // Sticky compact toggle
  elements.stickyCompact.addEventListener('change', (e) => {
    saveSetting('stickyCompact', e.target.checked);
  });

  // Theme selector
  elements.stickyTheme.addEventListener('change', (e) => {
    saveSetting('stickyTheme', e.target.value);
    updateSubSettings();
  });

  // Manual color inputs
  elements.colorBg.addEventListener('change', saveManualColors);
  elements.colorText.addEventListener('change', saveManualColors);
  elements.colorAccent.addEventListener('change', saveManualColors);
  elements.colorAuthor.addEventListener('change', saveManualColors);
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

/**
 * main.js - Entry point for Thread Anchor content script
 *
 * Responsibilities:
 * - Load settings from chrome.storage.sync
 * - Listen for settings changes
 * - Initialize/deinitialize feature modules based on settings
 */

const ThreadAnchor = (() => {
  // Default settings (must match popup.js)
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

  // Current settings
  let settings = { ...DEFAULTS };

  // Module state
  let isInitialized = false;

  // Track current active comment for re-renders
  let currentActiveComment = null;

  /**
   * Load settings from storage
   * @returns {Promise<Object>} Settings object
   */
  async function loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(DEFAULTS);
      settings = { ...DEFAULTS, ...stored };
      return settings;
    } catch (error) {
      console.error('[ThreadAnchor] Failed to load settings:', error);
      return settings;
    }
  }

  /**
   * Handle settings changes from storage
   * @param {Object} changes - Storage changes object
   * @param {string} areaName - Storage area name
   */
  function handleSettingsChange(changes, areaName) {
    if (areaName !== 'sync') return;

    let needsStickyUpdate = false;
    let needsRerender = false;

    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in settings) {
        settings[key] = newValue;

        // Track which modules need updating
        if (key === 'stickyAncestorsEnabled') {
          needsStickyUpdate = true;
        }
        // These settings need immediate re-render
        if (key === 'stickyDepth' || key === 'stickyCompact' || key === 'stickyTheme' || key === 'manualColors') {
          needsRerender = true;
        }
      }
    }

    // Update modules as needed
    if (needsStickyUpdate) {
      updateStickyAncestors();
    } else if (needsRerender && settings.stickyAncestorsEnabled) {
      // Re-render with current active comment
      rerenderStickyUI();
    }
  }

  /**
   * Re-render the sticky UI with current state
   */
  function rerenderStickyUI() {
    if (typeof StickyUI === 'undefined') return;

    // Update theme
    StickyUI.setTheme(settings.stickyTheme, settings.manualColors);

    // Re-render if there's an active comment
    if (currentActiveComment) {
      handleActiveCommentChange(currentActiveComment);
    }
  }

  /**
   * Initialize or update the sticky ancestors module
   */
  function updateStickyAncestors() {
    if (typeof StickyUI === 'undefined' || typeof ActiveComment === 'undefined') {
      console.warn('[ThreadAnchor] StickyUI or ActiveComment module not loaded');
      return;
    }

    if (settings.stickyAncestorsEnabled) {
      // Initialize active comment tracking
      ActiveComment.init({
        onActiveChange: handleActiveCommentChange
      });

      // Initialize sticky UI with theme
      StickyUI.init({
        depth: settings.stickyDepth,
        compact: settings.stickyCompact,
        theme: settings.stickyTheme,
        manualColors: settings.manualColors
      });
    } else {
      ActiveComment.destroy();
      StickyUI.destroy();
      currentActiveComment = null;
    }
  }

  /**
   * Handle active comment changes
   * @param {Element|null} activeComment - The currently active comment element
   */
  function handleActiveCommentChange(activeComment) {
    if (!settings.stickyAncestorsEnabled) return;

    if (typeof Ancestors === 'undefined' || typeof StickyUI === 'undefined' || typeof Selectors === 'undefined') {
      return;
    }

    // Track current active comment for re-renders
    currentActiveComment = activeComment;

    // Always get the OP (original post) metadata
    const opMeta = Selectors.getOriginalPost();

    if (activeComment) {
      const fullChain = Ancestors.computeAncestors(activeComment);
      // Only show comment ancestors, not the active comment itself
      // Remove the last element (the active comment) from the chain
      const ancestorsOnly = fullChain.slice(0, -1);

      // Always render with OP as level 0, followed by comment ancestors
      // Even if there are no comment ancestors, we show the OP
      StickyUI.render(ancestorsOnly, settings.stickyDepth, settings.stickyCompact, activeComment, opMeta);
    } else {
      StickyUI.hide();
    }
  }

  /**
   * Initialize Thread Anchor
   */
  async function init() {
    if (isInitialized) return;

    console.log('[ThreadAnchor] Initializing...');

    // Load settings
    await loadSettings();

    // Listen for settings changes
    chrome.storage.onChanged.addListener(handleSettingsChange);

    // Initialize modules based on settings
    updateStickyAncestors();

    isInitialized = true;
    console.log('[ThreadAnchor] Initialized with settings:', settings);
  }

  /**
   * Destroy Thread Anchor (cleanup)
   */
  function destroy() {
    if (!isInitialized) return;

    console.log('[ThreadAnchor] Destroying...');

    // Remove settings listener
    chrome.storage.onChanged.removeListener(handleSettingsChange);

    // Cleanup modules
    if (typeof ActiveComment !== 'undefined') {
      ActiveComment.destroy();
    }
    if (typeof StickyUI !== 'undefined') {
      StickyUI.destroy();
    }

    currentActiveComment = null;
    isInitialized = false;
  }

  /**
   * Get current settings (for debugging)
   * @returns {Object} Current settings
   */
  function getSettings() {
    return { ...settings };
  }

  // Public API
  return {
    init,
    destroy,
    getSettings
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThreadAnchor.init());
} else {
  ThreadAnchor.init();
}

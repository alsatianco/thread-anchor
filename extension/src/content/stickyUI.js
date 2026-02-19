/**
 * stickyUI.js - Render the sticky ancestor header
 *
 * Creates a fixed header showing the ancestor chain of the currently
 * active comment, allowing users to maintain context while reading
 * deeply nested threads.
 */

const StickyUI = (() => {
  // Container element
  let container = null;

  // Style element for injected CSS
  let styleElement = null;

  // Module state
  let isActive = false;

  // Configuration
  let config = {
    depth: 3,
    compact: true,
    theme: 'dark',
    manualColors: null
  };

  // Track current chain to avoid unnecessary re-renders
  let currentChainIds = [];

  // Reddit header height (for positioning below it)
  let redditHeaderHeight = 0;

  // Currently highlighted active comment
  let currentActiveComment = null;

  // Theme palettes
  const THEMES = {
    dark: {
      // Deep ocean nautical theme
      bg: '#1e3a5f',
      bgGradient: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a7b 100%)',
      border: '#4ecdc4',
      rowBorder: 'rgba(255, 255, 255, 0.1)',
      rowHover: 'rgba(78, 205, 196, 0.15)',
      text: '#e8f1f5',
      textMuted: '#a8c5d6',
      textFaint: '#7a9bb5',
      accent: '#4ecdc4',
      accentHover: '#7fdbda',
      author: '#7fdbda',
      authorHover: '#a8f0ef',
      authorOp: '#ffd93d',
      authorOpHover: '#ffe566',
      authorAdmin: '#ff6b6b',
      authorMod: '#6bcb77',
      opRowBg: 'rgba(255, 217, 61, 0.1)',
      opRowBorder: 'rgba(255, 217, 61, 0.3)',
      opRowHover: 'rgba(255, 217, 61, 0.2)',
      activeCommentBg: '#e6f7f7',
      activeCommentBorder: '#4ecdc4'
    },
    light: {
      // Clean light nautical theme
      bg: '#f0f7fa',
      bgGradient: 'linear-gradient(135deg, #f0f7fa 0%, #e1eef5 100%)',
      border: '#2a9d8f',
      rowBorder: 'rgba(0, 0, 0, 0.08)',
      rowHover: 'rgba(42, 157, 143, 0.1)',
      text: '#264653',
      textMuted: '#5a7a8a',
      textFaint: '#7a9aaa',
      accent: '#2a9d8f',
      accentHover: '#21867a',
      author: '#2a9d8f',
      authorHover: '#21867a',
      authorOp: '#e76f51',
      authorOpHover: '#d45a3c',
      authorAdmin: '#e63946',
      authorMod: '#2d6a4f',
      opRowBg: 'rgba(231, 111, 81, 0.08)',
      opRowBorder: 'rgba(231, 111, 81, 0.25)',
      opRowHover: 'rgba(231, 111, 81, 0.15)',
      activeCommentBg: '#e8f5f2',
      activeCommentBorder: '#2a9d8f'
    }
  };

  /**
   * Detect if Reddit is using dark mode
   * @returns {boolean}
   */
  function detectRedditDarkMode() {
    // Check body background color
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg) {
      // Parse RGB values
      const match = bodyBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        // Calculate luminance - if dark, return true
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
      }
    }

    // Check for RES night mode
    if (document.body.classList.contains('res-nightmode')) {
      return true;
    }

    // Default to light
    return false;
  }

  /**
   * Get current theme colors
   * @returns {Object} Theme color palette
   */
  function getCurrentTheme() {
    if (config.theme === 'manual' && config.manualColors) {
      // Generate full palette from manual colors
      const mc = config.manualColors;
      const isDark = isColorDark(mc.bg);
      return {
        bg: mc.bg,
        bgGradient: mc.bg,
        border: mc.accent,
        rowBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        rowHover: hexToRgba(mc.accent, 0.15),
        text: mc.text,
        textMuted: adjustBrightness(mc.text, isDark ? -20 : 20),
        textFaint: adjustBrightness(mc.text, isDark ? -40 : 40),
        accent: mc.accent,
        accentHover: adjustBrightness(mc.accent, isDark ? 20 : -20),
        author: mc.author,
        authorHover: adjustBrightness(mc.author, isDark ? 20 : -20),
        authorOp: '#ffd93d',
        authorOpHover: '#ffe566',
        authorAdmin: '#ff6b6b',
        authorMod: '#6bcb77',
        opRowBg: hexToRgba(mc.accent, 0.1),
        opRowBorder: hexToRgba(mc.accent, 0.3),
        opRowHover: hexToRgba(mc.accent, 0.2),
        activeCommentBg: isDark ? '#e6f7f7' : '#e8f5f2',
        activeCommentBorder: mc.accent
      };
    }

    if (config.theme === 'auto') {
      return detectRedditDarkMode() ? THEMES.dark : THEMES.light;
    }

    return THEMES[config.theme] || THEMES.dark;
  }

  /**
   * Check if a hex color is dark
   * @param {string} hex - Hex color
   * @returns {boolean}
   */
  function isColorDark(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  }

  /**
   * Convert hex to RGB
   * @param {string} hex - Hex color
   * @returns {Object|null}
   */
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Convert hex to rgba
   * @param {string} hex - Hex color
   * @param {number} alpha - Alpha value
   * @returns {string}
   */
  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  /**
   * Adjust brightness of a hex color
   * @param {string} hex - Hex color
   * @param {number} amount - Amount to adjust (-100 to 100)
   * @returns {string}
   */
  function adjustBrightness(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const adjust = (c) => Math.max(0, Math.min(255, c + amount));
    return `#${[rgb.r, rgb.g, rgb.b].map(c => adjust(c).toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * Generate CSS for current theme
   * @returns {string}
   */
  function generateCSS() {
    const t = getCurrentTheme();
    return `
    #ta-sticky-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: ${t.bgGradient};
      border-bottom: 2px solid ${t.border};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-family: verdana, arial, helvetica, sans-serif;
      font-size: 14px;
      max-height: 40vh;
      overflow-y: auto;
      display: none;
    }

    #ta-sticky-container.visible {
      display: block;
    }

    /* Active comment indicator - Old Reddit */
    .thing.comment.ta-active-comment {
      position: relative;
    }

    /* Active comment indicator - New Reddit */
    shreddit-comment.ta-active-comment {
      position: relative;
    }

    /* Blue anchor square on the left side of active comment */
    .ta-active-icon {
      position: absolute;
      left: -6px;
      top: 8px;
      width: 24px;
      height: 24px;
      background: #1a73e8;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
      color: #fff;
      z-index: 10;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      pointer-events: none;
    }

    /* Old Reddit: position below the vote arrows to avoid covering them */
    .thing.comment.ta-active-comment > .ta-active-icon {
      left: 2px;
      top: 52px;
    }

    .ta-sticky-row {
      padding: 10px 14px;
      border-bottom: 1px solid ${t.rowBorder};
      cursor: pointer;
      transition: background-color 0.15s ease;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .ta-sticky-row:last-child {
      border-bottom: none;
    }

    .ta-sticky-row:hover {
      background: ${t.rowHover};
    }

    .ta-sticky-row.compact {
      padding: 6px 14px;
      align-items: center;
    }

    .ta-sticky-depth {
      color: ${t.accent};
      font-size: 12px;
      min-width: 24px;
      flex-shrink: 0;
      font-weight: bold;
    }

    .ta-sticky-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .ta-sticky-author {
      color: ${t.author};
      font-weight: bold;
      text-decoration: none;
    }

    .ta-sticky-author:hover {
      text-decoration: underline;
      color: ${t.authorHover};
    }

    .ta-sticky-author.op {
      color: ${t.authorOp};
    }

    .ta-sticky-author.op:hover {
      color: ${t.authorOpHover};
    }

    .ta-sticky-author.admin {
      color: ${t.authorAdmin};
    }

    .ta-sticky-author.moderator {
      color: ${t.authorMod};
    }

    .ta-sticky-score {
      color: ${t.textMuted};
      font-size: 13px;
    }

    .ta-sticky-time {
      color: ${t.textFaint};
      font-size: 12px;
    }

    .ta-sticky-excerpt {
      color: ${t.text};
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ta-sticky-row:not(.compact) .ta-sticky-excerpt {
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.4;
    }

    .ta-sticky-jump {
      color: ${t.accent};
      font-size: 14px;
      text-decoration: none;
      flex-shrink: 0;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background-color 0.15s ease;
    }

    .ta-sticky-jump:hover {
      background: ${t.rowHover};
      color: ${t.accentHover};
    }

    .ta-sticky-empty {
      padding: 10px 14px;
      color: ${t.textMuted};
      font-style: italic;
      text-align: center;
    }

    /* OP (Original Post) row styling */
    .ta-sticky-row.ta-op-row {
      background: ${t.opRowBg};
      border-bottom: 2px solid ${t.opRowBorder};
    }

    .ta-sticky-row.ta-op-row:hover {
      background: ${t.opRowHover};
    }

    .ta-sticky-title {
      color: ${t.authorOp};
      font-weight: bold;
      text-decoration: none;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ta-sticky-title:hover {
      text-decoration: underline;
      color: ${t.authorOpHover};
    }

    .ta-sticky-subreddit {
      color: ${t.textMuted};
      font-size: 12px;
    }
  `;
  }

  /**
   * Inject CSS styles into the page
   */
  function injectStyles() {
    if (styleElement) {
      // Update existing styles
      styleElement.textContent = generateCSS();
      return;
    }

    styleElement = document.createElement('style');
    styleElement.id = 'ta-sticky-styles';
    styleElement.textContent = generateCSS();
    document.head.appendChild(styleElement);
  }

  /**
   * Remove injected CSS styles
   */
  function removeStyles() {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    styleElement = null;
  }

  /**
   * Set the theme and update styles
   * @param {string} theme - Theme name ('dark', 'light', 'auto', 'manual')
   * @param {Object} manualColors - Manual color settings (for 'manual' theme)
   */
  function setTheme(theme, manualColors = null) {
    config.theme = theme;
    config.manualColors = manualColors;

    // Re-inject styles with new theme
    if (styleElement) {
      styleElement.textContent = generateCSS();
    }

    // Force re-render by clearing chain IDs
    currentChainIds = [];
  }

  /**
   * Detect Reddit header height
   * @returns {number} Header height in pixels
   */
  function detectRedditHeaderHeight() {
    const header = document.getElementById('header');
    if (header) {
      const rect = header.getBoundingClientRect();
      // Only count if header is at the top (not scrolled past)
      if (rect.top >= -rect.height) {
        return Math.max(0, rect.bottom);
      }
    }
    return 0;
  }

  /**
   * Create the sticky container element
   */
  function createContainer() {
    if (container) return;

    container = document.createElement('div');
    container.id = 'ta-sticky-container';
    document.body.appendChild(container);

    // Position below Reddit header
    updateContainerPosition();
  }

  /**
   * Update container position based on Reddit header
   */
  function updateContainerPosition() {
    if (!container) return;

    redditHeaderHeight = detectRedditHeaderHeight();
    container.style.top = `${redditHeaderHeight}px`;
  }


  /**
   * Create a sticky row element for a comment
   * @param {Element} comment - The comment element
   * @param {number} depth - Depth in the chain (0 = top-level)
   * @param {boolean} compact - Use compact mode
   * @returns {Element} The row element
   */
  function createRow(comment, depth, compact) {
    const meta = Selectors.getCommentMeta(comment);
    const commentId = Selectors.getCommentId(comment);

    const row = document.createElement('div');
    row.className = `ta-sticky-row${compact ? ' compact' : ''}`;
    row.dataset.commentId = commentId || '';

    // Depth indicator (depth 1 = top-level comment, depth 2+ = nested replies)
    const depthEl = document.createElement('span');
    depthEl.className = 'ta-sticky-depth';
    depthEl.textContent = `↳${depth}`;
    row.appendChild(depthEl);

    // Meta container
    const metaEl = document.createElement('span');
    metaEl.className = 'ta-sticky-meta';

    // Author
    const authorEl = document.createElement('span');
    authorEl.className = 'ta-sticky-author';
    authorEl.textContent = meta ? meta.author : '[unknown]';

    // Check for special author classes
    const authorLink = comment.querySelector('.entry .author');
    if (authorLink) {
      if (authorLink.classList.contains('submitter')) {
        authorEl.classList.add('op');
      }
      if (authorLink.classList.contains('admin')) {
        authorEl.classList.add('admin');
      }
      if (authorLink.classList.contains('moderator')) {
        authorEl.classList.add('moderator');
      }
    }

    metaEl.appendChild(authorEl);

    // Score
    if (meta && meta.score) {
      const scoreEl = document.createElement('span');
      scoreEl.className = 'ta-sticky-score';
      scoreEl.textContent = meta.score;
      metaEl.appendChild(scoreEl);
    }

    // Time (only in non-compact mode)
    if (!compact && meta && meta.time) {
      const timeEl = document.createElement('span');
      timeEl.className = 'ta-sticky-time';
      timeEl.textContent = meta.time;
      metaEl.appendChild(timeEl);
    }

    row.appendChild(metaEl);

    // Excerpt
    if (meta && meta.excerpt) {
      const excerptEl = document.createElement('span');
      excerptEl.className = 'ta-sticky-excerpt';
      excerptEl.textContent = meta.excerpt;
      row.appendChild(excerptEl);
    }

    // Jump link
    const jumpEl = document.createElement('a');
    jumpEl.className = 'ta-sticky-jump';
    jumpEl.href = '#';
    jumpEl.textContent = '↓';
    jumpEl.title = 'Jump to comment';
    jumpEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      scrollToComment(comment);
    });
    row.appendChild(jumpEl);

    // Click on row also scrolls to comment
    row.addEventListener('click', (e) => {
      if (e.target === jumpEl) return;
      scrollToComment(comment);
    });

    return row;
  }

  /**
   * Create a sticky row element for the original post (OP)
   * @param {Object} opMeta - The OP metadata from Selectors.getOriginalPost()
   * @param {boolean} compact - Use compact mode
   * @returns {Element} The row element
   */
  function createOPRow(opMeta, compact) {
    const row = document.createElement('div');
    row.className = `ta-sticky-row ta-op-row${compact ? ' compact' : ''}`;
    row.dataset.postId = opMeta.postId || 'op';

    // Depth indicator (always "OP" for original post)
    const depthEl = document.createElement('span');
    depthEl.className = 'ta-sticky-depth';
    depthEl.textContent = 'OP';
    row.appendChild(depthEl);

    // Meta container
    const metaEl = document.createElement('span');
    metaEl.className = 'ta-sticky-meta';

    // Subreddit
    if (opMeta.subreddit) {
      const subredditEl = document.createElement('span');
      subredditEl.className = 'ta-sticky-subreddit';
      subredditEl.textContent = opMeta.subreddit;
      metaEl.appendChild(subredditEl);
    }

    // Author
    if (opMeta.author) {
      const authorEl = document.createElement('span');
      authorEl.className = 'ta-sticky-author op';
      authorEl.textContent = opMeta.author;
      metaEl.appendChild(authorEl);
    }

    // Score
    if (opMeta.score) {
      const scoreEl = document.createElement('span');
      scoreEl.className = 'ta-sticky-score';
      scoreEl.textContent = opMeta.score;
      metaEl.appendChild(scoreEl);
    }

    row.appendChild(metaEl);

    // Title (as excerpt)
    if (opMeta.title) {
      const titleEl = document.createElement('a');
      titleEl.className = 'ta-sticky-title';
      titleEl.textContent = opMeta.title;
      titleEl.href = opMeta.url || '#';
      titleEl.title = opMeta.title;
      titleEl.addEventListener('click', (e) => {
        e.stopPropagation();
        // Let the link navigate normally
      });
      row.appendChild(titleEl);
    }

    // Jump link (scroll to top of page)
    const jumpEl = document.createElement('a');
    jumpEl.className = 'ta-sticky-jump';
    jumpEl.href = '#';
    jumpEl.textContent = '↑';
    jumpEl.title = 'Scroll to top';
    jumpEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    row.appendChild(jumpEl);

    // Click on row scrolls to top
    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    return row;
  }

  /**
   * Scroll to a comment
   * @param {Element} comment - The comment element
   */
  function scrollToComment(comment) {
    if (!comment || !document.contains(comment)) return;

    // Calculate offset (sticky header + Reddit header)
    const stickyHeight = container ? container.offsetHeight : 0;
    const offset = redditHeaderHeight + stickyHeight + 10;

    Util.scrollToElement(comment, {
      behavior: 'smooth',
      offset: offset
    });

    // Briefly highlight the comment
    highlightComment(comment);
  }

  /**
   * Briefly highlight a comment
   * @param {Element} comment - The comment element
   */
  function highlightComment(comment) {
    const originalBg = comment.style.backgroundColor;
    comment.style.backgroundColor = '#fff8dc';
    comment.style.transition = 'background-color 0.3s ease';

    setTimeout(() => {
      comment.style.backgroundColor = originalBg || '';
      setTimeout(() => {
        comment.style.transition = '';
      }, 300);
    }, 1000);
  }

  /**
   * Render the ancestor chain in the sticky header
   * @param {Element[]} chain - Array of ancestor comment elements (NOT including the active comment)
   * @param {number} depth - Number of ancestors to show
   * @param {boolean} compact - Use compact mode
   * @param {Element|null} activeComment - The currently active comment (for highlighting)
   * @param {Object|null} opMeta - Original post metadata (always shown as level 0)
   */
  function render(chain, depth, compact, activeComment = null, opMeta = null) {
    if (!isActive || !container) return;

    // Update config
    config.depth = depth;
    config.compact = compact;

    // Get the ancestors to display (up to depth, from the chain)
    // Note: depth applies to comment ancestors only, OP is always shown
    const displayChain = chain.slice(0, depth);

    // Build chain ID including OP and compact state
    const opId = opMeta ? (opMeta.postId || 'op') : '';
    const commentIds = displayChain.map(c => Selectors.getCommentId(c)).join(',');
    const newChainKey = `${opId}|${commentIds}|${compact}`;

    if (newChainKey === currentChainIds.join('') && container.classList.contains('visible')) {
      // Chain display hasn't changed, but active comment might have
      updateActiveHighlight(activeComment);
      return;
    }
    currentChainIds = [newChainKey];

    // Clear container
    container.innerHTML = '';

    // Always render OP row first (if available)
    if (opMeta) {
      const opRow = createOPRow(opMeta, compact);
      container.appendChild(opRow);
    }

    // Create rows for each ancestor comment (starting at depth 1 since OP is depth 0)
    displayChain.forEach((comment, index) => {
      const row = createRow(comment, index + 1, compact);
      container.appendChild(row);
    });

    // If we only have OP and no ancestors, still show the sticky header
    if (!opMeta && displayChain.length === 0) {
      hide();
      return;
    }

    // Highlight the active comment
    updateActiveHighlight(activeComment);

    // Show container
    container.classList.add('visible');

    // Update position
    updateContainerPosition();
  }

  /**
   * Update the highlight on the active comment
   * @param {Element|null} newActiveComment - The new active comment
   */
  function updateActiveHighlight(newActiveComment) {
    // Remove highlight and icon from previous active comment
    if (currentActiveComment && currentActiveComment !== newActiveComment) {
      currentActiveComment.classList.remove('ta-active-comment');
      const oldIcon = currentActiveComment.querySelector('.ta-active-icon');
      if (oldIcon) {
        oldIcon.remove();
      }
    }

    // Add anchor icon to new active comment
    if (newActiveComment && document.contains(newActiveComment)) {
      newActiveComment.classList.add('ta-active-comment');

      // Add blue anchor square if not already present
      if (!newActiveComment.querySelector('.ta-active-icon')) {
        const icon = document.createElement('span');
        icon.className = 'ta-active-icon';
        icon.textContent = '⚓';

        // Insert directly into the comment element (positioned absolutely on the left)
        newActiveComment.insertBefore(icon, newActiveComment.firstChild);
      }
    }

    currentActiveComment = newActiveComment;
  }

  /**
   * Hide the sticky header
   * @param {Element|null} activeComment - The currently active comment (to maintain highlighting)
   */
  function hide(activeComment = null) {
    if (!container) return;

    container.classList.remove('visible');
    container.innerHTML = '';
    currentChainIds = [];

    // Update active highlight (maintain highlight on active comment even when header is hidden)
    updateActiveHighlight(activeComment);
  }

  /**
   * Initialize the sticky UI
   * @param {Object} options - Configuration options
   * @param {number} options.depth - Number of ancestors to show
   * @param {boolean} options.compact - Use compact mode
   * @param {string} options.theme - Theme name
   * @param {Object} options.manualColors - Manual colors (for manual theme)
   */
  function init(options = {}) {
    if (isActive) {
      // Update config
      config = { ...config, ...options };
      // Re-inject styles in case theme changed
      injectStyles();
      return;
    }

    config = { ...config, ...options };
    isActive = true;

    // Inject styles
    injectStyles();

    // Create container
    createContainer();

    // Listen for scroll to update Reddit header position
    window.addEventListener('scroll', updateContainerPosition, { passive: true });

    console.log('[StickyUI] Initialized with config:', config);
  }

  /**
   * Destroy the sticky UI
   */
  function destroy() {
    if (!isActive) return;

    // Remove event listeners
    window.removeEventListener('scroll', updateContainerPosition);

    // Remove active highlight and icon
    if (currentActiveComment) {
      currentActiveComment.classList.remove('ta-active-comment');
      const icon = currentActiveComment.querySelector('.ta-active-icon');
      if (icon) {
        icon.remove();
      }
      currentActiveComment = null;
    }

    // Remove container
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;

    // Remove styles
    removeStyles();

    currentChainIds = [];
    isActive = false;

    console.log('[StickyUI] Destroyed');
  }

  /**
   * Check if the sticky UI is currently visible
   * @returns {boolean}
   */
  function isVisible() {
    return container && container.classList.contains('visible');
  }

  /**
   * Get current container height
   * @returns {number}
   */
  function getHeight() {
    return container ? container.offsetHeight : 0;
  }

  // Public API
  return {
    init,
    destroy,
    render,
    hide,
    isVisible,
    getHeight,
    updateContainerPosition,
    setTheme
  };
})();

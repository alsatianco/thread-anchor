/**
 * activeComment.js - Track the currently anchored comment via click
 *
 * Users click on a comment to "anchor" it, showing its ancestors
 * in the sticky header. Click again to toggle off, or click a
 * different comment to switch.
 *
 * Supports both old Reddit and new Reddit.
 */

const ActiveComment = (() => {
  // Module state
  let isActive = false;

  // Callback for active comment changes
  let onChangeCallback = null;

  // Current anchored comment
  let currentAnchored = null;

  /**
   * Find the comment element from a click target
   * Works for both old and new Reddit
   * @param {Element} target - The clicked element
   * @returns {Element|null} The comment element or null
   */
  function findCommentFromTarget(target) {
    // Use Selectors to handle both Reddit versions
    if (typeof Selectors === 'undefined') return null;

    // Walk up the DOM to find a comment element
    let current = target;
    while (current && current !== document.body) {
      if (Selectors.isCommentThing(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Check if the click target is within a clickable area (not just any part of comment)
   * This helps avoid triggering on link clicks, button clicks, etc.
   * @param {Element} target - The clicked element
   * @param {Element} comment - The comment element
   * @returns {boolean}
   */
  function isValidClickTarget(target, comment) {
    // Don't trigger on links (except if it's within the comment body)
    if (target.tagName === 'A') {
      // Allow clicks on comment body links to still anchor
      const isInBody = target.closest('.md, [slot="comment"], [data-testid="comment"]');
      if (!isInBody) return false;
    }

    // Don't trigger on buttons (vote buttons, collapse buttons, etc.)
    if (target.tagName === 'BUTTON') return false;

    // Don't trigger on input elements
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return false;

    // Don't trigger on vote arrows
    if (target.closest('.arrow, [data-click-id="upvote"], [data-click-id="downvote"]')) return false;

    // Don't trigger on expand/collapse controls
    if (target.closest('.expand, [data-testid="comment-collapse-toggle"]')) return false;

    return true;
  }

  /**
   * Handle click on a comment
   * @param {Event} event
   */
  function handleCommentClick(event) {
    if (!isActive) return;

    // Find the comment from the click target
    const comment = findCommentFromTarget(event.target);
    if (!comment) return;

    // Validate that this is a valid click target
    if (!isValidClickTarget(event.target, comment)) return;

    // Toggle: if clicking the same comment, deactivate
    if (comment === currentAnchored) {
      setAnchored(null);
    } else {
      setAnchored(comment);
    }
  }

  /**
   * Handle click outside comments (deactivate)
   * @param {Event} event
   */
  function handleDocumentClick(event) {
    if (!isActive || !currentAnchored) return;

    // Check if click is within a comment
    const comment = findCommentFromTarget(event.target);
    if (comment) return; // Handled by handleCommentClick

    // Check if click is within the sticky container (don't deactivate)
    const stickyContainer = event.target.closest('#ta-sticky-container');
    if (stickyContainer) return;

    // Click outside comments - deactivate
    setAnchored(null);
  }

  /**
   * Set the anchored comment and notify callback
   * @param {Element|null} comment
   */
  function setAnchored(comment) {
    if (comment === currentAnchored) return;

    currentAnchored = comment;

    if (onChangeCallback) {
      try {
        onChangeCallback(currentAnchored);
      } catch (error) {
        console.error('[ActiveComment] Callback error:', error);
      }
    }
  }

  /**
   * Initialize active comment tracking
   * @param {Object} options - Configuration options
   * @param {Function} options.onActiveChange - Callback when anchored comment changes
   */
  function init(options = {}) {
    if (isActive) return;

    onChangeCallback = options.onActiveChange || null;
    isActive = true;

    // Listen for clicks on comment entries
    document.addEventListener('click', handleCommentClick, true);

    // Listen for clicks outside comments (with slight delay to let comment click fire first)
    document.addEventListener('click', handleDocumentClick, false);

    const version = typeof Selectors !== 'undefined' ? Selectors.getRedditVersion() : 'unknown';
    console.log('[ActiveComment] Initialized (click-based) for', version, 'Reddit');
  }

  /**
   * Destroy active comment tracking
   */
  function destroy() {
    if (!isActive) return;

    // Remove event listeners
    document.removeEventListener('click', handleCommentClick, true);
    document.removeEventListener('click', handleDocumentClick, false);

    // Clear state
    currentAnchored = null;
    onChangeCallback = null;
    isActive = false;

    console.log('[ActiveComment] Destroyed');
  }

  /**
   * Get the currently anchored comment
   * @returns {Element|null}
   */
  function getActive() {
    return currentAnchored;
  }

  // Public API
  return {
    init,
    destroy,
    getActive
  };
})();

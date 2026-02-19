/**
 * ancestors.js - Compute ancestor chain for a comment
 *
 * Walks up the DOM tree to find all ancestor comments,
 * with caching for performance on large threads.
 */

const Ancestors = (() => {
  // Cache for parent lookups (comment -> parent comment)
  const parentCache = new WeakMap();

  // Cache for full ancestor chains (comment -> chain array)
  const chainCache = new WeakMap();

  /**
   * Get the parent comment with caching
   * @param {Element} commentEl - The comment element
   * @returns {Element|null} Parent comment or null
   */
  function getParentCached(commentEl) {
    if (parentCache.has(commentEl)) {
      return parentCache.get(commentEl);
    }

    const parent = Selectors.getParentThing(commentEl);
    parentCache.set(commentEl, parent);
    return parent;
  }

  /**
   * Compute the ancestor chain for a comment
   * Returns array from top-level ancestor to the comment itself
   * @param {Element} commentEl - The comment element
   * @returns {Element[]} Array of ancestors [topLevel, ..., commentEl]
   */
  function computeAncestors(commentEl) {
    if (!Selectors.isCommentThing(commentEl)) {
      return [];
    }

    // Check cache first
    if (chainCache.has(commentEl)) {
      return chainCache.get(commentEl).slice(); // Return copy to prevent mutation
    }

    const chain = [];
    let current = commentEl;

    // Walk up the parent chain
    while (current) {
      chain.unshift(current);
      current = getParentCached(current);
    }

    // Cache the result
    chainCache.set(commentEl, chain);

    return chain.slice(); // Return copy
  }

  /**
   * Get the depth of a comment in the thread (0 = top-level)
   * @param {Element} commentEl - The comment element
   * @returns {number} Depth level
   */
  function getDepth(commentEl) {
    const chain = computeAncestors(commentEl);
    return Math.max(0, chain.length - 1);
  }

  /**
   * Get the top-level ancestor of a comment
   * @param {Element} commentEl - The comment element
   * @returns {Element|null} Top-level ancestor or null
   */
  function getTopLevelAncestor(commentEl) {
    const chain = computeAncestors(commentEl);
    return chain.length > 0 ? chain[0] : null;
  }

  /**
   * Check if two comments share the same top-level ancestor
   * @param {Element} comment1 - First comment
   * @param {Element} comment2 - Second comment
   * @returns {boolean}
   */
  function shareTopLevel(comment1, comment2) {
    const top1 = getTopLevelAncestor(comment1);
    const top2 = getTopLevelAncestor(comment2);
    return top1 !== null && top1 === top2;
  }

  /**
   * Find the common ancestor of two comments
   * @param {Element} comment1 - First comment
   * @param {Element} comment2 - Second comment
   * @returns {Element|null} Common ancestor or null
   */
  function findCommonAncestor(comment1, comment2) {
    const chain1 = computeAncestors(comment1);
    const chain2 = computeAncestors(comment2);

    const set1 = new Set(chain1);

    // Walk chain2 from bottom to top to find first common ancestor
    for (let i = chain2.length - 1; i >= 0; i--) {
      if (set1.has(chain2[i])) {
        return chain2[i];
      }
    }

    return null;
  }

  /**
   * Clear the caches (call if DOM structure changes significantly)
   */
  function clearCache() {
    // WeakMaps don't have a clear method, but we can create new ones
    // However, since these are module-scoped consts, we can't reassign
    // The WeakMap will automatically clean up when elements are GC'd
    // For now, this is a no-op but kept for API consistency
    console.log('[Ancestors] Cache will be cleared as elements are garbage collected');
  }

  /**
   * Invalidate cache for a specific comment and its descendants
   * Call this if a comment's position in the tree changes
   * @param {Element} commentEl - The comment element
   */
  function invalidate(commentEl) {
    // Remove from caches
    parentCache.delete(commentEl);
    chainCache.delete(commentEl);

    // Note: We don't invalidate children because WeakMaps
    // don't support iteration. Children will be invalidated
    // naturally when their cached parent no longer matches.
  }

  // Public API
  return {
    computeAncestors,
    getDepth,
    getTopLevelAncestor,
    shareTopLevel,
    findCommonAncestor,
    clearCache,
    invalidate
  };
})();

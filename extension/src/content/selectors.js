/**
 * selectors.js - DOM selectors and helpers for Reddit comments
 *
 * Supports both old Reddit and new Reddit:
 *
 * Old Reddit DOM structure:
 * - Comments are `.thing.comment` elements
 * - Each has `data-fullname` attribute (e.g., "t1_abc123")
 * - Nesting is via `.child` containers
 *
 * New Reddit DOM structure:
 * - Uses `shreddit-comment` custom elements
 * - Each has `thingid` attribute (e.g., "t1_abc123")
 * - Nesting is via nested `shreddit-comment` elements
 */

const Selectors = (() => {
  // Cache for computed depths
  const depthCache = new WeakMap();

  // Cache for comment IDs
  const idCache = new WeakMap();

  // Cache for comment metadata
  const metaCache = new WeakMap();

  // Detect which Reddit version we're on
  let redditVersion = null;

  /**
   * Detect which version of Reddit we're on
   * @returns {string} 'old', 'new', or 'unknown'
   */
  function detectRedditVersion() {
    if (redditVersion) return redditVersion;

    // Check for old Reddit indicators
    if (document.querySelector('.thing.comment') ||
        document.querySelector('#siteTable') ||
        document.body.classList.contains('listing-page')) {
      redditVersion = 'old';
      console.log('[Selectors] Detected old Reddit');
      return redditVersion;
    }

    // Check for new Reddit (shreddit) indicators
    if (document.querySelector('shreddit-comment') ||
        document.querySelector('shreddit-app') ||
        document.querySelector('[data-testid="comment"]')) {
      redditVersion = 'new';
      console.log('[Selectors] Detected new Reddit');
      return redditVersion;
    }

    // Default to checking URL
    if (window.location.hostname === 'old.reddit.com') {
      redditVersion = 'old';
    } else {
      redditVersion = 'new';
    }

    console.log('[Selectors] Detected Reddit version from URL:', redditVersion);
    return redditVersion;
  }

  /**
   * Get the Reddit version
   * @returns {string} 'old' or 'new'
   */
  function getRedditVersion() {
    return detectRedditVersion();
  }

  // =====================
  // OLD REDDIT SELECTORS
  // =====================

  const OldReddit = {
    getAllCommentThings() {
      return Array.from(document.querySelectorAll('.thing.comment'));
    },

    isCommentThing(el) {
      if (!el || !(el instanceof Element)) return false;
      return el.classList.contains('thing') && el.classList.contains('comment');
    },

    getCommentId(el) {
      if (!this.isCommentThing(el)) return null;
      if (idCache.has(el)) return idCache.get(el);

      const id = el.getAttribute('data-fullname') || el.id || null;
      if (id) idCache.set(el, id);
      return id;
    },

    getExpandControl(el) {
      if (!this.isCommentThing(el)) return null;
      return el.querySelector(':scope > .entry a.expand') ||
             el.querySelector(':scope > .entry .expand');
    },

    isCollapsed(el) {
      if (!this.isCommentThing(el)) return false;
      if (el.classList.contains('collapsed')) return true;

      const expand = this.getExpandControl(el);
      if (expand && expand.textContent.trim().includes('[+]')) return true;
      return false;
    },

    getIndentDepth(el) {
      if (!this.isCommentThing(el)) return -1;
      if (depthCache.has(el)) return depthCache.get(el);

      let depth = 0;
      let current = el.parentElement;

      while (current) {
        if (current.classList.contains('siteTable') &&
            current.classList.contains('nestedlisting')) break;
        if (current.id && current.id.startsWith('siteTable')) break;
        if (current.classList.contains('child')) depth++;
        current = current.parentElement;
      }

      depthCache.set(el, depth);
      return depth;
    },

    getParentThing(el) {
      if (!this.isCommentThing(el)) return null;

      let current = el.parentElement;
      while (current) {
        if (current.classList.contains('child')) {
          const parentComment = current.parentElement;
          if (parentComment && this.isCommentThing(parentComment)) {
            return parentComment;
          }
        }
        if (current.classList.contains('siteTable')) return null;
        current = current.parentElement;
      }
      return null;
    },

    getCommentsContainer() {
      return document.querySelector('.siteTable.nestedlisting') ||
             document.querySelector('.commentarea > .siteTable') ||
             document.querySelector('.commentarea');
    },

    getCommentMeta(el) {
      if (!this.isCommentThing(el)) return null;
      if (metaCache.has(el)) return metaCache.get(el);

      const entry = el.querySelector(':scope > .entry');
      if (!entry) return null;

      const authorEl = entry.querySelector('.author');
      const author = authorEl ? authorEl.textContent.trim() : '[deleted]';

      const scoreEl = entry.querySelector('.score.unvoted, .score.likes, .score.dislikes');
      const score = scoreEl ? scoreEl.textContent.trim() : '';

      const timeEl = entry.querySelector('time');
      const time = timeEl ? timeEl.getAttribute('title') || timeEl.textContent.trim() : '';

      const bodyEl = entry.querySelector('.md');
      let excerpt = '';
      if (bodyEl) {
        excerpt = bodyEl.textContent.trim().slice(0, 150);
        if (bodyEl.textContent.length > 150) excerpt += '...';
      }

      const meta = { author, score, time, excerpt };
      metaCache.set(el, meta);
      return meta;
    },

    getOriginalPost() {
      const postEl = document.querySelector('.thing.link') ||
                     document.querySelector('#siteTable .thing');

      let title = '', url = '';
      const titleEl = document.querySelector('.top-matter .title a.title') ||
                      document.querySelector('a.title');
      if (titleEl) {
        title = titleEl.textContent.trim();
        url = titleEl.href || '';
      }

      let author = '';
      const authorEl = document.querySelector('.top-matter .tagline .author') ||
                       document.querySelector('.thing.link .author') ||
                       document.querySelector('.tagline .author');
      if (authorEl) author = authorEl.textContent.trim();

      let score = '';
      const scoreEl = document.querySelector('.thing.link .score.unvoted') ||
                      document.querySelector('.thing.link .score.likes') ||
                      document.querySelector('.linkinfo .score .number');
      if (scoreEl) score = scoreEl.textContent.trim();

      let subreddit = '';
      const subredditEl = document.querySelector('.thing.link .subreddit') ||
                          document.querySelector('.redditname a');
      if (subredditEl) subreddit = subredditEl.textContent.trim();

      let postId = '';
      if (postEl) {
        postId = postEl.getAttribute('data-fullname') || postEl.id || 'op';
      } else {
        const match = window.location.pathname.match(/\/comments\/([a-z0-9]+)/i);
        if (match) postId = 't3_' + match[1];
      }

      if (!title) return null;
      return { title, author, score, subreddit, url, postId, element: postEl };
    }
  };

  // =====================
  // NEW REDDIT SELECTORS
  // =====================

  const NewReddit = {
    getAllCommentThings() {
      // New Reddit uses shreddit-comment custom elements
      const shredditComments = Array.from(document.querySelectorAll('shreddit-comment'));
      if (shredditComments.length > 0) return shredditComments;

      // Fallback: try other new Reddit patterns
      return Array.from(document.querySelectorAll('[data-testid="comment"]'));
    },

    isCommentThing(el) {
      if (!el || !(el instanceof Element)) return false;
      return el.tagName.toLowerCase() === 'shreddit-comment' ||
             el.getAttribute('data-testid') === 'comment';
    },

    getCommentId(el) {
      if (!this.isCommentThing(el)) return null;
      if (idCache.has(el)) return idCache.get(el);

      // shreddit-comment uses thingid attribute
      let id = el.getAttribute('thingid') ||
               el.getAttribute('data-fullname') ||
               el.getAttribute('id');

      // Try to extract from permalink
      if (!id) {
        const permalink = el.getAttribute('permalink');
        if (permalink) {
          const match = permalink.match(/\/comment\/([a-z0-9]+)/i);
          if (match) id = 't1_' + match[1];
        }
      }

      if (id) idCache.set(el, id);
      return id;
    },

    getExpandControl(el) {
      if (!this.isCommentThing(el)) return null;
      // New Reddit collapse is handled differently
      return el.querySelector('[data-testid="comment-collapse-toggle"]') ||
             el.querySelector('button[aria-label*="collapse"]') ||
             el.querySelector('button[aria-label*="Collapse"]');
    },

    isCollapsed(el) {
      if (!this.isCommentThing(el)) return false;

      // Check for collapsed attribute
      if (el.hasAttribute('collapsed')) return el.getAttribute('collapsed') === 'true';

      // Check for aria-expanded
      const toggle = this.getExpandControl(el);
      if (toggle && toggle.getAttribute('aria-expanded') === 'false') return true;

      return false;
    },

    getIndentDepth(el) {
      if (!this.isCommentThing(el)) return -1;
      if (depthCache.has(el)) return depthCache.get(el);

      // New Reddit: depth attribute or count parent shreddit-comments
      let depth = parseInt(el.getAttribute('depth') || '0', 10);

      if (!depth) {
        // Count ancestor shreddit-comment elements
        let current = el.parentElement;
        while (current) {
          if (current.tagName && current.tagName.toLowerCase() === 'shreddit-comment') {
            depth++;
          }
          // Stop at comment tree root
          if (current.tagName && current.tagName.toLowerCase() === 'shreddit-comment-tree') {
            break;
          }
          current = current.parentElement;
        }
      }

      depthCache.set(el, depth);
      return depth;
    },

    getParentThing(el) {
      if (!this.isCommentThing(el)) return null;

      // Find parent shreddit-comment
      let current = el.parentElement;
      while (current) {
        if (this.isCommentThing(current)) {
          return current;
        }
        // Stop at comment tree root
        if (current.tagName && current.tagName.toLowerCase() === 'shreddit-comment-tree') {
          return null;
        }
        current = current.parentElement;
      }
      return null;
    },

    getCommentsContainer() {
      return document.querySelector('shreddit-comment-tree') ||
             document.querySelector('[data-testid="comments-page-container"]') ||
             document.querySelector('#comment-tree') ||
             document.querySelector('div[id*="comment"]');
    },

    getCommentMeta(el) {
      if (!this.isCommentThing(el)) return null;
      if (metaCache.has(el)) return metaCache.get(el);

      // Author - try attribute first, then DOM
      let author = el.getAttribute('author') || '';
      if (!author) {
        const authorEl = el.querySelector('[data-testid="comment_author_link"]') ||
                        el.querySelector('a[href*="/user/"]');
        if (authorEl) author = authorEl.textContent.trim().replace(/^u\//, '');
      }
      if (!author) author = '[deleted]';

      // Score
      let score = el.getAttribute('score') || '';
      if (!score) {
        const scoreEl = el.querySelector('[data-testid="score"]') ||
                       el.querySelector('faceplate-number') ||
                       el.querySelector('[id*="vote-arrows"] span');
        if (scoreEl) score = scoreEl.textContent.trim();
      }

      // Time
      let time = '';
      const timeEl = el.querySelector('time') ||
                    el.querySelector('faceplate-timeago') ||
                    el.querySelector('[data-testid="comment_timestamp"]');
      if (timeEl) {
        time = timeEl.getAttribute('title') ||
               timeEl.getAttribute('ts') ||
               timeEl.textContent.trim();
      }

      // Excerpt - find comment body
      let excerpt = '';
      const bodyEl = el.querySelector('[slot="comment"]') ||
                    el.querySelector('[data-testid="comment"]') ||
                    el.querySelector('div[id*="comment-content"]') ||
                    el.querySelector('p');
      if (bodyEl) {
        excerpt = bodyEl.textContent.trim().slice(0, 150);
        if (bodyEl.textContent.length > 150) excerpt += '...';
      }

      const meta = { author, score, time, excerpt };
      metaCache.set(el, meta);
      return meta;
    },

    getOriginalPost() {
      // Try shreddit-post element
      const postEl = document.querySelector('shreddit-post') ||
                     document.querySelector('[data-testid="post-container"]');

      let title = '';
      let url = window.location.href;

      // Get title from post element or page
      if (postEl) {
        title = postEl.getAttribute('post-title') || '';
      }
      if (!title) {
        const titleEl = document.querySelector('h1[slot="title"]') ||
                       document.querySelector('[data-testid="post-title"]') ||
                       document.querySelector('h1');
        if (titleEl) title = titleEl.textContent.trim();
      }

      // Author
      let author = '';
      if (postEl) {
        author = postEl.getAttribute('author') || '';
      }
      if (!author) {
        const authorEl = document.querySelector('shreddit-post [data-testid="post_author_link"]') ||
                        document.querySelector('a[href*="/user/"]');
        if (authorEl) author = authorEl.textContent.trim().replace(/^u\//, '');
      }

      // Score
      let score = '';
      if (postEl) {
        score = postEl.getAttribute('score') || '';
      }
      if (!score) {
        const scoreEl = document.querySelector('shreddit-post faceplate-number') ||
                       document.querySelector('[data-testid="post-score"]');
        if (scoreEl) score = scoreEl.textContent.trim();
      }

      // Subreddit
      let subreddit = '';
      if (postEl) {
        subreddit = postEl.getAttribute('subreddit-prefixed-name') ||
                   postEl.getAttribute('subreddit-name') || '';
      }
      if (!subreddit) {
        const match = window.location.pathname.match(/\/r\/([^\/]+)/);
        if (match) subreddit = 'r/' + match[1];
      }

      // Post ID
      let postId = '';
      if (postEl) {
        postId = postEl.getAttribute('id') ||
                postEl.getAttribute('thingid') || '';
      }
      if (!postId) {
        const match = window.location.pathname.match(/\/comments\/([a-z0-9]+)/i);
        if (match) postId = 't3_' + match[1];
      }

      if (!title) return null;
      return { title, author, score, subreddit, url, postId, element: postEl };
    }
  };

  // =====================
  // UNIFIED API
  // =====================

  /**
   * Get the appropriate selector object based on Reddit version
   */
  function getSelectors() {
    return detectRedditVersion() === 'old' ? OldReddit : NewReddit;
  }

  /**
   * Get all comment elements on the page
   * @returns {Element[]} Array of comment elements
   */
  function getAllCommentThings() {
    return getSelectors().getAllCommentThings();
  }

  /**
   * Check if an element is a comment thing
   * @param {Element} el - Element to check
   * @returns {boolean}
   */
  function isCommentThing(el) {
    return getSelectors().isCommentThing(el);
  }

  /**
   * Get the unique ID for a comment (cached)
   * @param {Element} el - Comment element
   * @returns {string|null} Comment ID (e.g., "t1_abc123") or null
   */
  function getCommentId(el) {
    return getSelectors().getCommentId(el);
  }

  /**
   * Get the expand/collapse control element for a comment
   * @param {Element} el - Comment element
   * @returns {Element|null} The clickable expand control or null
   */
  function getExpandControl(el) {
    return getSelectors().getExpandControl(el);
  }

  /**
   * Check if a comment is currently collapsed
   * @param {Element} el - Comment element
   * @returns {boolean}
   */
  function isCollapsed(el) {
    return getSelectors().isCollapsed(el);
  }

  /**
   * Get the nesting depth of a comment (0 = top-level)
   * @param {Element} el - Comment element
   * @returns {number} Depth level (0 for top-level)
   */
  function getIndentDepth(el) {
    return getSelectors().getIndentDepth(el);
  }

  /**
   * Get the parent comment element
   * @param {Element} el - Comment element
   * @returns {Element|null} Parent comment element or null if top-level
   */
  function getParentThing(el) {
    return getSelectors().getParentThing(el);
  }

  /**
   * Get the comments container element
   * @returns {Element|null}
   */
  function getCommentsContainer() {
    return getSelectors().getCommentsContainer();
  }

  /**
   * Extract comment metadata for display (cached)
   * @param {Element} el - Comment element
   * @returns {Object|null} Object with author, score, time, body excerpt
   */
  function getCommentMeta(el) {
    return getSelectors().getCommentMeta(el);
  }

  /**
   * Get all "load more comments" elements on the page
   * @returns {Element[]} Array of morecomments elements
   */
  function getAllMoreComments() {
    if (detectRedditVersion() === 'old') {
      return Array.from(document.querySelectorAll('.morecomments a, .morerecursion a'));
    }
    // New Reddit - "load more" is typically a button or link
    return Array.from(document.querySelectorAll(
      'button[data-testid="load-more-comments"],' +
      'faceplate-partial[loading="action"],' +
      '[slot="more-comments-permalink"]'
    ));
  }

  /**
   * Check if an element is a "load more comments" link
   * @param {Element} el - Element to check
   * @returns {boolean}
   */
  function isMoreCommentsLink(el) {
    if (!el || !(el instanceof Element)) return false;

    if (detectRedditVersion() === 'old') {
      return el.closest('.morecomments, .morerecursion') !== null;
    }

    return el.matches('button[data-testid="load-more-comments"]') ||
           el.closest('faceplate-partial[loading="action"]') !== null;
  }

  /**
   * Get the clickable link from a morecomments container
   * @param {Element} el - The morecomments container or link
   * @returns {Element|null} The clickable link
   */
  function getMoreCommentsLink(el) {
    if (!el) return null;
    if (el.tagName === 'A' || el.tagName === 'BUTTON') return el;
    return el.querySelector('a, button') || null;
  }

  /**
   * Get the original post (OP) metadata
   * @returns {Object|null} Object with title, author, score, subreddit, url, element
   */
  function getOriginalPost() {
    return getSelectors().getOriginalPost();
  }

  // Public API
  return {
    getRedditVersion,
    getAllCommentThings,
    isCommentThing,
    getCommentId,
    getExpandControl,
    isCollapsed,
    getIndentDepth,
    getParentThing,
    getCommentsContainer,
    getCommentMeta,
    getAllMoreComments,
    isMoreCommentsLink,
    getMoreCommentsLink,
    getOriginalPost
  };
})();

/**
 * util.js - Shared utility functions
 */

const Util = (() => {
  /**
   * Debounce a function - only execute after the specified delay
   * has passed since the last invocation
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(fn, delay) {
    let timeoutId = null;

    const debounced = function (...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        timeoutId = null;
      }, delay);
    };

    debounced.cancel = function () {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return debounced;
  }

  /**
   * Throttle a function - execute at most once per specified interval
   * @param {Function} fn - Function to throttle
   * @param {number} interval - Minimum interval between executions in milliseconds
   * @returns {Function} Throttled function
   */
  function throttle(fn, interval) {
    let lastTime = 0;
    let timeoutId = null;

    const throttled = function (...args) {
      const now = Date.now();
      const remaining = interval - (now - lastTime);

      if (remaining <= 0) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        lastTime = now;
        fn.apply(this, args);
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastTime = Date.now();
          timeoutId = null;
          fn.apply(this, args);
        }, remaining);
      }
    };

    throttled.cancel = function () {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return throttled;
  }

  /**
   * Request animation frame with fallback
   * @param {Function} fn - Function to execute
   * @returns {number} Request ID
   */
  function raf(fn) {
    return (window.requestAnimationFrame || window.setTimeout)(fn, 16);
  }

  /**
   * Cancel animation frame with fallback
   * @param {number} id - Request ID to cancel
   */
  function cancelRaf(id) {
    (window.cancelAnimationFrame || window.clearTimeout)(id);
  }

  /**
   * Create a simple event emitter
   * @returns {Object} Event emitter with on, off, emit methods
   */
  function createEmitter() {
    const listeners = new Map();

    return {
      on(event, callback) {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event).add(callback);
      },

      off(event, callback) {
        if (listeners.has(event)) {
          listeners.get(event).delete(callback);
        }
      },

      emit(event, data) {
        if (listeners.has(event)) {
          listeners.get(event).forEach(callback => {
            try {
              callback(data);
            } catch (e) {
              console.error('Event listener error:', e);
            }
          });
        }
      },

      clear() {
        listeners.clear();
      }
    };
  }

  /**
   * Clamp a number between min and max
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Check if an element is in the viewport
   * @param {Element} el - Element to check
   * @param {number} buffer - Buffer in pixels
   * @returns {boolean}
   */
  function isInViewport(el, buffer = 0) {
    const rect = el.getBoundingClientRect();
    return (
      rect.bottom >= -buffer &&
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) + buffer
    );
  }

  /**
   * Scroll to an element smoothly
   * @param {Element} el - Element to scroll to
   * @param {Object} options - Scroll options
   */
  function scrollToElement(el, options = {}) {
    const {
      behavior = 'smooth',
      block = 'start',
      offset = 0
    } = options;

    if (offset === 0) {
      el.scrollIntoView({ behavior, block });
    } else {
      const rect = el.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - offset;

      window.scrollTo({
        top: targetY,
        behavior
      });
    }
  }

  // ============================================
  // Performance measurement utilities
  // ============================================

  // Performance metrics storage
  const perfMetrics = {
    enabled: false,
    samples: new Map()
  };

  /**
   * Enable/disable performance tracking
   * @param {boolean} enabled
   */
  function setPerfEnabled(enabled) {
    perfMetrics.enabled = enabled;
    if (!enabled) {
      perfMetrics.samples.clear();
    }
  }

  /**
   * Start timing a named operation
   * @param {string} name - Operation name
   * @returns {Function} End function that returns duration
   */
  function perfStart(name) {
    if (!perfMetrics.enabled) {
      return () => 0;
    }

    const start = performance.now();

    return function perfEnd() {
      const duration = performance.now() - start;

      if (!perfMetrics.samples.has(name)) {
        perfMetrics.samples.set(name, []);
      }

      const samples = perfMetrics.samples.get(name);
      samples.push(duration);

      // Keep only last 100 samples
      if (samples.length > 100) {
        samples.shift();
      }

      return duration;
    };
  }

  /**
   * Measure a function's execution time
   * @param {string} name - Operation name
   * @param {Function} fn - Function to measure
   * @returns {*} Function result
   */
  function perfMeasure(name, fn) {
    const end = perfStart(name);
    try {
      return fn();
    } finally {
      end();
    }
  }

  /**
   * Get performance statistics for a named operation
   * @param {string} name - Operation name
   * @returns {Object|null} Stats object with min, max, avg, count
   */
  function perfStats(name) {
    const samples = perfMetrics.samples.get(name);
    if (!samples || samples.length === 0) {
      return null;
    }

    const sum = samples.reduce((a, b) => a + b, 0);
    const avg = sum / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);

    return {
      name,
      count: samples.length,
      avg: avg.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      total: sum.toFixed(2)
    };
  }

  /**
   * Get all performance statistics
   * @returns {Object[]} Array of stats objects
   */
  function perfAllStats() {
    const stats = [];
    for (const name of perfMetrics.samples.keys()) {
      stats.push(perfStats(name));
    }
    return stats;
  }

  /**
   * Log all performance statistics to console
   */
  function perfLog() {
    const stats = perfAllStats();
    if (stats.length === 0) {
      console.log('[Perf] No metrics collected. Enable with Util.setPerfEnabled(true)');
      return;
    }

    console.group('[Perf] Thread Anchor Performance Metrics');
    console.table(stats);
    console.groupEnd();
  }

  /**
   * Clear all performance metrics
   */
  function perfClear() {
    perfMetrics.samples.clear();
  }

  // Public API
  return {
    debounce,
    throttle,
    raf,
    cancelRaf,
    createEmitter,
    clamp,
    isInViewport,
    scrollToElement,
    // Performance utilities
    setPerfEnabled,
    perfStart,
    perfMeasure,
    perfStats,
    perfAllStats,
    perfLog,
    perfClear
  };
})();

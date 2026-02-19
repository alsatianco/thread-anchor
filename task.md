# task.md — Thread Anchor Implementation Tasks

## Phase 1: Project Setup & Foundation

### Task 1.1: Create project structure
- [x] Create `extension/` directory
- [x] Create `extension/src/content/` directory
- [x] Create `extension/src/popup/` directory
- [x] Create `extension/assets/` directory

### Task 1.2: Create manifest.json (MV3)
- [x] Create `extension/manifest.json`
- [x] Set manifest_version to 3
- [x] Configure content_scripts to match `https://old.reddit.com/r/*/comments/*`
- [x] Add `storage` permission
- [x] Configure popup action
- [x] Reference icon assets (16, 48, 128)

### Task 1.3: Create placeholder icons
- [x] Create `extension/assets/icon16.png`
- [x] Create `extension/assets/icon48.png`
- [x] Create `extension/assets/icon128.png`

---

## Phase 2: Popup & Settings

### Task 2.1: Create popup HTML
- [x] Create `extension/src/popup/popup.html`
- [x] Add toggle for "Sticky ancestors"
- [x] Add slider/number input for "Pinned rows (N)"
- [x] Add optional checkbox for "Compact sticky rows"

### Task 2.2: Create popup CSS
- [x] Create `extension/src/popup/popup.css`
- [x] Style toggles and controls
- [x] Keep UI clean and minimal

### Task 2.3: Create popup JS with storage wiring
- [x] Create `extension/src/popup/popup.js`
- [x] Implement `chrome.storage.sync` read/write
- [x] Set defaults:
  - `stickyAncestorsEnabled: true`
  - `stickyDepth: 3`
  - `stickyCompact: true`
- [x] Wire UI controls to storage updates

---

## Phase 3: Content Script Foundation

### Task 3.1: Create selectors.js
- [x] Create `extension/src/content/selectors.js`
- [x] Implement `getAllCommentThings()` — returns all comment elements
- [x] Implement `isCommentThing(el)` — checks if element is a comment
- [x] Implement `getCommentId(el)` — returns unique ID for comment
- [x] Implement `getExpandControl(el)` — returns clickable expand element
- [x] Implement `isCollapsed(el)` — checks if comment is collapsed
- [x] Implement `getIndentDepth(el)` — returns nesting depth
- [x] Implement `getParentThing(el)` — returns parent comment element

### Task 3.2: Create util.js
- [x] Create `extension/src/content/util.js`
- [x] Implement debounce function
- [x] Implement throttle function (if needed)
- [x] Add any shared utility functions

### Task 3.3: Create main.js entry point
- [x] Create `extension/src/content/main.js`
- [x] Read settings from `chrome.storage.sync` on load
- [x] Listen for `chrome.storage.onChanged` events
- [x] Initialize/deinitialize feature modules based on settings

---

## Phase 4: Feature — Sticky Ancestors Header

### Task 4.1: Create activeComment.js module
- [x] Create `extension/src/content/activeComment.js`
- [x] Implement IntersectionObserver to track visible comments
- [x] Maintain set of currently visible comments
- [x] Compute "active" comment (smallest positive top distance to viewport top)
- [x] Debounce active comment updates (50-100ms)
- [x] Export `onActiveChange(callback)` for notifying changes

### Task 4.2: Create ancestors.js module
- [x] Create `extension/src/content/ancestors.js`
- [x] Implement `computeAncestors(commentEl)` function
- [x] Walk backwards in DOM to find parent (depth - 1)
- [x] Repeat until reaching top-level (depth 0)
- [x] Return chain array `[topLevel, ..., currentComment]`
- [x] Cache depth values in WeakMap for performance

### Task 4.3: Create stickyUI.js module
- [x] Create `extension/src/content/stickyUI.js`
- [x] Create container `div#ta-sticky-container`
- [x] Style as fixed position at top, full width, high z-index
- [x] Position below Reddit's `#header` to avoid overlap

### Task 4.4: Implement sticky row rendering
- [x] Implement `render(chain, N)` function
- [x] For each comment in `chain.slice(0, N)`:
  - Extract and display: author, score, timestamp (optional), short excerpt
  - Add "jump" link that scrolls to original comment on click
  - Truncate long excerpts with ellipsis
- [x] Keep rendering lightweight (don't clone full comment HTML)

### Task 4.5: Handle body padding for sticky header
- [x] Measure sticky container height
- [x] Set `document.body.style.paddingTop` accordingly
- [x] Update padding when container height changes

### Task 4.6: Wire active comment to sticky UI
- [x] In main.js, register `onActiveChange` callback
- [x] On change: compute ancestors, call `stickyUI.render(chain, N)`
- [x] Handle edge cases:
  - Active comment is null → hide container or show post title
  - Chain length < N → render only available rows
  - Comment is collapsed → still show in sticky using available DOM data

---

## Phase 5: Polish & Edge Cases

### Task 5.1: Implement compact mode for sticky rows
- [x] Add compact rendering option (single-line rows)
- [x] Toggle based on `stickyCompact` setting

### Task 5.2: Implement jump-to-comment functionality
- [x] Clicking sticky row scrolls viewport to original comment
- [x] Smooth scroll or instant scroll (user preference)
- [x] Optionally highlight the target comment briefly

### Task 5.3: Handle Reddit header offset
- [x] Detect old Reddit header height (`#header`)
- [x] Set sticky container `top` below Reddit header

### Task 5.4: Add MutationObserver for dynamic comments
- [x] Watch for newly inserted comments (rare but possible)
- [x] Register new comments with IO observers

---

## Phase 6: Performance Optimization

### Task 6.1: Implement caching with WeakMaps
- [x] Cache comment depth values (selectors.js: depthCache)
- [x] Cache comment IDs (selectors.js: idCache)
- [x] Cache comment metadata (selectors.js: metaCache)
- [x] Cache parent lookups (ancestors.js: parentCache)
- [x] Cache ancestor chains (ancestors.js: chainCache)

### Task 6.2: Optimize rendering
- [x] Only re-render sticky UI when active comment or settings change (currentChainIds comparison)
- [x] Avoid querySelectorAll in scroll handlers (use visibleComments Set)
- [x] Use IO rootMargin instead of manual buffer calculations

### Task 6.3: Performance testing
- [x] Added performance measurement utilities (Util.perfStart, perfMeasure, perfStats, perfLog)
- [ ] Test on large threads (1000+ comments) — manual testing required
- [ ] Verify no scroll jank during fast scrolling — manual testing required
- [ ] Profile and optimize any bottlenecks — manual testing required

---

## Phase 7: Testing & Validation

### Task 7.1: Manual testing — Sticky ancestors feature
- [ ] Enable sticky ancestors with N=3
- [ ] Scroll into nested replies → verify pinned chain updates correctly
- [ ] Move between sibling threads → verify replacement behavior
- [ ] Test with different N values (1, 2, 3, 5)

### Task 7.2: Manual testing — Edge cases
- [ ] Test collapsed parent chains
- [ ] Test very shallow threads (< N depth)
- [ ] Verify sticky rows don't overlap Reddit header

### Task 7.3: Manual testing — Click interactions
- [ ] Click sticky rows → verify scroll to correct comment

### Task 7.4: Cross-browser testing
- [ ] Test in Chrome
- [ ] Test in other Chromium browsers (Edge, Brave, etc.)

---

## Done Criteria

- [ ] Works on Reddit comment threads (old.reddit.com and www.reddit.com)
- [ ] Sticky ancestor header shows correct chain, updates smoothly, supports configurable N
- [ ] Toggle state persists across reloads via chrome.storage
- [ ] No significant scroll jank on large threads
- [ ] UI is clean and doesn't break Reddit's native behavior

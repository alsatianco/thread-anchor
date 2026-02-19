```md
# plan.md — Thread Anchor - Reddit Helper (Frozen Ancestors) - an extension for Chrome (and Chromium based browsers)

Target: Reddit (old.reddit.com and www.reddit.com), comment threads only.  
Features:
1) "Frozen ancestor comments" header: shows the ancestor chain for the comment you're currently reading, with top **N** rows pinned and updating as you scroll (user can toggle on/off).

## Name/brand

**Name:** Thread Anchor
**Brand flavor:** Ahoy / nautical

**Tagline options:** *Ahoy! Never lose the thread.*

**Why this works insanely well:**

* “Thread Anchor” is clear, serious, trustworthy
* “Ahoy” adds charm *without* being cringey
* You can:
  * use **Thread Anchor** in stores
  * use **⚓ Ahoy mode**, **Ahoy UI**, **Ahoy header** in the product
* Professional on first glance, delightful after install

---

## 0) Constraints & assumptions

- Scope pages: `https://old.reddit.com/r/*/comments/*`
- Do not break Reddit’s native behavior; prefer **clicking native controls** over directly mutating classes.
- Must be performant on large threads:
  - Avoid scanning the full DOM repeatedly
  - Use **IntersectionObserver** (IO) for viewport detection
  - Debounce/throttle any scroll-driven recomputation
- Manifest V3 (Chrome).

---

## 1) Repo structure

Suggested:
```

extension/
manifest.json
src/
content/
main.js
activeComment.js
ancestors.js
stickyUI.js
selectors.js
util.js
popup/
popup.html
popup.js
popup.css
assets/
icon16.png
icon48.png
icon128.png

````

---

## 2) Manifest (MV3) sketch

- `content_scripts` runs on Reddit comment pages.
- `storage` permission for settings.
- Optional `activeTab` not required if you match host patterns.

Key bits:
- matches: `https://old.reddit.com/r/*/comments/*`
- permissions: `storage`
- action: popup to toggle features and set N

---

## 3) Settings model

Use `chrome.storage.sync` (or local) with defaults:

```js
{
  stickyAncestorsEnabled: true,
  stickyDepth: 3,         // N rows pinned
  stickyCompact: true     // compact rendering
}
````

On content-script load:

* read settings
* start/stop feature modules accordingly
* listen for changes via `chrome.storage.onChanged`

Popup UI:


* Toggle: “Sticky ancestors”
* Slider/number: “Pinned rows (N)”
* (Optional) checkbox: “Compact sticky rows”

---

## 4) DOM model on Reddit (practical approach)

Reddit comment pages typically have:

* Each comment as a `.thing.comment` element (or similar)
* A clickable collapse/expand control (often `.expand` or `.expando-button`-like)
* A “collapsed” state that can be detected via:

  * presence of a class like `collapsed` on the comment
  * or a child “expand” link visible

Because this can vary slightly:

* Centralize all selectors in `selectors.js`
* Implement **robust finders** that fall back to multiple patterns.

### selectors.js

Provide functions, not just strings:

* `getAllCommentThings()`
* `isCommentThing(el)`
* `getCommentId(el)`
* `getExpandControl(el)`  // returns element to click, if any
* `isCollapsed(el)`       // best-effort
* `getIndentDepth(el)` or `getParentThing(el)`

---

## 5) Feature — Frozen ancestor comments header (“sticky ancestors”)

### 5.1 UX behavior

* A fixed header at the top of the page showing up to **N** ancestor rows:

  * Row 1: top-level comment (A1)
  * Row 2: reply (B1)
  * ...
* As user scrolls and the “active comment” changes, the chain updates.
* Your “last pinned row replaced by same-level when they go up” is naturally achieved by:

  * always computing ancestors for the current active comment
  * rendering only the top N of that chain

### 5.2 Determine the "active comment"

Goal: pick the comment the user is “reading now”.

Two workable heuristics:

**Option A (recommended): IntersectionObserver with top-threshold**

* Observe all comments
* Maintain a set of visible comments
* Active = visible comment with smallest positive `top` distance to viewport top (>= 0), or closest to a target line.

**Option B: Scroll + elementFromPoint**

* On scroll (debounced):

  * `document.elementFromPoint(x, y)` where y = stickyHeaderHeight + 10
  * walk up to nearest `.thing.comment`
* Active = found comment

Option A tends to be smoother and less brittle; Option B is simpler.

### 5.3 Ancestor chain computation

Implement in `ancestors.js`:

Given a comment element `c`, compute:

* `chain = [topLevel, ..., c]`

How to find parent:

* Prefer an explicit parent link if present in DOM (some pages include parent references).
* Otherwise use indentation depth + previous siblings:

  1. Get depth of `c`:

     * Read indentation from a known indent element (`.child` / `.midcol` / style `margin-left`)
  2. Walk backwards in DOM to find the nearest previous comment with depth = currentDepth - 1 (parent).
  3. Repeat until depth 0.

This "walk backwards by depth" works well with Reddit because comments are rendered in a linear DOM order.

### 5.4 Sticky UI rendering

Implement in `stickyUI.js`:

* Create container:

  * `div#orh-sticky-container`
  * fixed to top, full width
  * add padding/margin to body to avoid covering content:

    * measure container height; set `document.body.style.paddingTop`
* Render rows:

  * For each comment in `chain.slice(0, N)`:

    * show: author, score, timestamp (optional), and a short excerpt
    * include a “jump” link: clicking a row scrolls to the original comment
    * include a collapse/expand indicator optionally
* Keep it lightweight: don’t clone full comment HTML; create your own row DOM.

### 5.5 Update loop

In `activeComment.js`:

* Track active comment changes:

  * On IO updates or scroll debounce:

    * compute active
    * if changed: call `onActiveChange(active)`
* In `main.js`:

  * `onActiveChange`:

    * `chain = computeAncestors(active)`
    * `stickyUI.render(chain, N)`

### 5.6 Edge cases

* If active comment is null (top of page): hide sticky container or show post title.
* If chain length < N: render only available.
* If comment is collapsed:

  * still can show it in sticky (using author/excerpt from available DOM)

---

## 7) Styling & layout considerations

* Keep sticky UI readable but minimal:

  * single-line or two-line rows
  * ellipsis for long excerpts
* Ensure high z-index
* Do not block Reddit’s top nav; place below it:

  * detect old Reddit header height (e.g., `#header`)
  * set container `top` accordingly

---

## 8) Performance checklist

* Use WeakMaps for per-comment metadata:

  * depth cache
  * id cache
  * expandedAttempted
* Avoid querySelectorAll in scroll handlers.
* IO rootMargin used instead of manual buffers.
* Debounce active-comment updates (e.g., 50–100ms).
* Only re-render sticky UI when:

  * active comment changed
  * settings changed (N, compact, enable/disable)

---

## 9) Testing plan (manual)

1. Open a large Reddit thread with deep nesting.
2. Sticky ancestors ON with N=3:

   * scroll into nested replies
   * ensure pinned chain updates correctly
   * verify "replacement" behavior when moving between sibling threads
3. Test collapsed chains:

   * collapse a parent comment
   * scroll within child area (if possible) and verify sticky display remains sane
4. Verify no major layout overlap:

   * header not covered
   * clicking sticky rows scrolls to correct comment
5. Performance sanity:

   * no noticeable lag while fast scrolling

---

## 10) Implementation order (recommended)

1. MV3 skeleton + popup + storage wiring
2. Comment detection + selectors + stable ID/depth helpers
3. Sticky UI container + simple rendering
4. Active comment detection + ancestor chain computation
5. Polish:

   * compact mode
   * jump-to-comment
   * header offset handling
   * mutation observer for newly added comments

---

## 11) “Done” definition

* Works on Reddit comment threads (old.reddit.com and www.reddit.com)
* Sticky ancestor header shows correct chain, updates smoothly, supports N
* Toggle state persists across reloads
* No significant scroll jank on large threads

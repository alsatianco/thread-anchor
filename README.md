# Thread Anchor

**Ahoy! Never lose the thread.**

A Chrome extension that enhances the Reddit comment reading experience:

**Sticky ancestor header** — Pins ancestor comments at the top so you never lose context in deeply nested threads

## Features

### Sticky Ancestor Header
- Shows the ancestor chain for the comment you're currently reading
- Configurable number of pinned rows (1-10)
- Compact mode for minimal UI footprint
- Click any row to jump to that comment
- Automatically positions below Reddit's header
- Smooth updates as you scroll

## Project Structure

```
thread-anchor/
├── extension/
│   ├── manifest.json          # Chrome extension manifest (MV3)
│   ├── assets/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── src/
│       ├── content/           # Content scripts (injected into Reddit)
│       │   ├── selectors.js   # DOM selectors & helpers for Reddit
│       │   ├── util.js        # Utilities (debounce, throttle, perf tools)
│       │   ├── ancestors.js   # Ancestor chain computation
│       │   ├── activeComment.js   # Active comment tracking
│       │   ├── stickyUI.js    # Sticky header UI
│       │   └── main.js        # Entry point & settings management
│       └── popup/             # Extension popup UI
│           ├── popup.html
│           ├── popup.css
│           └── popup.js
├── plan.md                    # Original design document
├── task.md                    # Implementation task checklist
└── README.md
```

## Development

### Prerequisites

- Google Chrome or any Chromium-based browser (Edge, Brave, etc.)
- No build tools required — vanilla JavaScript

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension/` directory from this project
5. The extension icon should appear in your toolbar

### Testing

1. Navigate to any Reddit comment thread (e.g., `https://old.reddit.com/r/*/comments/*` or `https://www.reddit.com/r/*/comments/*`)
2. Click the extension icon to open the settings popup
3. Toggle features on/off and adjust settings
4. Scroll through comments to see the features in action

### Debug Logging

Open the browser console (F12 → Console) on a Reddit page to see debug logs:

```
[ThreadAnchor] Initializing...
[ThreadAnchor] Initialized with settings: {...}
[ActiveComment] Initialized
[StickyUI] Initialized with config: {...}
```

### Performance Profiling

The extension includes built-in performance utilities. In the console:

```javascript
// Enable performance tracking
Util.setPerfEnabled(true);

// Scroll around to collect metrics...

// View performance stats
Util.perfLog();

// Clear metrics
Util.perfClear();
```

## Configuration

Settings are stored in `chrome.storage.sync` and persist across sessions.

| Setting | Default | Description |
|---------|---------|-------------|
| `stickyAncestorsEnabled` | `true` | Enable sticky header feature |
| `stickyDepth` | `3` | Number of ancestor rows to show |
| `stickyCompact` | `true` | Use compact single-line rows |

## Architecture

### Content Scripts Load Order

Scripts are loaded in dependency order (defined in `manifest.json`):

1. `selectors.js` — No dependencies
2. `util.js` — No dependencies
3. `ancestors.js` — Depends on Selectors
4. `activeComment.js` — Depends on Selectors, Util
5. `stickyUI.js` — Depends on Selectors, Util, ActiveComment
6. `main.js` — Orchestrates all modules

### Module Pattern

Each module uses the revealing module pattern:

```javascript
const ModuleName = (() => {
  // Private state and functions

  function init(options) { /* ... */ }
  function destroy() { /* ... */ }

  // Public API
  return { init, destroy };
})();
```

### Key Design Decisions

- **IntersectionObserver over scroll events** — More performant for detecting visible elements
- **WeakMap/WeakSet for caching** — Automatic garbage collection when DOM elements are removed
- **Click native controls** — Expand comments by clicking Reddit's own buttons rather than mutating classes
- **Debounced updates** — Prevent excessive re-renders during fast scrolling

## Deployment

### Chrome Web Store

1. Update version in `manifest.json`
2. Create a ZIP of the `extension/` directory:
   ```bash
   cd extension && zip -r ../thread-anchor.zip . && cd ..
   ```
3. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Upload the ZIP file
5. Fill in store listing details
6. Submit for review

### Manual Distribution

Share the `extension/` folder directly. Users can load it as an unpacked extension following the development instructions above.

## Browser Compatibility

- **Chrome** 88+ (MV3 support)
- **Edge** 88+
- **Brave** (latest)
- **Other Chromium browsers** with MV3 support

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on various Reddit threads
5. Submit a pull request

## Troubleshooting

### Extension not working?

1. Check that the extension is enabled in `chrome://extensions/`
2. Try refreshing the Reddit page
3. Check the console for error messages

### Sticky header overlaps content?

The extension automatically adjusts body padding. If issues persist:
1. Check if other extensions are conflicting
2. Try disabling and re-enabling the sticky ancestors feature

### Performance issues on large threads?

1. Try reducing the `stickyDepth` setting
2. Use `Util.perfLog()` to identify bottlenecks

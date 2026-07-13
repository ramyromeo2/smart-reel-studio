# Debug Session: poster-overlay-recursion
- **Status**: [FIXED]
- **Issue**: `smartlab-posts-preview.html` throws `RangeError: Maximum call stack size exceeded` while collecting poster overlay render state, and the poster layout appears incorrect.
- **Debug Server**: Pending
- **Log File**: `.dbg/trae-debug-log-poster-overlay-recursion.ndjson`

## Reproduction Steps
1. Open `smartlab-posts-preview.html`.
2. Open the poster overlay controls and apply or render the overlay state.
3. Observe the browser console error pointing at `slCollectPosterOverlayState()` and `getRenderState()`.
4. Compare the rendered poster layout with the expected alignment.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | `slCollectPosterOverlayState()` calls `getRenderState()`, which directly or indirectly calls `slCollectPosterOverlayState()` again, causing infinite recursion. | High | Low | Confirmed by stack trace alternating between `smartlab-posts-preview.html:3422` and `smartlab-posts-preview.html:3507`. |
| B | The overlay controller exposes `getRenderState()` by delegating to the same collector that also tries to read controller state, creating a circular dependency only when the poster overlay is enabled. | High | Med | Confirmed in fallback object: `getRenderState() { return slCollectPosterOverlayState(); }`. |
| C | A reactive render/update hook re-enters state collection during layout recomputation, so stack overflow and broken layout are two symptoms of one render loop. | Med | Med | Unconfirmed. No runtime log capture yet. |
| D | The layout issue comes from malformed overlay JSON or scene metrics, while the recursion bug is separate and only prevents state capture. | Med | Low | Pending user verification after recursion fix. |
| E | A recent fallback/default-state path returns a live object with self-references that `slCollectPosterOverlayState()` traverses repeatedly. | Low | Med | Rejected by code inspection; the direct recursion is sufficient to explain the overflow. |

## Log Evidence
- Added temporary debug reporting to `smartlab-posts-preview.html` for collector entry, collector exit, init success, and init failure.
- Debug server started at `http://127.0.0.1:7777/event`.
- No browser-reported events captured yet, so current root-cause confirmation relies on the provided stack trace plus code inspection.

## Verification Conclusion
- Applied a minimal fix in `smartlab-posts-preview.html`.
- User verification result: fixed.
- Cleanup completed for code instrumentation and debug server shutdown.
- Session artifacts were intentionally kept in the workspace.

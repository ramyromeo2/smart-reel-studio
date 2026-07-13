# Run this on the other machine

1. Unzip it somewhere (NOT inside Downloads if you can avoid it — avoids macOS quarantine).

2. Install dependencies (this zip does NOT include node_modules):
   ```
   cd smart-reel-bulk-generator-FULL-2026-06-27
   npm install
   ```

3. If on macOS and the app won't start or renders fail with
   "library load disallowed by system policy" / "Cannot find native binding",
   clear the macOS quarantine + sign the native binaries:
   ```
   xattr -dr com.apple.quarantine node_modules .hub-remotion-bin
   find node_modules .hub-remotion-bin -type f \( -name '*.node' -o -name 'ffmpeg' -o -name 'ffprobe' \) -exec codesign --force --sign - {} \;
   ```

4. Start the studio hub:
   ```
   npm run hub
   ```
   Then open http://localhost:4001/

Notes:
- The render bundle (.hub-remotion-bundle) and out/ videos rebuild themselves; they were left out to keep the zip small.
- Your scenes, images, presets, and saved state ARE included.

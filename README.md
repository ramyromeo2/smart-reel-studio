# Smart Reel Studio

Smart Reel Studio is a local, visual design and rendering workspace for creating branded social-media posters, animated scenes, and complete videos from reusable JSON documents.

It began with a simple need: produce medical and laboratory content quickly without rebuilding every post by hand. That small bulk-rendering experiment kept growing. Every real campaign exposed another friction point: Arabic typography, exact placement, reusable scenes, image layers, animation timing, PNG exports, video rendering, project portability, and the gap between what an editor shows and what a renderer exports.

This project is the result of following those problems all the way down.

It is proudly vibe-coded: built through curiosity, fast experiments, visual judgment, and a lot of stubborn iteration. But the purpose is serious. The goal is to give a creative team direct control over production without forcing every adjustment back through a traditional design or video-editing workflow.

## What it does

### Visual poster editor

- Imports poster definitions from JSON.
- Supports Arabic and English text, including RTL layout.
- Adds and edits text, shapes, icons, images, and backgrounds.
- Moves elements directly on the canvas with drag controls.
- Resizes elements visually and through precise numeric controls.
- Controls typography, colors, opacity, borders, radius, alignment, and layering.
- Supports multiple image layers above the background.
- Preserves a fixed design canvas such as `1080 x 1350` or `1080 x 1920`.
- Supports the modern Saudi Riyal symbol in editor and rendered output.

### Scene timeline

- Adds, duplicates, deletes, reorders, hides, and reveals scenes.
- Sets an independent duration for every scene.
- Navigates large projects through a horizontal scene rail.
- Previews one scene or all visible scenes.
- Renders one scene independently or renders the complete timeline.
- Keeps project scenes isolated when creating a new project.

### Animation system

- Applies entrance presets such as fade, slide, wipe, pop, and directional motion.
- Controls each element's start frame and duration.
- Animates backgrounds separately from foreground elements.
- Automatically fits animation schedules into short video scenes when timings overflow.
- Exports PNGs in a fully settled state so every designed element remains visible.

### Rendering and export

- Exports individual scenes as full-resolution PNG files.
- Renders individual scenes as MP4 videos.
- Renders all visible scenes as one video.
- Uses a warmed Remotion renderer for faster repeated PNG exports.
- Shows render progress, elapsed time, completion, and failure states.
- Keeps editor coordinates and Remotion output on the same canvas model.

### Projects and persistence

- Provides a local project hub for built-in and custom projects.
- Creates clean advanced poster projects without copying another project's scenes.
- Saves timeline, overlay, preset, media, and studio state locally.
- Imports and exports complete studio payloads.
- Supports reusable presets and recovery-state files.
- Includes portable setup guidance for moving the workspace to another machine.

### Bulk generation

- Generates repeated videos from CSV content.
- Reuses React and Remotion compositions across different brands and campaigns.
- Includes SmartLab, SmartMed, Hajj, RightCare, Tokyo, and custom project compositions.

## Built with

- [Remotion](https://www.remotion.dev/) for programmatic video and still rendering
- React and TypeScript for compositions
- Node.js for the local project hub and rendering API
- Plain HTML, CSS, and JavaScript for the visual studio interface
- JSON for portable poster, timeline, preset, and project state

## Requirements

- Node.js 18 or newer
- npm
- macOS, Windows, or Linux with a Chromium-compatible environment for Remotion
- Internet access during the first dependency installation

## Install

```bash
git clone https://github.com/ramyromeo2/smart-reel-studio.git
cd smart-reel-studio
npm install
```

`node_modules` is intentionally not committed. `package-lock.json` pins the dependency versions so another machine can recreate the same installation.

## Start the project hub

```bash
npm run hub
```

The default hub runs at:

```text
http://localhost:4001/
```

Open the SmartLab poster studio directly at:

```text
http://localhost:4001/smartlab-posts-preview.html
```

## Open Remotion Studio

```bash
npm run studio
```

## Common render commands

```bash
npm run render:smartlab-posts
npm run render:smartlab
npm run render:smartmed
npm run render:smartmed-hajj
npm run render:bulk
```

Rendered files are written to `out/` and are intentionally ignored by Git.

## JSON poster format

A poster document defines its canvas, background, brand defaults, and editable elements:

```json
{
  "id": "example-poster",
  "type": "posterOverlay",
  "canvas": { "width": 1080, "height": 1350 },
  "backgroundImage": "public/generated/example/background.png",
  "brandStyle": {
    "primaryColor": "#1A9DD7",
    "fontFamily": "Tajawal",
    "direction": "rtl"
  },
  "elements": [
    {
      "id": "headline",
      "type": "text",
      "text": "عنوان قابل للتعديل",
      "frame": { "x": 140, "y": 160, "width": 800, "height": 100 },
      "style": {
        "fontSize": 64,
        "color": "#1A9DD7",
        "textAlign": "center",
        "direction": "rtl"
      },
      "animation": {
        "preset": "fadeDown",
        "startFrame": 8,
        "durationFrames": 36
      }
    }
  ]
}
```

## Project structure

```text
src/                         Remotion compositions and overlay renderer
src/posterOverlay/           JSON schema, animation, styling, and rendering logic
scripts/hub-server.mjs       Local project, save, export, and render API
scripts/                     Bulk rendering and preset utilities
public/generated/            Project design assets used by scenes
*-preview.html               Visual studio pages
*-overlay-state.json         Editable poster documents
*-timeline.json              Scene order, visibility, and duration
*-studio-state.json          Complete saved editor state
projects.json                Project hub registry
```

## Portability

For a fresh machine, clone the repository and run `npm install`. See `SETUP-OTHER-MACHINE.md` for the portable workflow and platform-specific notes.

Remotion may download a compatible headless Chromium build on first use. That browser binary is machine-specific and deliberately excluded from Git.

## Current status

This is an actively evolved creative tool, not a polished commercial product. Some project files preserve experiments and real production history because they are useful examples of the system growing under actual use.

The codebase values practical creative control: what appears in the editor should survive saving, PNG export, and video rendering. When those paths disagree, the project treats it as a bug worth fixing.

## Why this exists

Creative work often gets slowed down by tiny revisions: move a title, replace a photo, adjust Arabic text, change a price, add a scene, retime an entrance, export again. None of those changes is individually difficult, but together they consume enormous time.

Smart Reel Studio is an attempt to turn that repeated labor into a reusable system while keeping the designer in control. It is code serving the design process, not design being forced to serve the code.

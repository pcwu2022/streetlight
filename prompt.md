# AI Agent Prompt — Streetlight

## Role

You are a senior full-stack engineer. Your task is to build a complete, production-ready Next.js web application from the spec below. Work methodically: scaffold first, implement core data layer, then UI, then persistence. After each phase, verify nothing is broken before continuing.

---

## Project Goal

Build a dark-themed, interactive city street memory game for Taiwan. The player picks a Taiwanese city/district, then types road names from memory. Each correctly named road "lights up" on a live SVG map. Progress is saved to localStorage. The UI feels like a cyberpunk city map seen from orbit — dark, precise, glowing.

---

## Phase 1 — Project Scaffold

1. Initialize a new Next.js project (latest stable) with TypeScript, Tailwind CSS, and App Router:
   ```bash
   npx create-next-app@latest taiwan-street-game --typescript --tailwind --app --src-dir=false
   ```

2. Install additional dependencies:
   ```bash
   npm install @fontsource/noto-serif-tc @fontsource/ibm-plex-mono @fontsource/noto-sans-tc
   npm install --save-dev @types/node
   ```

3. Create the full directory structure as specified in the spec under "File Structure".

4. Configure `tailwind.config.ts` with a custom color palette:
   ```ts
   colors: {
     bg: '#080c18',
     surface: '#0f1629',
     border: '#1e2d4a',
     cyan: '#00e5ff',
     amber: '#ffc93c',
     magenta: '#ff6ef7',
     'text-primary': '#e8f4f8',
     'text-muted': '#5a7a99',
   }
   ```

5. Set up `globals.css` with CSS custom properties mirroring these colors plus font imports. Set `body` background to `#080c18` and default text to `#e8f4f8`.

6. Configure `layout.tsx` with Noto Serif TC, IBM Plex Mono, and Noto Sans TC fonts (via next/font or @fontsource), proper `<html lang="zh-TW">`, and metadata.

---

## Phase 2 — Data Layer & Types

### 2a. Types (`/types/index.ts`)

Define these interfaces:

```ts
export type RoadType = '路' | '街' | '大道' | '大路' | '道' | 'other';

export interface RoadFeature {
  id: number;
  name: string;
  type: RoadType;
  coordinates: [number, number][]; // [lng, lat]
  lengthKm: number;
}

export interface GameSave {
  regionId: string;
  regionName: string;
  foundRoads: string[];
  startedAt: string;
  lastPlayedAt: string;
}

export interface OsmCache {
  fetchedAt: string;
  roads: RoadFeature[];
}

export interface Region {
  id: string;          // slugified, e.g. "hsinchu-city"
  nameZh: string;      // e.g. "新竹市"
  osmRelationId: number;
  type: 'city' | 'town' | 'district';
}
```

### 2b. Regions list (`/lib/regions.ts`)

Create a hardcoded array of at least 20 Taiwan regions covering:
- Major cities: 台北市, 新北市, 桃園市, 台中市, 台南市, 高雄市, 新竹市, 基隆市
- Districts: 台北市大安區, 台北市信義區, 台北市中山區, 台中市西屯區, 高雄市前金區
- Towns: 新竹縣竹東鎮, 新竹縣關西鎮, 苗栗縣頭份市

Use real OSM relation IDs. Look them up via `https://nominatim.openstreetmap.org/search?q={name}&format=json&addressdetails=1` if needed.

Export as `export const REGIONS: Region[]`.

### 2c. Overpass API (`/lib/overpass.ts`)

Implement `fetchRoadsForRegion(osmRelationId: number): Promise<RoadFeature[]>`:

- Build this Overpass QL query:
  ```
  [out:json][timeout:90];
  rel({osmRelationId});
  map_to_area->.searchArea;
  (
    way["highway"]["name"~"路$|街$|道$|大道$|大路$"](area.searchArea);
  );
  out geom;
  ```
- POST to `https://overpass-api.de/api/interpreter` with `Content-Type: application/x-www-form-urlencoded`, body: `data=<query>`
- Parse response: for each `way` in `elements`, extract `tags.name` and `geometry` array
- Filter out names containing `巷` or `弄`
- Detect road type from name suffix (last character or last 2 characters): 大道 > 大路 > 道 > 路 > 街 > other (check in that order)
- Calculate `lengthKm` using the Haversine formula across the geometry node array
- Return array of `RoadFeature`

Also export a `getRoadType(name: string): RoadType` helper.

### 2d. Geo utils (`/lib/geo.ts`)

Implement:
- `haversineKm(a: [number,number], b: [number,number]): number` — distance between two [lng,lat] points
- `projectToSVG(coords: [number,number][], width: number, height: number, padding: number): [number,number][]` — normalize a set of lat/lon coordinates to fit within SVG viewport with padding. Compute bounding box from all coordinates across all roads (pass the full road list bounding box, not per-road).
- `getBoundingBox(roads: RoadFeature[]): { minLng, maxLng, minLat, maxLat }` — compute overall bounding box

### 2e. Storage (`/lib/storage.ts`)

Implement:
- `saveGame(save: GameSave): void`
- `loadGame(regionId: string): GameSave | null`
- `deleteGame(regionId: string): void`
- `listGames(): GameSave[]`
- `saveOsmCache(regionId: string, cache: OsmCache): void`
- `loadOsmCache(regionId: string): OsmCache | null` — return null if missing or >7 days old

All functions must guard against SSR (`typeof window === 'undefined'` check).

### 2f. Road utils (`/lib/roadUtils.ts`)

Implement:
- `normalizeRoadName(input: string): string` — trim whitespace, normalize full-width characters to half-width
- `getMatchingRoads(query: string, roads: RoadFeature[]): RoadFeature[]` — extract first 2 non-space characters from `query`, return roads whose name includes those 2 chars (case/width insensitive). Return max 8 results sorted by name length ascending.
- `computeStats(roads: RoadFeature[], foundNames: Set<string>)` — return `{ total, found, foundKm, totalKm, byType: Record<RoadType, {total,found}>, longestFound, shortestFound, recentlyFound: string[] }`

---

## Phase 3 — Entry / Gallery Page (`/app/page.tsx`)

Build the gallery page with these sections:

### Header
- App name "路名記憶" in Noto Serif TC, large, with a subtle glow text-shadow in cyan
- Tagline: "你還記得幾條路？" in muted text

### Region Selector
- A search input with placeholder "輸入城市或地區…"
- As user types, filter `REGIONS` array and show a dropdown list
- Clicking a region navigates to `/game/${region.id}`
- If region has an existing save, show a "繼續" badge next to it in the dropdown

### Progress Gallery
- CSS grid of `RegionCard` components, one per saved game
- Each card (`/components/gallery/RegionCard.tsx`):
  - Dark card background (`#0f1629`) with a `1px` border (`#1e2d4a`)
  - Region name (large, Noto Serif TC)
  - A small SVG thumbnail (200×150) showing the map with found roads lit in cyan — render a simplified version using the cached OSM data
  - Overall completion percentage as a circular progress ring (SVG-based, `/components/ui/ProgressRing.tsx`)
  - "上次遊戲: X天前" timestamp
  - Two buttons: "繼續遊戲" (primary, cyan) and "重新開始" (ghost, danger on hover)
- "重新開始" opens a confirmation `<Modal>` before calling `deleteGame()`

### Empty State
- If no saves: centered illustration (SVG of a city grid with a question mark), text "還沒有開始任何城市", and a large CTA button

### Background
- Full-page background: `#080c18` with a subtle dot-grid or noise texture via CSS (`background-image: radial-gradient(...)` or pseudo-element with SVG noise)
- Slight animated pulse on the grid dots using CSS keyframes

---

## Phase 4 — Game Page (`/app/game/[regionId]/page.tsx`)

This is a client component (`'use client'`).

### On mount:
1. Find region from `REGIONS` by `params.regionId`
2. Try `loadOsmCache(regionId)` — if valid, use it. Otherwise call `fetchRoadsForRegion()`, then `saveOsmCache()`. Show a loading screen during fetch with animated text "正在載入道路資料…" and a progress indicator.
3. Load game save via `loadGame(regionId)`. Initialize `foundRoads` Set from save, or empty if new game.
4. Compute SVG projection: call `getBoundingBox` and `projectToSVG` once, store projection parameters in state.

### Layout
Three-column CSS grid (on desktop): `[240px] [1fr] [0px]`, with the sidebar on the left, map in center. On mobile: map full width, sidebar as collapsible bottom sheet triggered by a stats button.

### Header bar
- Back arrow → home page
- Region name
- A subtle breadcrumb or badge showing `X / Y 條路已找到`

### Map Canvas (`/components/game/MapCanvas.tsx`)
Props: `roads: RoadFeature[]`, `foundRoads: Set<string>`, `svgProjection: ProjectionParams`, `onRoadHover: (road: RoadFeature | null) => void`

- Render an `<svg>` with `viewBox="0 0 1000 800"` inside a `div` with `overflow: hidden`, `background: #080c18`
- For each road, render a `<RoadPolyline>` component
- Apply a CSS `transform` wrapper for pan and zoom:
  - Mouse wheel: scale (min 1x, max 10x)
  - Mouse drag: translate
  - Touch: pinch-to-zoom + drag
- Add an SVG `<defs>` section with glow filter definitions:
  ```svg
  <filter id="glow-cyan">
    <feGaussianBlur stdDeviation="3" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  ```
  Make similar filters for amber and magenta.

### Road Polyline (`/components/game/RoadPolyline.tsx`)
Props: `road: RoadFeature`, `isFound: boolean`, `isHovered: boolean`, `projectedPoints: [number,number][]`, `onHover: (road: RoadFeature | null) => void`

- Render as `<polyline points="..." />`
- Not found: `stroke="#1e2d4a"`, `strokeWidth="0.8"`, no filter
- Found: stroke color based on type (cyan/amber/magenta), `strokeWidth="2"`, apply matching glow filter, CSS transition `stroke 0.3s, stroke-width 0.3s, filter 0.3s`
- Hovered (found): increase `strokeWidth` to 3.5, brighter glow
- Hovered (not found): slight highlight `stroke="#2a3d5a"`
- On mouse enter/leave: call `onHover`
- Use a wider invisible `<polyline>` (strokeWidth 12, opacity 0) as a hit target for easier hovering

### Tooltip (`/components/game/Tooltip.tsx`)
- Fixed-position div following mouse cursor
- Show: road full name, type badge, length in km
- Fade in/out on visibility change

### Input Bar (`/components/game/InputBar.tsx`)
Fixed at bottom of page. Contains:
- A large text input (`font-size: 1.25rem`, Noto Sans TC, dark background, cyan focus ring)
- Placeholder: "輸入路名…（例如：中山路）"
- As user types:
  - Call `getMatchingRoads(value, roads)` on every keystroke
  - Show autocomplete dropdown above the input with up to 8 results
  - Each result row: road name (highlight matching chars in cyan), type badge, length
  - Already-found roads show a ✓ checkmark and are greyed out
  - Keyboard: ArrowUp/ArrowDown to navigate, Enter to select highlighted, Escape to close
- On submit (Enter with no dropdown selection, or clicking a result):
  - Normalize input with `normalizeRoadName()`
  - Look up exact match in roads array
  - If found and not yet in `foundRoads`: add to set, update save, trigger map animation, update stats
  - If already found: show toast "「{name}」已找到過了！" in amber
  - If not found: shake animation on input, show toast "找不到「{name}」" in red-ish
  - Clear input after any submission

### Sidebar (`/components/game/Sidebar.tsx`)
Render stats from `computeStats()`. Update on every `foundRoads` change.

Sections:
1. **Overall progress**: large animated number "X / Y" with a thin progress bar below it
2. **總長度**: "X.X km / Y.Y km"  
3. **按類型分類**: three rows (路 / 街 / 大道) each with a mini bar and percentage. Use the road type colors (cyan/amber/magenta) for each bar.
4. **最長 / 最短**: show road name + km. Update only when a new record is set (flash animation).
5. **最近找到**: a scrolling list of the last 5 found roads with a fade-in animation when new items are added. Each item shows the name and a small type badge.

Use `StatCounter` component for animated number transitions (count up over 600ms using `requestAnimationFrame`).

### Persistence
In the game page, use a `useEffect` that watches `foundRoads` and debounces `saveGame()` calls by 500ms.

---

## Phase 5 — UI Components

### `/components/ui/ProgressRing.tsx`
SVG-based circular progress ring. Props: `percentage: number`, `size: number`, `color: string`. Animate `stroke-dashoffset` on value change.

### `/components/ui/Modal.tsx`
Centered modal with backdrop blur (`backdrop-filter: blur(8px)`). Trap focus. Close on Escape or backdrop click. Smooth scale + fade animation.

### `/components/ui/Toast.tsx`
Notification system. Fixed top-right, stack multiple toasts. Auto-dismiss after 3s. Slide-in from right. Types: success (cyan), warning (amber), error (coral).

---

## Phase 6 — Loading State (`/app/game/[regionId]/loading.tsx`)

Show a full-screen dark loading view:
- Animated SVG of a city grid drawing itself (stroke-dashoffset animation)
- Text: "正在載入 {regionName} 的道路資料…"
- Subtle pulsing dots

---

## Phase 7 — Polish & Final Checks

1. The user interface is in English, where the streets and inputs support Traditional Chinese (ZH-TW)
2. Add `<meta>` description and OG tags in layout
3. Verify localStorage operations don't crash during SSR
4. Test the Overpass API query manually at https://overpass-turbo.eu/ for 新竹市 before hardcoding
5. Add error boundary for failed Overpass fetches with a retry button
6. Ensure the SVG map renders correctly for both large cities (many roads) and small towns (few roads) — the projection must always fill the viewport
7. Add a "重置縮放" (reset zoom) button on the map
8. Add keyboard shortcut: press `/` to focus the input bar from anywhere

---

## Code Quality Rules

- All components must be typed with TypeScript — no `any`
- Use `'use client'` only where needed (map, input, sidebar); keep page components server-side where possible
- Extract magic numbers into named constants
- All Overpass/fetch calls must have proper error handling with user-facing messages
- No inline styles except for dynamic values (e.g. computed SVG coordinates); use Tailwind or CSS modules
- Commit-ready code: no TODO comments, no console.log in production paths

---

## Deliverable

A fully working Next.js application where:
- A user can select 新竹市, see its roads load on an SVG map, type road names, watch them light up, see live stats, and have their progress survive a page refresh.
- The gallery page shows a card for 新竹市 with a mini glowing map thumbnail and completion percentage.
- The UI looks and feels like a polished, dark cyberpunk cartography tool — not a generic web app.
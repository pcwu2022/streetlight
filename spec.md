# Streetlight — Project Specification

## Overview

A web-based memory game where users recall and type street names from a chosen Taiwanese city, town, or district. As streets are named correctly, they "light up" on an interactive map, building a glowing city grid over time. Progress is saved per-map in localStorage. This game has a user interface in English, but supports Traditional Chinese characters for street names and inputs.

---

## Tech Stack

- **Framework**: Next.js (latest stable, App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + CSS custom properties
- **Map Rendering**: SVG (generated from OpenStreetMap data), optionally layered with a lightweight canvas for glow effects
- **Data Source**: OpenStreetMap Overpass API
- **State/Persistence**: React context + localStorage (per-city save slots)
- **Fonts**: A distinctive display font for headings (e.g. Noto Serif TC for Chinese, a geometric sans for UI labels)

---

## Pages & Routes

### `/` — Entry / Gallery Page

- Dark background with a subtle animated grid or noise texture
- Header: app title (e.g. **路名記憶** or **街名挑戰**)
- **City selector**: searchable dropdown/combobox allowing the user to choose:
  - City (市): e.g. 新竹市, 台北市, 台中市
  - Town (鎮/鄉): e.g. 竹東鎮, 關西鎮
  - District (區): e.g. 台北市大安區, 台中市西屯區
  - Input accepts Chinese characters; filter list as user types
- **Progress Gallery**: card grid showing all previously played maps, each card showing:
  - City/district name
  - Mini SVG thumbnail of the map with lit streets highlighted
  - Completion percentage (overall + by type)
  - "Continue" or "New Game" button
- "Start New Game" CTA button leading to `/game/[regionId]`

---

### `/game/[regionId]` — Game Page

#### Layout (3-column on desktop, stacked on mobile)

```
┌──────────────────────────────────────────────────────┐
│  Header: region name + timer (optional) + back btn   │
├────────────┬────────────────────────────┬────────────┤
│            │                            │            │
│  Sidebar   │      Map Canvas (SVG)      │  (future   │
│  (stats)   │                            │   panel)   │
│            │                            │            │
├────────────┴────────────────────────────┴────────────┤
│  Input bar + autocomplete dropdown                   │
└──────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### 1. Region Selection

- Use a curated list of Taiwan administrative regions (hardcoded JSON with Chinese names + OSM relation IDs)
- Alternatively, allow free-text search that resolves to an OSM relation via Nominatim
- Once selected, the app fetches all qualifying roads within that relation boundary

---

### 2. Road Data Fetching (Overpass API)

**Endpoint**: `https://overpass-api.de/api/interpreter`

**Overpass Query** (fetch roads in region, excluding lanes/driveways):

```
[out:json][timeout:60];
area["name"="{regionName}"]->.searchArea;
(
  way["highway"]["name"~"路$|街$|道$|大道$|大路$"](area.searchArea);
);
out geom;
```

- Filter criteria (include): names ending in 路, 街, 道, 大道, 大路
- Filter criteria (exclude): names containing 巷, 弄 (lanes, driveways)
- Parse returned `way` elements: extract `name` tag + `geometry` (lat/lon node array)
- Cache fetched data in localStorage under key `osmData_${regionId}` with timestamp (re-fetch if >7 days old)
- Show a loading skeleton/spinner with progress indicator while fetching

---

### 3. SVG Map Rendering

- Project all coordinates to a normalized SVG viewport (e.g. `viewBox="0 0 1000 800"`)
- Use a simple equirectangular projection (scale lat/lon linearly to SVG coords)
- All roads rendered as `<polyline>` or `<path>` elements
  - Default state: dim grey (`#1e2a3a` or similar), thin stroke (0.5–1px)
  - "Found" state: glowing neon color (e.g. `#00e5ff` or `#7fff9e`), thicker stroke (2px), SVG drop-shadow filter
- Road types get distinct glow colors:
  - 路 (Road): cyan `#00e5ff`
  - 街 (Street): amber `#ffc93c`
  - 大道/大路 (Boulevard/Avenue): magenta `#ff6ef7`
- Animate stroke from dim to lit on discovery (CSS transition or SMIL)
- **Tooltip on hover**: display road's full name + length + type tag
  - Implemented via SVG `<title>` + custom floating tooltip div
  - Hovering also increases glow/brightness temporarily
- **Pan & zoom**: implement with CSS `transform` + pointer events (no heavy library needed); or use `svg-pan-zoom` lightweight lib
- Background: `#0a0e1a` (near-black navy)

---

### 4. Input Section

Located at the bottom of the screen, always visible.

- Large, prominent text input (Chinese IME compatible)
- **Live autocomplete**: detect first 2 non-space characters of input, query the in-memory road list for matches (client-side filter, no extra API calls)
  - Show dropdown list of up to 8 matching road names
  - Highlight matching characters in results
  - Arrow keys to navigate, Enter to select
- On confirmed input:
  1. Normalize: strip whitespace, validate name exists in dataset
  2. If valid and not yet found: mark road as found, animate it on the map, update stats, play a subtle chime/sound (optional toggle)
  3. If already found: show "已找到！" toast
  4. If invalid: show brief shake animation + "找不到此路名" message
- Input clears after each successful entry

---

### 5. Sidebar — Progress Stats

Always visible (collapsible on mobile). Updates live.

**Stats to display:**

| Stat | Description |
|---|---|
| 總道路數 | Total road count in region |
| 已找到 | Count + percentage found |
| 總長度 | Total km of roads found vs total |
| 最長道路 | Longest found road (name + km) |
| 最短道路 | Shortest found road (name + km) |
| 路 (Roads) | X found / Y total (%) |
| 街 (Streets) | X found / Y total (%) |
| 大道/大路 (Blvds) | X found / Y total (%) |
| 最近找到 | Last 5 found roads (scrolling list) |

- Use animated number counters when values change
- Mini bar charts for type breakdown (pure CSS bars)
- Subtle progress ring or bar for overall completion at the top

---

### 6. Persistence (localStorage)

**Storage schema:**

```ts
// Key: `game_${regionId}`
interface GameSave {
  regionId: string;
  regionName: string;         // e.g. "新竹市"
  foundRoads: string[];       // array of road names found
  startedAt: string;          // ISO timestamp
  lastPlayedAt: string;
  osmDataCacheKey: string;    // points to cached OSM data key
}

// Key: `osmData_${regionId}`
interface OsmCache {
  fetchedAt: string;
  roads: RoadFeature[];
}

interface RoadFeature {
  id: number;
  name: string;
  type: "路" | "街" | "大道" | "大路" | "道" | "other";
  coordinates: [number, number][];  // [lng, lat] pairs
  lengthKm: number;
}
```

- Auto-save on every road discovery (debounced 500ms)
- On page load, restore `foundRoads` and re-highlight them on the map
- Gallery page reads all `game_*` keys to render progress cards

---

### 7. Gallery / Entry Page Details

- Each saved game renders as a card:
  - Background: dark card with a glowing mini-map SVG thumbnail (scaled-down version with found roads lit)
  - Region name in large type
  - Completion % ring
  - Last played date
  - "繼續遊戲" / "重新開始" buttons
- "重新開始" triggers a confirmation modal, then clears save data for that region
- Empty state (no saves): illustration + prompt to start first game

---

## UI / UX Design Direction

**Aesthetic**: Cyberpunk cartography — dark, glowing, precise. Like a circuit board or a city seen from orbit at night.

**Color palette:**
- Background: `#080c18`
- Surface/cards: `#0f1629`
- Border/dividers: `#1e2d4a`
- Primary accent (roads found): `#00e5ff` (cyan)
- Secondary accent (streets): `#ffc93c` (amber)
- Tertiary (boulevards): `#ff6ef7` (magenta)
- Text primary: `#e8f4f8`
- Text secondary: `#5a7a99`

**Typography:**
For Chinese Characters:
- Headings: Noto Serif TC (Chinese characters, traditional)
- UI labels/numbers: `IBM Plex Mono` (monospace, techy feel)
- Body: Noto Sans TC

**Motion:**
- Road "light-up" on discovery: stroke-dashoffset animation (draw effect) + glow filter fade-in
- Stat counters: animated number roll
- Input validation feedback: shake keyframe on error, pulse on success
- Page transitions: fade + slight upward slide

---

## Additional Ideas (Enhancements)

1. **Heatmap mode**: toggle to show a density heatmap of found vs. unfound roads
2. **Hint system**: "Reveal 1 road" button with a cooldown timer (costs a "hint token")
3. **Share progress**: generate a shareable PNG snapshot of the current map state
4. **Streaks**: track daily play streaks, show a flame icon if streak > 3
5. **Sound effects**: optional ambient city sound + chime on road discovery (Web Audio API)
6. **Mobile**: bottom sheet for stats instead of sidebar; swipe up to expand

---

## File Structure (Next.js App Router)

```
/app
  /page.tsx                  — Gallery / entry page
  /game/[regionId]/page.tsx  — Game page
  /game/[regionId]/loading.tsx
  /layout.tsx                — Root layout (fonts, metadata)
  /globals.css

/components
  /gallery/
    RegionCard.tsx
    RegionSelector.tsx
  /game/
    MapCanvas.tsx            — SVG map renderer
    RoadPolyline.tsx         — Individual road SVG element
    InputBar.tsx             — Input + autocomplete
    Sidebar.tsx              — Stats panel
    StatCounter.tsx
    Tooltip.tsx
  /ui/
    Modal.tsx
    Toast.tsx
    ProgressRing.tsx

/lib
  /overpass.ts               — Overpass API queries
  /geo.ts                    — Coordinate projection utils
  /storage.ts                — localStorage read/write helpers
  /roadUtils.ts              — Road name parsing, type detection, length calc
  /regions.ts                — Hardcoded Taiwan regions list with OSM IDs

/types
  index.ts                   — Shared TypeScript interfaces

/public
  /sounds/                   — Optional chime audio files
```

---

## Out of Scope (v1)

- User accounts / cloud sync
- Multiplayer
- Routing/directions
- Non-Taiwan regions
- Mobile app (PWA installability optional)
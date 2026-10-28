# Streetlight

A road naming game built with Next.js. Run `npm install` and `npm run dev`, then open <http://localhost:3000/streetlight>.

## Stored maps

Road snapshots live in `public/data/roads/<region-id>.json` and are tracked in Git. Next.js copies them into the static export, so gameplay loads the hosted JSON files instead of calling Overpass. The `/streetlight` base path is shared by Next.js and the map loader. Game progress stays in browser storage.

`data/regions.json` is the shared region list for the application and download scripts. `public/data/manifest.json` lists the available snapshots. Lengths and road types are calculated from snapshot geometry when a map loads, keeping classification consistent with the current code.

```bash
npm run maps:check                          # Validate all configured map files, offline
npm run maps:prefetch                       # Download missing maps; reuse existing files
npm run maps:prefetch -- --regions new-york  # Download one map
npm run maps:prefetch -- --regions new-york --refresh
```

The prefetch command is an explicit maintenance step; development, builds, and gameplay do not contact Overpass. Use `--endpoint URL` to choose another Overpass server. Downloads reject empty or partial responses and preserve the last good snapshot on failure. Commit updated JSON files and the manifest along with any region changes.

For bulk imports when Overpass is unavailable, download an OpenStreetMap PBF extract containing the complete city boundaries, then run:

```bash
python3 -m venv /tmp/streetlight-maps
/tmp/streetlight-maps/bin/pip install osmium shapely
/tmp/streetlight-maps/bin/python data/import_osm_extract.py /path/to/taiwan.osm.pbf \
  --locale tw --source https://download.geofabrik.de/asia/taiwan-latest.osm.pbf
```

Use `--regions region-id` instead of `--locale` to import individual cities. Imports select named highways intersecting the configured administrative boundaries.

Map data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/).

## Matching and classification

Press Enter to submit a name. Road type words and keywords matching more than 20 distinct road names keep the input intact so you can narrow your guess. Multiple OSM segments of the same road count as one name; already found roads still count toward the limit.

Broadway has its own category. All road categories, including Other, appear in the statistics and use the same colors as lit map segments.

## Checks and deployment

```bash
npm test
npm run maps:check
npm run build
npm run deploy
```

The production build validates every configured map offline before exporting the site to `out/` for GitHub Pages.

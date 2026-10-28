#!/usr/bin/env python3
"""Download road snapshots explicitly; builds and gameplay never call Overpass."""
import argparse
import gzip
import http.client
import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REGION_CONFIG = PROJECT_ROOT / 'data' / 'regions.json'
DEFAULT_ENDPOINT = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'


def read_snapshot(path, region):
    data = json.loads(path.read_text(encoding='utf-8'))
    if data.get('region') != region['id'] or not data.get('roads'):
        raise ValueError(f'Missing or empty road snapshot: {path}')
    for road in data['roads']:
        points = road.get('coordinates', [])
        if (not isinstance(road.get('id'), int) or not isinstance(road.get('name'), str)
                or not road['name'].strip() or len(points) < 2
                or any(len(point) != 2 or not all(isinstance(n, (int, float)) and math.isfinite(n) for n in point) for point in points)):
            raise ValueError(f'Invalid road geometry: {path}')
    return data


def fetch_region_data(region, endpoint, retries, delay):
    area_id = 3600000000 + region['osmRelationId']
    name_filter = '["name"]' if region['locale'] == 'en' else '["name"~"路|街|道|橋|地下道|隧道"]'
    query = f'[out:json][timeout:90];area({area_id})->.a;way["highway"]{name_filter}(area.a);out geom;'
    request = urllib.request.Request(
        endpoint,
        data=urllib.parse.urlencode({'data': query}).encode('utf-8'),
        headers={'User-Agent': 'StreetlightPrefetch/2.0 (https://github.com/pcwu2022/streetlight)',
                 'Content-Type': 'application/x-www-form-urlencoded',
                 'Accept': 'application/json', 'Accept-Encoding': 'gzip'},
    )
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                stream = gzip.GzipFile(fileobj=response) if response.headers.get('Content-Encoding') == 'gzip' else response
                payload = json.load(stream)
            if payload.get('remark') or not isinstance(payload.get('elements'), list):
                raise ValueError(payload.get('remark', 'Invalid Overpass response'))
            roads = []
            for element in payload['elements']:
                if element.get('type') != 'way':
                    continue
                name = (element.get('tags', {}).get('name') or '').strip()
                points = [[p['lon'], p['lat']] for p in element.get('geometry', []) if 'lon' in p and 'lat' in p]
                if name and len(points) >= 2:
                    roads.append({'id': element['id'], 'name': name, 'coordinates': points})
            if not roads:
                raise ValueError('Overpass returned no roads; check the region boundary ID')
            return {'region': region['id'], 'name': region['name'], 'osmRelationId': region['osmRelationId'],
                    'fetchedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'roads': roads}
        except (OSError, urllib.error.URLError, http.client.HTTPException, ValueError) as exc:
            if attempt == retries:
                raise RuntimeError(f'Could not fetch {region["id"]}: {exc}') from exc
            wait = max(30, delay * (attempt + 1))
            print(f'  {exc}; retrying in {wait}s', file=sys.stderr, flush=True)
            time.sleep(wait)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Atomic replacement keeps a failed refresh from corrupting the last good snapshot.
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    temporary.replace(path)


def update_manifest(root, regions):
    entries = []
    for region in regions:
        path = root / 'roads' / f'{region["id"]}.json'
        if not path.exists():
            continue
        data = read_snapshot(path, region)
        entries.append({'id': region['id'], 'name': region['name'], 'locale': region['locale'],
                        'osmRelationId': region['osmRelationId'], 'roadCount': len(data['roads']),
                        'file': f'roads/{region["id"]}.json'})
    write_json(root / 'manifest.json', {'source': 'OpenStreetMap contributors',
                                     'license': 'https://opendatacommons.org/licenses/odbl/1-0/', 'regions': entries})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--delay', type=float, default=8, help='Seconds between API requests.')
    parser.add_argument('--endpoint', default=DEFAULT_ENDPOINT)
    parser.add_argument('--retries', type=int, default=2)
    parser.add_argument('--output-dir', type=Path, default=PROJECT_ROOT / 'public' / 'data')
    parser.add_argument('--regions', nargs='*', default=[])
    parser.add_argument('--limit', type=int)
    parser.add_argument('--refresh', action='store_true', help='Replace existing snapshots; otherwise reuse valid files.')
    parser.add_argument('--check', action='store_true', help='Validate all selected files without network access.')
    args = parser.parse_args()
    config = json.loads(REGION_CONFIG.read_text(encoding='utf-8'))
    regions = [region for group in config.values() for region in group]
    selected = [r for r in regions if not args.regions or r['id'] in args.regions]
    unknown = set(args.regions) - {r['id'] for r in selected}
    if unknown:
        parser.error(f'Unknown region IDs: {", ".join(sorted(unknown))}')
    if args.limit is not None:
        selected = selected[:args.limit]
    failures = []
    for region in selected:
        path = args.output_dir / 'roads' / f'{region["id"]}.json'
        try:
            if args.check or (path.exists() and not args.refresh):
                data = read_snapshot(path, region)
                print(f'Validated {region["id"]}: {len(data["roads"])} segments', flush=True)
            else:
                print(f'Fetching {region["id"]}...', flush=True)
                data = fetch_region_data(region, args.endpoint, args.retries, args.delay)
                write_json(path, data)
                print(f'Saved {region["id"]}: {len(data["roads"])} segments', flush=True)
                update_manifest(args.output_dir, regions)
                time.sleep(args.delay)
        except Exception as exc:
            failures.append(region['id'])
            print(f'Failed {region["id"]}: {exc}', file=sys.stderr, flush=True)
    if not args.check:
        update_manifest(args.output_dir, regions)
    if failures:
        raise SystemExit(f'Missing or invalid maps: {", ".join(failures)}')


if __name__ == '__main__':
    main()

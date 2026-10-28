#!/usr/bin/env python3
"""Import a local OSM PBF extract into map snapshots (pip install osmium shapely)."""
import argparse
import json
import re
import sys
import time
from pathlib import Path

import osmium
from shapely import from_wkb
from shapely.geometry import LineString
from shapely.prepared import prep

from prefetch_overpass import PROJECT_ROOT, REGION_CONFIG, update_manifest, write_json


class RoadImporter(osmium.SimpleHandler):
    def __init__(self, regions):
        super().__init__()
        self.regions = {r['osmRelationId']: r for r in regions}
        self.boundaries = {}
        self.roads = []
        self.factory = osmium.geom.WKBFactory()
        self.taiwan_only = all(r['locale'] == 'tw' for r in regions)

    def way(self, way):
        name = way.tags.get('name', '').strip()
        if not way.tags.get('highway') or not name:
            return
        if self.taiwan_only and not re.search('路|街|道|橋|隧道', name):
            return
        try:
            points = [[node.lon, node.lat] for node in way.nodes]
        except osmium.InvalidLocationError:
            return
        if len(points) >= 2:
            self.roads.append({'id': way.id, 'name': name, 'coordinates': points})

    def area(self, area):
        if not area.from_way() and area.orig_id() in self.regions:
            self.boundaries[area.orig_id()] = from_wkb(self.factory.create_multipolygon(area))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--regions', nargs='+')
    parser.add_argument('--locale', choices=['tw', 'en'])
    parser.add_argument('--source', required=True, help='Public URL of the downloaded PBF extract.')
    args = parser.parse_args()
    config = json.loads(REGION_CONFIG.read_text(encoding='utf-8'))
    all_regions = [r for group in config.values() for r in group]
    regions = [r for r in all_regions if (not args.regions or r['id'] in args.regions) and (not args.locale or r['locale'] == args.locale)]
    if not regions or (not args.regions and not args.locale):
        parser.error('Choose --regions or --locale')
    importer = RoadImporter(regions)
    print(f'Reading {args.input}...', flush=True)
    importer.apply_file(str(args.input), locations=True, idx='flex_mem')
    print(f'Read {len(importer.roads)} named road segments and {len(importer.boundaries)} region boundaries', flush=True)
    geometries = [LineString(r['coordinates']) for r in importer.roads]
    failures = []
    root = PROJECT_ROOT / 'public' / 'data'
    for region in regions:
        boundary = importer.boundaries.get(region['osmRelationId'])
        if boundary is None:
            print(f'Missing complete boundary: {region["id"]}', file=sys.stderr)
            failures.append(region['id'])
            continue
        polygon = prep(boundary)
        roads = [road for road, geometry in zip(importer.roads, geometries) if polygon.intersects(geometry)]
        if not roads:
            failures.append(region['id'])
            continue
        write_json(root / 'roads' / f'{region["id"]}.json', {
            'region': region['id'], 'name': region['name'], 'osmRelationId': region['osmRelationId'],
            'source': args.source, 'fetchedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'roads': roads,
        })
        print(f'Saved {region["id"]}: {len(roads)} road segments', flush=True)
    update_manifest(root, all_regions)
    if failures:
        raise SystemExit(f'Missing maps: {", ".join(failures)}')


if __name__ == '__main__':
    main()

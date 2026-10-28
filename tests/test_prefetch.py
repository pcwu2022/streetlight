import gzip
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'data'))
from prefetch_overpass import fetch_region_data, read_snapshot, update_manifest, write_json


class PrefetchTests(unittest.TestCase):
    region = {'id': 'test', 'name': 'Test', 'locale': 'en', 'osmRelationId': 123}

    def response(self, payload):
        response = io.BytesIO(gzip.compress(json.dumps(payload).encode()))
        response.headers = {'Content-Encoding': 'gzip'}
        return response

    def test_rejects_partial_results_even_with_http_success(self):
        payload = {'remark': 'runtime error: Query timed out', 'elements': []}
        with patch('urllib.request.urlopen', return_value=self.response(payload)):
            with self.assertRaisesRegex(RuntimeError, 'Query timed out'):
                fetch_region_data(self.region, 'https://example.test', 0, 0)

    def test_rejects_empty_results(self):
        with patch('urllib.request.urlopen', return_value=self.response({'elements': []})):
            with self.assertRaisesRegex(RuntimeError, 'no roads'):
                fetch_region_data(self.region, 'https://example.test', 0, 0)

    def test_accepts_compressed_geometry_and_preserves_coordinates(self):
        payload = {'elements': [{'type': 'way', 'id': 1, 'tags': {'name': 'Broadway'},
                                'geometry': [{'lon': -74, 'lat': 40.7}, {'lon': -73.99, 'lat': 40.71}]}]}
        with patch('urllib.request.urlopen', return_value=self.response(payload)):
            snapshot = fetch_region_data(self.region, 'https://example.test', 0, 0)
        self.assertEqual(snapshot['roads'][0]['coordinates'], [[-74, 40.7], [-73.99, 40.71]])

    def test_updating_manifest_keeps_other_existing_regions(self):
        other = {**self.region, 'id': 'other'}
        road = {'id': 1, 'name': 'Broadway', 'coordinates': [[-74, 40.7], [-73.99, 40.71]]}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for region in [self.region, other]:
                write_json(root / 'roads' / f'{region["id"]}.json', {'region': region['id'], 'roads': [road]})
            update_manifest(root, [self.region, other])
            manifest = json.loads((root / 'manifest.json').read_text())
            self.assertEqual([r['id'] for r in manifest['regions']], ['test', 'other'])
            write_json(root / 'roads' / 'test.json', {'region': 'test', 'roads': []})
            with self.assertRaisesRegex(ValueError, 'empty'):
                read_snapshot(root / 'roads' / 'test.json', self.region)


if __name__ == '__main__':
    unittest.main()

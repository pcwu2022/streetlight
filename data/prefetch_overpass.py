#!/usr/bin/env python3

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

DEFAULT_REGIONS = [
    {"id": "london", "name": "London", "osmRelationId": 175342},
    {"id": "paris", "name": "Paris", "osmRelationId": 7444},
    {"id": "new-york", "name": "New York", "osmRelationId": 175905},
    {"id": "madrid", "name": "Madrid", "osmRelationId": 367106},
    {"id": "berlin", "name": "Berlin", "osmRelationId": 62422},
    {"id": "munich", "name": "Munich", "osmRelationId": 62463},
    {"id": "barcelona", "name": "Barcelona", "osmRelationId": 349514},
    {"id": "rome", "name": "Rome", "osmRelationId": 41787},
    {"id": "milan", "name": "Milan", "osmRelationId": 152812},
    {"id": "venice", "name": "Venice", "osmRelationId": 42746},
    {"id": "toronto", "name": "Toronto", "osmRelationId": 324939},
    {"id": "vancouver", "name": "Vancouver", "osmRelationId": 374935},
    {"id": "los-angeles", "name": "Los Angeles", "osmRelationId": 207708},
    {"id": "san-francisco", "name": "San Francisco", "osmRelationId": 1423609},
    {"id": "seattle", "name": "Seattle", "osmRelationId": 189714},
    {"id": "dallas", "name": "Dallas", "osmRelationId": 111326},
    {"id": "washington-dc", "name": "Washington, DC", "osmRelationId": 133512},
    {"id": "pittsburgh", "name": "Pittsburgh", "osmRelationId": 188553},
    {"id": "atlanta", "name": "Atlanta", "osmRelationId": 128065},
]


def region_file_name(region_id: str) -> str:
    return f"{region_id}.json"


def fetch_region_data(region, delay_seconds=8.0, endpoint="https://overpass-api.de/api/interpreter", retries=5):
    # Overpass does not accept arithmetic in the area() selector; it expects a literal integer like 3600175342.
    area_id = 3600000000 + int(region['osmRelationId'])
    query = f"""
[out:json][timeout:90];
area({area_id})->.searchArea;
(
  way["highway"]["name"](area.searchArea);
);
out geom;
    """.strip()

    encoded = urllib.parse.quote(query)
    request = urllib.request.Request(
        endpoint,
        data=f"data={encoded}".encode("utf-8"),
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "StreetlightPrefetch/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )

    last_error = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            last_error = exc
            status_code = getattr(exc, 'code', None)
            if status_code not in {429, 500, 502, 503, 504}:
                raise RuntimeError(f"Overpass request failed with HTTP {status_code}: {exc.reason}") from exc
            if attempt == retries:
                raise RuntimeError(
                    f"Overpass request failed after {retries + 1} attempts with HTTP {status_code}. "
                    "The API may be rate-limiting or timing out; try a higher --delay value."
                ) from exc
            wait_seconds = min(180, delay_seconds + (2 ** attempt) * 5)
            print(f"  Request failed (HTTP {status_code}: {exc.reason}); retrying in {wait_seconds}s...", file=sys.stderr)
            time.sleep(wait_seconds)
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt == retries:
                raise RuntimeError(
                    f"Network request failed after {retries + 1} attempts. "
                    "Run this script from a machine with internet access or configure a reachable endpoint."
                ) from exc
            wait_seconds = min(180, delay_seconds + (2 ** attempt) * 5)
            print(f"  Request failed ({exc}); retrying in {wait_seconds}s...", file=sys.stderr)
            time.sleep(wait_seconds)

    roads = []
    for element in payload.get("elements", []):
        if element.get("type") != "way":
            continue

        tags = element.get("tags") or {}
        name = (tags.get("name") or tags.get("name:en") or "").strip()
        if not name:
            continue

        geometry = element.get("geometry") or []
        points = []
        for point in geometry:
            if "lon" in point and "lat" in point:
                points.append([float(point["lon"]), float(point["lat"])])
        if len(points) < 2:
            continue

        roads.append({
            "id": int(element["id"]),
            "name": name,
            "type": "road",
            "coordinates": points,
        })

    if delay_seconds > 0:
        time.sleep(delay_seconds)

    return roads


def main():
    parser = argparse.ArgumentParser(description="Pre-fetch Overpass road data for the Streetlight English cities.")
    parser.add_argument("--delay", type=float, default=8.0, help="Seconds to wait between requests. Increase for rate-limited Overpass servers.")
    parser.add_argument("--endpoint", type=str, default="https://overpass-api.de/api/interpreter", help="Overpass interpreter endpoint.")
    parser.add_argument("--retries", type=int, default=5, help="Retries per region after network, timeout, or temporary Overpass errors.")
    parser.add_argument("--output-dir", type=str, default="data", help="Directory to store fetched data.")
    parser.add_argument("--regions", nargs="*", default=[], help="Optional region ids to fetch.")
    parser.add_argument("--limit", type=int, default=None, help="Optional cap on region count.")
    args = parser.parse_args()

    selected = DEFAULT_REGIONS
    if args.regions:
        region_ids = set(args.regions)
        selected = [region for region in DEFAULT_REGIONS if region["id"] in region_ids]
        missing = sorted(region_ids - {region["id"] for region in selected})
        if missing:
            raise SystemExit(f"Unknown region ids: {', '.join(missing)}")

    if args.limit is not None:
        selected = selected[: args.limit]

    root = Path(args.output_dir)
    root.mkdir(parents=True, exist_ok=True)
    (root / "roads").mkdir(parents=True, exist_ok=True)

    manifest = {"fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "regions": []}

    for region in selected:
        try:
            roads = fetch_region_data(region, delay_seconds=args.delay, endpoint=args.endpoint, retries=args.retries)
            out_path = root / "roads" / region_file_name(region["id"])
            out_path.write_text(json.dumps({"region": region["id"], "name": region["name"], "roads": roads}, ensure_ascii=False, indent=2), encoding="utf-8")
            manifest["regions"].append({
                "id": region["id"],
                "name": region["name"],
                "roadCount": len(roads),
                "file": str(out_path.relative_to(root.parent if root.parent != Path('.') else Path('.'))),
            })
            print(f"Fetched {region['name']} ({len(roads)} roads) -> {out_path}")
        except Exception as exc:
            print(f"Failed to fetch {region['name']}: {exc}", file=sys.stderr)

    (root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

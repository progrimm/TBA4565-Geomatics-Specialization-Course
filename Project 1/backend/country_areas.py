import argparse
import csv
import json
from datetime import date
from math import asin, atan, ceil, cos, degrees, isfinite, pi, radians, sinh
from pathlib import Path
from statistics import median

from pyproj import Geod, Transformer
from shapely import MultiPolygon, Polygon, clip_by_rect, orient_polygons, transform
from shapely.geometry import shape

from database import connect_database

RADIUS = 6371007.1809
# Web Mercator latitude limit, where the square map closes: atan(sinh(pi)).
MERCATOR_LIMIT = degrees(atan(sinh(pi)))
SPACINGS = (20000, 10000, 5000)
TOLERANCE = 1e-5
PROJECTIONS = ("merc", "eck4")

sphere = Geod(a=RADIUS, f=0)
source_crs = f"+proj=longlat +R={RADIUS} +type=crs"
target_crs = {
    projection: f"+proj={projection} +R={RADIUS} +units=m +type=crs"
    for projection in (*PROJECTIONS, "cea")
}
transformers = {
    projection: Transformer.from_crs(source_crs, crs, always_xy=True)
    for projection, crs in target_crs.items()
}

PROJECT_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_DIR / "results" / "country_areas.csv"
SUMMARY_PATH = PROJECT_DIR / "results" / "summary.md"
JSON_PATH = PROJECT_DIR / "frontend" / "public" / "data" / "country_areas.json"

COLUMNS = (
    "adm0_a3",
    "admin",
    "sphere_radius_m",
    "spherical_area_m2",
    "unclipped_spherical_area_m2",
    "ellipsoidal_area_m2",
    "merc_area_m2",
    "merc_ratio",
    "merc_change_20_10",
    "merc_change_10_5",
    "eck4_area_m2",
    "eck4_ratio",
    "eck4_change_20_10",
    "eck4_change_10_5",
    "centroid_lat_deg",
    "min_lat_deg",
    "max_lat_deg",
    "sec2_at_centroid",
    "merc_ratio_over_sec2",
    "is_clipped",
    "clipped_area_fraction",
    "max_segment_length_m",
    "status",
)


def densify_ring(ring, spacing):
    coordinates = list(ring.coords)
    result = []
    for start, end in zip(coordinates, coordinates[1:]):
        distance = sphere.inv(*start, *end)[2]
        extra = max(0, ceil(distance / spacing) - 1)
        result.append(start)
        if extra:
            result.extend(sphere.npts(*start, *end, extra))
    return result + [coordinates[-1]]


def densify_parallel_edges(ring, spacing):
    """Densify clip edges that follow a parallel, not a great circle."""
    coordinates = list(ring.coords)
    result = []
    for (x0, y0), (x1, y1) in zip(coordinates, coordinates[1:]):
        result.append((x0, y0))
        if y0 == y1 and abs(y0) == MERCATOR_LIMIT:
            length = RADIUS * cos(radians(y0)) * radians(abs(x1 - x0))
            steps = ceil(length / spacing)
            result.extend(
                (x0 + (x1 - x0) * step / steps, y0) for step in range(1, steps)
            )
    return result + [coordinates[-1]]


def as_multipolygon(geometry):
    if isinstance(geometry, Polygon):
        return MultiPolygon([geometry])
    if isinstance(geometry, MultiPolygon):
        return geometry
    parts = [
        part
        for part in getattr(geometry, "geoms", [])
        if isinstance(part, (Polygon, MultiPolygon)) and not part.is_empty
    ]
    polygons = [p for part in parts for p in as_multipolygon(part).geoms]
    return MultiPolygon(polygons)


def densify(geometry, spacing, ring_function=densify_ring):
    return MultiPolygon(
        [
            Polygon(
                ring_function(part.exterior, spacing),
                [ring_function(hole, spacing) for hole in part.interiors],
            )
            for part in geometry.geoms
        ]
    )


def needs_clipping(geometry):
    _, min_lat, _, max_lat = geometry.bounds
    return min_lat < -MERCATOR_LIMIT or max_lat > MERCATOR_LIMIT


def clip_to_mercator_limit(geometry, spacing):
    """Clip a great-circle-densified geometry to |latitude| <= MERCATOR_LIMIT."""
    # Clip in latitude only. A rectangle edge on +/-180 would replace densified
    # antimeridian edges with straight lines, which Eckert IV draws curved.
    clipped = as_multipolygon(
        clip_by_rect(geometry, -360, -MERCATOR_LIMIT, 360, MERCATOR_LIMIT)
    )
    if clipped.is_empty:
        raise ValueError("Geometry lies entirely beyond the Mercator limit")
    return orient_polygons(densify(clipped, spacing, densify_parallel_edges))


def prepare(geometry, spacing, clip):
    dense = densify(geometry, spacing)
    return clip_to_mercator_limit(dense, spacing) if clip else dense


def spherical_area(geometry):
    return sphere.geometry_area_perimeter(geometry)[0]


def centroid_latitude(geometry):
    """Area-weighted mean latitude: asin of the mean of sin(latitude).

    In the spherical cylindrical equal-area projection y = R sin(latitude)
    and areas are preserved, so the planar centroid's y gives that mean.
    """
    projected = transform(geometry, transformers["cea"].transform, interleaved=False)
    return degrees(asin(max(-1.0, min(1.0, projected.centroid.y / RADIUS))))


def sec2(latitude):
    return 1 / cos(radians(latitude)) ** 2


def calculate_country_areas(code, admin, geometry, ellipsoidal_area_m2=None):
    """Compute reference/projected areas and checks for one country geometry.

    Numerical problems are recorded in "status" instead of raised, so a
    batch run reports every country. Invalid input geometry still raises.
    """
    geometry = as_multipolygon(orient_polygons(geometry))
    if geometry.is_empty or not geometry.is_valid:
        raise ValueError(f"{code}: expected a valid, nonempty (Multi)Polygon")
    unclipped_reference = spherical_area(geometry)
    if not isfinite(unclipped_reference) or unclipped_reference <= 0:
        raise ValueError(f"{code}: invalid spherical reference area")
    clip = needs_clipping(geometry)
    issues = []
    areas = {projection: {} for projection in PROJECTIONS}
    for spacing in SPACINGS:
        dense = prepare(geometry, spacing, clip)
        for projection in PROJECTIONS:
            projected = transform(
                dense, transformers[projection].transform, interleaved=False
            )
            area = projected.area
            if not isfinite(area) or area <= 0:
                issues.append(f"{projection}_invalid_area_{spacing // 1000}km")
            elif spacing == SPACINGS[-1] and not projected.is_valid:
                issues.append(f"{projection}_invalid_geometry")
            areas[projection][spacing] = area
    # The reference area is exact for unclipped geometries. Clipped ones use
    # the finest clipped geometry, so the ratio covers the same region.
    reference = spherical_area(dense) if clip else unclipped_reference
    row = {
        "adm0_a3": code,
        "admin": admin,
        "sphere_radius_m": RADIUS,
        "spherical_area_m2": reference,
        "unclipped_spherical_area_m2": unclipped_reference,
        "ellipsoidal_area_m2": ellipsoidal_area_m2,
    }
    for projection in PROJECTIONS:
        by_spacing = areas[projection]
        area = by_spacing[5000]
        ratio = area / reference
        change_10_5 = abs(area / by_spacing[10000] - 1)
        if change_10_5 >= TOLERANCE:
            issues.append(f"{projection}_not_converged")
        row |= {
            f"{projection}_area_m2": area,
            f"{projection}_ratio": ratio,
            f"{projection}_change_20_10": abs(by_spacing[10000] / by_spacing[20000] - 1),
            f"{projection}_change_10_5": change_10_5,
        }
    if abs(row["eck4_ratio"] - 1) >= TOLERANCE:
        issues.append("eck4_ratio_outside_tolerance")
    if row["merc_ratio"] <= 1:
        issues.append("merc_ratio_not_above_1")
    latitude = centroid_latitude(dense)
    _, min_lat, _, max_lat = dense.bounds
    row |= {
        "centroid_lat_deg": latitude,
        "min_lat_deg": min_lat,
        "max_lat_deg": max_lat,
        "sec2_at_centroid": sec2(latitude),
        "merc_ratio_over_sec2": row["merc_ratio"] / sec2(latitude),
        "is_clipped": clip,
        "clipped_area_fraction": reference / unclipped_reference,
        "max_segment_length_m": SPACINGS[-1],
        "status": ",".join(issues) or "ok",
    }
    return row


def to_response(row):
    """API shape: a superset of the original Greenland-only response."""
    return {
        "country_code": row["adm0_a3"],
        "admin": row["admin"],
        "sphere_radius_m": row["sphere_radius_m"],
        "spherical_reference_area_m2": row["spherical_area_m2"],
        "unclipped_spherical_area_m2": row["unclipped_spherical_area_m2"],
        "ellipsoidal_area_m2": row["ellipsoidal_area_m2"],
        "max_segment_length_m": row["max_segment_length_m"],
        "boundary_model": "spherical great-circle arcs",
        "ratio_reference": "spherical_reference_area_m2",
        "projections": {
            projection: {
                "area_m2": row[f"{projection}_area_m2"],
                "area_ratio": row[f"{projection}_ratio"],
                "relative_change_from_10km": row[f"{projection}_change_10_5"],
                "relative_change_20_to_10km": row[f"{projection}_change_20_10"],
                "crs": target_crs[projection],
            }
            for projection in PROJECTIONS
        },
        "centroid_latitude_deg": row["centroid_lat_deg"],
        "latitude_range_deg": [row["min_lat_deg"], row["max_lat_deg"]],
        "sec2_at_centroid": row["sec2_at_centroid"],
        "merc_ratio_over_sec2": row["merc_ratio_over_sec2"],
        "clipping": {
            "is_clipped": row["is_clipped"],
            "latitude_limit_deg": MERCATOR_LIMIT,
            "clipped_area_fraction": row["clipped_area_fraction"],
        },
        "status": row["status"],
    }


def load_countries(codes=None):
    query = """
        SELECT adm0_a3, admin, ST_AsGeoJSON(geom, 15)::json, geodesic_area_m2
        FROM public.countries
    """
    parameters = []
    if codes:
        query += " WHERE adm0_a3 = ANY(%s)"
        parameters.append(list(codes))
    with connect_database() as connection:
        return connection.execute(query + " ORDER BY adm0_a3", parameters).fetchall()


def compute(codes=None):
    rows, failures = [], []
    for code, admin, geojson, ellipsoidal in load_countries(codes):
        row = calculate_country_areas(code, admin, shape(geojson), ellipsoidal)
        rows.append(row)
        if row["status"] != "ok":
            failures.append(row)
    return rows, failures


def write_table(rows):
    placeholders = ", ".join(f"%({column})s" for column in COLUMNS)
    with connect_database() as connection:
        with connection.transaction():
            connection.execute("DELETE FROM public.country_area_stats")
            with connection.cursor() as cursor:
                cursor.executemany(
                    f"INSERT INTO public.country_area_stats ({', '.join(COLUMNS)}) "
                    f"VALUES ({placeholders})",
                    rows,
                )


def read_table(code=None):
    query = f"SELECT {', '.join(COLUMNS)} FROM public.country_area_stats"
    parameters = []
    if code is not None:
        query += " WHERE adm0_a3 = %s"
        parameters.append(code)
    with connect_database() as connection:
        cursor = connection.execute(query + " ORDER BY adm0_a3", parameters)
        return [dict(zip(COLUMNS, record)) for record in cursor.fetchall()]


def write_csv(rows, path=CSV_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def write_json(rows, path=JSON_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps([to_response(row) for row in rows], indent=1) + "\n",
        encoding="utf-8",
    )


def summarize(rows):
    """Markdown summary. Every number is computed from rows."""

    def ratio(value):
        return f"{value:.4f}"

    def country_table(selection):
        lines = [
            "| Country | Code | Centroid lat (°) | Lat range (°) | Mercator ratio | sec²(φc) | Ratio / sec²(φc) |",
            "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
        ]
        for row in selection:
            lines.append(
                f"| {row['admin']} | {row['adm0_a3']} | {row['centroid_lat_deg']:.2f} "
                f"| {row['min_lat_deg']:.1f} to {row['max_lat_deg']:.1f} "
                f"| {ratio(row['merc_ratio'])} | {ratio(row['sec2_at_centroid'])} "
                f"| {ratio(row['merc_ratio_over_sec2'])} |"
            )
        return "\n".join(lines)

    clipped = [row for row in rows if row["is_clipped"]]
    failures = [row for row in rows if row["status"] != "ok"]
    stats = [row for row in rows if not row["is_clipped"]]
    by_ratio = sorted(stats, key=lambda row: row["merc_ratio"], reverse=True)
    by_gap = sorted(stats, key=lambda row: row["merc_ratio_over_sec2"], reverse=True)
    gaps = [row["merc_ratio_over_sec2"] for row in stats]
    eck4_worst = max(stats, key=lambda row: abs(row["eck4_ratio"] - 1))
    within_1pct = sum(1 for gap in gaps if gap < 1.01)
    within_10pct = sum(1 for gap in gaps if gap < 1.10)
    largest_gap_span = min(row["max_lat_deg"] - row["min_lat_deg"] for row in by_gap[:5])

    lines = [
        "# Country area distortion: summary",
        "",
        f"Generated on {date.today().isoformat()} by `country_areas.py export` from "
        "`public.country_area_stats`. Do not edit by hand; rerun the export.",
        "",
        f"Method: sphere R = {RADIUS} m, great-circle boundaries densified to "
        f"{SPACINGS[-1] // 1000} km, ratio = projected area / spherical area of the same "
        "geometry. Natural Earth 1:110m boundaries (generalised).",
        "",
        "## Coverage",
        "",
        f"- Countries computed: {len(rows)}.",
        f"- Countries not `ok`: {len(failures)}"
        + (
            ". " + "; ".join(f"{row['adm0_a3']} ({row['status']})" for row in failures)
            + ". Flagged countries are still included in the statistics below; see the "
            "backend README for the diagnosis."
            if failures
            else " (every country converged to below 1e-5 between 10 km and 5 km "
            "for both projections, and every Eckert IV ratio is within 1e-5 of 1)."
        ),
    ]
    for row in clipped:
        lines.append(
            f"- {row['admin']} ({row['adm0_a3']}) extends beyond ±{MERCATOR_LIMIT:.4f}°, "
            "where Mercator area grows without bound. It was clipped to that limit for "
            f"both the reference and projected areas; {row['clipped_area_fraction'] * 100:.2f}% "
            f"of its spherical area is kept. Its clipped Mercator ratio is "
            f"{ratio(row['merc_ratio'])}. It is excluded from every statistic below."
        )
    lines += [
        "",
        f"## Mercator inflation (n = {len(stats)})",
        "",
        f"- Median Mercator area ratio: {ratio(median(row['merc_ratio'] for row in stats))}.",
        f"- Maximum: {ratio(by_ratio[0]['merc_ratio'])} ({by_ratio[0]['admin']}).",
        f"- Minimum: {ratio(by_ratio[-1]['merc_ratio'])} ({by_ratio[-1]['admin']}).",
        "",
        "Most inflated:",
        "",
        country_table(by_ratio[:5]),
        "",
        "Least inflated:",
        "",
        country_table(by_ratio[-5:]),
        "",
        "## Eckert IV",
        "",
        f"- Largest |ratio − 1|: {abs(eck4_worst['eck4_ratio'] - 1):.3e} "
        f"({eck4_worst['admin']}). Eckert IV is equal-area, so the remaining difference "
        "comes from approximating curved projected edges with straight segments.",
        "",
        "## Mercator ratio compared with sec²(φ) at the centroid",
        "",
        f"- Median ratio / sec²(φc): {ratio(median(gaps))}; minimum {min(gaps):.6f}; "
        f"maximum {ratio(by_gap[0]['merc_ratio_over_sec2'])} ({by_gap[0]['admin']}).",
        f"- Countries where sec²(φc) is within 1% of the measured ratio: {within_1pct} of "
        f"{len(stats)}; within 10%: {within_10pct} of {len(stats)}.",
        "",
        "Largest gaps:",
        "",
        country_table(by_gap[:5]),
        "",
        "### Why the centroid prediction falls short",
        "",
        "On the sphere Mercator stretches lengths by sec φ in both directions, so the local "
        "area scale is sec²φ. A country's Mercator area ratio is therefore the area-weighted "
        "mean of sec²φ over the country, not sec²φ at one point.",
        "",
        "The centroid latitude used here is φc = asin(mean of sin φ), weighted by area. Written "
        "in s = sin φ, the scale is sec²φ = 1 / (1 − s²), which is convex in s. By Jensen's "
        "inequality the mean of sec²φ is at least sec²(φc), so the ratio / sec²(φc) values "
        "above are ≥ 1 except for numerical noise. The gap is close to zero for small "
        "countries and grows with a country's latitude spread, because the poleward part of "
        "the country gains far more area than the equatorward part loses. Each of the five "
        f"largest gaps above belongs to a country spanning at least {largest_gap_span:.1f}° "
        "of latitude, several of them because of remote parts (for example Svalbard for "
        "Norway, Alaska and Hawaii for the United States). For such countries the centroid "
        "can even fall at a latitude where the country has little or no land.",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Country projection area statistics")
    commands = parser.add_subparsers(dest="command", required=True)
    compute_parser = commands.add_parser(
        "compute", help="calculate every country and replace public.country_area_stats"
    )
    compute_parser.add_argument(
        "--dry-run", action="store_true", help="print results, do not write the table"
    )
    compute_parser.add_argument("--only", nargs="+", metavar="ADM0_A3")
    commands.add_parser("export", help="write CSV, JSON and summary from the table")
    arguments = parser.parse_args()

    if arguments.command == "compute":
        rows, failures = compute(arguments.only)
        print(f"Computed {len(rows)} countries; {len(failures)} not ok")
        for row in failures:
            print(f"  {row['adm0_a3']} {row['admin']}: {row['status']}")
        for row in rows:
            if row["is_clipped"]:
                print(
                    f"  {row['adm0_a3']} clipped to +/-{MERCATOR_LIMIT:.4f} deg, "
                    f"kept fraction {row['clipped_area_fraction']:.6f}"
                )
        if arguments.dry_run:
            if arguments.only:
                print(json.dumps([to_response(row) for row in rows], indent=1))
            return
        write_table(rows)
        print(f"Wrote {len(rows)} rows to public.country_area_stats")
    else:
        rows = read_table()
        write_csv(rows)
        write_json(rows)
        SUMMARY_PATH.write_text(summarize(rows), encoding="utf-8")
        print(f"Exported {len(rows)} rows to {CSV_PATH}, {JSON_PATH} and {SUMMARY_PATH}")


if __name__ == "__main__":
    main()

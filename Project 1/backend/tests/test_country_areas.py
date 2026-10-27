import json
from math import pi, radians, sin
from pathlib import Path

import pytest
from shapely import Polygon, box
from shapely.geometry import shape

from country_areas import (
    MERCATOR_LIMIT,
    RADIUS,
    calculate_country_areas,
    sec2,
    spherical_area,
)

GEOJSON = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "public"
    / "data"
    / "ne_110m_admin_0_countries.geojson"
)


def calculate(geometry):
    return calculate_country_areas("TST", "Test", geometry)


def test_octant_has_one_eighth_of_the_sphere_area():
    # Equator and two meridians are great circles, so this triangle is exact.
    octant = Polygon([(0, 0), (90, 0), (0, 90)])
    assert spherical_area(octant) == pytest.approx(pi * RADIUS**2 / 2, rel=1e-12)


def test_eckert_iv_preserves_area():
    row = calculate(box(0, 45, 10, 55))
    assert row["status"] == "ok"
    assert row["eck4_ratio"] == pytest.approx(1, abs=1e-5)


@pytest.mark.parametrize("latitude", [0, 30, 45, 60, 75])
def test_small_polygon_follows_mercator_scale_factor(latitude):
    row = calculate(box(10, latitude - 0.05, 10.1, latitude + 0.05))
    assert row["centroid_lat_deg"] == pytest.approx(latitude, abs=1e-3)
    assert row["merc_ratio"] == pytest.approx(sec2(latitude), rel=1e-3)


def test_tall_polygon_exceeds_sec2_at_centroid():
    # sec² is convex in sin(latitude), so the area-weighted mean is larger.
    row = calculate(box(0, 10, 10, 70))
    assert row["status"] == "ok"
    assert row["merc_ratio"] > 1.2 * row["sec2_at_centroid"]


def test_antimeridian_edge_matches_shifted_polygon():
    east = calculate(box(170, 60, 180, 70))
    shifted = calculate(box(-10, 60, 0, 70))
    for key in ("spherical_area_m2", "merc_ratio", "eck4_ratio", "centroid_lat_deg"):
        assert east[key] == pytest.approx(shifted[key], rel=1e-9)


def test_polygon_reaching_the_pole_is_clipped_and_flagged():
    # Vertices every 0.1° so the 70°S edge follows the parallel closely.
    parallel = [(-180 + step / 10, -70) for step in range(3601)]
    cap = Polygon([*parallel, (180, -90), (-180, -90)])
    row = calculate(cap)
    assert row["is_clipped"]
    assert row["status"] == "ok"
    assert row["min_lat_deg"] == pytest.approx(-MERCATOR_LIMIT)
    assert 0 < row["clipped_area_fraction"] < 1
    # Clipped cap between 70°S and the limit: area of a spherical zone.
    expected = 2 * pi * RADIUS**2 * (sin(radians(-70)) - sin(radians(-MERCATOR_LIMIT)))
    assert row["spherical_area_m2"] == pytest.approx(expected, rel=1e-5)
    assert row["eck4_ratio"] == pytest.approx(1, abs=1e-5)
    assert row["merc_ratio"] > sec2(70)


def test_polygon_entirely_beyond_the_limit_is_rejected():
    with pytest.raises(ValueError, match="beyond the Mercator limit"):
        calculate(box(-10, 86, 10, 89))


def test_greenland_matches_documented_results():
    features = json.loads(GEOJSON.read_text(encoding="utf-8"))["features"]
    feature = next(f for f in features if f["properties"]["ADM0_A3"] == "GRL")
    row = calculate_country_areas("GRL", "Greenland", shape(feature["geometry"]))
    assert row["status"] == "ok"
    assert not row["is_clipped"]
    assert row["spherical_area_m2"] / 1e6 == pytest.approx(2_189_750.321, rel=1e-9)
    assert row["merc_area_m2"] / 1e6 == pytest.approx(36_225_613.004, rel=1e-9)
    assert row["merc_ratio"] == pytest.approx(16.54326187, rel=1e-9)
    assert row["eck4_ratio"] == pytest.approx(0.99999975, abs=1e-8)


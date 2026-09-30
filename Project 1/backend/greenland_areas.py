from math import ceil, isfinite
from database import connect_database
from pyproj import Geod, Transformer
from shapely import MultiPolygon, Polygon, orient_polygons, transform
from shapely.geometry import shape

RADIUS = 6371007.1809
sphere = Geod(a=RADIUS, f=0)
source_crs = f"+proj=longlat +R={RADIUS} +type=crs"


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


def calculate_greenland_areas():
    with connect_database() as connection:
        row = connection.execute("""
            SELECT ST_AsGeoJSON(geom, 15)::json, geodesic_area_m2
            FROM public.countries WHERE adm0_a3 = 'GRL'
        """).fetchone()
    if row is None:
        raise RuntimeError("Greenland was not found")
    geometry = orient_polygons(shape(row[0]))
    if (
        not isinstance(geometry, MultiPolygon)
        or geometry.is_empty
        or not geometry.is_valid
    ):
        raise ValueError("Expected a valid, nonempty Greenland MultiPolygon")
    reference = sphere.geometry_area_perimeter(geometry)[0]
    if not isfinite(reference) or reference <= 0:
        raise ValueError("Invalid spherical reference area")
    previous, projections = {}, {}
    for spacing in (20000, 10000, 5000):
        dense = MultiPolygon(
            [
                Polygon(
                    densify_ring(part.exterior, spacing),
                    [densify_ring(hole, spacing) for hole in part.interiors],
                )
                for part in geometry.geoms
            ]
        )
        for projection in ("merc", "eck4"):
            target = f"+proj={projection} +R={RADIUS} +units=m +type=crs"
            transformer = Transformer.from_crs(source_crs, target, always_xy=True)
            projected = transform(dense, transformer.transform, interleaved=False)
            area = projected.area
            if not projected.is_valid or not isfinite(area) or area <= 0:
                raise ValueError(f"Invalid {projection} projected geometry or area")
            ratio = area / reference
            if spacing == 5000:
                change = abs(area / previous[projection] - 1)
                if change >= 1e-5:
                    raise ValueError(f"{projection} area did not converge")
                if (
                    projection == "eck4"
                    and abs(ratio - 1) >= 1e-5
                    or projection == "merc"
                    and ratio <= 1
                ):
                    raise ValueError(f"Unexpected {projection} area ratio")
                projections[projection] = {
                    "area_m2": area,
                    "area_ratio": ratio,
                    "relative_change_from_10km": change,
                    "crs": target,
                }
            previous[projection] = area
    return {
        "country_code": "GRL",
        "sphere_radius_m": RADIUS,
        "spherical_reference_area_m2": reference,
        "ellipsoidal_area_m2": row[1],
        "max_segment_length_m": 5000,
        "boundary_model": "spherical great-circle arcs",
        "ratio_reference": "spherical_reference_area_m2",
        "projections": projections,
    }


if __name__ == "__main__":
    print(calculate_greenland_areas())

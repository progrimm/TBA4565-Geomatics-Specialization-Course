\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM public.countries) <> 177 THEN
        RAISE EXCEPTION 'Expected 177 imported country features';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.countries
        WHERE geom IS NULL
           OR ST_IsEmpty(geom)
           OR ST_GeometryType(geom) <> 'ST_MultiPolygon'
           OR ST_SRID(geom) <> 4326
    ) THEN
        RAISE EXCEPTION 'Expected nonempty MultiPolygon geometries in EPSG:4326';
    END IF;

    IF (SELECT COUNT(*) FROM public.countries WHERE adm0_a3 IN ('USA', 'SDN')) <> 2
       OR (SELECT COUNT(DISTINCT adm0_a3) FROM public.countries
           WHERE adm0_a3 IN ('USA', 'SDN')) <> 2 THEN
        RAISE EXCEPTION 'Expected exactly one USA feature and one SDN feature';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.countries
        WHERE NOT ST_IsValid(geom)
          AND (adm0_a3 IS NULL OR adm0_a3 NOT IN ('USA', 'SDN'))
    ) THEN
        RAISE EXCEPTION 'Unexpected invalid feature; inspect before repairing';
    END IF;
END;
$$;

ALTER TABLE public.countries
ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326)
USING geom::geometry(MultiPolygon, 4326);

UPDATE public.countries
SET geom = ST_MakeValid(geom)
WHERE adm0_a3 IN ('USA', 'SDN')
  AND NOT ST_IsValid(geom)
RETURNING adm0_a3, admin;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.countries
        WHERE geom IS NULL OR ST_IsEmpty(geom) OR NOT ST_IsValid(geom)
    ) THEN
        RAISE EXCEPTION 'Geometry quality check failed after repair';
    END IF;
END;
$$;

ALTER TABLE public.countries
ADD COLUMN geodesic_area_m2 double precision
GENERATED ALWAYS AS (ST_Area(geom::geography)) STORED;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.countries
        WHERE geodesic_area_m2 IS NULL
           OR NOT (
               geodesic_area_m2 > 0
               AND geodesic_area_m2 < 'Infinity'::double precision
           )
    ) THEN
        RAISE EXCEPTION 'Expected positive, finite geodesic areas for every country';
    END IF;
END;
$$;

COMMIT;
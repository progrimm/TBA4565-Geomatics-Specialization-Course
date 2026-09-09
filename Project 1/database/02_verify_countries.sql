\set ON_ERROR_STOP on

BEGIN READ ONLY;

SELECT current_database(), postgis_full_version();

SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE geom IS NULL) AS missing,
    COUNT(*) FILTER (WHERE ST_IsEmpty(geom)) AS empty,
    COUNT(*) FILTER (WHERE NOT ST_IsValid(geom)) AS invalid,
    COUNT(geodesic_area_m2) AS populated_areas,
    COUNT(*) FILTER (
        WHERE geodesic_area_m2 > 0
          AND geodesic_area_m2 < 'Infinity'::double precision
    ) AS positive_finite_areas
FROM public.countries;

SELECT ST_GeometryType(geom) AS geometry_type,
       ST_SRID(geom) AS srid,
       COUNT(*) AS feature_count
FROM public.countries
GROUP BY ST_GeometryType(geom), ST_SRID(geom);

\d public.countries

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'countries'
ORDER BY indexname;

SELECT admin, geodesic_area_m2, geodesic_area_m2 / 1000000.0 AS area_km2
FROM public.countries
WHERE adm0_a3 = 'GRL';

SELECT admin, adm0_a3
FROM public.countries
WHERE ST_Covers(geom, ST_Point(13.405, 52.52, 4326));

EXPLAIN (ANALYZE, BUFFERS)
SELECT admin, adm0_a3
FROM public.countries
WHERE ST_Covers(geom, ST_Point(13.405, 52.52, 4326));

ROLLBACK;
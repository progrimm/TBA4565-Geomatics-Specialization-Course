\set ON_ERROR_STOP on

-- Precomputed projection-area statistics, one row per country.
-- Filled by `country_areas.py compute` (backend) as an administrator;
-- the API role only reads it.
CREATE TABLE public.country_area_stats (
    adm0_a3 text PRIMARY KEY,
    admin text NOT NULL,
    sphere_radius_m double precision NOT NULL,
    spherical_area_m2 double precision NOT NULL,
    unclipped_spherical_area_m2 double precision NOT NULL,
    ellipsoidal_area_m2 double precision,
    merc_area_m2 double precision NOT NULL,
    merc_ratio double precision NOT NULL,
    merc_change_20_10 double precision NOT NULL,
    merc_change_10_5 double precision NOT NULL,
    eck4_area_m2 double precision NOT NULL,
    eck4_ratio double precision NOT NULL,
    eck4_change_20_10 double precision NOT NULL,
    eck4_change_10_5 double precision NOT NULL,
    centroid_lat_deg double precision NOT NULL,
    min_lat_deg double precision NOT NULL,
    max_lat_deg double precision NOT NULL,
    sec2_at_centroid double precision NOT NULL,
    merc_ratio_over_sec2 double precision NOT NULL,
    is_clipped boolean NOT NULL,
    clipped_area_fraction double precision NOT NULL,
    max_segment_length_m double precision NOT NULL,
    status text NOT NULL,
    computed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON TABLE public.country_area_stats TO projection_api;

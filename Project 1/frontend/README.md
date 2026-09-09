# Map Projection Frontend

React and TypeScript render one interactive SVG map; D3 blends the raw Mercator and Eckert IV projections of a local Natural Earth country collection. A slider controls the blend and a checkbox toggles finite geographic circles approximating Tissot's indicatrix. A short introduction and projection notes explain the trade-offs. No API or database is needed yet.

Phases 1-2 of the frontend are complete. Phase 3's native PostGIS database is also prepared, but is not connected to this app. See the [database guide](../database/README.md) for the separate setup and verification workflow. Phase 4 will replace the static data source with FastAPI GeoJSON and add area/distortion statistics.

## Run Locally

Run these commands from this directory with a Node.js version supported by Vite (Node 24 was used for this project):

```powershell
npm ci
npm run dev
```

Open the Local URL printed by Vite. Use `npm run build` for TypeScript checking and production output, `npm run lint` for ESLint, and `npm run preview` to serve an existing production build locally.

## Source Layout

- [src/App.tsx](src/App.tsx): loading, projections, and SVG layers.
- [src/App.css](src/App.css): map layout and geographic layer styling.
- [src/index.css](src/index.css): shared page styles and color variables.
- [src/d3-geo-projection.d.ts](src/d3-geo-projection.d.ts): local typings for the extension's `geoEckert4` and `geoEckert4Raw` functions; there is no published `@types/d3-geo-projection` package.
- [public/data/ne_110m_admin_0_countries.geojson](public/data/ne_110m_admin_0_countries.geojson): static country data, served at `/data/ne_110m_admin_0_countries.geojson`.

The app currently assumes deployment at the site root. The map is fitted independently at each slider step; screen areas across blend values do not share a calibrated scale. The Mercator contribution clamps latitude to approximately +/-85.05 degrees; this introduces artificial polar behavior. Pure Eckert IV remains unmodified. Intermediate blends generally preserve neither angles nor area.

D3 calculates on a sphere; the database's geodesic areas use the WGS 84 ellipsoid. The static file retains the original geometries, including the two self-intersections repaired only in PostGIS. API integration will need to verify the repaired GeoJSON's winding and rendering, not merely change the fetch URL.

## Verification Recorded

After the single-map redesign, the production build and ESLint passed. Browser checks confirmed 177 features, one map, valid paths at blends 0, 0.5, and 1, 0/30 circles when toggled, and working keyboard controls. No horizontal overflow was observed at viewport widths 1600, 1024, 768, 390, and 320 pixels. These are recorded manual checks, not a committed automated browser test suite.

## Data Source

[Natural Earth Admin 0 Countries, 1:110 million](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/), downloaded from the [Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Boundaries follow the dataset's documented conventions.

See the [project brief](../README.md) and [progress log](../PROGRESS.md) for the learning sequence and tutoring agreement.

# Projection Lab Frontend

React and TypeScript render one interactive SVG map; D3 blends the raw Mercator and Eckert IV projections of 177 Natural Earth country geometries served from PostGIS through FastAPI. A checkbox toggles finite geographic circles approximating Tissot's indicatrix. Greenland is highlighted, with an adjacent comparison of ellipsoidal, spherical, and projected areas.

The simplified Projection Lab interface uses a compact header, blend slider, circle checkbox, and Greenland results. Longer explanatory sections were replaced by a keyboard-accessible, collapsed Method disclosure. The spherical denominator and distinction from screen area remain visible; intermediate blends remain explicitly unmeasured. Fetch/error handling is shared while country and statistics requests retain independent state.

The map requests `/api/countries`; the independent statistics request is `/api/countries/GRL/areas`. The [Vite configuration](vite.config.ts) proxies `/api` to `http://127.0.0.1:8000` and removes the prefix. Start the [backend](../backend/README.md) and prepared [database](../database/README.md) before the frontend. A statistics failure does not prevent country loading, and neither request falls back to static data.

## Run Locally

Run these commands from this directory with a Node.js version supported by Vite (Node 24 was used for this project):

```powershell
npm ci
npm run dev
```

Open the Local URL printed by Vite. Use `npm run build` for TypeScript checking and production output, and `npm run lint` for ESLint. `npm run preview` serves a local build, not a deployable backend-routing solution; a production web server must route `/api/*` to the API with the prefix removed.

## Source Layout

- [src/App.tsx](src/App.tsx): independent country/statistics loading, projections, SVG layers, and Greenland comparison.
- [src/App.css](src/App.css): map layout and geographic layer styling.
- [src/index.css](src/index.css): shared page styles and color variables.
- [src/d3-geo-projection.d.ts](src/d3-geo-projection.d.ts): local typings for the extension's `geoEckert4` and `geoEckert4Raw` functions; there is no published `@types/d3-geo-projection` package.
- [public/data/ne_110m_admin_0_countries.geojson](public/data/ne_110m_admin_0_countries.geojson): original versioned import source; still available as a static asset but not fetched by the map.

The app currently assumes deployment at the site root. The map is fitted independently at each slider step; screen areas across blend values do not share a calibrated scale. The Mercator contribution clamps latitude to approximately +/-85.05 degrees; this introduces artificial polar behavior. Pure Eckert IV remains unmodified. Intermediate blends generally preserve neither angles nor area.

D3 calculates on a sphere; the database's geodesic areas use the WGS 84 ellipsoid. The API includes the USA/Sudan repairs while the static file remains unchanged. All 177 database geometries passed the clockwise-exterior/counterclockwise-hole check. The API preserves that D3-oriented winding, which differs from RFC 7946's recommendation.

## Greenland Results During Morphing

Both endpoint results stay visible. At 0% Mercator is marked current; at 100% Eckert IV is marked current. At intermediate positions neither row is current and the panel explicitly says the blend area is not calculated. Ratios are never interpolated or inferred from screen size. Area values are displayed in square kilometers and rounded for readability; API values retain square-meter precision.

The spherical area is the denominator for both ratios. The WGS 84 ellipsoidal area is a separate reference, not the denominator. See the [backend method and result table](../backend/README.md#greenland-method) for the radius, numerical convergence, and limitations. A rounded Eckert IV ratio of 1 is consistent with a small nonzero numerical approximation error.

## Verification Recorded

After the single-map redesign, the production build and ESLint passed. Browser checks confirmed 177 features, one map, valid paths at blends 0, 0.5, and 1, 0/30 circles when toggled, and working keyboard controls. No horizontal overflow was observed at viewport widths 1600, 1024, 768, 390, and 320 pixels. These are recorded manual checks, not a committed automated browser test suite.

On 2026-09-21 the learner verified API-backed loading, 177 features, projection endpoints and midpoint, circle toggling, API shutdown/error/recovery, and passing build/lint. The Greenland panel's agent-run checks are recorded separately in the [progress log](../PROGRESS.md).

After the Projection Lab simplification, build and lint passed. Live-API browser checks covered five widths (320, 390, 768, 1024, 1600), distinct valid map paths at all three blend test positions, endpoint markers, keyboard slider controls, circle toggling, Method disclosure, delayed statistics loading, independent request failures, malformed statistics, and recovery. No page exceptions or horizontal overflow were observed; desktop/mobile screenshots were inspected. Backend calculations were unchanged.

## Data Source

[Natural Earth Admin 0 Countries, 1:110 million](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/), downloaded from the [Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Boundaries follow the dataset's documented conventions.

See the [project brief](../README.md) and [progress log](../PROGRESS.md) for the learning sequence and tutoring agreement.

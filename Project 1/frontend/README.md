# Map Projection Frontend

React and TypeScript render one interactive SVG map; D3 blends the raw Mercator and Eckert IV projections of a local Natural Earth country collection. A slider controls the blend and a checkbox toggles finite geographic circles approximating Tissot's indicatrix. A short introduction and projection notes explain the trade-offs. No API or database is needed yet.

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
- [src/d3-geo-projection.d.ts](src/d3-geo-projection.d.ts): local typing for the extension's `geoEckert4` function.
- [public/data/ne_110m_admin_0_countries.geojson](public/data/ne_110m_admin_0_countries.geojson): static country data, served at `/data/ne_110m_admin_0_countries.geojson`.

The app currently assumes deployment at the site root. The map is fitted independently at each slider step; screen areas across blend values do not share a calibrated scale. The Mercator contribution clamps latitude to approximately +/-85.05 degrees; this introduces artificial polar behavior. Pure Eckert IV remains unmodified. Intermediate blends generally preserve neither angles nor area.

## Data Source

[Natural Earth Admin 0 Countries, 1:110 million](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/), downloaded from the [Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Boundaries follow the dataset's documented conventions.

See the [project brief](../README.md) and [progress log](../PROGRESS.md) for the learning sequence and tutoring agreement.

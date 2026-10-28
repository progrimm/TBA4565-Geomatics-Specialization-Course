// GitHub Pages has no backend, so the static build reads JSON files exported
// from the same PostGIS queries the API serves (country_areas.py export and
// export-geometry). BASE_URL keeps the paths relative to the app's subpath.
export const isStatic = import.meta.env.VITE_DATA_MODE === 'static'

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`

export const countriesUrl = isStatic
  ? dataUrl('countries.geojson')
  : '/api/countries'

export const countryAreasUrl = isStatic
  ? dataUrl('country_areas.json')
  : '/api/countries/areas'

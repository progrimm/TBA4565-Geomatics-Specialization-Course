export type ProjectionArea = {
  area_m2: number
  area_ratio: number
}

export type CountryAreas = {
  country_code: string
  admin: string
  spherical_reference_area_m2: number
  unclipped_spherical_area_m2: number
  ellipsoidal_area_m2: number
  projections: { merc: ProjectionArea; eck4: ProjectionArea }
  centroid_latitude_deg: number
  sec2_at_centroid: number
  merc_ratio_over_sec2: number
  clipping: {
    is_clipped: boolean
    latitude_limit_deg: number
    clipped_area_fraction: number
  }
  status: string
}

export async function fetchJson<ResponseData>(
  url: string,
  label: string,
): Promise<ResponseData> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`)
  }
  return response.json()
}

function isValidCountry(data: CountryAreas) {
  const positive = [
    data?.spherical_reference_area_m2,
    data?.unclipped_spherical_area_m2,
    data?.ellipsoidal_area_m2,
    data?.projections?.merc?.area_m2,
    data?.projections?.merc?.area_ratio,
    data?.projections?.eck4?.area_m2,
    data?.projections?.eck4?.area_ratio,
    data?.sec2_at_centroid,
    data?.merc_ratio_over_sec2,
    data?.clipping?.clipped_area_fraction,
  ]
  return (
    typeof data?.country_code === 'string' &&
    typeof data?.admin === 'string' &&
    typeof data?.status === 'string' &&
    typeof data?.clipping?.is_clipped === 'boolean' &&
    Number.isFinite(data?.centroid_latitude_deg) &&
    positive.every((value) => Number.isFinite(value) && value > 0)
  )
}

export function validateAreas(data: CountryAreas[]) {
  if (!Array.isArray(data) || data.length === 0 || !data.every(isValidCountry)) {
    throw new Error('Country statistics are invalid')
  }
  return new Map(data.map((country) => [country.country_code, country]))
}

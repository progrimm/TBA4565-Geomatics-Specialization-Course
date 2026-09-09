declare module 'd3-geo-projection' {
  import type { GeoProjection } from 'd3-geo'

  export function geoEckert4(): GeoProjection

  export function geoEckert4Raw( // Input:Radians
    longitude: number,
    latitude: number,
  ): [number, number]
}
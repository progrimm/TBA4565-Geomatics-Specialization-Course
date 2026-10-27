# Country area distortion: summary

Generated on 2026-10-27 by `country_areas.py export` from `public.country_area_stats`. Do not edit by hand; rerun the export.

Method: sphere R = 6371007.1809 m, great-circle boundaries densified to 5 km, ratio = projected area / spherical area of the same geometry. Natural Earth 1:110m boundaries (generalised).

## Coverage

- Countries computed: 177.
- Countries not `ok`: 1. SDN (merc_invalid_geometry,eck4_invalid_geometry). Flagged countries are still included in the statistics below; see the backend README for the diagnosis.
- Antarctica (ATA) extends beyond ±85.0511°, where Mercator area grows without bound. It was clipped to that limit for both the reference and projected areas; 92.27% of its spherical area is kept. Its clipped Mercator ratio is 25.5238. It is excluded from every statistic below.

## Mercator inflation (n = 176)

- Median Mercator area ratio: 1.2063.
- Maximum: 16.5433 (Greenland).
- Minimum: 1.0007 (Gabon).

Most inflated:

| Country | Code | Centroid lat (°) | Lat range (°) | Mercator ratio | sec²(φc) | Ratio / sec²(φc) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Greenland | GRL | 72.05 | 60.0 to 83.6 | 16.5433 | 10.5231 | 1.5721 |
| Norway | NOR | 65.63 | 58.1 to 80.7 | 9.3798 | 5.8755 | 1.5964 |
| Iceland | ISL | 65.05 | 63.5 to 66.5 | 5.6367 | 5.6194 | 1.0031 |
| Finland | FIN | 64.12 | 59.8 to 70.2 | 5.4650 | 5.2481 | 1.0413 |
| Canada | CAN | 57.61 | 41.7 to 83.2 | 5.2127 | 3.4856 | 1.4955 |

Least inflated:

| Country | Code | Centroid lat (°) | Lat range (°) | Mercator ratio | sec²(φc) | Ratio / sec²(φc) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Rwanda | RWA | -2.01 | -2.9 to -1.1 | 1.0013 | 1.0012 | 1.0001 |
| Ecuador | ECU | -1.45 | -5.0 to 1.4 | 1.0012 | 1.0006 | 1.0006 |
| Uganda | UGA | 1.29 | -1.4 to 4.2 | 1.0011 | 1.0005 | 1.0006 |
| Equatorial Guinea | GNQ | 1.65 | 1.0 to 2.3 | 1.0009 | 1.0008 | 1.0000 |
| Gabon | GAB | -0.65 | -4.0 to 2.3 | 1.0007 | 1.0001 | 1.0006 |

## Eckert IV

- Largest |ratio − 1|: 2.486e-06 (Luxembourg). Eckert IV is equal-area, so the remaining difference comes from approximating curved projected edges with straight segments.

## Mercator ratio compared with sec²(φ) at the centroid

- Median ratio / sec²(φc): 1.0010; minimum 1.000010; maximum 1.5964 (Norway).
- Countries where sec²(φc) is within 1% of the measured ratio: 156 of 176; within 10%: 169 of 176.

Largest gaps:

| Country | Code | Centroid lat (°) | Lat range (°) | Mercator ratio | sec²(φc) | Ratio / sec²(φc) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Norway | NOR | 65.63 | 58.1 to 80.7 | 9.3798 | 5.8755 | 1.5964 |
| Greenland | GRL | 72.05 | 60.0 to 83.6 | 16.5433 | 10.5231 | 1.5721 |
| Canada | CAN | 57.61 | 41.7 to 83.2 | 5.2127 | 3.4856 | 1.4955 |
| United States of America | USA | 42.05 | 18.9 to 71.4 | 2.2979 | 1.8133 | 1.2672 |
| Russia | RUS | 59.56 | 41.2 to 81.3 | 4.8971 | 3.8949 | 1.2573 |

### Why the centroid prediction falls short

On the sphere Mercator stretches lengths by sec φ in both directions, so the local area scale is sec²φ. A country's Mercator area ratio is therefore the area-weighted mean of sec²φ over the country, not sec²φ at one point.

The centroid latitude used here is φc = asin(mean of sin φ), weighted by area. Written in s = sin φ, the scale is sec²φ = 1 / (1 − s²), which is convex in s. By Jensen's inequality the mean of sec²φ is at least sec²(φc), so the ratio / sec²(φc) values above are ≥ 1 except for numerical noise. The gap is close to zero for small countries and grows with a country's latitude spread, because the poleward part of the country gains far more area than the equatorward part loses. Each of the five largest gaps above belongs to a country spanning at least 22.6° of latitude, several of them because of remote parts (for example Svalbard for Norway, Alaska and Hawaii for the United States). For such countries the centroid can even fall at a latitude where the country has little or no land.

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

interface MinimapProps {
  /** Degrees */
  latitude: number
  /** Degrees */
  longitude: number
  /** Compass degrees */
  heading: number
  /** Incremented when the flight is reset, to start a new trail segment. */
  flightId: number
}

// Wizard hat seen from the side; its tip points in the direction of travel.
const HAT_SVG = `
<svg class="minimap-hat" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
  <polygon points="16,1 23,23 9,23" fill="#4b2a7b" stroke="#000" stroke-width="1.2" />
  <rect x="9.5" y="19" width="13" height="3" fill="#d9ad33" stroke="#000" stroke-width="0.8" />
  <ellipse cx="16" cy="24.5" rx="13" ry="3.6" fill="#2e1a52" stroke="#000" stroke-width="1.2" />
  <path d="M16 8 l1 2.2 2.4 .2 -1.8 1.6 .6 2.4 -2.2 -1.3 -2.2 1.3 .6 -2.4 -1.8 -1.6 2.4 -.2 z" fill="#ffd84a" />
</svg>`

const TRAIL_MIN_DISTANCE = 25 // meters between recorded trail points

function Minimap({ latitude, longitude, heading, flightId }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const trailRef = useRef<L.Polyline | null>(null)
  const segmentsRef = useRef<L.LatLng[][]>([])
  const flightIdRef = useRef(flightId)

  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      keyboard: false,
      doubleClickZoom: false,
      boxZoom: false,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    map.attributionControl.setPrefix(false)

    trailRef.current = L.polyline([], { color: '#c0392b', weight: 3, opacity: 0.85 }).addTo(map)
    markerRef.current = L.marker([0, 0], {
      icon: L.divIcon({ html: HAT_SVG, className: 'minimap-hat-icon', iconSize: [30, 30] }),
      interactive: false,
      keyboard: false,
    }).addTo(map)
    map.setView([0, 0], 11)
    mapRef.current = map
    segmentsRef.current = [[]]

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    const trail = trailRef.current
    if (!map || !marker || !trail) return

    const position = L.latLng(latitude, longitude)
    marker.setLatLng(position)
    const hat = marker.getElement()?.querySelector<SVGElement>('.minimap-hat')
    if (hat) hat.style.transform = `rotate(${heading}deg)`
    map.setView(position, map.getZoom(), { animate: false })

    // A reset teleports the broom, so begin a new segment instead of drawing a jump.
    if (flightIdRef.current !== flightId) {
      flightIdRef.current = flightId
      segmentsRef.current.push([])
    }
    const segment = segmentsRef.current[segmentsRef.current.length - 1]
    const last = segment[segment.length - 1]
    if (!last || map.distance(last, position) >= TRAIL_MIN_DISTANCE) {
      segment.push(position)
      trail.setLatLngs(segmentsRef.current)
    }
  }, [latitude, longitude, heading, flightId])

  return <div ref={containerRef} className="minimap" aria-label="Minimap" />
}

export default Minimap

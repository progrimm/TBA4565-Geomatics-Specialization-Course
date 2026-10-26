import { Cesium3DTileset, Ion, Viewer } from 'cesium'
import { useEffect, useRef, useState } from 'react'
import FlightSim from './flight/FlightSim'
import ModeSwitch, { type Mode } from './ModeSwitch'
import Tour from './Tour'
import { useTourPosition } from './tourPosition'

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN ?? ''

const GOOGLE_PHOTOREALISTIC_3D_TILES_ASSET_ID = 2275207

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [mode, setMode] = useState<Mode>('tour')
  // Held here so the tour resumes where it was after a flight.
  const tour = useTourPosition()

  useEffect(() => {
    if (!containerRef.current) return

    // Photorealistic 3D Tiles include their own terrain and imagery, so the
    // globe and its default imagery layer are disabled. The tour panel
    // replaces the default geocoder, layer picker and selection UI.
    const viewer = new Viewer(containerRef.current, {
      globe: false,
      geocoder: false,
      baseLayerPicker: false,
      sceneModePicker: false,
      timeline: false,
      animation: false,
      infoBox: false,
      selectionIndicator: false,
    })
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true

    // Loaded via fromIonAssetId rather than createGooglePhotorealistic3DTileset:
    // the latter shares one cached ion Resource across calls, so StrictMode's
    // double-mounted effect fails with "The Resource is already being fetched".
    // Options mirror createGooglePhotorealistic3DTileset's defaults.
    Cesium3DTileset.fromIonAssetId(GOOGLE_PHOTOREALISTIC_3D_TILES_ASSET_ID, {
      cacheBytes: 1536 * 1024 * 1024,
      maximumCacheOverflowBytes: 1024 * 1024 * 1024,
      enableCollision: true,
    })
      .then((tileset) => {
        if (viewer.isDestroyed()) {
          tileset.destroy()
          return
        }
        viewer.scene.primitives.add(tileset)
      })
      .catch((error) => {
        console.error('Failed to load Google Photorealistic 3D Tiles', error)
      })

    setViewer(viewer)

    return () => {
      setViewer(null)
      viewer.destroy()
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <ModeSwitch mode={mode} onChange={setMode} />
      {viewer && mode === 'tour' && (
        <Tour viewer={viewer} position={tour} />
      )}
      {viewer && mode === 'flight' && <FlightSim viewer={viewer} />}
    </div>
  )
}

export default App

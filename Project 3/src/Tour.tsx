import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  type Entity,
  HeadingPitchRange,
  LabelStyle,
  Math as CesiumMath,
  VerticalOrigin,
  type Viewer,
} from 'cesium'
import { useEffect } from 'react'
import { landmarks } from './landmarks'
import TourPanel from './TourPanel'
import type { TourPosition } from './tourPosition'

// Every landmark gets a blue pin; the selected one is drawn larger.
const MARKER_COLOR = Color.fromCssColorString('#1e6fd9')

function landmarkPosition(index: number) {
  const { longitude, latitude, height } = landmarks[index]
  return Cartesian3.fromDegrees(longitude, latitude, height)
}

interface TourProps {
  viewer: Viewer
  position: TourPosition
}

function Tour({ viewer, position }: TourProps) {
  const { index: selectedIndex, next, previous, select } = position

  useEffect(() => {
    const entities: Entity[] = landmarks.map((landmark, index) =>
      viewer.entities.add({
        id: landmark.id,
        position: landmarkPosition(index),
        point: {
          pixelSize: 12,
          color: MARKER_COLOR,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: landmark.name,
          font: '600 14px system-ui, sans-serif',
          style: LabelStyle.FILL_AND_OUTLINE,
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: new Cartesian2(0, -12),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    )

    // Clicking a marker selects that landmark in the tour.
    const removeSelectionListener = viewer.selectedEntityChanged.addEventListener(
      (entity) => {
        if (entity) select(entity.id)
      },
    )

    return () => {
      removeSelectionListener()
      entities.forEach((entity) => viewer.entities.remove(entity))
    }
  }, [viewer, select])

  // Frame the selected landmark from an oblique angle rather than top-down.
  useEffect(() => {
    landmarks.forEach((landmark, index) => {
      const entity = viewer.entities.getById(landmark.id)
      if (!entity?.point) return
      const selected = index === selectedIndex
      entity.point.pixelSize = new ConstantProperty(selected ? 18 : 12)
      entity.point.outlineWidth = new ConstantProperty(selected ? 3 : 2)
    })

    const { heading, pitch, range } = landmarks[selectedIndex].view
    viewer.camera.flyToBoundingSphere(
      new BoundingSphere(landmarkPosition(selectedIndex), 0),
      {
        offset: new HeadingPitchRange(
          CesiumMath.toRadians(heading),
          CesiumMath.toRadians(pitch),
          range,
        ),
        duration: 3,
      },
    )
  }, [viewer, selectedIndex])

  // Arrow keys step through the tour.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') next()
      else if (event.key === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, previous])

  return <TourPanel landmarks={landmarks} position={position} />
}

export default Tour

// Generates public/models/wizard-on-broom.glb: a low-poly wizard riding a broom,
// built from cones, cylinders and spheres. Run with `node scripts/generate-wizard-model.mjs`.
//
// Axes (glTF, meters): +X forward (broom tip), +Y up, +Z right. Cesium converts
// glTF Y-up to Z-up, so in Cesium's model frame +X is forward, +Y left, +Z up.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SEGMENTS = 16

const colors = {
  wood: [0.48, 0.29, 0.13],
  straw: [0.79, 0.64, 0.23],
  binding: [0.55, 0.1, 0.1],
  robe: [0.29, 0.16, 0.48],
  robeDark: [0.18, 0.1, 0.32],
  skin: [0.95, 0.76, 0.6],
  beard: [0.87, 0.87, 0.87],
  boot: [0.12, 0.08, 0.06],
  gold: [0.85, 0.68, 0.2],
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalize = (a) => scale(a, 1 / Math.hypot(...a))

// Truncated cone between p0 and p1 (radius r0 at p0, r1 at p1), with caps.
function frustum(p0, p1, r0, r1) {
  const axis = normalize(sub(p1, p0))
  const length = Math.hypot(...sub(p1, p0))
  const helper = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const u = normalize(cross(axis, helper))
  const v = cross(axis, u)
  const slope = (r0 - r1) / length

  const positions = []
  const normals = []
  const indices = []

  for (let i = 0; i <= SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2
    const radial = add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)))
    const normal = normalize(add(radial, scale(axis, slope)))
    positions.push(add(p0, scale(radial, r0)), add(p1, scale(radial, r1)))
    normals.push(normal, normal)
  }
  for (let i = 0; i < SEGMENTS; i++) {
    const a = i * 2
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }

  for (const [center, radius, normal] of [
    [p0, r0, scale(axis, -1)],
    [p1, r1, axis],
  ]) {
    if (radius === 0) continue
    const base = positions.length
    positions.push(center)
    normals.push(normal)
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2
      const radial = add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)))
      positions.push(add(center, scale(radial, radius)))
      normals.push(normal)
    }
    for (let i = 1; i <= SEGMENTS; i++) {
      // Wind caps so they face outward along their normal.
      if (dot(normal, axis) > 0) indices.push(base, base + i, base + i + 1)
      else indices.push(base, base + i + 1, base + i)
    }
  }

  return { positions, normals, indices }
}

function sphere(center, radius) {
  const positions = []
  const normals = []
  const indices = []
  const rings = SEGMENTS / 2
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI
    for (let s = 0; s <= SEGMENTS; s++) {
      const theta = (s / SEGMENTS) * Math.PI * 2
      const n = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]
      positions.push(add(center, scale(n, radius)))
      normals.push(n)
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < SEGMENTS; s++) {
      const a = r * (SEGMENTS + 1) + s
      const b = a + SEGMENTS + 1
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  return { positions, normals, indices }
}

const parts = [
  // Broom
  [frustum([-1.1, 0, 0], [1.0, 0, 0], 0.035, 0.03), colors.wood],
  [frustum([-1.1, 0, 0], [-1.7, 0, 0], 0.07, 0.24), colors.straw],
  [frustum([-1.06, 0, 0], [-1.16, 0, 0], 0.075, 0.08), colors.binding],
  // Robe and limbs
  [frustum([-0.3, 0.02, 0], [-0.1, 0.72, 0], 0.3, 0.13), colors.robe],
  [frustum([-0.2, 0.0, 0.13], [0.12, -0.3, 0.16], 0.08, 0.06), colors.robeDark],
  [frustum([-0.2, 0.0, -0.13], [0.12, -0.3, -0.16], 0.08, 0.06), colors.robeDark],
  [sphere([0.16, -0.33, 0.16], 0.07), colors.boot],
  [sphere([0.16, -0.33, -0.16], 0.07), colors.boot],
  [frustum([-0.1, 0.62, 0.17], [0.38, 0.06, 0.05], 0.055, 0.045), colors.robe],
  [frustum([-0.1, 0.62, -0.17], [0.38, 0.06, -0.05], 0.055, 0.045), colors.robe],
  [sphere([0.4, 0.04, 0.04], 0.055), colors.skin],
  [sphere([0.4, 0.04, -0.04], 0.055), colors.skin],
  // Head, beard and hat
  [sphere([-0.04, 0.86, 0], 0.13), colors.skin],
  [frustum([0.04, 0.82, 0], [0.16, 0.5, 0], 0.1, 0.01), colors.beard],
  [frustum([-0.05, 0.95, 0], [-0.05, 0.975, 0], 0.32, 0.32), colors.robeDark],
  [frustum([-0.05, 0.975, 0], [-0.05, 1.04, 0], 0.17, 0.165), colors.gold],
  [frustum([-0.05, 1.04, 0], [-0.32, 1.55, 0], 0.165, 0.0), colors.robe],
]

// Pack every part into one GLB, one primitive and material per part.
const chunks = []
const bufferViews = []
const accessors = []
const materials = []
const primitives = []
let byteOffset = 0

function addView(typedArray, target) {
  const bytes = Buffer.from(typedArray.buffer)
  const padded = Buffer.concat([bytes, Buffer.alloc((4 - (bytes.length % 4)) % 4)])
  bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length, target })
  chunks.push(padded)
  byteOffset += padded.length
  return bufferViews.length - 1
}

for (const [{ positions, normals, indices }, color] of parts) {
  const flat = positions.flat()
  const min = [0, 1, 2].map((i) => Math.min(...positions.map((p) => p[i])))
  const max = [0, 1, 2].map((i) => Math.max(...positions.map((p) => p[i])))

  const positionView = addView(new Float32Array(flat), 34962)
  const normalView = addView(new Float32Array(normals.flat()), 34962)
  const indexView = addView(new Uint16Array(indices), 34963)

  accessors.push(
    { bufferView: positionView, componentType: 5126, count: positions.length, type: 'VEC3', min, max },
    { bufferView: normalView, componentType: 5126, count: normals.length, type: 'VEC3' },
    { bufferView: indexView, componentType: 5123, count: indices.length, type: 'SCALAR' },
  )
  materials.push({
    pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0, roughnessFactor: 0.85 },
  })
  const a = accessors.length - 3
  primitives.push({
    attributes: { POSITION: a, NORMAL: a + 1 },
    indices: a + 2,
    material: materials.length - 1,
  })
}

const bin = Buffer.concat(chunks)
const gltf = {
  asset: { version: '2.0', generator: 'generate-wizard-model.mjs' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'WizardOnBroom' }],
  meshes: [{ primitives }],
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
}

const json = Buffer.from(JSON.stringify(gltf))
const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)])
const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0) // "glTF"
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8)
const chunkHeader = (length, type) => {
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32LE(length, 0)
  buffer.writeUInt32LE(type, 4)
  return buffer
}

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models/wizard-on-broom.glb')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(
  out,
  Buffer.concat([
    header,
    chunkHeader(jsonChunk.length, 0x4e4f534a), // "JSON"
    jsonChunk,
    chunkHeader(bin.length, 0x004e4942), // "BIN\0"
    bin,
  ]),
)
console.log(`Wrote ${out}`)

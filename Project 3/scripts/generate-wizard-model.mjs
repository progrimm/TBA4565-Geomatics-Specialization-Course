// Generates public/models/wizard-on-broom.glb: a wizard riding a broom, built
// procedurally from tubes, spheres and cloth-like surfaces. Run with
// `npm run generate:model`.
//
// Axes (glTF, meters): +X forward (broom tip), +Y up, +Z right. The app loads
// the model with forwardAxis = X, so Cesium only converts Y-up to Z-up.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SEGMENTS = 24

// Deterministic pseudo-random numbers so the model is identical on every run.
let seed = 1994
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

// name: [r, g, b], roughness
const materialDefs = {
  wood: [[0.36, 0.21, 0.1], 0.55],
  woodDark: [[0.22, 0.12, 0.06], 0.6],
  straw: [[0.78, 0.62, 0.27], 0.9],
  strawLight: [[0.87, 0.74, 0.4], 0.9],
  strawDark: [[0.6, 0.45, 0.18], 0.9],
  cord: [[0.45, 0.09, 0.08], 0.8],
  robe: [[0.24, 0.13, 0.42], 0.92],
  robeShade: [[0.16, 0.08, 0.3], 0.92],
  cloak: [[0.07, 0.11, 0.24], 0.95],
  skin: [[0.93, 0.72, 0.58], 0.6],
  beard: [[0.9, 0.9, 0.88], 0.95],
  eye: [[0.05, 0.05, 0.08], 0.3],
  boot: [[0.13, 0.08, 0.05], 0.5],
  gold: [[0.86, 0.66, 0.22], 0.35],
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalize = (a) => scale(a, 1 / (Math.hypot(...a) || 1))
const lerp = (a, b, t) => add(a, scale(sub(b, a), t))

const emptyMesh = () => ({ positions: [], normals: [], indices: [] })

function append(target, mesh) {
  const offset = target.positions.length
  target.positions.push(...mesh.positions)
  target.normals.push(...mesh.normals)
  target.indices.push(...mesh.indices.map((i) => i + offset))
  return target
}

function ringBasis(axis) {
  const helper = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const u = normalize(cross(axis, helper))
  return [u, cross(axis, u)]
}

/**
 * Smooth tube through points with a radius per point. Rings are oriented along
 * the local path direction, and open ends are closed with caps.
 */
function tube(points, radii, segments = SEGMENTS) {
  const mesh = emptyMesh()
  const count = points.length
  let [u, v] = ringBasis(normalize(sub(points[1], points[0])))

  for (let i = 0; i < count; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(count - 1, i + 1)]
    const tangent = normalize(sub(next, prev))
    // Parallel transport keeps rings from twisting along a bent path.
    u = normalize(sub(u, scale(tangent, u[0] * tangent[0] + u[1] * tangent[1] + u[2] * tangent[2])))
    v = cross(tangent, u)
    const dr = (radii[Math.max(0, i - 1)] - radii[Math.min(count - 1, i + 1)]) /
      (Math.hypot(...sub(next, prev)) || 1)
    for (let s = 0; s <= segments; s++) {
      const angle = (s / segments) * Math.PI * 2
      const radial = add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)))
      mesh.positions.push(add(points[i], scale(radial, radii[i])))
      mesh.normals.push(normalize(add(radial, scale(tangent, dr))))
    }
  }
  for (let i = 0; i < count - 1; i++) {
    for (let s = 0; s < segments; s++) {
      const a = i * (segments + 1) + s
      const b = a + segments + 1
      mesh.indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }

  for (const [index, sign] of [[0, -1], [count - 1, 1]]) {
    if (radii[index] <= 0) continue
    const neighbor = points[index === 0 ? 1 : count - 2]
    const normal = normalize(sub(points[index], neighbor))
    const base = mesh.positions.length
    mesh.positions.push(points[index])
    mesh.normals.push(normal)
    const ringStart = index * (segments + 1)
    for (let s = 0; s <= segments; s++) {
      mesh.positions.push(mesh.positions[ringStart + s])
      mesh.normals.push(normal)
    }
    for (let s = 1; s <= segments; s++) {
      if (sign > 0) mesh.indices.push(base, base + s, base + s + 1)
      else mesh.indices.push(base, base + s + 1, base + s)
    }
  }
  return mesh
}

function sphere(center, radii, segments = SEGMENTS) {
  const [rx, ry, rz] = typeof radii === 'number' ? [radii, radii, radii] : radii
  const mesh = emptyMesh()
  const rings = segments / 2
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * Math.PI * 2
      const n = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]
      mesh.positions.push(add(center, [n[0] * rx, n[1] * ry, n[2] * rz]))
      mesh.normals.push(normalize([n[0] / rx, n[1] / ry, n[2] / rz]))
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s
      const b = a + segments + 1
      mesh.indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  return mesh
}

/** Two-sided cloth surface from a function (u, v) → point on [0,1]². */
function sheet(surface, uSteps, vSteps) {
  const mesh = emptyMesh()
  const eps = 1e-3
  for (const side of [1, -1]) {
    const base = mesh.positions.length
    for (let j = 0; j <= vSteps; j++) {
      for (let i = 0; i <= uSteps; i++) {
        const u = i / uSteps
        const v = j / vSteps
        const p = surface(u, v)
        const du = sub(surface(Math.min(1, u + eps), v), surface(Math.max(0, u - eps), v))
        const dv = sub(surface(u, Math.min(1, v + eps)), surface(u, Math.max(0, v - eps)))
        mesh.positions.push(p)
        mesh.normals.push(scale(normalize(cross(du, dv)), side))
      }
    }
    for (let j = 0; j < vSteps; j++) {
      for (let i = 0; i < uSteps; i++) {
        const a = base + j * (uSteps + 1) + i
        const b = a + uSteps + 1
        if (side > 0) mesh.indices.push(a, b, a + 1, a + 1, b, b + 1)
        else mesh.indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  return mesh
}

/** Points along a quadratic Bézier curve. */
function curve(p0, p1, p2, steps) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    return add(add(scale(p0, (1 - t) ** 2), scale(p1, 2 * (1 - t) * t)), scale(p2, t * t))
  })
}

const meshes = Object.fromEntries(Object.keys(materialDefs).map((name) => [name, emptyMesh()]))
const put = (material, mesh) => append(meshes[material], mesh)

// ── Broom ────────────────────────────────────────────────────────────────
// Slightly crooked handle with a carved knob at the tip.
const handle = Array.from({ length: 13 }, (_, i) => {
  const t = i / 12
  return [1.05 - t * 2.2, Math.sin(t * Math.PI * 2.3) * 0.012, Math.sin(t * Math.PI * 1.4) * 0.01]
})
put('wood', tube(handle, handle.map((_, i) => 0.033 - i * 0.0004), 16))
put('woodDark', sphere([1.07, 0.003, 0], 0.045, 16))
for (const x of [0.62, 0.15, -0.55]) put('woodDark', tube([[x - 0.015, 0, 0], [x + 0.015, 0, 0]], [0.038, 0.038], 16))

// Bristles: individual tapered strands fanning out behind the bindings.
const strawTones = ['straw', 'strawLight', 'strawDark']
put('strawDark', tube([[-1.08, 0, 0], [-1.35, -0.01, 0], [-1.62, -0.025, 0]], [0.06, 0.1, 0.07], 20))
for (let i = 0; i < 320; i++) {
  const angle = random() * Math.PI * 2
  const start = Math.sqrt(random()) * 0.06
  const spread = 0.05 + Math.sqrt(random()) * 0.16
  const length = 0.6 + random() * 0.14
  const p0 = [-1.08, Math.sin(angle) * start, Math.cos(angle) * start]
  const p2 = [-1.08 - length, Math.sin(angle) * spread - 0.03, Math.cos(angle) * spread]
  const p1 = lerp(p0, p2, 0.4)
  p1[1] += 0.02
  put(strawTones[i % 3], tube(curve(p0, p1, p2, 4), [0.008, 0.0075, 0.0065, 0.005, 0.0025], 5))
}
// Cord bindings around the bristle bundle.
for (const x of [-1.06, -1.14, -1.22]) {
  const r = 0.07 + (x + 1.06) * -0.25
  put('cord', tube([[x + 0.012, 0, 0], [x - 0.012, 0, 0]], [r, r + 0.004], 20))
}

// ── Wizard ───────────────────────────────────────────────────────────────
// Robe: torso leaning into the wind, with a skirt draping over the broom.
put('robe', tube(
  [[-0.27, 0.0, 0], [-0.24, 0.2, 0], [-0.17, 0.45, 0], [-0.11, 0.64, 0], [-0.09, 0.72, 0]],
  [0.29, 0.25, 0.19, 0.15, 0.1],
))
put('robeShade', tube(
  [[-0.25, 0.06, 0], [-0.28, -0.08, 0], [-0.32, -0.22, 0]],
  [0.27, 0.3, 0.33],
))
put('gold', tube([[-0.24, 0.24, 0], [-0.23, 0.28, 0]], [0.25, 0.245]))

// Cloak streaming behind the shoulders.
put('cloak', sheet((u, v) => {
  const across = u - 0.5
  const z = across * (0.34 + v * 0.3)
  // Wraps around the back near the shoulders, then ripples out behind.
  const wrap = -Math.cos(across * Math.PI) * 0.1 * (1 - v)
  const ripple = Math.sin(v * Math.PI * 3 + u * 3) * 0.035 * v
  return [-0.24 - v * 0.74 + wrap, 0.66 - v * 0.62 + ripple + across * across * 0.2 * v, z]
}, 14, 22))

// Legs bent at the knee, ending in pointed boots.
for (const side of [1, -1]) {
  const hip = [-0.2, 0.0, 0.14 * side]
  const knee = [0.06, -0.12, 0.17 * side]
  const ankle = [0.02, -0.38, 0.17 * side]
  put('robeShade', tube(curve(hip, [0.0, -0.02, 0.16 * side], knee, 4).concat([ankle]), [0.085, 0.08, 0.075, 0.07, 0.065, 0.055]))
  put('boot', tube([[0.0, -0.36, 0.17 * side], [0.06, -0.42, 0.17 * side], [0.17, -0.43, 0.17 * side], [0.24, -0.39, 0.17 * side]], [0.06, 0.058, 0.045, 0.012]))
}

// Arms reaching forward to grip the handle, with flared sleeves.
for (const side of [1, -1]) {
  const shoulder = [-0.1, 0.62, 0.17 * side]
  const elbow = [0.1, 0.36, 0.2 * side]
  const wrist = [0.33, 0.1, 0.07 * side]
  put('robe', tube(curve(shoulder, add(lerp(shoulder, elbow, 0.5), [0, 0.03, 0]), elbow, 4), [0.07, 0.068, 0.066, 0.064, 0.062]))
  put('robe', tube([elbow, lerp(elbow, wrist, 0.6), add(wrist, [-0.03, 0.02, 0])], [0.062, 0.07, 0.095]))
  put('skin', sphere([0.37, 0.05, 0.05 * side], [0.06, 0.05, 0.045], 16))
  put('skin', tube([[0.34, 0.06, 0.02 * side], [0.4, 0.02, 0.0]], [0.018, 0.014], 10))
}

// Head with nose, eyes and bushy brows.
put('skin', sphere([-0.04, 0.86, 0], [0.125, 0.135, 0.12]))
put('skin', tube([[0.07, 0.86, 0], [0.13, 0.83, 0], [0.15, 0.81, 0]], [0.03, 0.022, 0.012], 12))
for (const side of [1, -1]) {
  put('eye', sphere([0.068, 0.895, 0.045 * side], 0.016, 12))
  put('beard', tube([[0.06, 0.93, 0.02 * side], [0.08, 0.935, 0.06 * side], [0.07, 0.92, 0.09 * side]], [0.018, 0.016, 0.006], 8))
}
// Long white hair from under the hat, blowing back over the shoulders.
for (let i = 0; i < 11; i++) {
  const z = (i - 5) * 0.022
  const p0 = [-0.1, 0.92, z * 1.1]
  const p2 = [-0.42 - random() * 0.12, 0.62 + random() * 0.06, z * 2.2]
  put('beard', tube(curve(p0, [-0.24, 0.9, z * 1.6], p2, 6), [0.04, 0.038, 0.034, 0.028, 0.02, 0.012, 0.0], 10))
}
// Beard and moustache, swept back by the wind.
for (let i = 0; i < 9; i++) {
  const z = (i - 4) * 0.022
  const p0 = [0.07, 0.8, z]
  const p2 = [-0.12 - random() * 0.12, 0.42 + random() * 0.1, z * 1.8]
  put('beard', tube(curve(p0, [0.08, 0.6, z * 1.3], p2, 6), [0.045, 0.044, 0.04, 0.032, 0.024, 0.014, 0.0], 10))
}
for (const side of [1, -1]) {
  put('beard', tube(curve([0.13, 0.8, 0], [0.12, 0.79, 0.06 * side], [0.06, 0.74, 0.12 * side], 4), [0.018, 0.02, 0.017, 0.012, 0.0], 8))
}

// Hat: wavy brim, gold band and a tall crown bending back in the wind.
put('robeShade', sheet((u, v) => {
  const angle = u * Math.PI * 2
  const radius = 0.12 + v * 0.22
  const droop = -v * v * 0.06 + Math.sin(angle * 5) * 0.012 * v
  return [-0.05 + Math.cos(angle) * radius, 0.975 + droop, Math.sin(angle) * radius]
}, 36, 4))
put('gold', tube([[-0.05, 0.98, 0], [-0.05, 1.03, 0]], [0.155, 0.15]))
const crown = curve([-0.05, 1.0, 0], [-0.08, 1.38, 0], [-0.52, 1.5, 0.04], 10)
put('robe', tube(crown, crown.map((_, i) => 0.15 * (1 - i / 10) ** 1.2)))
put('gold', sphere(crown[crown.length - 1], 0.025, 12))

// ── Pack into a GLB, one primitive per material ──────────────────────────
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

for (const [name, { positions, normals, indices }] of Object.entries(meshes)) {
  if (positions.length === 0) continue
  const [color, roughness] = materialDefs[name]
  const min = [0, 1, 2].map((i) => Math.min(...positions.map((p) => p[i])))
  const max = [0, 1, 2].map((i) => Math.max(...positions.map((p) => p[i])))
  const indexArray = positions.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)

  const positionView = addView(new Float32Array(positions.flat()), 34962)
  const normalView = addView(new Float32Array(normals.flat()), 34962)
  const indexView = addView(indexArray, 34963)

  accessors.push(
    { bufferView: positionView, componentType: 5126, count: positions.length, type: 'VEC3', min, max },
    { bufferView: normalView, componentType: 5126, count: normals.length, type: 'VEC3' },
    {
      bufferView: indexView,
      componentType: indexArray instanceof Uint32Array ? 5125 : 5123,
      count: indices.length,
      type: 'SCALAR',
    },
  )
  materials.push({
    name,
    pbrMetallicRoughness: {
      baseColorFactor: [...color, 1],
      metallicFactor: 0,
      roughnessFactor: roughness,
    },
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
console.log(`Wrote ${out} (${primitives.length} materials)`)

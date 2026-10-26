# Glossary

**Mode**: what the app is doing, either the landmark Tour or the broom flight simulator. Switched with the tabs or `M`.

## Tour

**Landmark**: a place in Lillehammer the Tour visits, with its position, facts and camera framing (`src/landmarks.ts`).

**Tour position**: which Landmark the Tour is on. Moves by next / previous (wrapping around) or by selecting a Landmark id (`src/tourPosition.ts`).

## Flight

**Flight state**: the broom's position (radians, ellipsoidal height), attitude, speed and throttle at one instant.

**Flight input**: the pilot's controls for one frame: throttle, pitch and roll, each −1 … 1.

**Flight controls**: the key bindings that produce Flight input and the restart signal, and the legend drawn from them (`src/flight/controls.ts`).

**Flight session**: one run of the simulator. Advances the Flight state, keeps the broom above sampled ground and records the Track. Knows nothing about Cesium (`src/flight/session.ts`).

**Ground sample**: the ellipsoidal height of the photorealistic tiles under the broom, read from Cesium after a frame is drawn. Samples far above the broom come from coarse tiles and are ignored.

**Track**: the path flown, one segment per flight; a restart begins a new segment. Drawn on the minimap.

**Cockpit readings**: the Flight state in the units the instruments show: knots, feet above mean sea level, degrees (`src/flight/cockpit.ts`).

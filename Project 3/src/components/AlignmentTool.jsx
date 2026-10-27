const STATUS_TEXT = { loading: 'Loading…', error: 'Unavailable' };

/**
 * One on/off switch row.
 * @param {object} props
 * @param {string} props.label
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {'loading' | 'ready' | 'error'} [props.status] - for layers that load on demand.
 * @param {boolean} [props.disabled]
 */
function Switch({ label, checked, onChange, status, disabled = false }) {
  return (
    <li>
      <label className="layer">
        <span className="layer__name">{label}</span>
        {STATUS_TEXT[status] && <span className="layer__status">{STATUS_TEXT[status]}</span>}
        <input
          type="checkbox"
          className="switch"
          role="switch"
          checked={checked}
          disabled={disabled || status === 'error'}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    </li>
  );
}

/**
 * Alignment check: compare the selected splat with independent reference layers,
 * and swipe between the splat and its mesh (or the bare reference layers).
 * @param {object} props
 * @param {import('../config.js').Splat | undefined} props.splat
 * @param {ReturnType<typeof import('../hooks/useAlignment.js').useAlignment>} props.alignment
 */
export default function AlignmentTool({ splat, alignment }) {
  const a = alignment;
  const hasSplat = Boolean(splat);

  return (
    <details className="tool">
      <summary className="tool__summary">Alignment check</summary>
      <ul className="layers">
        <Switch label="Cesium World Terrain" checked={a.terrain} onChange={a.toggleTerrain} />
        <Switch label="Imagery" checked={a.imagery} onChange={a.toggleImagery} />
        <Switch
          label="OSM Buildings"
          checked={a.buildings.on}
          status={a.buildings.state?.status}
          onChange={a.toggleBuildings}
        />
        <Switch
          label="Splat"
          checked={a.splatVisible}
          disabled={!hasSplat}
          onChange={a.toggleSplat}
        />
        {splat?.offset && (
          <Switch
            label={`Sandcastle offset (${splat.offset.join(', ')}) m ECEF`}
            checked={a.offsetOn}
            onChange={a.toggleOffset}
          />
        )}
        <Switch
          label={splat?.mesh ? 'Swipe: splat | mesh' : 'Swipe: splat | reference'}
          checked={a.swipe}
          status={a.mesh?.status}
          disabled={!hasSplat}
          onChange={a.toggleSwipe}
        />
      </ul>
      {a.swipe && hasSplat && (
        <label className="range">
          <span>Split position</span>
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.01"
            value={a.splitPosition}
            onChange={(event) => a.setSplitPosition(Number(event.target.value))}
          />
        </label>
      )}
      <p className="tool__note">
        {splat?.mesh
          ? 'Swipe: splat left of the line, the triangle mesh of the same scene right of it.'
          : 'Swipe: splat left of the line; right of it only terrain, imagery and buildings.'}{' '}
        CesiumJS 1.146 has no opacity or style for Gaussian splats, so the swipe and the Splat
        switch take the place of an opacity slider.
      </p>
    </details>
  );
}

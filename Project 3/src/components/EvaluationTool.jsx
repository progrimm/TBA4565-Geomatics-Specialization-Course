import { EVALUATION } from '../config.js';
import { formatNumber } from '../utils/format.js';
import PhotoDetail from './PhotoDetail.jsx';
import Tool from './Tool.jsx';

const db = (value) => (Number.isFinite(value) ? value.toFixed(2) : '–');
const ratio = (value) => (Number.isFinite(value) ? value.toFixed(3) : '–');
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Means per role, like the per-scene numbers in the 3DGS paper (mean of per-image values). */
function summary(rows) {
  return ['train', 'test']
    .map((role) => {
      const metrics = rows.filter((row) => row.role === role).map((row) => row.metrics);
      if (metrics.length === 0) return null;
      const of = (key) => mean(metrics.map((m) => m[key]));
      return {
        role,
        count: metrics.length,
        psnr: of('psnr'),
        ssim: of('ssim'),
        psnrSplat: of('psnrSplat'),
        ssimSplat: of('ssimSplat'),
        coverage: of('coverage'),
      };
    })
    .filter(Boolean);
}

/** The results as CSV, one row per photo. */
function toCsv(rows) {
  const lines = rows.map(({ name, role, metrics: m }) =>
    [name, role, m.psnr, m.ssim, m.psnrSplat, m.ssimSplat, m.coverage].join(','),
  );
  return ['image,role,psnr_db,ssim,psnr_splat_area_db,ssim_splat_area,coverage', ...lines].join(
    '\n',
  );
}

function download(text, fileName) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * PSNR and SSIM of this pane's splat against the photos.
 * @param {{evaluation: ReturnType<typeof import('../hooks/useEvaluation.js').useEvaluation>,
 *   photos: {name: string, role: string, file: File | null}[], splatName: string,
 *   photo: {name: string, file: File | null} | null, onShowDifference: () => void}} props
 *   photo: the chosen photo, which can be evaluated on its own.
 */
export default function EvaluationTool({ evaluation, photos, splatName, photo, onShowDifference }) {
  const { results, progress, seconds, evaluate, cancel, detail, analysing, analyse } = evaluation;
  const rows = photos
    .filter((photo) => results.has(photo.name))
    .map((photo) => ({ name: photo.name, role: photo.role, metrics: results.get(photo.name) }));
  const tests = photos.filter((photo) => photo.role === 'test' && photo.file).length;
  const running = progress !== null;

  return (
    <Tool id="evaluation" title="Compare with the photos">
      <div className="tool__actions">
        <button className="chip" type="button" disabled={running} onClick={() => evaluate(false)}>
          Evaluate all photos
        </button>
        {tests > 0 && (
          <button className="chip" type="button" disabled={running} onClick={() => evaluate(true)}>
            Test photos only
          </button>
        )}
        {photo?.file && (
          <button
            className="chip"
            type="button"
            disabled={running || analysing !== null}
            onClick={() => analyse(photo)}
          >
            {analysing === photo.name ? 'Evaluating…' : `Evaluate ${photo.name}`}
          </button>
        )}
        {running && (
          <button className="chip" type="button" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>
      <p className="tool__note" role="status">
        {running && `Rendering and comparing ${progress.done} / ${progress.total}…`}
        {!running && seconds !== null && `${rows.length} photos in ${seconds.toFixed(1)} s.`}
        {!photo && 'Choose a photo under Photos (COLMAP) to evaluate it on its own.'}
      </p>
      {detail && detail.name === photo?.name && (
        <PhotoDetail
          detail={detail}
          role={photos.find((candidate) => candidate.name === detail.name)?.role}
          onShowDifference={onShowDifference}
        />
      )}
      {rows.length > 0 && (
        <>
          <div className="table-scroll">
            <table className="metrics">
              <thead>
                <tr>
                  <th scope="col">Photos</th>
                  <th scope="col">PSNR</th>
                  <th scope="col">SSIM</th>
                  <th scope="col" title="Only pixels covered by the splat">
                    PSNR*
                  </th>
                  <th scope="col" title="Only pixels covered by the splat">
                    SSIM*
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary(rows).map((row) => (
                  <tr key={row.role}>
                    <th scope="row">
                      {row.role} ({row.count})
                    </th>
                    <td>{db(row.psnr)}</td>
                    <td>{ratio(row.ssim)}</td>
                    <td>{db(row.psnrSplat)}</td>
                    <td>{ratio(row.ssimSplat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="tool__details">
            <summary>Per photo</summary>
            <div className="table-scroll">
              <table className="metrics">
                <thead>
                  <tr>
                    <th scope="col">Photo</th>
                    <th scope="col">PSNR</th>
                    <th scope="col">SSIM</th>
                    <th scope="col">PSNR*</th>
                    <th scope="col">Cover</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ name, role, metrics }) => (
                    <tr key={name}>
                      <th scope="row">
                        {name}
                        {role === 'test' ? ' (test)' : ''}
                      </th>
                      <td>{db(metrics.psnr)}</td>
                      <td>{ratio(metrics.ssim)}</td>
                      <td>{db(metrics.psnrSplat)}</td>
                      <td>{formatNumber(metrics.coverage * 100)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className="tool__actions tool__actions--spaced">
            <button
              className="chip"
              type="button"
              disabled={running}
              onClick={() =>
                download(toCsv(rows), `${splatName.replace(/\.[^.]+$/, '')}_metrics.csv`)
              }
            >
              Download CSV
            </button>
          </div>
        </>
      )}
      <p className="tool__note">
        Rendered at each photo&apos;s camera and full size on black (the 3DGS default background).
        PSNR in dB and SSIM (11 × 11 Gaussian window) over the whole photo, as in the 3DGS paper; *
        only where the splat covers the pixel (alpha ≥ {EVALUATION.coverageThreshold}), for splats
        cropped to an object. Training photos measure the fit; only test photos, held out in
        training, measure novel views.
      </p>
    </Tool>
  );
}

/**
 * A small pool of Web Workers that answer one job at a time each: a job goes to an idle worker,
 * or waits until one is free. Workers are started on first need, up to `size`. Each job is
 * posted as {...message, id}; the worker answers {id, ...} or {id, error}.
 * Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
 * @param {() => Worker} createWorker
 * @param {number} size - at most this many workers (at least 1).
 * @returns {{run: (message: object, transfer?: Transferable[]) => Promise<object>,
 *   size: number, terminate: () => void}}
 */
export function createWorkerPool(createWorker, size) {
  const limit = Math.max(1, Math.floor(size));
  const workers = [];
  const idle = [];
  // Jobs waiting for a free worker, as resolve functions.
  const queue = [];
  const pending = new Map();
  let nextId = 1;

  function start() {
    const worker = createWorker();
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) job?.reject(new Error(data.error));
      else job?.resolve(data);
    };
    workers.push(worker);
    return worker;
  }

  function acquire() {
    if (idle.length > 0) return Promise.resolve(idle.pop());
    if (workers.length < limit) return Promise.resolve(start());
    return new Promise((resolve) => queue.push(resolve));
  }

  function release(worker) {
    if (!workers.includes(worker)) return;
    const next = queue.shift();
    if (next) next(worker);
    else idle.push(worker);
  }

  async function run(message, transfer = []) {
    const worker = await acquire();
    const id = nextId++;
    try {
      return await new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ ...message, id }, transfer);
      });
    } finally {
      release(worker);
    }
  }

  /** Stop all workers; running jobs fail, waiting jobs never start. */
  function terminate() {
    for (const worker of workers) worker.terminate();
    for (const job of pending.values()) job.reject(new Error('The workers were stopped.'));
    workers.length = 0;
    idle.length = 0;
    queue.length = 0;
    pending.clear();
  }

  return { run, size: limit, terminate };
}

/**
 * How many metric workers to run: the configured number, but leave one core for the page
 * (rendering, Spark's own workers).
 * @param {number} configured
 * @param {number | undefined} cores - navigator.hardwareConcurrency (may be undefined).
 * @returns {number} at least 1.
 */
export function poolSize(configured, cores) {
  return Math.max(1, Math.min(configured, (cores || 2) - 1));
}

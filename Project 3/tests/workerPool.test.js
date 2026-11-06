import { describe, it, expect } from 'vitest';
import { createWorkerPool, poolSize } from '../src/utils/workerPool.js';

/** A stand-in for a Web Worker: keeps its messages until the test answers them. */
function fakeWorkers() {
  const started = [];
  const create = () => {
    const worker = {
      inbox: [],
      terminated: false,
      postMessage(message) {
        this.inbox.push(message);
      },
      answer(data) {
        const message = this.inbox.shift();
        this.onmessage({ data: { id: message.id, ...data(message) } });
      },
      terminate() {
        this.terminated = true;
      },
    };
    started.push(worker);
    return worker;
  };
  return { started, create };
}

/** Let pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('worker pool', () => {
  it('starts workers on demand, up to the size, and queues the rest', async () => {
    const { started, create } = fakeWorkers();
    const pool = createWorkerPool(create, 2);
    const jobs = [1, 2, 3].map((value) => pool.run({ value }));
    await settle();
    expect(started).toHaveLength(2);
    expect(started.map((worker) => worker.inbox.length)).toEqual([1, 1]);
    // The third job starts on whichever worker answers first.
    started[1].answer((message) => ({ result: message.value * 10 }));
    await settle();
    expect(started[1].inbox.map((message) => message.value)).toEqual([3]);
    started[0].answer((message) => ({ result: message.value * 10 }));
    started[1].answer((message) => ({ result: message.value * 10 }));
    const results = await Promise.all(jobs);
    expect(results.map((data) => data.result)).toEqual([10, 20, 30]);
    expect(started).toHaveLength(2);
  });

  it('rejects a job the worker reports as failed, and keeps the worker', async () => {
    const { started, create } = fakeWorkers();
    const pool = createWorkerPool(create, 1);
    const failed = pool.run({});
    await settle();
    started[0].answer(() => ({ error: 'bad photo' }));
    await expect(failed).rejects.toThrow('bad photo');
    const next = pool.run({});
    await settle();
    started[0].answer(() => ({ ok: true }));
    await expect(next).resolves.toMatchObject({ ok: true });
    expect(started).toHaveLength(1);
  });

  it('stops all workers and fails running jobs on terminate', async () => {
    const { started, create } = fakeWorkers();
    const pool = createWorkerPool(create, 2);
    const job = pool.run({});
    await settle();
    pool.terminate();
    await expect(job).rejects.toThrow('stopped');
    expect(started[0].terminated).toBe(true);
  });

  it('leaves one core for the page and runs at least one worker', () => {
    expect(poolSize(3, 16)).toBe(3);
    expect(poolSize(3, 2)).toBe(1);
    expect(poolSize(3, 1)).toBe(1);
    expect(poolSize(3, undefined)).toBe(1);
  });
});

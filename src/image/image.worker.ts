import { makePreview, processImage } from './engine';
import type { Request, Response } from './worker-protocol';

function send(response: Response) {
  self.postMessage(response);
}

self.addEventListener('message', async (event: MessageEvent<Request>) => {
  const job = event.data;
  try {
    if (job.kind === 'preview') {
      const result = await makePreview(job.source, job.maxSide, job.edits, job.bitmap);
      send({ kind: 'preview', result });
    } else {
      const result = await processImage(job.source, job.settings, job.edits,
        value => send({ kind: 'progress', value }), undefined, job.bitmap);
      send({ kind: 'output', result });
    }
  } catch (error) {
    send({ kind: 'error', message: error instanceof Error ? error.message : '处理失败' });
  }
});

/**
 * The clouds' noise made off the page's own thread (clouds.ts `CloudPass.warm`): both tiles, then posted back with
 * their memory handed over, not copied. The numbers are cloudnoise.ts's, the same as the page would make.
 */
import { billowsData, detailData } from './cloudnoise';

function whole(making: Generator<void, Uint8Array<ArrayBuffer>>): Uint8Array<ArrayBuffer> {
  let r = making.next();
  while (!r.done) r = making.next();
  return r.value;
}

const billows = whole(billowsData());
const detail = whole(detailData());
(self as unknown as Worker).postMessage({ billows, detail }, [billows.buffer, detail.buffer]);

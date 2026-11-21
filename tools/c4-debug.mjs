import { readFileSync } from 'node:fs';
import { LunarTerrain } from '../src/world/lunar-terrain.ts';
import { fitPlane } from '../src/viewer/runs.ts';
const tile = readFileSync('public/lunar/hadley.terrain.bin');
const terrain = new LunarTerrain(tile.buffer.slice(tile.byteOffset, tile.byteOffset + tile.byteLength));
const pts = [[1.143,-0.914],[1.143,0.914],[-1.143,-0.914],[-1.143,0.914]].map(([dx,dz]) => ({x: dx, z: dz, d: terrain.height(23.5+dx, -77+dz)}));
console.log(pts.map(p=>p.d.toFixed(4)));
const pl = fitPlane(pts, 0); console.log(pl, 'resid', pts.map(p => (p.d - (pl.a + pl.b*(p.x-pl.x) + pl.c*(p.z-pl.z))).toFixed(4)));

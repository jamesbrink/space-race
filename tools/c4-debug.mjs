import { readFileSync } from 'node:fs';
import { LunarRover } from '../src/viewer/lunar-rover.ts';
import { LunarTerrain } from '../src/world/lunar-terrain.ts';
import { hierarchy } from '../tests/glb.mjs';
const file = readFileSync('public/models/usa/apollo/apollo-15/rover.glb');
const model = hierarchy(JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8')));
const tile = readFileSync('public/lunar/hadley.terrain.bin');
const terrain = new LunarTerrain(tile.buffer.slice(tile.byteOffset, tile.byteOffset + tile.byteLength));
const rover = new LunarRover(model, { radius: 9000, height: (x, z) => terrain.height(x, z) }, { x: 23.5, z: -77, heading: 0, distance: 0 });
const b = rover.vehicle.bounce;
console.log('rest', b.rest, 'k', b.k, 'mass', b.mass, 'y', rover.vehicle.y, 'pitch', b.pitch, 'roll', b.roll);
console.log('hubs', rover.wheels.map(w => w.hub.toArray().map(v=>v.toFixed(3)).join(',')));
for (let i = 0; i < 12; i++) { rover.drive(0, 1, false, 1/60); console.log(i, rover.vehicle.y.toFixed(4), b.pitch.toFixed(4), b.roll.toFixed(4), b.last.map(v=>v.toFixed(4)).join(' '), rover.wheels.map(w=>w.contact?1:0).join('')); }

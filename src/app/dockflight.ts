import { Box3, BufferGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, Matrix4, Vector3 } from 'three';
import { Stage } from '../viewer/stage.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { sunlit } from '../world/orbit.ts';
import { julianDate, terrestrialTime } from '../world/time.ts';
import { SUN } from '../world/bodies.ts';
import type { Flight } from '../types.ts';
import { DockDeck } from '../deck/dockdeck.ts';
import { tetherAnchor } from '../sim/tether.ts';
import { turn } from '../sim/rigid.ts';
import { portGap } from '../sim/docking.ts';
import { add, sub, length } from '../world/frames.ts';
import { Clock } from '../world/clock.ts';
import { dockJets } from '../viewer/dockjets.ts';
import { bindDockingProbe } from '../viewer/docking.ts';
import { CURTAIN, Curtain } from './curtain.ts';
import { formatAddress, onMoved, where } from './address.ts';
import { goHome } from './home.ts';
import { installDebug } from './debug.ts';
import '../ui/dockflight.css';

export async function openDocking(flight: Flight) {
  const mission = flight.docking!;
  const root = document.querySelector<HTMLElement>('#ui')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
  const apollo = mission.interface === 'probe';
  root.innerHTML = `<header class="dockflight"><button>Gallery</button><strong></strong><small>Terminal approach</small></header>${CURTAIN}`;
  root.querySelector('strong')!.textContent = flight.designation + ' · ' + mission.target;
  const gallery = () => goHome(formatAddress(flight.id, 'gallery'));
  root.querySelector<HTMLButtonElement>('.dockflight button')!.onclick = gallery;
  const curtain = new Curtain(root.querySelector('.loading')!);
  curtain.begin(flight.designation);
  const stage = new Stage(canvas);
  stage.setAutoRotate(false);
  const epoch = julianDate(flight.launch);
  const clock = new Clock(flight.launch);
  clock.allow(16);
  const deck = new DockDeck(root, flight, clock, {
    fly: () => {},
    piloting: (on) => {
      root.classList.toggle('piloting', on);
      if (!on) gallery();
    },
  });
  stage.clock = clock;
  try {
    const stack = flight.models[0],
      other = apollo ? flight.models.find((m) => m.id === 'spider')! : stack;
    const gltf = await stage.model(stack.url),
      target = other === stack ? gltf : await stage.model(other.url);
    const vehicles = [new Group(), new Group()];
    const lower = new Group(),
      folded = new Group(),
      carrier = new Group();
    const mount = mission.carrier;
    if (mount) {
      const port = stack.dockingPorts?.find((p) => p.role === 'drogue');
      const ring = port && gltf.getObjectByName(port.part)?.getObjectByName(port.frame);
      if (!ring) throw Error('Carrier has no target docking frame');
      ring.updateWorldMatrix(true, false);
      const toRing = new Matrix4().copy(ring.matrixWorld).invert();
      for (const name of mount.jettisoned) gltf.getObjectByName(name)?.removeFromParent();
      const carrierParts = new Group();
      for (const name of mount.nodes) {
        const node = gltf.getObjectByName(name);
        if (!node) throw Error('Carrier part missing: ' + name);
        carrierParts.attach(node);
      }
      for (const p of other.parts) {
        const node = gltf.getObjectByName(p.node);
        if (node) folded.attach(node);
      }
      folded.applyMatrix4(toRing);
      carrierParts.applyMatrix4(toRing);
      // First docking port arm is measured from the separate LM's centre.
      carrierParts.position.y += mission.massProperties![0]![1]!.arm.value + mount.arm.value;
      carrier.add(carrierParts);
    }
    const descriptions = [stack, other];
    let probe: ReturnType<typeof bindDockingProbe> = null;
    for (const [i, model] of descriptions.entries()) {
      const source = i ? target : gltf;
      source.updateWorldMatrix(true, true);
      const parts = new Group(),
        body = vehicles[i];
      body.add(parts);

      if (i === 1 && apollo) parts.add(lower);
      for (const p of model.parts) {
        if (i === 0 ? p.group !== 'Spacecraft' : apollo ? false : p.group !== 'Docking target') continue;
        if (['NoseFairing', 'ScannerFairing'].includes(p.node)) continue;
        const node = source.getObjectByName(p.node);
        if (node) (i === 1 && apollo && p.group === 'Descent stage' ? lower : parts).attach(node);
      }
      const port = model.dockingPorts?.find((p) => p.role === (i ? 'drogue' : 'probe'));
      if (port) {
        const ring = parts.getObjectByName(port.part)?.getObjectByName(port.frame);
        if (!ring) throw Error('Docking frame missing: ' + port.frame);
        ring.updateWorldMatrix(true, false);
        parts.applyMatrix4(new Matrix4().copy(ring.matrixWorld).invert());
        if (port.role === 'probe') probe = bindDockingProbe(parts, port);
      } else {
        const coupling = parts.getObjectByName(i ? 'MooringLatches' : 'RendezvousRecovery');
        if (!coupling) throw Error('Missing Gemini docking hardware');
        const bounds = new Box3().setFromObject(coupling),
          datum = bounds.getCenter(new Vector3());
        if (!i) datum.y = bounds.max.y;
        parts.position.sub(datum);
      }
      parts.position.y += deck.run.bodies[i].port;
    }
    if (mount) vehicles[1].add(folded);
    const line = mission.tether
      ? new Line(
          new BufferGeometry().setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3)),
          new LineBasicMaterial({ color: 0xead8bd }),
        )
      : null;
    if (line) line.frustumCulled = false;
    const draw = stage.orbitalBodies(mount ? [...vehicles, carrier] : vehicles, line ? [line] : []);
    installDebug({
      stage,
      flight,
      get docking() {
        return deck.run;
      },
    });
    const flames = dockJets(vehicles, mission.jets ?? []);
    const bases = vehicles.map((v, i) => v.children[0].position.y - deck.run.bodies[i]!.port);
    const foldedBase = folded.position.y;
    const pose = () => {
      const run = deck.run;
      lower.visible = !deck.redock;
      const target = run.bodies[1];
      const anchor = add(target.r, turn(target.q, [0, target.port, 0]));
      for (const [i, b] of run.bodies.entries()) {
        const v = vehicles[i];
        v.children[0].position.y = bases[i]! + b.port;
        v.position.fromArray(sub(b.r, anchor));
        v.quaternion.set(b.q[1], b.q[2], b.q[3], b.q[0]);
      }
      if (mount) {
        const payloadArm = mission.massProperties![0]![1]!.arm.value;
        folded.position.y = foldedBase + target.port;
        folded.visible = run.mounted;
        vehicles[1].children[0].visible = !run.mounted;
        carrier.visible = run.mounted || !!run.released;
        const state = run.released ?? target;
        carrier.position.fromArray(run.released ? sub(state.r, anchor) : turn(target.q, [0, -payloadArm - mount.arm.value, 0]));
        carrier.quaternion.set(state.q[1], state.q[2], state.q[3], state.q[0]);
      }
      if (line) {
        line.visible = run.tetherLength > 0;
        if (line.visible) {
          const coords = line.geometry.getAttribute('position');
          run.bodies.forEach((body, i) => coords.setXYZ(i, ...sub(tetherAnchor(body), anchor)));
          coords.needsUpdate = true;
        }
      }
      for (const show of flames) show(run.t, deck.firedForce, deck.firedTorque, deck.mainFiring);
      probe?.(run.phase === 'hard' ? 'docked' : run.phase === 'capture' ? 'capture' : 'approach', run.closure);
      const earthToSun = sunPosition(terrestrialTime(epoch + run.t / 86400)),
        toSun = sub(earthToSun, run.bodies[1].r);
      draw(new Vector3(...toSun).normalize(), Math.asin(SUN.equatorialRadius.value / length(toSun)), sunlit(run.bodies[1].r, earthToSun));
    };
    const distance = portGap(...deck.run.bodies).gap;
    stage.pose(30, 12, Math.max(mount ? 52 : 42, distance * 2), distance / 2);
    pose();
    clock.listen(pose);
    await stage.warm(0, (label, fraction) => curtain.set(0.7 + 0.3 * fraction, [{ label, done: fraction }]));
    deck.enter();
    document.body.classList.add('scene-ready');
    curtain.set(1, [{ label: 'Spacecraft', done: 1 }]);
    curtain.done();
  } catch (error) {
    curtain.failed(error instanceof Error ? error.message : 'Model loading failed');
    root.querySelector<HTMLButtonElement>('.loading button')!.onclick = () => location.reload();
  }
  onMoved(() => goHome(where(), true));
}

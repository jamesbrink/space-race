import { Box3, BufferGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, Matrix4, Vector3 } from 'three';
import { DockDeck } from '../deck/dockdeck.ts';
import { portGap } from '../sim/docking.ts';
import { turn } from '../sim/rigid.ts';
import { tetherAnchor } from '../sim/tether.ts';
import type { Flight } from '../types.ts';
import { bindDockingProbe } from '../viewer/docking.ts';
import { dockJets } from '../viewer/dockjets.ts';
import { Stage } from '../viewer/stage.ts';
import { SUN } from '../world/bodies.ts';
import { Clock } from '../world/clock.ts';
import { frameOf } from '../world/earthframe.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { add, length, sub } from '../world/frames.ts';
import { sunlit } from '../world/orbit.ts';
import { formatAddress, onMoved, where } from './address.ts';
import { CURTAIN, Curtain } from './curtain.ts';
import { installDebug } from './debug.ts';
import { goHome } from './home.ts';
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
  // (the frame the two craft's states are in: the flight's, as every flown run's; the Sun is turned into it)
  const frame = frameOf(flight);
  const clock = new Clock(flight.launch);
  clock.allow(128);
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
      other = apollo ? flight.models.find((m) => m.id === mission.spacecraft.targetModel)! : stack;
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
        if (!deck.run.plan!.craft[i]!.bodies[0]!.nodes!.includes(p.node)) continue;
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
    const visit = mission.visit;
    const otherTarget = new Group();
    if (visit) {
      const model = flight.models.find((m) => m.id === visit.model)!;
      const target = await stage.model(model.url);
      const coupling = target.getObjectByName('MooringLatches');
      if (!coupling) throw Error('The passive target lacks its docking adapter');
      const datum = new Box3().setFromObject(coupling).getCenter(new Vector3());
      target.position.sub(datum);
      target.position.y += deck.run.bodies[1].port;
      otherTarget.add(target);
      otherTarget.visible = false;
    }
    const line = mission.tether
      ? new Line(
          new BufferGeometry().setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3)),
          new LineBasicMaterial({ color: 0xead8bd }),
        )
      : null;
    if (line) line.frustumCulled = false;
    const draw = stage.orbitalBodies(mount ? [...vehicles, carrier] : visit ? [...vehicles, otherTarget] : vehicles, line ? [line] : []);
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
      const anchor =
        (deck.visit && !deck.eva) || (deck.transfer && run.phase === 'free')
          ? run.bodies[0].r
          : add(target.r, turn(target.q, [0, target.port, 0]));
      for (const [i, b] of run.bodies.entries()) {
        const v = vehicles[i];
        v.children[0].position.y = bases[i]! + b.port;
        v.position.fromArray(sub(b.r, anchor));
        v.quaternion.set(b.q[1], b.q[2], b.q[3], b.q[0]);
      }
      if (visit) {
        otherTarget.visible = deck.visit;
        if (deck.visit && run.released) {
          otherTarget.position.copy(vehicles[1].position);
          otherTarget.quaternion.copy(vehicles[1].quaternion);
          const own = run.released;
          vehicles[1].position.fromArray(sub(own.r, anchor));
          vehicles[1].quaternion.set(own.q[1], own.q[2], own.q[3], own.q[0]);
        }
        const heading = root.querySelector('strong')!,
          label = flight.designation + ' · ' + (deck.visit ? visit.label : mission.target);
        if (heading.textContent !== label) heading.textContent = label;
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
      const earthToSun = frame.fromDate(sunPosition(frame.jdTT(run.t))),
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

// A model stood as it was at liftoff. A flight's pad is built as it stood when the pilot went aboard, and its
// parts' `moves` (types.ts: Move) take it through the morning: platforms part, the structure rolls back, the cherry
// picker's cab is lowered. The native build does not play those yet, so the unpacked model is written already
// moved: the web build's own Exploder (src/viewer/explode.ts) is run on the model's nodes at the place on its slider
// where liftoff falls (its `sequence`), and each node's place is written back into the glTF.
import * as THREE from 'three';
import { flights } from '../../missions/index.ts';
import { Exploder } from '../../src/viewer/explode.ts';
import { sliderAt } from '../../src/world/sequence.ts';

/**
 * Stand `gltf` (its JSON, changed in place) as its flight has it at liftoff. `file` is its path under
 * public/models/. Returns where on its slider that is, or null for a model no flight moves on a clock.
 */
export function standAtLiftoff(gltf, file) {
  const model = flights.flatMap((flight) => flight.models).find((m) => m.url === `models/${file}`);
  if (!model?.sequence) return null;

  const objects = gltf.nodes.map((node) => {
    const object = new THREE.Object3D();
    // (as the page's loader names them, so the flight's node names find them)
    object.name = THREE.PropertyBinding.sanitizeNodeName(node.name ?? '');
    object.userData = node.extras ?? {};
    if (node.matrix) new THREE.Matrix4().fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
    return object;
  });
  gltf.nodes.forEach((node, i) => {
    for (const child of node.children ?? []) objects[i].add(objects[child]);
  });
  const root = new THREE.Group();
  for (const i of gltf.scenes[gltf.scene ?? 0].nodes) root.add(objects[i]);

  const slider = sliderAt(model.sequence, 0);
  const exploder = new Exploder(root, model.parts);
  exploder.set(slider);

  gltf.nodes.forEach((node, i) => {
    const object = objects[i];
    delete node.matrix;
    node.translation = object.position.toArray();
    node.rotation = object.quaternion.toArray();
    node.scale = object.scale.toArray();
  });
  return slider;
}

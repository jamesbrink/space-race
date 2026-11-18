import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PerspectiveCamera, Scene, Texture } from 'three';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CloudPass } from '../src/viewer/clouds.ts';
import { WeatherMap } from '../src/viewer/weathermap.ts';

test('a second site keeps its own weather and a compiled cloud pass follows its stage', async () => {
  const first = new WeatherMap(0, { cumulus: { cover: 0.2, wind: [1, 0] }, high: { toward: 0 } });
  const pass = new CloudPass(new Scene(), new PerspectiveCamera());
  const output = new OutputPass();
  pass.adopt(output);
  pass.setAir(null, first);
  pass.dress(null);
  const drawn = output.material.uniforms;
  const firstTexture = drawn.tWeather.value;

  const second = new WeatherMap(90, { cumulus: { cover: 0.8, wind: [0, 1] }, high: { toward: 0 } });
  assert.equal(drawn.tWeather.value, firstTexture);
  assert.equal(drawn.uWeather.value.w, 0.2);
  assert.deepEqual(drawn.uWeatherWind.value.toArray(), [1, 0]);
  pass.setAir(null, second);
  assert.notEqual(drawn.tWeather.value, firstTexture);
  assert.equal(drawn.tWeather.value, second.uniforms.tWeather.value);
  assert.equal(drawn.uWeather.value.w, 0.8);
  assert.deepEqual(drawn.uWeatherWind.value.toArray(), [0, 1]);
  let closed = false;
  const recovery = new Texture({
    close: () => {
      closed = true;
    },
  });
  second.textureFor = async () => recovery;
  await second.loadRecovery('sample');
  second.recover(0.6);
  assert.equal(drawn.tRecovery.value, recovery);
  assert.equal(drawn.uRecovery.value, 0.6);
  assert.equal(first.uniforms.uRecovery.value, 0);
  second.recover(0);
  assert.equal(drawn.uRecovery.value, 0);
  first.dispose();
  assert.equal(drawn.tWeather.value, second.uniforms.tWeather.value);
  const secondTexture = drawn.tWeather.value;
  second.dispose();
  assert.equal(closed, true);
  assert.notEqual(drawn.tRecovery.value, recovery);
  assert.notEqual(drawn.tWeather.value, secondTexture);
  assert.equal(drawn.tWeather.value, second.uniforms.tWeather.value);
  pass.setAir(null, null);
  assert.equal(drawn.uWeather.value.w, 0.1);
  pass.dispose();
  output.dispose();
});

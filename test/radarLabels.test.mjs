import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes, createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.resolve('nuxt'));
const { parse, compileScript } = require('vue/compiler-sfc');
const { createSSRApp, defineComponent, h } = require('vue');
const { renderToString } = require('vue/server-renderer');

const source = fs.readFileSync(new URL('../app/components/statistics/MandatoryRadar.vue', import.meta.url), 'utf8');
const { descriptor } = parse(source);
const compiled = compileScript(descriptor, { id: 'radar-label-test', inlineTemplate: true });
const code = stripTypeScriptTypes(compiled.content).replace(/from ['"]vue['"]/g, `from ${JSON.stringify(pathToFileURL(require.resolve('vue')).href)}`);
const { default: Radar } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const Card = defineComponent({ setup(_props, { slots }) { return () => h('section', [slots.header?.(), slots.default?.()]); } });
async function render(props) {
  const app = createSSRApp(Radar, props); app.component('UCard', Card);
  return renderToString(app);
}
test('rating labels are visible when the Boolean prop is omitted', async () => {
  const html = await render({ ratings: ['TWR','APP','APS'].map(rating => ({ rating, statistic: [] })) });
  for (const rating of ['TWR','APP','APS']) assert.match(html, new RegExp(`Rating: ${rating}`));
});
test('MATS explicitly hides its rating label', async () => {
  const html = await render({ ratings: [{ rating: 'MATS', statistic: [] }], showRating: false });
  assert.doesNotMatch(html, /Rating:/);
  const page = fs.readFileSync(new URL('../app/pages/pfcScore/branchUnit.vue', import.meta.url), 'utf8');
  assert.match(page, /:ratings="matsRadar"\s+:show-rating="false"/);
});

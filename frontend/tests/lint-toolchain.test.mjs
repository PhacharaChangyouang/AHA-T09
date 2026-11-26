import test from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

test('replacement lint retains Hooks, JSX and ARIA checks plus styled-jsx support', async () => {
  const eslint = new ESLint();
  const lint = async code => (await eslint.lintText(code, { filePath: 'src/lint-fixture.jsx' }))[0];
  const hooks = await lint("import {useState} from 'react'; export default function Fixture({show}) { if(show) useState(0); return <div/>; }");
  assert.ok(hooks.messages.some(m => m.ruleId === 'react-hooks/rules-of-hooks' && m.severity === 2));
  const jsx = await lint('export default function Fixture() { return <UndefinedComponent/>; }');
  assert.ok(jsx.messages.some(m => m.ruleId === 'react/jsx-no-undef' && m.severity === 2));
  const aria = await lint('export default function Fixture() { return <div aria-invalid-attribute="true"/>; }');
  assert.ok(aria.messages.some(m => m.ruleId === 'jsx-a11y/aria-props'));
  const styled = await lint('export default function Fixture() { return <style jsx global>{`body{color:black}`}</style>; }');
  assert.equal(styled.errorCount, 0);
});

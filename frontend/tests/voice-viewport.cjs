// Real Chromium layout checks against source-rendered fixtures only.
// No login, production connection, user cookies, microphone or notification send.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { chromium } = require('playwright');
const { page: fixture, load, walk } = require('./ui-experience.cjs');

async function main() {
  const output = path.resolve('test-results/voice-viewport');
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const name = path.basename(url.pathname);
    const dir = url.pathname.startsWith('/fonts/') ? '.next/static/media' : url.pathname.startsWith('/icons/') ? 'public/icons' : null;
    if (!dir || !/\.(woff2?|svg|png)$/.test(name)) { res.writeHead(404); res.end(); return; }
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.png') ? 'image/png' : 'font/woff2');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  server.unref();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const sheets = fs.readdirSync('.next/static/css').filter(n => n.endsWith('.css')).map(n => fs.readFileSync('.next/static/css/' + n, 'utf8')).join('\n').replaceAll('/_next/static/media/', origin + '/fonts/');
  const font = /--font-prompt:([^;}]+)/.exec(sheets)?.[1] || 'sans-serif';
  let styles = '';
  for (const name of ['AhaVisualPolish', 'AhaResponsiveFix', 'AhaCaregiverEnhancements', 'AhaLayoutRefresh']) {
    const C = (await load(`src/components/${name}.jsx`, { react: { ...React, useEffect() {} }, 'next/navigation': { usePathname: () => '/voice' }, './AhaIcon': () => null })).default;
    // Raw style text matches styled-jsx output; React's generic static renderer
    // HTML-escapes quotes inside <style>, invalidating attribute selectors.
    styles += walk(C()).filter(n => n.type === 'style').map(n => `<style>${n.props.children}</style>`).join('');
  }
  const browser = await chromium.launch({ headless: true, ...(process.env.AHA_TEST_CHROME ? { executablePath: process.env.AHA_TEST_CHROME } : {}) });
  const context = await browser.newContext();
  await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  const tab = await context.newPage();
  const sizes = [[280,653],[320,568],[360,640],[375,667],[390,844],[412,915],[430,932],[760,740],[761,740],[768,1024],[1024,768],[1440,900],[1920,1080],[844,390],[390,420]];
  const results = [], failures = [];
  try {
    matrix: for (const role of ['elderly','caregiver']) for (const mode of ['text','voice']) for (const stress of [false,true]) {
      const f = await fixture('voice', role, mode);
      f.states[5] = null;
      f.states[2] = '';
      f.states[3] = 'แตะปุ่มแล้วพูดได้เลยค่ะ เช่น ยาครั้งต่อไปกี่โมง';
      f.states[4] = [{ role: 'assistant', text: f.states[3] }];
      if (stress) {
        const long = 'ข้อมูลยาที่บันทึกไว้ กรุณาตรวจสอบชื่อยาและเวลาให้ถูกต้องก่อนยืนยันค่ะ '.repeat(8);
        f.states[3] = long;
        f.states[4] = [{ role: 'assistant', text: long }, { role: 'user', text: 'https://example.test/' + 'A'.repeat(240) }, { role: 'assistant', text: 'ทวนรายการที่คุณต้องการค่ะ ' + 'ยาความดัน'.repeat(24) }];
        f.states[5] = { stage: 'confirming', medicine_name: 'วิตามินชื่อยาวสำหรับตรวจสอบการตัดบรรทัด'.repeat(3), reminder_time: '01:13' };
      }
      const body = renderToStaticMarkup(f.tree());
      const nav = (await fixtureNavigation()).html;
      for (const theme of ['light','dark']) for (const [width,height] of sizes) for (const inset of [0,34]) {
        const name = `${role}-${mode}-${stress ? 'stress' : 'normal'}-${theme}-${width}x${height}-inset${inset}`;
        await tab.setViewportSize({ width, height });
        await tab.setContent(`<!doctype html><html lang="th" data-aha-appearance="${theme}"><head><base href="${origin}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${sheets}\n:root{--font-prompt:${font}}body{font-family:var(--font-prompt),sans-serif}</style>${styles}</head><body>${body}${nav}</body></html>`);
        await tab.evaluate(() => document.fonts.ready);
        await tab.evaluate(inset => {
          document.documentElement.style.setProperty('--aha-safe-bottom', `${inset}px`);
          document.documentElement.style.setProperty('--aha-safe-top', `${inset ? 20 : 0}px`);
          document.documentElement.style.setProperty('--aha-safe-left', `${inset ? 12 : 0}px`);
          document.documentElement.style.setProperty('--aha-safe-right', `${inset ? 12 : 0}px`);
        }, inset);
        try {
          const metrics = await tab.evaluate(() => {
            const issues = [];
            if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('document overflows horizontally');
            const modeLabel = document.querySelector('.aha-conversation-mode-switch span');
            const modeButton = modeLabel.parentElement.getBoundingClientRect();
            const modeIcon = modeLabel.parentElement.querySelector('svg').getBoundingClientRect();
            if (innerWidth <= 760 && (Math.abs((modeIcon.left + modeIcon.right - modeButton.left - modeButton.right) / 2) > 1 || Math.abs((modeIcon.top + modeIcon.bottom - modeButton.top - modeButton.bottom) / 2) > 1)) issues.push('mode icon is not centered');
            if (innerWidth > 760) {
              const r = modeLabel.getBoundingClientRect(), parent = modeLabel.parentElement.getBoundingClientRect();
              if (r.left < parent.left || r.right > parent.right || r.top < parent.top || r.bottom > parent.bottom) issues.push('mode label leaves its button');
            }
            const voiceNav = document.querySelector('.aha-v3-nav-voice');
            if (getComputedStyle(voiceNav).backgroundColor !== 'rgb(47, 107, 255)') issues.push('voice navigation loses brand contrast');
            for (const icon of document.querySelectorAll('.aha-conversation-mode-switch>svg,.aha-voice-type-link>svg,.aha-live-controls button>svg,.aha-v3-side-links button>svg')) {
              const r = icon.getBoundingClientRect(), p = icon.parentElement.getBoundingClientRect();
              if (r.left < p.left - 1 || r.right > p.right + 1 || r.top < p.top - 1 || r.bottom > p.bottom + 1) issues.push('icon leaves its button');
            }
            const speaker = document.querySelector('.speaker-sticker svg');
            if (speaker && !['none','matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(speaker).transform)) issues.push('speaker icon is reversed');
            for (const icon of document.querySelectorAll('.aha-companion.compact svg')) {
              const box = icon.viewBox.baseVal, art = icon.querySelector('.aha-companion-float').getBBox();
              if (art.x < box.x || art.y < box.y || art.x + art.width > box.x + box.width || art.y + art.height > box.y + box.height) issues.push('compact character is cropped');
            }
            if (innerWidth <= 760) {
              const nav = document.querySelector('.aha-v3-sidebar').getBoundingClientRect();
              const inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--aha-safe-bottom')) || 0;
              const rootStyle = getComputedStyle(document.documentElement);
              const left = Math.max(8,parseFloat(rootStyle.getPropertyValue('--aha-safe-left')) || 0), right = Math.max(8,parseFloat(rootStyle.getPropertyValue('--aha-safe-right')) || 0);
              const bottomGap = Math.max(8,inset - 16);
              if (Math.abs(nav.left - left) > 1 || Math.abs(innerWidth - nav.right - right) > 1 || Math.abs(innerHeight - nav.bottom - bottomGap) > 1 || nav.top < 0) issues.push('capsule loses its compact screen-edge spacing');
              for (const button of document.querySelectorAll('.aha-v3-side-links button')) {
                const r = button.getBoundingClientRect();
                if (r.top < nav.top - (button.classList.contains('aha-v3-nav-voice') ? 8 : 0) || r.bottom > nav.bottom + 1) issues.push('navigation button leaves safe capsule area');
              }
              const center = voiceNav.getBoundingClientRect();
              if (center.top >= nav.top - 1 || center.top < nav.top - 8) issues.push('AHA button is not subtly raised');
            }
            const characterPanel = document.querySelector('.aha-character-panel');
            if (characterPanel) {
              const style = getComputedStyle(characterPanel);
              if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none' || parseFloat(style.borderTopWidth) !== 0) issues.push('character still has a card frame');
            }
            for (const bubble of document.querySelectorAll('.aha-chat-bubble')) {
              if (bubble.scrollWidth > bubble.clientWidth + 1) issues.push('bubble content overflows');
              const p = bubble.querySelector('p'), bounds = bubble.getBoundingClientRect();
              const range = document.createRange(); range.selectNodeContents(p);
              for (const rect of range.getClientRects()) if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) issues.push('text leaves bubble border');
            }
            const composer = document.querySelector('.aha-chat-composer');
            if (composer) {
              const r = composer.getBoundingClientRect();
              if (r.left < 0 || r.right > innerWidth + 1 || r.height < 44 || r.top < 0) issues.push('composer is clipped');
              const nav = document.querySelector('.aha-v3-sidebar').getBoundingClientRect();
              const navTop = Math.min(nav.top,voiceNav.getBoundingClientRect().top);
              if (r.bottom > (innerWidth <= 760 ? navTop : innerHeight) + 1) issues.push('composer overlaps navigation or viewport');
              if (document.querySelector('.aha-chat-scroll').clientHeight < 16) issues.push('chat scroll area collapsed');
            }
            const rect = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { x:r.x,y:r.y,width:r.width,height:r.height } : null; };
            return { issues, width: innerWidth, height: innerHeight, composer:rect('.aha-chat-composer'), navigation:rect('.aha-v3-sidebar') };
          });
          assert.deepEqual(metrics.issues, [], name + ': ' + JSON.stringify(metrics));
          if (mode === 'voice') {
            const mic = tab.getByRole('button', { name: 'เริ่มพูด', exact: true });
            await mic.scrollIntoViewIfNeeded();
            const r = await mic.boundingBox();
            assert.ok(r && r.y >= -1 && r.y + r.height <= height + 1, name + ': microphone remains reachable');
            const typeLink = tab.locator('.aha-voice-type-link');
            await typeLink.scrollIntoViewIfNeeded();
            const link = await typeLink.boundingBox(), navigation = await tab.locator('.aha-v3-sidebar').boundingBox();
            const center = await tab.locator('.aha-v3-nav-voice').boundingBox();
            assert.ok(link && link.y >= -1 && link.y + link.height <= (width <= 760 ? Math.min(navigation.y,center.y) : height) + 1, name + ': text mode remains reachable above navigation');
          }
          if (role === 'elderly' && (width === 390 && height === 844 || width === 1440)) await tab.screenshot({ path: path.join(output, name + '.png') });
          results.push({ name, passed: true });
        } catch (error) {
          await tab.screenshot({ path: path.join(output, name + '-FAILED.png'), fullPage: true });
          failures.push({ name, error: error.message });
          if (failures.length >= 8) break matrix;
        }
      }
    }
    const sharedPageChecks = [];
    for (const role of ['elderly','caregiver']) for (const route of ['home','reminders','family','notifications','profile','emergency']) {
      const f = await fixture(route, role);
      const nav = (await fixtureNavigation('/' + route)).html;
      for (const theme of ['light','dark']) for (const [width,height] of sizes) {
        const name = `${role}-${route}-${theme}-${width}x${height}`;
        await tab.setViewportSize({ width,height });
        await tab.setContent(`<html data-aha-appearance="${theme}"><head><base href="${origin}"><style>${sheets}\n:root{--font-prompt:${font}}body{font-family:var(--font-prompt),sans-serif}</style>${styles}</head><body>${renderToStaticMarkup(f.tree())}${nav}</body></html>`);
        await tab.evaluate(() => document.fonts.ready);
        const issues = await tab.evaluate(() => {
          const issues = [];
          if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('document overflows horizontally');
          if (getComputedStyle(document.querySelector('.aha-v3-nav-voice')).backgroundColor !== 'rgb(47, 107, 255)') issues.push('voice navigation loses brand contrast');
          if (innerWidth <= 760) {
            const nav = document.querySelector('.aha-v3-sidebar').getBoundingClientRect();
            if (Math.abs(innerHeight - nav.bottom - 8) > 1 || Math.abs(nav.left - 8) > 1 || Math.abs(innerWidth - nav.right - 8) > 1) issues.push('navigation does not keep capsule edge gaps');
            for (const button of document.querySelectorAll('.aha-v3-side-links button')) {
              const r = button.getBoundingClientRect();
              const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              if (!hit || !button.contains(hit)) issues.push('navigation is obscured');
            }
          }
          return issues;
        });
        let homeEndGap;
        if (route === 'home' && width <= 760) {
          homeEndGap = await tab.evaluate(() => {
            document.documentElement.style.setProperty('--aha-safe-bottom','34px');
            window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});
            return document.querySelector('.aha-v3-sidebar').getBoundingClientRect().top - document.querySelector('.aha-v3-content>section:last-child').getBoundingClientRect().bottom;
          });
          if (homeEndGap < 12 || homeEndGap > 24) issues.push('home ending lacks a balanced gap above navigation: ' + homeEndGap);
          if (width === 390 && height === 844 || width === 320 && height === 568) await tab.screenshot({path:path.join(output,name + '-home-end.png')});
        }
        if (issues.length) {
          await tab.screenshot({ path:path.join(output,name + '-FAILED.png'),fullPage:true });
          failures.push({name,error:issues.join(', ')});
        }
        sharedPageChecks.push({name,passed:!issues.length,...(homeEndGap === undefined ? {} : {homeEndGap})});
      }
    }
    const keyboardChecks = [];
    for (const role of ['elderly','caregiver']) for (const theme of ['light','dark']) for (const visibleHeight of [300,420,520]) {
      const f = await fixture('voice',role,'text');
      f.states[5] = null;
      await tab.setViewportSize({width:390,height:844});
      await tab.setContent(`<html data-aha-appearance="${theme}" data-aha-voice-compact="true" style="--aha-voice-height:${visibleHeight}px;--aha-viewport-bottom-gap:${844-visibleHeight}px;--aha-safe-bottom:34px;--aha-safe-top:20px"><head><style>${sheets}\n:root{--font-prompt:${font}}body{font-family:var(--font-prompt),sans-serif}</style>${styles}</head><body>${renderToStaticMarkup(f.tree())}${(await fixtureNavigation()).html}</body></html>`);
      await tab.evaluate(() => document.fonts.ready);
      const positions = await tab.evaluate(() => {
        const composer = document.querySelector('.aha-chat-composer').getBoundingClientRect();
        const nav = document.querySelector('.aha-v3-sidebar').getBoundingClientRect();
        return {composerBottom:composer.bottom,navTop:Math.min(nav.top,document.querySelector('.aha-v3-nav-voice').getBoundingClientRect().top),navBottom:nav.bottom,scrollHeight:document.querySelector('.aha-chat-scroll').clientHeight};
      });
      const passed = positions.composerBottom <= positions.navTop + 1 && Math.abs(positions.navBottom - (visibleHeight - 18)) <= 1 && positions.scrollHeight >= 16;
      if (!passed) failures.push({name:`${role}-${theme}-keyboard-${visibleHeight}`,error:JSON.stringify(positions)});
      keyboardChecks.push({role,theme,visibleHeight,passed});
    }
    const animationChecks = [];
    for (const state of ['idle','listening','understanding','processing','speaking']) {
      const f = await fixture('voice', 'elderly', 'voice');
      f.states[1] = state; f.states[5] = null;
      await tab.setContent(`<html><head><style>${sheets}</style>${styles}</head><body>${renderToStaticMarkup(f.tree())}</body></html>`);
      const character = tab.locator('.aha-character-scene .aha-companion');
      assert.ok((await character.getAttribute('class')).includes('mood-' + state));
      const selector = state === 'speaking' ? '.aha-companion-mouth' : ['understanding','processing'].includes(state) ? '.aha-companion-thought' : '.aha-companion-float';
      const animation = await character.locator(selector).evaluate(el => ({ display:getComputedStyle(el).display, name:getComputedStyle(el).animationName }));
      assert.notEqual(animation.display, 'none', state + ': matching character feature is visible');
      assert.notEqual(animation.name, 'none', state + ': matching character feature animates');
      animationChecks.push(state);
    }
    await tab.emulateMedia({ reducedMotion: 'reduce' });
    const moving = await tab.locator('.aha-character-scene .aha-companion-float').evaluate(el => getComputedStyle(el).animationName);
    assert.equal(moving, 'none', 'reduced motion disables companion animation');
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: results.length, failures, results, sharedPageChecks, keyboardChecks, animationChecks, reducedMotion: 'passed', scope: 'source-rendered Chromium fixtures; no live account or device integration' }, null, 2));
    assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
    console.log(`PASS ${results.length} voice and ${sharedPageChecks.length} shared-page Chromium viewport fixtures plus reduced-motion check.`);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
async function fixtureNavigation(pathname = '/voice') {
  const { fixture: hooksFixture } = require('./ui-experience.cjs');
  const f = hooksFixture();
  const Icon = (await load('src/components/AhaIcon.js')).default;
  const BrandMark = (await load('src/components/AhaBrandMark.jsx')).default;
  const C = (await load('src/components/AhaNavigation.jsx', { react: f.hooks, 'next/navigation': { usePathname: () => pathname, useRouter: () => ({}) }, './AhaIcon': Icon, './AhaBrandMark': BrandMark, '../services/api': {} })).default;
  return { html: renderToStaticMarkup(f.render(C)) };
}
main().catch(error => { console.error(error); process.exitCode = 1; });

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './landing.module.css';
import AhaBrandMark from '../AhaBrandMark';

const stories = [
  {
    title: 'เริ่มจากคำพูดง่าย ๆ',
    description: 'สำหรับเวลาที่อยากตั้งเตือนยา ผู้สูงอายุสามารถใช้เสียงช่วยสร้างรายการเตือน โดยไม่จำเป็นต้องผ่านหลายหน้าจอ',
    theme: 'voice',
    icon: 'mic',
  },
  {
    title: 'เมื่อถึงเวลา มีตัวช่วยเตือน',
    description: 'AHA ช่วยแจ้งเตือนรายการที่ตั้งไว้ เพื่อให้การดูแลเรื่องยาในแต่ละวันเป็นระเบียบและสม่ำเสมอขึ้น',
    theme: 'reminder',
    icon: 'bell',
  },
  {
    title: 'เชื่อมความใส่ใจของคนในบ้าน',
    description: 'เชื่อมต่อกับผู้ดูแลเพื่อให้คนในครอบครัวมีส่วนร่วมในการติดตามข้อมูลที่ระบบรองรับ',
    theme: 'family',
    icon: 'family',
  },
];

const guide = [
  ['01', 'สร้างบัญชี AHA', 'เริ่มด้วยการสมัครบัญชีและเลือกบทบาทที่ตรงกับการใช้งาน'],
  ['02', 'ตั้งรายการเตือนยา', 'กำหนดรายการและเวลาเตือนด้วยการกรอกข้อมูล หรือใช้เสียงช่วยตั้งรายการ'],
  ['03', 'เชื่อมต่อครอบครัว', 'เพิ่มผู้ดูแลเมื่อต้องการให้ร่วมติดตามข้อมูล ขั้นตอนนี้เป็นทางเลือก'],
];

function Showcase({ active, setActive }) {
  const root = useRef(null);
  const progressRef = useRef(null);
  const touchStart = useRef(null);
  const keyboardNavigation = useRef(false);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [motionOverride, setMotionOverride] = useState(false);
  const [focus, setFocus] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) setMotionOverride(false);
    };
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  // Measure the visible portion of the whole section, not the tall carousel card.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.innerHeight || document.documentElement.clientHeight;
      const header = document.querySelector('header');
      const headerBottom = Math.max(0, header?.getBoundingClientRect().bottom || 0);
      const pixels = Math.max(0, Math.min(rect.bottom, viewport) - Math.max(rect.top, headerBottom));
      setInView(pixels >= Math.min(90, viewport * .14));
    };
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('pageshow', queue);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(queue, { threshold: [0, .03, .15, .5, 1] }) : null;
    if (observer && root.current) observer.observe(root.current);
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      window.removeEventListener('pageshow', queue);
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Tab') keyboardNavigation.current = true; };
    const onPointer = () => { keyboardNavigation.current = false; };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  const enabled = !paused && (!reducedMotion || motionOverride);
  const canPlay = inView && pageVisible && enabled && !focus;
  // A single monotonic clock drives BOTH the 5-second rotation and the progress bar.
  // No hover pause: a resting desktop pointer must not silently freeze autoplay.
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return undefined;
    if (!canPlay) {
      bar.style.transform = 'scaleX(0)';
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = now => {
      const fraction = Math.min(1, (now - start) / 5000);
      bar.style.transform = 'scaleX(' + fraction + ')';
      if (fraction >= 1) {
        setActive(current => (current + 1) % stories.length);
      } else {
        frame = window.requestAnimationFrame(tick);
      }
    };
    bar.style.transform = 'scaleX(0)';
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, canPlay, setActive]);

  const move = useCallback(delta => {
    setPaused(true); // Reading time is under the user's control after manual navigation.
    setActive(index => (index + delta + stories.length) % stories.length);
  }, [setActive]);
  const toggle = () => {
    if (enabled) setPaused(true);
    else { setPaused(false); setMotionOverride(true); }
  };
  const storyImages = ['/landing/v67/story-voice.webp', '/landing/v67/story-reminder.webp', '/landing/v67/story-family.webp'];
  const storyAlt = [
    'ภาพจำลองผู้สูงอายุใช้โทรศัพท์เพื่อช่วยตั้งรายการเตือนด้วยเสียง',
    'ภาพประกอบสถานการณ์การแจ้งเตือนเรื่องยาในครอบครัว',
    'ภาพจำลองผู้สูงอายุและลูกสาวดูโทรศัพท์ด้วยกัน'
  ];
  return (
    <section className={styles.showcase} id="showcase" aria-labelledby="showcaseHeading">
      <div className={styles.wrap}>
        <div className={styles.showcaseHeading}>
          <h2 id="showcaseHeading">ตัวอย่างการใช้งาน<br />ในแต่ละวัน</h2>
          <p>จากการตั้งเตือนเล็ก ๆ ไปสู่การดูแลร่วมกันในครอบครัว</p>
        </div>
        <div className={styles.carousel} aria-roledescription="carousel" aria-label="ตัวอย่างสถานการณ์การใช้งาน AHA"
          onFocusCapture={() => { if (keyboardNavigation.current) { setFocus(true); setPaused(true); } }}
          onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false); }}
          onTouchStart={e => { touchStart.current = [e.changedTouches[0].clientX, e.changedTouches[0].clientY]; }}
          onTouchEnd={e => {
            if (!touchStart.current) return;
            const dx = e.changedTouches[0].clientX - touchStart.current[0];
            const dy = e.changedTouches[0].clientY - touchStart.current[1];
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.35) move(dx < 0 ? 1 : -1);
            touchStart.current = null;
          }}>
          <div ref={root} className={styles.slideStage}>
            {stories.map((story, i) => (
              <div key={story.title} className={i === active ? styles.slideActive : styles.slide} aria-hidden={i !== active} inert={i !== active}>
                <div className={styles.slideText}>
                  <h3>{story.title}</h3>
                  <p>{story.description}</p>
                </div>
                <div className={styles.storyGraphic} data-theme={story.theme}>
                  <div className={styles.graphicRing}><Image src={storyImages[i]} alt={storyAlt[i]} width={780} height={960} loading="eager" sizes="(max-width:630px) 100vw, 45vw"/></div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.slideControls}>
            <span aria-live={canPlay ? 'off' : 'polite'}>{String(active + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}</span>
            <span className={styles.progress} aria-hidden="true"><i ref={progressRef}/></span>
            <div className={styles.controlGroup}>
              <button type="button" onClick={() => move(-1)} aria-label="สไลด์ก่อนหน้า">←</button>
              <button type="button" onClick={toggle} aria-label={enabled ? 'หยุดสไลด์อัตโนมัติ' : 'เล่นสไลด์อัตโนมัติ'} aria-pressed={!enabled}>{enabled ? 'Ⅱ' : '▶'}</button>
              <button type="button" onClick={() => move(1)} aria-label="สไลด์ถัดไป">→</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const botRef = useRef(null);
  const [botAwake, setBotAwake] = useState(false);
  useEffect(() => {
    if (!botRef.current) return undefined;
    if (!('IntersectionObserver' in window)) { setBotAwake(true); return undefined; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setBotAwake(true); observer.disconnect(); }
    }, { threshold: .18 });
    observer.observe(botRef.current);
    return () => observer.disconnect();
  }, []);
  const [activeSection, setActiveSection] = useState('#top');
  useEffect(() => {
    const ids = ['problem', 'features', 'showcase', 'steps', 'pricing'];
    let frame = 0;
    const check = () => {
      frame = 0;
      const header = document.querySelector('header');
      const headerBottom = header?.getBoundingClientRect().bottom || 0;
      const line = Math.min(window.innerHeight - 40, headerBottom + Math.max(110, window.innerHeight * .42));
      let target = '#top';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) target = '#' + id;
      }
      setActiveSection(target);
    };
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('pageshow', queue);
    window.addEventListener('hashchange', queue);
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      window.removeEventListener('pageshow', queue);
      window.removeEventListener('hashchange', queue);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const nav = [['ปัญหาที่อาจพบ', '#problem'], ['AHA ช่วยอย่างไร', '#features'], ['ตัวอย่างการใช้งาน', '#showcase'], ['เริ่มต้นใช้งาน', '#steps'], ['แพ็กเกจฟรี', '#pricing']];
  return (
    <div className={styles.landing} id="top">
      <a className={styles.skip} href="#main">ข้ามไปยังเนื้อหา</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/about" className={styles.brand} aria-label="AHA หน้าแนะนำระบบ"><AhaBrandMark className={styles.brandMark}/><span className={styles.brandText}><strong>AHA</strong><small>AI Health Assistant</small></span></Link>
          <button className={styles.menuButton} type="button" aria-expanded={menuOpen} aria-controls="about-navigation" aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? '✕' : '☰'}</button>
          <nav id="about-navigation" className={menuOpen ? styles.navOpen : styles.nav} aria-label="เมนูหน้าแนะนำ AHA">
            {nav.map(([label, url]) => <a key={url} href={url} aria-current={activeSection === url ? 'location' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}
          </nav>
        </div>
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="heroHeading">
          <div className={styles.heroCopy}>
            <h1 id="heroHeading">ดูแลกันได้<br />แม้ไม่ได้อยู่ข้างกัน</h1>
            <p>AHA ช่วยเตือนการรับประทานยา และเชื่อมการดูแลกันในครอบครัว</p>
            <Link className={styles.primaryButton} href="/login">เริ่มใช้งานฟรี <span aria-hidden="true">↗</span></Link>
          </div>
          <div className={styles.heroImage}><Image src="/landing/v67/hero-original.webp" alt="ผู้สูงอายุที่บ้าน ภาพประกอบการดูแลในชีวิตประจำวัน" width={1120} height={850} priority sizes="(max-width: 900px) 100vw, 55vw"/></div>
        </section>
        <section id="problem" className={styles.section} aria-labelledby="problemHeading">
          <div className={styles.wrap}>
            <div className={styles.sectionLead}><h2 id="problemHeading">เรื่องเล็ก ๆ ที่เราเป็นห่วงกันทุกวัน</h2><p>บางครั้งผู้สูงอายุอาจจำเวลารับประทานยาไม่แน่ใจ ขณะที่ลูกหลานก็มีหน้าที่ของตนเอง แต่ยังคงเป็นห่วงคนที่บ้านเสมอ</p></div>
            <div className={styles.problemGrid}>
              <article className={styles.problem}><div className={styles.problemArt}><Image src="/landing/v67/problem-elderly.webp" alt="ภาพจำลองผู้สูงอายุกำลังทบทวนเวลาในการรับประทานยา" width={800} height={1000} sizes="(max-width:630px) 100vw, 45vw"/></div><h3>“วันนี้กินยาแล้วหรือยังนะ?”</h3><p>การจดจำรายการและเวลาเตือนยาในแต่ละวันอาจเป็นเรื่องที่ต้องคอยใส่ใจ</p></article>
              <article className={styles.problem}><div className={styles.problemArt}><Image src="/landing/v67/problem-caregiver.webp" alt="ภาพจำลองลูกสาวทำงานและเป็นห่วงผู้สูงอายุที่บ้าน" width={800} height={1000} sizes="(max-width:630px) 100vw, 45vw"/></div><h3>“วันนี้แม่กินยาตรงเวลาไหม?”</h3><p>แม้ไม่ได้อยู่ด้วยกันตลอดเวลา คนในครอบครัวก็อยากรับรู้และช่วยดูแลกันได้</p></article>
            </div>
          </div>
        </section>
        <section id="features" className={styles.present} aria-labelledby="presentHeading">
          <div className={styles.wrap}>
            <div className={styles.presentLayout}>
              <div ref={botRef} className={`${styles.presentArt} ${botAwake ? styles.presentArtAwake : ''}`} aria-hidden="true"><span className={styles.presentCircle}><Image src="/landing/v67/mascot-concept.svg" alt="" width={260} height={260}/></span></div>
              <div><h2 id="presentHeading">ให้ AHA ช่วยดูแลเรื่องสำคัญในทุกวัน</h2><p className={styles.lead}>AHA ออกแบบให้ใช้งานง่ายทั้งสำหรับผู้สูงอายุและคนในครอบครัว ช่วยจัดการเวลาเตือนยาและเชื่อมต่อการดูแลกัน</p>
                <ul className={styles.benefits}>{[['แจ้งเตือนการรับประทานยา', 1], ['สร้างรายการเตือนด้วยเสียง', 0], ['เชื่อมต่อบัญชีผู้ดูแล', 2]].map(([label, slide]) => <li key={label}><a href="#showcase" onClick={() => setActiveSlide(slide)}>{label}<span aria-hidden="true">↗</span></a></li>)}</ul>
              </div>
            </div>
          </div>
        </section>
        <Showcase active={activeSlide} setActive={setActiveSlide}/>
        <section id="steps" className={styles.section} aria-labelledby="stepsHeading"><div className={styles.wrap}><div className={styles.sectionLead}><h2 id="stepsHeading">เริ่มใช้งานได้<br/>ใน 3 ขั้นตอน</h2><p>เริ่มจากเรื่องที่จำเป็นก่อน และสามารถเชื่อมต่อผู้ดูแลเพิ่มเติมภายหลังได้</p></div><div className={styles.stepGrid}>{guide.map(([number, title, description]) => <article className={styles.step} key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
        <section id="pricing" className={styles.pricing} aria-labelledby="pricingHeading"><div className={styles.wrap}><div className={styles.pricingGrid}><div><h2 id="pricingHeading">เริ่มต้นดูแลกันได้ฟรี</h2><p>เริ่มใช้งานความสามารถพื้นฐานสำหรับการเตือนยาได้ฟรี และค่อยเลือกเชื่อมบัญชีผู้ดูแลเมื่อต้องการ</p></div><div className={styles.plan}><strong>AHA Free</strong><p className={styles.price}>฿0 <small>/ เริ่มต้นใช้งาน</small></p><p>สร้างรายการเตือนยา ใช้เสียงช่วยตั้งรายการ และเชื่อมต่อผู้ดูแลตามสิทธิ์ที่ระบบรองรับ</p><Link className={styles.primaryButton} href="/login">เริ่มใช้งานฟรี <span aria-hidden="true">↗</span></Link></div></div></div></section>
      </main>
      <footer className={styles.footer}><div className={styles.wrap}><div className={styles.footerGrid}>
        <div><Link href="/about" className={styles.brand} aria-label="AHA หน้าแรก"><AhaBrandMark className={styles.brandMark}/><span className={styles.brandText}><strong>AHA</strong><small>AI Health Assistant</small></span></Link><p>ผู้ช่วยเตือนการรับประทานยาและเชื่อมต่อการดูแลระหว่างผู้สูงอายุกับคนในครอบครัว</p></div>
        <div><strong>สำรวจ AHA</strong><nav aria-label="ลิงก์หน้าแนะนำ">{nav.map(([label,url])=><a key={url} href={url}>{label}</a>)}</nav></div>
        <div><strong>ข้อมูลและนโยบาย</strong><nav aria-label="ลิงก์นโยบาย"><Link href="/privacy-policy">นโยบายความเป็นส่วนตัว</Link><Link href="/terms-of-service">ข้อกำหนดการใช้งาน</Link><Link href="/cookies-policy">นโยบายคุกกี้</Link><Link href="/login">เข้าสู่ระบบ</Link></nav></div>
      </div><div className={styles.legal}>© 2026 AHA. สงวนสิทธิ์ตามกฎหมาย</div></div></footer>
    </div>
  );
}

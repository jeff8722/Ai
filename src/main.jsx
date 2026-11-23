import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Camera, Check, ChevronLeft, ChevronRight, CircleHelp, Columns2, Heart,
  ImageUp, RefreshCw, Ruler, Shuffle, Sun, Timer, X
} from 'lucide-react';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource/libre-barcode-39-text/400.css';
import './styles.css';
import { gsap, ScrollTrigger, SplitText, getLenis, magnetic, reduced, scrollTop } from './motion';
import Admin from './Admin';
import { API, Barcode, Hanger, TYPE_LABEL, TagButton, imageUrl, priceLabel, tone, useObjectUrl } from './ui';
import { FITS, recommendSize } from './size';

const IDLE_MS = 90_000; // quiet time before the "still there?" tag drops
const IDLE_GRACE = 15; // seconds of warning before the session erases itself
const FLOW = { consent: 0, camera: 0, catalog: 1, processing: 2, result: 2 };
const TABS = ['Photo', 'Choose', 'See'];
const DEPARTMENTS = [['all', 'Everything'], ['men', 'Men'], ['women', 'Women'], ['kids', 'Kids'], ['footwear', 'Footwear']];
const HERO = [['Try', 'women', 'one photo'], ['it', 'kids', 'any piece on our rail'], ['on.', 'men', 'no trial room queue']];
const HOW = [
  ['Take one photo', 'Stand back so your whole body fits, or upload a full-length photo.'],
  ['Choose from the rail', 'Try a single piece or a saree, or put a top and bottoms together as an outfit.'],
  ['See it on you', 'Your look appears after a short wait. Keep the ones you like, find your size, and show the tag to our staff.']
];

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const lookName = look => look.items.map(i => i.name).join(' + ');
let lookSeq = 0;

function App() {
  const [step, setStep] = useState('welcome');
  const [catalog, setCatalog] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [health, setHealth] = useState({ mode: 'checking', admin_locked: false });
  const [department, setDepartment] = useState('all');
  const [category, setCategory] = useState('all');
  const [mode, setMode] = useState('single');
  const [selected, setSelected] = useState(null);
  const [top, setTop] = useState(null);
  const [bottom, setBottom] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [consent, setConsent] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [light, setLight] = useState(null);
  const [sharper, setSharper] = useState(false);
  const [busy, setBusy] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [looks, setLooks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [compareId, setCompareId] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [idleLeft, setIdleLeft] = useState(null);
  const [pin, setPin] = useState('');
  const [body, setBody] = useState(null); // height/weight for the size guide, kept only in memory
  const [sizeOpen, setSizeOpen] = useState(false);

  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const abortRef = useRef(null);
  const lastActive = useRef(Date.now());
  const stepRef = useRef(step);
  const looksRef = useRef(looks);
  stepRef.current = step;
  looksRef.current = looks;

  const photoUrl = useObjectUrl(photo);
  const active = looks.find(l => l.id === activeId) || null;
  const compare = looks.find(l => l.id === compareId) || null;
  const tryable = catalog.filter(i => i.tryon_category);

  const categories = useMemo(() => {
    const seen = new Map();
    catalog
      .filter(i => department === 'all' || i.department === department)
      .forEach(i => {
        const key = i.category.trim().toLowerCase();
        if (!seen.has(key)) seen.set(key, cap(i.category.trim()));
      });
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [catalog, department]);

  const visible = catalog.filter(i =>
    (department === 'all' || i.department === department) &&
    (category === 'all' || i.category.trim().toLowerCase() === category)
  );

  /* ---------- data ---------- */

  const loadCatalog = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/products`);
      if (!response.ok) throw new Error();
      const items = await response.json();
      setCatalog(items);
      const keep = (cur, ok) => items.find(i => i.id === cur?.id && ok(i)) || items.find(ok) || null;
      setSelected(cur => keep(cur, i => i.tryon_category));
      setTop(cur => keep(cur, i => i.tryon_category === 'tops'));
      setBottom(cur => keep(cur, i => i.tryon_category === 'bottoms'));
    } catch {
      setError('The catalogue did not load. Check that the fitting computer (backend) is running.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Health is polled so a backend started after the app still turns the status live.
  useEffect(() => {
    const check = () => fetch(`${API}/api/health`).then(r => r.json()).then(setHealth)
      .catch(() => setHealth(h => ({ ...h, mode: 'offline' })));
    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!catalog.length && loaded && !['offline', 'checking'].includes(health.mode)) loadCatalog();
  }, [health.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- session ---------- */

  const reset = useCallback(() => {
    abortRef.current?.abort();
    looksRef.current.forEach(l => URL.revokeObjectURL(l.url));
    setLooks([]);
    setActiveId(null);
    setCompareId(null);
    setComparing(false);
    setPhoto(null);
    setConsent(false);
    setIdleLeft(null);
    setPin('');
    setBody(null);
    setSizeOpen(false);
    setHelpOpen(false);
    setError('');
    setStep('welcome');
  }, []);

  // A device passed between strangers: after a quiet spell, warn, then erase the session.
  useEffect(() => {
    const poke = () => { lastActive.current = Date.now(); setIdleLeft(null); };
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
    events.forEach(e => window.addEventListener(e, poke, { passive: true }));
    const id = setInterval(() => {
      if (stepRef.current === 'welcome' || stepRef.current === 'processing') return;
      const left = IDLE_GRACE - Math.floor((Date.now() - lastActive.current - IDLE_MS) / 1000);
      if (left <= 0) reset();
      else if (left <= IDLE_GRACE) setIdleLeft(left);
    }, 1000);
    return () => {
      events.forEach(e => window.removeEventListener(e, poke));
      clearInterval(id);
    };
  }, [reset]);

  useEffect(() => { lastActive.current = Date.now(); }, [step]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(''), 12000);
    return () => clearTimeout(id);
  }, [error]);

  /* ---------- camera ---------- */

  useEffect(() => {
    if (step !== 'camera') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot open the camera here. Upload a full-length photo instead.');
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false })
      .then(async stream => {
        if (cancelled) return stream.getTracks().forEach(t => t.stop());
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraReady(true);
        setError('');
      })
      .catch(() => setError('The camera is not available. Allow camera access in the browser, or upload a full-length photo instead.'));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraReady(false);
      setCountdown(null);
      setLight(null);
    };
  }, [step]);

  // Light check: average brightness of a tiny copy of the frame.
  useEffect(() => {
    if (!cameraReady) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const id = setInterval(() => {
      const video = videoRef.current;
      if (!video?.videoWidth) return;
      ctx.drawImage(video, 0, 0, 32, 32);
      const d = ctx.getImageData(0, 0, 32, 32).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
      const mean = sum / (d.length / 4);
      // ponytail: fixed thresholds on mean luma; a histogram check would catch backlighting better.
      setLight(mean < 60 ? 'dark' : mean > 210 ? 'bright' : 'good');
    }, 700);
    return () => clearInterval(id);
  }, [cameraReady]);

  function snap() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => blob && acceptPhoto(new File([blob], 'customer-photo.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92);
  }

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      snap();
      return;
    }
    const id = setTimeout(() => setCountdown(n => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  function acceptPhoto(file) {
    setPhoto(file);
    setStep('catalog');
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('That file is not a photo. Choose a JPG, PNG or WEBP image.');
    acceptPhoto(file);
  }

  /* ---------- try-on ---------- */

  async function requestTryOn(person, item, seed, signal) {
    const body = new FormData();
    body.append('person_image', person);
    body.append('product_id', item.id); // the backend reads the garment from its own disk
    body.append('category', item.tryon_category);
    body.append('seed', String(seed));
    if (sharper) body.append('steps', '30');
    const response = await fetch(`${API}/api/try-on`, { method: 'POST', body, signal });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.detail || `The preview of ${item.name} did not finish. Try again.`);
    }
    return response.blob();
  }

  async function fit(items, seed = 42) {
    if (!photo || !items.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError('');
    setElapsed(0);
    setStep('processing');
    try {
      // One garment per pass: an outfit applies the top, then the bottoms over that result.
      let person = photo;
      let blob;
      for (const [i, item] of items.entries()) {
        setBusy({ item, pass: i + 1, total: items.length });
        blob = await requestTryOn(person, item, seed, controller.signal);
        person = new File([blob], `vestiq-pass-${i + 1}.png`, { type: 'image/png' });
      }
      const look = { id: `look-${++lookSeq}`, url: URL.createObjectURL(blob), items, kept: false };
      setLooks(ls => [...ls, look]);
      setActiveId(look.id);
      setCompareId(null);
      setComparing(false);
      setStep('result');
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Something went wrong. Try again.');
      if (stepRef.current === 'processing') setStep('catalog');
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  }

  useEffect(() => {
    if (step !== 'processing') return;
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [step]);

  function choose(item) {
    if (mode === 'single') return setSelected(item);
    if (item.tryon_category === 'tops') setTop(item);
    else if (item.tryon_category === 'bottoms') setBottom(item);
    else setError(item.tryon_category ? 'Full-length pieces are tried on alone. Switch to “One piece” to try this.' : 'Footwear can’t be tried on yet.');
  }

  function cycle(dir) {
    const list = visible.filter(i => i.tryon_category);
    if (!list.length) return;
    const index = list.findIndex(i => i.id === selected?.id);
    const next = list[(index + dir + list.length) % list.length];
    setSelected(next);
    requestAnimationFrame(() => {
      const el = document.getElementById(`p-${next.id}`);
      if (!el) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(el, { offset: -160 });
      else el.scrollIntoView({ block: 'center' });
    });
  }

  function startWith(item) {
    setMode('single');
    setSelected(item);
    setStep('consent');
  }

  function toggleKeep(id) {
    setLooks(ls => ls.map(l => (l.id === id ? { ...l, kept: !l.kept } : l)));
  }

  function pickLook(id) {
    if (comparing && id !== activeId) setCompareId(id);
    else setActiveId(id);
  }

  function toggleCompare() {
    if (comparing) return setComparing(false);
    setComparing(true);
    setCompareId(looks.filter(l => l.id !== activeId).at(-1)?.id || null);
  }

  /* ---------- motion ---------- */

  useEffect(() => {
    document.documentElement.classList.toggle('motion', !reduced());
    getLenis();
    return magnetic();
  }, []);

  // Tags sway with scroll speed and swing when touched. One quickTo per tag, shared by both.
  useEffect(() => {
    if (reduced()) return;
    const swings = new WeakMap();
    const swing = (el, r) => {
      if (!swings.has(el)) swings.set(el, gsap.quickTo(el, 'rotation', { duration: 1.4, ease: 'elastic.out(1, 0.3)' }));
      swings.get(el)(r);
    };
    let settle;
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: s => {
        const r = gsap.utils.clamp(-6, 6, -s.getVelocity() / 350);
        const els = document.querySelectorAll('.swing');
        els.forEach((el, i) => swing(el, r * (0.75 + (i % 3) * 0.12)));
        clearTimeout(settle);
        settle = setTimeout(() => els.forEach(el => swing(el, 0)), 140);
      }
    });
    let last = null;
    const over = e => {
      const el = e.target.closest?.('.swing') ?? null;
      if (el === last) return;
      last = el;
      if (!el) return;
      swing(el, e.movementX < 0 ? -5 : 5);
      setTimeout(() => swing(el, 0), 120);
    };
    document.addEventListener('pointerover', over);
    return () => {
      trigger.kill();
      clearTimeout(settle);
      document.removeEventListener('pointerover', over);
    };
  }, []);

  // Every step: headings set letter by letter; tags on threads drop and settle.
  useLayoutEffect(() => {
    scrollTop();
    if (reduced()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-split]').forEach(el => {
        const split = SplitText.create(el, { type: 'words,chars', mask: 'chars' });
        gsap.from(split.chars, { yPercent: 115, duration: 0.9, ease: 'expo.out', stagger: 0.016, delay: 0.08 });
      });
      gsap.utils.toArray('.solo').forEach(el =>
        gsap.from(el, { yPercent: -14, rotation: 6, transformOrigin: '50% 0', duration: 1.5, ease: 'elastic.out(1, 0.42)' })
      );
      if (step === 'result') {
        gsap.fromTo('.ba, .compare', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' });
        // the original photo peeks once, so the slider announces itself
        gsap.timeline({ delay: 1.2 })
          .to('.ba', { '--pos': '34%', duration: 0.9, ease: 'power3.inOut' })
          .to('.ba', { '--pos': '0%', duration: 0.9, ease: 'power3.inOut' }, '+=0.35');
      }
    }, rootRef);
    return () => ctx.revert();
  }, [step]);

  // Welcome: one orchestrated entrance, then scroll scenes.
  useLayoutEffect(() => {
    if (step !== 'welcome' || !loaded || reduced()) return;
    const root = rootRef.current;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from('.shopfront > .rail', { scaleX: 0, transformOrigin: '0 50%', duration: 0.9 })
        .from('.hero-hang', { yPercent: -125, rotation: i => [-16, 12, -9][i], transformOrigin: '50% 0', duration: 1.7, ease: 'elastic.out(1, 0.38)', stagger: 0.14 }, 0.25)
        .from('.window-rail .hanger', { x: 140, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.5)
        .from('.hero-copy > *', { y: 26, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.85);

      gsap.utils.toArray('[data-reveal]').forEach(el => {
        const split = SplitText.create(el, { type: 'words,chars', mask: 'chars' });
        gsap.from(split.chars, { yPercent: 115, stagger: 0.014, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      });

      gsap.timeline({ scrollTrigger: { trigger: '.how-line', start: 'top 80%', end: 'center 50%', scrub: 0.6 } })
        .from('.how .rail', { scaleX: 0, transformOrigin: '0 50%', ease: 'none' })
        .from('.step-hang', { yPercent: -50, opacity: 0, rotation: -14, transformOrigin: '50% 0', stagger: 0.25, ease: 'power2.out' }, 0.1);

      const band = SplitText.create('.band-big', { type: 'words' });
      gsap.fromTo(band.words, { opacity: 0.16 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.woven-band', start: 'top 70%', end: 'center 45%', scrub: true } });

      const track = root.querySelector('.rail-track');
      const viewport = root.querySelector('.rail-viewport');
      const distance = () => track.scrollWidth - viewport.clientWidth;
      if (track && distance() > 40) {
        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: { trigger: '.rail-section', start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true }
        });
      }
    }, rootRef);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [step, loaded, catalog.length]);

  /* ---------- view ---------- */

  const inFlow = step in FLOW;
  const outfitPrice = (top ? Number(top.price) || 0 : 0) + (bottom ? Number(bottom.price) || 0 : 0);
  const isOn = item => (mode === 'single' ? selected?.id === item.id : top?.id === item.id || bottom?.id === item.id);
  const canTry = mode === 'single' ? !!selected?.tryon_category : !!(top && bottom);

  return (
    <div className="app" ref={rootRef}>
      <header className="fascia">
        <span className="wordmark">Vestiq</span>
        {inFlow && (
          <ol className="size-tabs" style={{ '--i': FLOW[step] }} aria-label="Progress">
            {TABS.map((label, i) => (
              <li key={label} aria-current={FLOW[step] === i ? 'step' : undefined}>
                <b>{i + 1}</b>{label}
              </li>
            ))}
          </ol>
        )}
        <div className="fascia-right">
          {health.mode === 'local-ai-ready' && (
            <span className="status live" role="status"><i aria-hidden="true" /><span>Fitting ready</span></span>
          )}
          <button className="fascia-btn" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={18} aria-hidden="true" /><span>Help</span>
          </button>
          <button className="fascia-btn" onClick={() => setStep('admin')}>Staff</button>
        </div>
      </header>

      <main>
        {step === 'welcome' && (
          <div className="welcome">
            <section className="shopfront">
              <div className="rail" aria-hidden="true" />
              <h1 className="hero-tags" aria-label="Try it on.">
                {HERO.map(([word, stock, note], i) => (
                  <span key={word} className={`hang hero-hang h${i}`} aria-hidden="true">
                    <span className="swing">
                      <span className="string" />
                      <span className={`tag tone-${stock}`}>
                        <span className="eyelet" />
                        <span className="tag-word">{word}</span>
                        <span className="tag-note">{note}</span>
                      </span>
                    </span>
                  </span>
                ))}
              </h1>
              {/* a two-tier rack: the top tier hangs off the shop rail, the lower tier has its own */}
              <div className="window-rail" aria-hidden="true">
                <div className="tier">
                  {tryable.slice(0, 2).map(item => <Hanger key={item.id} src={imageUrl(item.image)} alt="" />)}
                </div>
                {tryable.length > 2 && (
                  <div className="tier lower">
                    <div className="rail" />
                    {tryable.slice(2, 4).map(item => <Hanger key={item.id} src={imageUrl(item.image)} alt="" />)}
                  </div>
                )}
              </div>
              <div className="hero-copy">
                <p className="lead">See our clothes on you before you queue for a trial room. Take one photo, then try anything on the rail.</p>
                <TagButton label="Start fitting" icon={<ChevronRight size={20} aria-hidden="true" />} onClick={() => setStep('consent')} />
                {['local-ai-ready', 'checking'].includes(health.mode) ? (
                  <p className="fine">Takes a few minutes. Your photo is erased when you finish.</p>
                ) : (
                  <p className="notice" role="status">Try-on isn’t switched on right now. Please ask our staff before you start.</p>
                )}
              </div>
            </section>

            <section className="how" aria-labelledby="how-title">
              <h2 id="how-title" className="display" data-reveal>One photo, then the whole rail</h2>
              <div className="how-line">
                <div className="rail" aria-hidden="true" />
                <ol className="how-tags">
                  {HOW.map(([title, text], i) => (
                    <li key={title} className="step-hang">
                      <div className="swing">
                        <span className="string" />
                        <div className={`tag tone-${HERO[i][1]}`}>
                          <span className="eyelet" />
                          <span className="step-no" aria-hidden="true">{i + 1}</span>
                          <h3>{title}</h3>
                          <p>{text}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section className="rail-section" aria-labelledby="rail-title">
              <div className="rail-head">
                <h2 id="rail-title" className="display" data-reveal>On the rail today</h2>
                <p className="lead">
                  {tryable.length
                    ? `${tryable.length} pieces you can try on now. Tap one to start with it.`
                    : 'The rail is empty right now. Ask our staff to add today’s stock.'}
                </p>
              </div>
              {tryable.length > 0 && (
                <div className="rail-viewport">
                  <ul className="rail-track">
                    {tryable.map(item => (
                      <li key={item.id}>
                        <button className="rail-item" onClick={() => startWith(item)}>
                          <Hanger src={imageUrl(item.image)} alt="" />
                          <span className="swing">
                            <span className="string" />
                            <span className={`tag mini-tag tone-${tone(item.department)}`}>
                              <span className="eyelet" />
                              <b>{item.name}</b>
                              <small>{priceLabel(item.price)}</small>
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="woven-band">
              <p className="band-big">Your photo stays in this shop.</p>
              <p className="band-small">
                Previews are made on this shop’s own computer, not on the internet. Your photo is erased from this
                device when you finish, or after about two minutes without use.
              </p>
            </section>

            <section className="close">
              <h2 className="display" data-reveal>Ready when you are.</h2>
              <TagButton label="Start fitting" icon={<ChevronRight size={20} aria-hidden="true" />} onClick={() => setStep('consent')} />
            </section>
          </div>
        )}

        {step === 'consent' && (
          <section className="stage consent">
            <div className="hang solo">
              <div className="swing">
                <span className="string" />
                <div className="tag tone-paper consent-tag">
                  <span className="eyelet" />
                  <h2 className="display" data-split>Before we take your photo</h2>
                  <p>We take one photo to make your previews. It stays on this shop’s computer and is erased when you finish.</p>
                  <label className="check">
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                    <span>I agree to having my photo taken and used for this try-on session.</span>
                  </label>
                  <TagButton label="Continue to camera" icon={<ChevronRight size={20} aria-hidden="true" />} disabled={!consent} onClick={() => setStep('camera')} />
                  <button className="text-btn" onClick={reset}>Cancel</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 'camera' && (
          <section className="stage camera">
            <div className="camera-copy">
              <h2 className="display" data-split>Step back. Fit all of you in the frame.</h2>
              <ul className="tips">
                <li><Check size={18} aria-hidden="true" /> Face the camera with your arms slightly away from your body</li>
                <li><Check size={18} aria-hidden="true" /> Feet in the frame, a little space above your head</li>
                <li><Check size={18} aria-hidden="true" /> Even light from the front works best</li>
              </ul>
              <p className={`light light-${light || 'wait'}`} role="status">
                <Sun size={18} aria-hidden="true" />
                {light === 'good' ? 'Light looks good' : light === 'dark' ? 'Too dark. Move nearer a light.' : light === 'bright' ? 'Very bright. Turn away from windows.' : 'Checking the light…'}
              </p>
              <div className="camera-actions">
                <TagButton label="Take photo in 3 s" icon={<Timer size={20} aria-hidden="true" />} disabled={!cameraReady || countdown !== null} onClick={() => setCountdown(3)} />
                <button className="ghost-btn" disabled={!cameraReady || countdown !== null} onClick={snap}>
                  <Camera size={18} aria-hidden="true" /> Take it now
                </button>
              </div>
              <button className="text-btn" onClick={() => fileRef.current?.click()}>
                <ImageUp size={18} aria-hidden="true" /> Upload a full-length photo instead
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadPhoto} />
            </div>

            <div className="lens">
              <video ref={videoRef} muted playsInline />
              {!cameraReady && <p className="lens-wait">Waiting for the camera…</p>}
              <div className="lens-guide" aria-hidden="true">
                <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
                <span className="silhouette" />
              </div>
              {countdown > 0 && <span key={countdown} className="countdown" aria-live="assertive">{countdown}</span>}
              <div className="lens-foot"><span><i aria-hidden="true" /> Live camera</span><span>Full length</span></div>
            </div>
          </section>
        )}

        {step === 'catalog' && (
          <section className="stage rack">
            <header className="rack-head">
              <div>
                <h2 className="display" data-split>Pick something to try</h2>
                <div className="mode-switch" role="group" aria-label="What to try">
                  <button aria-pressed={mode === 'single'} onClick={() => setMode('single')}>One piece</button>
                  <button aria-pressed={mode === 'outfit'} onClick={() => setMode('outfit')}>Full outfit</button>
                </div>
                <div className="filters">
                  <div className="dept-tabs" role="group" aria-label="Department">
                    {DEPARTMENTS.map(([id, label]) => (
                      <button key={id} className={`dept tone-${id === 'all' ? 'weave' : tone(id)}`} aria-pressed={department === id}
                        onClick={() => { setDepartment(id); setCategory('all'); }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {categories.length > 1 && (
                    <div className="cat-chips" role="group" aria-label="Category">
                      <button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All</button>
                      {categories.map(([key, label]) => (
                        <button key={key} aria-pressed={category === key} onClick={() => setCategory(key)}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <figure className="hang you-tag">
                <div className="swing">
                  <span className="string" />
                  <div className="tag tone-paper">
                    <span className="eyelet" />
                    {photoUrl && <img src={photoUrl} alt="Your photo" />}
                    <button className="text-btn" onClick={() => setStep('camera')}>Retake</button>
                  </div>
                </div>
              </figure>
            </header>

            {mode === 'outfit' && (
              <div className="hooks">
                {[['Top', top, 'a top'], ['Bottoms', bottom, 'bottoms']].map(([label, item, ask]) => (
                  <div key={label} className={`hook ${item ? 'filled' : ''}`}>
                    <span className="hook-label">{label}</span>
                    {item ? <><img src={imageUrl(item.image)} alt="" /><b>{item.name}</b></> : <em>Pick {ask} below</em>}
                  </div>
                ))}
              </div>
            )}

            {catalog.length === 0 ? (
              <div className="empty">
                <h3>The rail is empty</h3>
                <p>Ask our staff to add products, or check that the fitting computer is running.</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="empty"><h3>Nothing here yet</h3><p>Try another department.</p></div>
            ) : (
              <ul className="tag-grid">
                {visible.map(item => {
                  const on = isOn(item);
                  return (
                    <li key={item.id} id={`p-${item.id}`} className={`product ${on ? 'on' : ''}`}>
                      <div className="swing">
                        <span className="string" />
                        <button className={`tag product-tag tone-${tone(item.department)}`} aria-pressed={on} onClick={() => choose(item)}>
                          <span className="eyelet" />
                          <span className="stub">{TYPE_LABEL[item.tryon_category] || 'Display only'}</span>
                          <span className="product-img"><img src={imageUrl(item.image)} alt="" loading="lazy" /></span>
                          <span className="product-name">{item.name}</span>
                          <span className="product-meta">{cap(item.category.trim())}, {item.color?.toLowerCase()}</span>
                          <span className="product-price"><b>{priceLabel(item.price)}</b><small>{item.id}</small></span>
                          {on && (
                            <span className="picked">
                              <Check size={14} aria-hidden="true" />
                              {mode === 'outfit' ? TYPE_LABEL[item.tryon_category] : 'Picked'}
                            </span>
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="rack-bar">
              <button className="text-btn on-dark bar-retake" onClick={() => setStep('camera')}>
                <ChevronLeft size={18} aria-hidden="true" /> Retake photo
              </button>
              {mode === 'single' ? (
                <div className="cycle">
                  <button className="round-btn" onClick={() => cycle(-1)} aria-label="Previous piece" disabled={visible.filter(i => i.tryon_category).length < 2}>
                    <ChevronLeft size={20} />
                  </button>
                  <span className="bar-pick">
                    {selected?.tryon_category ? <>{selected.name}<small>{priceLabel(selected.price)}</small></> : selected ? 'Footwear can’t be tried on yet' : 'Pick a piece'}
                  </span>
                  <button className="round-btn" onClick={() => cycle(1)} aria-label="Next piece" disabled={visible.filter(i => i.tryon_category).length < 2}>
                    <ChevronRight size={20} />
                  </button>
                </div>
              ) : (
                <span className="bar-pick">
                  {top && bottom ? <>{top.name} + {bottom.name}<small>{priceLabel(outfitPrice)}</small></> : 'Pick a top and bottoms'}
                </span>
              )}
              <label className="switch">
                <input type="checkbox" checked={sharper} onChange={e => setSharper(e.target.checked)} />
                <span>Sharper <span className="switch-more">result </span>(slower)</span>
              </label>
              <TagButton
                label={mode === 'single' ? 'Try it on' : 'Try the outfit'}
                disabled={!canTry}
                onClick={() => fit(mode === 'single' ? [selected] : [top, bottom])}
              />
            </div>
          </section>
        )}

        {step === 'processing' && (
          <section className="stage fitting">
            <div className="hang solo fitting-photo">
              <div className="swing">
                <span className="string" />
                <div className="tag tone-paper">
                  <span className="eyelet" />
                  {photoUrl && <img src={photoUrl} alt="Your photo" />}
                  <span className="stitch-run" aria-hidden="true" />
                </div>
              </div>
            </div>
            <div className="fitting-copy">
              <h2 className="display" aria-live="polite">
                {busy?.total > 1 ? `Fitting piece ${busy.pass} of ${busy.total}` : 'Fitting your look'}
              </h2>
              <p className="fitting-item">{busy?.item.name}</p>
              <div className="stitch-progress" role="progressbar" aria-label="Making your preview" />
              <p className="muted">
                {elapsed < 60 ? `${elapsed} s` : `${Math.floor(elapsed / 60)} min ${elapsed % 60} s`} so far. The first
                try of the day takes longer while the fitting computer warms up.
              </p>
              <button className="ghost-btn" onClick={() => abortRef.current?.abort()}>
                <ChevronLeft size={18} aria-hidden="true" /> Stop and go back
              </button>
            </div>
          </section>
        )}

        {step === 'result' && active && (
          <section className="stage result">
            <div className="result-stage">
              {comparing && compare ? (
                <div className="compare">
                  {[active, compare].map(look => (
                    <figure key={look.id}>
                      <img src={look.url} alt={`You wearing ${lookName(look)}`} />
                      <figcaption>{lookName(look)}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <BeforeAfter before={photoUrl} after={active.url} label={lookName(active)} />
              )}
            </div>

            <aside className="hang solo look">
              <div className="swing">
                <span className="string" />
                <div className="tag tone-paper look-tag perf-bottom">
                  <span className="eyelet" />
                  <h2 className="display" data-split>That’s you.</h2>
                  <ul className="look-items">
                    {active.items.map(item => {
                      const size = body && recommendSize(item, body);
                      return (
                        <li key={item.id} className={`tone-${tone(item.department)}`}>
                          <span className="dot" aria-hidden="true" />
                          <div>
                            <b>{item.name}</b>
                            <small>{TYPE_LABEL[item.tryon_category]}. {priceLabel(item.price)}</small>
                            {size && <span className="size-pill">Your size: {size}</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {sizeOpen && (
                    <SizeFinder body={body} onSave={b => { setBody(b); setSizeOpen(false); }} onClose={() => setSizeOpen(false)} />
                  )}
                  <div className="look-actions">
                    <TagButton label="Try something else" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={() => setStep('catalog')} />
                    <button className="ghost-btn" onClick={() => fit(active.items, Math.floor(Math.random() * 1e9))}>
                      <Shuffle size={18} aria-hidden="true" /> New variation
                    </button>
                    <button className="ghost-btn" aria-pressed={active.kept} onClick={() => toggleKeep(active.id)}>
                      <Heart size={18} aria-hidden="true" fill={active.kept ? 'currentColor' : 'none'} />
                      {active.kept ? 'Kept' : 'Keep this look'}
                    </button>
                    {!sizeOpen && (
                      <button className="ghost-btn" onClick={() => setSizeOpen(true)}>
                        <Ruler size={18} aria-hidden="true" /> {body ? 'Change my size details' : 'Find my size'}
                      </button>
                    )}
                  </div>
                  <button className="text-btn" onClick={reset}>Finish and erase my photo</button>
                </div>
                <div className="tear">
                  <p className="tear-label">Show this stub to our staff. They’ll bring your size to try.</p>
                  {active.items.map(item => {
                    const size = body && recommendSize(item, body);
                    return (
                      <div key={item.id} className="tear-code">
                        <Barcode code={item.id} />
                        <span className="tear-name">{item.name}</span>
                        {size && <b className="tear-size">Size: {size}</b>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            <p className="disclaimer">AI preview. Real fabric, drape, colour and fit can differ, so try your size before you buy.</p>

            {looks.length > 1 && (
              <div className="session">
                <div className="session-head">
                  <h3>Your looks <span className="count">{looks.length}</span></h3>
                  <button className="ghost-btn" aria-pressed={comparing} onClick={toggleCompare}>
                    <Columns2 size={18} aria-hidden="true" /> {comparing ? 'Stop comparing' : 'Compare two'}
                  </button>
                </div>
                {comparing && <p className="fine">Tap another look to see it beside this one.</p>}
                <ul className="session-row">
                  {looks.map(look => (
                    <li key={look.id} className={`look-hang ${look.id === activeId ? 'on' : ''} ${comparing && look.id === compareId ? 'vs' : ''}`}>
                      <div className="swing">
                        <span className="string" />
                        <button className="tag tone-paper session-tag" aria-pressed={look.id === activeId} onClick={() => pickLook(look.id)}>
                          <span className="eyelet" />
                          <img src={look.url} alt="" />
                          <span>{lookName(look)}</span>
                          {look.kept && <Heart className="kept" size={16} fill="currentColor" aria-label="Kept" />}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {step === 'admin' && (
          <Admin catalog={catalog} reload={loadCatalog} health={health} pin={pin} setPin={setPin} onExit={() => setStep('welcome')} />
        )}
      </main>

      <footer className="foot">
        <span>Vestiq virtual fitting room</span>
        <span>AI previews made in store. Ask our staff for sizes.</span>
      </footer>

      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss"><X size={18} /></button>
        </div>
      )}

      {helpOpen && <Help onClose={() => setHelpOpen(false)} />}

      {idleLeft !== null && (
        <div className="sheet-backdrop idle" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
          <div className="hang solo">
            <div className="swing">
              <span className="string" />
              <div className="tag tone-kids idle-tag">
                <span className="eyelet" />
                <h2 id="idle-title" className="display">Still trying things on?</h2>
                <p>This session ends in <b className="idle-count">{idleLeft}</b> seconds and your photo will be erased.</p>
                <TagButton label="I’m still here" autoFocus onClick={() => { lastActive.current = Date.now(); setIdleLeft(null); }} />
                <button className="text-btn" onClick={reset}>End session now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BeforeAfter({ before, after, label }) {
  const [pos, setPos] = useState(0);
  return (
    <div className="ba" style={{ '--pos': `${pos}%` }}>
      <img src={after} alt={`You wearing ${label}`} />
      <div className="ba-before"><img src={before} alt="Your original photo" /></div>
      <span className="ba-handle" aria-hidden="true"><span><ChevronLeft size={16} /><ChevronRight size={16} /></span></span>
      <input type="range" min="0" max="100" value={pos} onChange={e => setPos(Number(e.target.value))}
        aria-label="Drag to compare with your original photo" data-lenis-prevent />
      <span className="ba-chip before-chip" aria-hidden="true">Your photo</span>
      <span className="ba-chip after-chip" aria-hidden="true">Preview</span>
    </div>
  );
}

function SizeFinder({ body, onSave, onClose }) {
  const [ft, setFt] = useState(body?.ft ?? '');
  const [inch, setInch] = useState(body?.inch ?? '');
  const [weight, setWeight] = useState(body?.weight ?? '');
  const [fit, setFit] = useState(body?.fit ?? 'regular');
  function submit(event) {
    event.preventDefault();
    const height = Number(ft) * 30.48 + (Number(inch) || 0) * 2.54;
    onSave({ ft, inch, weight: Number(weight), height, fit });
  }
  return (
    <form className="size-finder" onSubmit={submit}>
      <h3>Find my size</h3>
      <div className="size-fields">
        <label className="field">
          <span>Height (ft)</span>
          <input type="number" inputMode="numeric" min="2" max="7" required autoFocus value={ft} onChange={e => setFt(e.target.value)} placeholder="5" />
        </label>
        <label className="field">
          <span>(in)</span>
          <input type="number" inputMode="numeric" min="0" max="11" value={inch} onChange={e => setInch(e.target.value)} placeholder="6" />
        </label>
        <label className="field">
          <span>Weight (kg)</span>
          <input type="number" inputMode="numeric" min="10" max="250" required value={weight} onChange={e => setWeight(e.target.value)} placeholder="60" />
        </label>
      </div>
      <div className="mode-switch" role="group" aria-label="How you like clothes to fit">
        {FITS.map(f => (
          <button key={f} type="button" aria-pressed={fit === f} onClick={() => setFit(f)}>{cap(f)}</button>
        ))}
      </div>
      <div className="look-actions">
        <TagButton label="Show my size" type="submit" />
        <button type="button" className="text-btn" onClick={onClose}>Not now</button>
      </div>
      <p className="fine">A guide from your height and weight. It stays on this device and is erased with your photo.</p>
    </form>
  );
}

function Help({ onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const key = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside className="care-label" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()} data-lenis-prevent>
        <button ref={closeRef} className="sheet-close" onClick={onClose} aria-label="Close help"><X size={20} /></button>
        <h2 id="help-title" className="display">How it works</h2>
        <ol className="care-steps">
          <li><b>Take one photo.</b> Stand back so your whole body fits, facing the camera. You can upload a full-length photo instead.</li>
          <li><b>Pick from the rail.</b> Try one piece, or choose “Full outfit” to put a top and bottoms together.</li>
          <li><b>See it on you.</b> Drag across the picture to compare with your photo. Keep the looks you like and show their codes to our staff.</li>
        </ol>
        <h3>Good to know</h3>
        <ul className="care-notes">
          <li>Previews are made by AI. Fabric, drape, colour and fit can differ from the real garment.</li>
          <li>Footwear can’t be tried on yet.</li>
          <li>Sarees are tried on whole, as one piece. The AI’s drape is close but not exact, so ask our staff to drape the real one.</li>
          <li>“Find my size” guesses from your height and weight. Sizes vary by brand, so our staff will check before you buy.</li>
          <li>Your photo stays on this shop’s computer and is erased when you finish, or after about two minutes without use.</li>
        </ul>
      </aside>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

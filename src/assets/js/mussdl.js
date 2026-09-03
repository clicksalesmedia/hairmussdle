/* =============================================================================
   Mussdl — theme behavior layer (Salla Twilight)
   -----------------------------------------------------------------------------
   Only presentation lives here. Cart, checkout, product options and pricing are
   Salla's (web components + salla.* SDK injected by the platform).

     1. chrome  — offer bar, mobile drawer, ambient hair-strand background
     2. motion  — reveals, parallax, counters, tilt (WAAPI, no dependencies)
     3. modules — hero scrub video, before/after slider, gallery thumbs, marquee

   Every animated element is visible by default and only hidden once JS has
   confirmed it can bring it back, so a script failure degrades to a complete
   static page.
   ========================================================================== */
(function () {
  'use strict';

  const html = (strings, ...values) => strings.reduce((out, str, i) => out + str + (values[i] ?? ''), '');
  const SPRING = 'cubic-bezier(.16,1,.3,1)';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===========================================================================
     1. CHROME
     ======================================================================== */

  function mountHairBackground() {
    if (document.querySelector('.hair-bg')) return;
    const layer = document.createElement('div');
    layer.className = 'hair-bg';
    layer.setAttribute('aria-hidden', 'true');
    const strands = [
      { d: 'M-100,120 C 320,-40 700,300 1100,120 S 1700,-20 2100,180', o: 0.42, w: 1.5, delay: 0.0 },
      { d: 'M-100,300 C 380,120 640,520 1080,340 S 1720,180 2100,400', o: 0.32, w: 1.2, delay: 0.35 },
      { d: 'M-100,520 C 300,340 760,760 1160,540 S 1740,400 2100,600', o: 0.26, w: 1.8, delay: 0.7 },
      { d: 'M-100,740 C 420,560 700,980 1120,760 S 1680,620 2100,820', o: 0.22, w: 1.1, delay: 1.0 },
      { d: 'M-100,940 C 340,780 780,1180 1180,960 S 1760,840 2100,1020', o: 0.18, w: 1.6, delay: 1.3 },
      { d: 'M-100,1140 C 400,980 660,1360 1100,1180 S 1720,1060 2100,1240', o: 0.15, w: 1.3, delay: 1.6 }
    ];
    layer.innerHTML = html`
      <svg viewBox="0 0 2000 1300" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hairStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#bfa354" stop-opacity="0"/><stop offset="28%" stop-color="#bfa354" stop-opacity="1"/>
            <stop offset="68%" stop-color="#4e4f3e" stop-opacity=".75"/><stop offset="100%" stop-color="#4e4f3e" stop-opacity="0"/>
          </linearGradient>
          <radialGradient id="washGold"><stop offset="0%" stop-color="#f6efd8" stop-opacity=".55"/><stop offset="100%" stop-color="#f6efd8" stop-opacity="0"/></radialGradient>
          <radialGradient id="washOlive"><stop offset="0%" stop-color="#4e4f3e" stop-opacity=".22"/><stop offset="100%" stop-color="#4e4f3e" stop-opacity="0"/></radialGradient>
          <radialGradient id="washMist"><stop offset="0%" stop-color="#89a0ad" stop-opacity=".30"/><stop offset="100%" stop-color="#89a0ad" stop-opacity="0"/></radialGradient>
        </defs>
        <ellipse class="wash" cx="1620" cy="220" rx="620" ry="480" fill="url(#washGold)"/>
        <ellipse class="wash" cx="240" cy="1000" rx="560" ry="440" fill="url(#washOlive)" style="animation-delay:-11s"/>
        <ellipse class="wash" cx="1100" cy="820" rx="520" ry="400" fill="url(#washMist)" style="animation-delay:-6s"/>
        ${strands.map((s) => `<path class="strand" d="${s.d}" stroke="url(#hairStroke)" stroke-width="${s.w}" opacity="${s.o}" style="animation-delay:${s.delay}s, ${(s.delay * 1.8).toFixed(2)}s"/>`).join('')}
      </svg>`;
    document.body.prepend(layer);
  }

  function wireHeader() {
    const host = document.querySelector('[data-site-header]');
    if (!host) return;
    const root = document.querySelector('[data-menu-root]');
    const scrim = root?.querySelector('[data-menu-scrim]');
    const panel = root?.querySelector('[data-menu-panel]');
    const openBtn = host.querySelector('[data-menu-open]');
    if (root && panel) {
      const setMenu = (open) => {
        root.classList.toggle('hidden', !open);
        requestAnimationFrame(() => {
          scrim.classList.toggle('opacity-0', !open);
          panel.classList.toggle('translate-x-full', !open);
        });
        openBtn?.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
      };
      openBtn?.addEventListener('click', () => setMenu(true));
      root.querySelectorAll('[data-menu-close], [data-menu-scrim], [data-menu-link]').forEach((el) => el.addEventListener('click', () => setMenu(false)));
      addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    }
    const bar = host.querySelector('[data-offer-bar]');
    const close = host.querySelector('[data-offer-close]');
    try {
      if (bar && sessionStorage.getItem('mussdl.offerClosed')) bar.remove();
      close?.addEventListener('click', () => { bar.remove(); sessionStorage.setItem('mussdl.offerClosed', '1'); });
    } catch (_) { close?.addEventListener('click', () => bar.remove()); }
  }

  /* ===========================================================================
     2. MOTION
     ======================================================================== */

  const VARIANTS = {
    up:    { from: { opacity: 0, transform: 'translateY(34px)' } },
    down:  { from: { opacity: 0, transform: 'translateY(-26px)' } },
    right: { from: { opacity: 0, transform: 'translateX(40px)' } },
    left:  { from: { opacity: 0, transform: 'translateX(-40px)' } },
    scale: { from: { opacity: 0, transform: 'scale(.92)' } },
    blur:  { from: { opacity: 0, filter: 'blur(12px)', transform: 'translateY(20px)' } },
    mask:  { from: { opacity: 0, transform: 'translateY(100%)' } }
  };

  function mountReveals() {
    const nodes = [...document.querySelectorAll('[data-reveal]')];
    if (!nodes.length) return;
    if (reduceMotion || !('IntersectionObserver' in window) || !('animate' in Element.prototype)) return;
    document.documentElement.classList.add('js-motion');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const variant = VARIANTS[el.dataset.reveal] || VARIANTS.up;
        const parent = el.parentElement?.closest('[data-stagger]');
        const step = parent ? Number(parent.dataset.stagger || 80) : 0;
        const siblings = parent ? [...parent.querySelectorAll('[data-reveal]')] : [el];
        const index = Math.max(0, siblings.indexOf(el));
        const delay = Number(el.dataset.revealDelay || 0) + index * step;
        const to = { opacity: 1, transform: 'none' };
        if (variant.from.filter) to.filter = 'blur(0)';
        const anim = el.animate([variant.from, to], {
          duration: Number(el.dataset.revealDuration || 820), delay, easing: SPRING, fill: 'both'
        });
        anim.onfinish = () => { el.style.opacity = ''; el.removeAttribute('data-reveal'); anim.cancel(); };
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    nodes.forEach((n) => io.observe(n));
  }

  function mountParallax() {
    if (reduceMotion) return;
    const nodes = [...document.querySelectorAll('[data-parallax]')];
    if (!nodes.length) return;
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      nodes.forEach((el) => {
        const box = el.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        const progress = (box.top + box.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(progress * Number(el.dataset.parallax) * -100).toFixed(2)}px, 0)`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const toArabicDigits = (v) => String(v).replace(/\d/g, (d) => AR_DIGITS[+d]);

  function mountCounters() {
    const nodes = [...document.querySelectorAll('[data-count-to]')];
    if (!nodes.length) return;
    const render = (el, value) => {
      const decimals = Number(el.dataset.countDecimals || 0);
      el.textContent = toArabicDigits(value.toFixed(decimals)) + (el.dataset.countSuffix || '');
    };
    if (reduceMotion || !('IntersectionObserver' in window)) { nodes.forEach((el) => render(el, Number(el.dataset.countTo))); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target; io.unobserve(el);
        const target = Number(el.dataset.countTo); const start = performance.now(); const dur = 1400;
        const tick = (now) => {
          const p = Math.min(1, (now - start) / dur); const eased = 1 - Math.pow(1 - p, 3);
          render(el, target * eased); if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    nodes.forEach((el) => { render(el, 0); io.observe(el); });
  }

  /* ===========================================================================
     3. PAGE MODULES (each self-gates on its markup)
     ======================================================================== */

  function mountThumbs() {
    const thumbs = document.querySelector('[data-thumbs]');
    const shot = document.querySelector('[data-main-shot], [data-hero-shot]');
    if (!thumbs || !shot) return;
    shot.style.transition = 'opacity .32s ease';
    thumbs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-thumb]');
      if (!btn) return;
      shot.style.opacity = '0';
      setTimeout(() => { shot.src = btn.dataset.thumb; shot.style.opacity = '1'; }, 160);
      thumbs.querySelectorAll('[data-thumb]').forEach((b) => {
        b.classList.toggle('border-gold', b === btn);
        b.classList.toggle('border-ink/10', b !== btn);
      });
    });
  }

  function mountCompare() {
    const fig = document.querySelector('[data-compare]');
    if (!fig) return;
    const clip = fig.querySelector('[data-compare-clip]');
    const handle = fig.querySelector('[data-compare-handle]');
    const beforeImg = fig.querySelector('[data-compare-before]');
    let dragging = false;
    const setPct = (pct) => {
      const p = Math.max(0, Math.min(100, pct));
      clip.style.width = p + '%'; handle.style.right = p + '%';
      beforeImg.style.width = fig.clientWidth + 'px';
    };
    const pctFromEvent = (e) => {
      const box = fig.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      return ((box.right - x) / box.width) * 100;
    };
    fig.addEventListener('pointerdown', (e) => { dragging = true; fig.setPointerCapture?.(e.pointerId); setPct(pctFromEvent(e)); });
    fig.addEventListener('pointermove', (e) => { if (dragging) { setPct(pctFromEvent(e)); e.preventDefault(); } });
    addEventListener('pointerup', () => { dragging = false; });
    fig.addEventListener('touchmove', (e) => { if (dragging) { setPct(pctFromEvent(e)); e.preventDefault(); } }, { passive: false });
    fig.querySelector('[data-compare-grip]')?.addEventListener('keydown', (e) => {
      const cur = parseFloat(clip.style.width);
      if (e.key === 'ArrowRight') setPct(cur - 5);
      if (e.key === 'ArrowLeft') setPct(cur + 5);
    });
    addEventListener('resize', () => setPct(parseFloat(clip.style.width) || 50));
    setPct(50);
  }

  function mountMarquee() {
    const marquee = document.querySelector('.marquee');
    const track = marquee?.querySelector('.marquee-track');
    const set = track?.querySelector('[data-marquee-set]');
    if (!set) return;
    while (track.children.length < 2 || track.scrollWidth < Math.max(marquee.clientWidth, 900) * 1.6) {
      track.appendChild(set.cloneNode(true));
      if (track.children.length > 40) break;
    }
    track.innerHTML += track.innerHTML;
  }

  function mountHeroScrub() {
    // Phones and data-saver connections keep the still image: the scrubbed clip is 3 MB.
    if (window.matchMedia('(max-width: 639px)').matches || (navigator.connection && navigator.connection.saveData)) return;
    const vid = document.querySelector('[data-hero-video]');
    const hero = document.querySelector('[data-hero]');
    if (!vid || !hero) return;
    const conn = navigator.connection || {};
    if (reduceMotion || conn.saveData) { vid.remove(); return; }
    let dur = 0, target = 0, current = 0, raf = 0, visible = true;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const frame = vid.closest('figure') || hero;
    const progress = () => {
      const bottom = frame.getBoundingClientRect().bottom + scrollY;
      const span = Math.max(bottom - innerHeight * 0.45, innerHeight * 0.55) * 1.75;
      return clamp01(scrollY / span);
    };
    const tick = () => {
      raf = 0;
      if (!dur || !visible) return;
      current += (target - current) * 0.10;
      if (Math.abs(target - current) > 0.004) { try { vid.currentTime = current; } catch (_) {} raf = requestAnimationFrame(tick); }
      else { try { vid.currentTime = target; } catch (_) {} }
    };
    const schedule = () => { target = dur * progress(); if (!raf) raf = requestAnimationFrame(tick); };
    vid.addEventListener('loadedmetadata', () => { dur = vid.duration || 0; vid.pause(); vid.classList.remove('opacity-0'); schedule(); });
    vid.addEventListener('error', () => vid.remove(), { once: true });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) schedule(); }).observe(hero);
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    vid.preload = 'auto'; vid.load();
  }

  /* ===========================================================================
     PRODUCT LINKS
     Until the merchant fills the "رابط صفحة المنتج" setting, every CTA points
     at the home page. Ask Salla for the store's products and re-point the CTAs
     at the Mussdl product (by name), or at the newest product as a fallback.
     ======================================================================== */

  function mountProductLinks() {
    const links = [...document.querySelectorAll('[data-product-link]')];
    if (!links.length) return;
    // Salla returns canonical URLs (the store's own domain). While the theme is
    // being previewed on salla.design that would jump out of the preview, so
    // every product link is rebased onto the host the page is served from.
    const home = new URL((window.mussdl && window.mussdl.home) || '/', location.href);
    const base = home.pathname.replace(/\/+$/, '');
    const rebase = (href) => {
      try {
        const u = new URL(href, location.href);
        if (u.origin === location.origin) return u.href;
        return base + u.pathname + u.search;
      } catch (_) { return href; }
    };
    links.forEach((a) => { if (a.getAttribute('href')) a.href = rebase(a.getAttribute('href')); });
    if (window.mussdl && window.mussdl.productUrl) return;
    const resolve = () => {
      if (!window.salla || !salla.product || typeof salla.product.fetch !== 'function') return;
      salla.product.fetch({ source: 'latest' }).then((res) => {
        const items = Array.isArray(res && res.data) ? res.data : [];
        const brand = items.find((p) => /مسدل|قرنفل|mussdl/i.test(p.name || '')) || items[0];
        if (!brand || !brand.url) return;
        const href = rebase(brand.url);
        links.forEach((a) => { a.href = href; });
      }).catch(() => {});
    };
    if (window.salla && typeof salla.onReady === 'function') salla.onReady(resolve); else resolve();
  }

  /* Listing page: the sort <select> drives salla-products-list and the ?sort= param. */
  function mountProductsList() {
    const list = document.querySelector('[data-products-page] salla-products-list');
    const select = document.getElementById('product-filter');
    if (!list || !select) return;
    const current = new URLSearchParams(location.search).get('sort');
    if (current) { select.value = current; list.sortBy = current; }
    select.addEventListener('change', (e) => {
      list.sortBy = e.currentTarget.value;
      const u = new URL(location.href); u.searchParams.set('sort', e.currentTarget.value);
      history.replaceState(null, '', u);
    });
  }

  /* ===========================================================================
     BOOT
     ======================================================================== */

  function boot() {
    mountHairBackground();
    wireHeader();
    mountProductLinks();
    mountProductsList();
    mountThumbs();
    mountCompare();
    mountMarquee();
    mountHeroScrub();
    mountReveals();
    mountParallax();
    mountCounters();
    document.dispatchEvent(new CustomEvent('mussdl::ready'));
  }

  window.MUSSDL = { toArabicDigits, SPRING, reduceMotion };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

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
     LINKS — preview safe
     Salla writes canonical URLs (the store's own domain) into theme settings and
     API responses, and its signed preview links (identifier/version_id/expires/
     signature) only apply to the page they open. So inside a preview a single
     click leaves it and the store answers with its PUBLISHED theme. Every store
     link is therefore rebased onto the host the page is served from and keeps
     the preview parameters. On the live store this is a no-op.
     ======================================================================== */

  const PREVIEW_KEYS = ['identifier', 'version_id', 'expires', 'signature', 'preview', 'draft_id'];
  const MAIN_PRODUCT_NAME = /مسدل|قرنفل|mussdl/i;
  const OFFER_PRODUCT_NAME = {
    2: /عبوتين|عبوتان|2\s*عبو|x\s*2|×\s*2|باكج\s*2|حزمة/i,
    3: /ثلاث|3\s*عبو|x\s*3|×\s*3/i
  };

  const Links = (() => {
    const cfg = window.mussdl || {};
    const hostOf = (v) => { try { return new URL(v, location.href).host; } catch (_) { return ''; } };
    const hosts = new Set([location.host]);
    [cfg.productUrl, ...Object.values(cfg.offerUrls || {})].forEach((u) => { const h = hostOf(u); if (h) hosts.add(h); });
    let base = '';
    try { base = new URL(cfg.home || '/', location.href).pathname.replace(/\/+$/, ''); } catch (_) {}
    const params = [];
    const search = new URLSearchParams(location.search);
    PREVIEW_KEYS.forEach((k) => { if (search.has(k)) params.push([k, search.get(k)]); });

    const addHost = (url) => { const h = hostOf(url); if (h) hosts.add(h); };

    /* Returns the href to use for a store URL, or null when it is not ours. */
    const fix = (href) => {
      if (!href) return null;
      const raw = String(href).trim();
      if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) return null;
      let u;
      try { u = new URL(raw, location.href); } catch (_) { return null; }
      if (!/^https?:$/.test(u.protocol)) return null;
      if (!hosts.has(u.host)) return null;
      if (u.host !== location.host) {
        const path = base + u.pathname;
        u = new URL(path + u.search + u.hash, location.origin);
      }
      params.forEach(([k, v]) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
      return u.href;
    };

    const decorate = (a) => {
      if (a.hasAttribute('download') || a.dataset.noPreview !== undefined) return;
      const next = fix(a.getAttribute('href'));
      if (next && next !== a.href) a.href = next;
    };
    const sweep = (root) => {
      if (!root || root.nodeType !== 1) return;
      if (root.matches && root.matches('a[href]')) decorate(root);
      root.querySelectorAll && root.querySelectorAll('a[href]').forEach(decorate);
    };
    return { fix, sweep, addHost, active: params.length > 0 || hosts.size > 1 };
  })();

  function mountLinks() {
    if (!Links.active) return;
    Links.sweep(document.body);
    /* Product cards, menus and modals arrive after hydration. */
    new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach(Links.sweep)))
      .observe(document.body, { childList: true, subtree: true });
  }

  /* Until the merchant fills the product-URL settings, CTAs point at the home
     page; the Mussdl product (and each offer's pack) is then found by name. */
  function mountProductLinks() {
    const cfg = window.mussdl || {};
    const productLinks = [...document.querySelectorAll('[data-product-link]')];
    const offerLinks = [...document.querySelectorAll('[data-offer-link]')];
    if (!productLinks.length && !offerLinks.length) return;
    const apply = (a, url) => { const next = Links.fix(url); if (next) a.href = next; };
    const offerUrls = cfg.offerUrls || {};
    const pendingOffers = offerLinks.filter((a) => {
      const url = offerUrls[a.dataset.offerLink];
      if (url) { apply(a, url); return false; }
      return true;
    });
    const pendingProducts = cfg.productUrl ? [] : productLinks;
    if (!pendingProducts.length && !pendingOffers.length) return;
    const resolve = () => {
      if (!window.salla || !salla.product || typeof salla.product.fetch !== 'function') return;
      salla.product.fetch({ source: 'latest' }).then((res) => {
        const items = Array.isArray(res && res.data) ? res.data : [];
        if (!items.length) return;
        items.forEach((p) => Links.addHost(p.url));
        const main = items.find((p) => MAIN_PRODUCT_NAME.test(p.name || '')) || items[0];
        if (main && main.url) pendingProducts.forEach((a) => apply(a, main.url));
        pendingOffers.forEach((a) => {
          const re = OFFER_PRODUCT_NAME[a.dataset.offerLink];
          const match = (re && items.find((p) => re.test(p.name || ''))) || main;
          if (match && match.url) apply(a, match.url);
        });
      }).catch(() => {});
    };
    if (window.salla && typeof salla.onReady === 'function') salla.onReady(resolve); else resolve();
  }

  /* Offer cards use the same Salla product with a quantity-based promotion.
     Preselect the requested pack on the product page; the cart remains the
     source of truth for the actual discount. */
  function mountOfferSelection() {
    const params = new URLSearchParams(location.search);
    const quantity = Number(params.get('quantity'));
    if (![1, 2, 3].includes(quantity)) return;
    const input = document.querySelector('salla-quantity-input[name="quantity"]');
    if (!input) return;
    const max = Number(input.getAttribute('max')) || quantity;
    const next = Math.min(quantity, max);
    const apply = () => {
      input.setAttribute('value', String(next));
      if (typeof input.setValue === 'function') input.setValue(next, false);
      else input.value = next;
    };
    apply();
    if (window.customElements && typeof customElements.whenDefined === 'function') {
      customElements.whenDefined('salla-quantity-input').then(apply).catch(() => {});
    }
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

  /* Salla's built-in product card mounts with `opacity:0; translateY(20px)` inline
     and leaves the entrance to the theme (Raed does it with anime.js). Reveal each
     card as it lands, with a small stagger, then drop the inline styles. */
  function mountProductCards() {
    const lists = [...document.querySelectorAll('salla-products-list')];
    if (!lists.length) return;
    const reveal = (card, index) => {
      if (card.dataset.revealed) return;
      card.dataset.revealed = '1';
      const finish = () => { card.style.opacity = ''; card.style.transform = ''; };
      if (reduceMotion || !('animate' in Element.prototype)) return finish();
      const anim = card.animate(
        [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 620, delay: Math.min(index, 8) * 60, easing: SPRING, fill: 'both' }
      );
      anim.onfinish = () => { finish(); anim.cancel(); };
    };
    const sweep = (root) => [...root.querySelectorAll('.s-product-card-entry')].forEach(reveal);
    lists.forEach((list) => {
      sweep(list);
      new MutationObserver(() => sweep(list)).observe(list, { childList: true, subtree: true });
    });
  }

  /* Notes & attachments: [data-collapse-toggle="id"] shows/hides #id (product page and cart). */
  function mountCollapses() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-collapse-toggle]');
      if (!btn) return;
      const target = document.getElementById(btn.dataset.collapseToggle);
      if (!target) return;
      const open = target.classList.toggle('hidden') === false;
      btn.setAttribute('aria-expanded', String(open));
      if (open) target.querySelector('textarea, input')?.focus();
    });
  }

  /* Cart page: Raed's cart.js needs Raed's app.js, which this layout never loads,
     so the per-item prices/totals and the free-shipping bar are refreshed here on
     Salla's cart::updated event. Totals in <salla-cart-summary-card> update themselves. */
  function mountCart() {
    if (!document.querySelector('[data-testid^="store-cart-item-"]')) return;
    const show = (el, on) => { if (el) el.classList.toggle('hidden', !on); };
    const wire = () => {
      if (!window.salla || !salla.event || !salla.event.cart) return;
      salla.event.cart.onUpdated((cart) => {
        if (!cart || !cart.count) { document.querySelector('.cart-options')?.remove(); window.location.reload(); return; }
        const optionIds = (cart.options || []).map((o) => String(o.id));
        document.querySelectorAll('.cart-options form').forEach((f) => {
          const id = f.querySelector('input[name="id"]')?.value;
          if (id && !optionIds.includes(String(id))) f.remove();
        });
        (cart.items || []).forEach((item) => {
          const row = document.getElementById('item-' + item.id);
          if (!row) return;
          const q = (s) => row.querySelector(s);
          const special = !!(item.offer || item.special_price > 0);
          const newOffers = (item.detailed_offers || []).length > 0;
          const totalEl = q('.item-total');
          if (totalEl) totalEl.textContent = salla.money(newOffers ? item.total_special_price : item.total);
          const priceEl = q('.item-price');
          if (priceEl) { priceEl.textContent = salla.money(item.price); priceEl.classList.toggle('text-gold-ink', special); priceEl.classList.toggle('text-ink', !special); }
          show(q('.offer-name'), special && !newOffers); show(q('.old-offers'), special && !newOffers);
          show(q('.item-regular-price'), special); show(q('.offer-icon'), special);
          const orig = q('.item-original-price'); show(orig, !!item.is_on_sale);
          if (orig && item.is_on_sale) orig.textContent = salla.money(item.original_price);
          const w = q('.item-weight'); if (w) w.textContent = item.weight_label || '';
          show(q('.item-weight-row'), !!item.weight_label);
          show(q('.free-ribbon'), item.price == 0 && item.has_discount);
        });
        const bar = cart.free_shipping_bar;
        show(document.getElementById('free-shipping'), !!bar);
        if (!bar) return;
        show(document.getElementById('free-shipping-bar'), !bar.has_free_shipping);
        show(document.getElementById('free-shipping-applied'), bar.has_free_shipping);
        const msg = document.getElementById('free-shipping-msg');
        if (msg) msg.innerHTML = bar.has_free_shipping ? salla.lang.get('pages.cart.has_free_shipping') : salla.lang.get('pages.cart.free_shipping_alert', { amount: salla.money(bar.remaining) });
        const track = document.getElementById('free-shipping-bar');
        if (track && track.children[0]) track.children[0].style.width = bar.percent + '%';
      });
    };
    if (window.salla && typeof salla.onReady === 'function') salla.onReady(wire); else wire();
  }

  /* ===========================================================================
     BOOT
     ======================================================================== */

  function boot() {
    mountHairBackground();
    wireHeader();
    mountLinks();
    mountProductLinks();
    mountOfferSelection();
    mountCollapses();
    mountCart();
    mountProductsList();
    mountProductCards();
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

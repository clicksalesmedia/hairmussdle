/* =============================================================================
   Mussdl — theme behavior layer (Salla Twilight)
   -----------------------------------------------------------------------------
   Only presentation lives here. Cart, checkout, product options and pricing are
   Salla's (web components + salla.* SDK injected by the platform).

     1. chrome  — offer bar, mobile drawer, ambient hair-strand background
     2. motion  — reveals, parallax, counters, tilt (WAAPI, no dependencies)
     3. modules — hero scrub video, before/after slider, gallery thumbs, marquee
     4. commerce — product / offer CTA links, product-page notes slot

   Every animated element is visible by default and only hidden once JS has
   confirmed it can bring it back, so a script failure degrades to a complete
   static page.
   ========================================================================== */
(function () {
  'use strict';

  const html = (strings, ...values) => strings.reduce((out, str, i) => out + str + (values[i] ?? ''), '');
  const SPRING = 'cubic-bezier(.16,1,.3,1)';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


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
    mountProductLinks();
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

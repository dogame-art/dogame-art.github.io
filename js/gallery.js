/* ============================================
   Gallery — fetch artworks.yml, render grid,
   chain filters, NFC deep links
   ============================================ */

(function () {
  'use strict';

  const grid = document.getElementById('gallery');
  const filtersWrap = document.getElementById('filters');
  let allArtworks = [];

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      const res = await fetch('/artworks.yml');
      if (!res.ok) throw new Error('Failed to load artworks.yml');
      const yaml = await res.text();
      const data = jsyaml.load(yaml);

      allArtworks = (data.artworks || []).filter(a => a.published);
      render(allArtworks);
      setupFilters();
      handleDeepLink();
    } catch (err) {
      grid.innerHTML = '<div class="gallery-loading">Could not load gallery.</div>';
      console.error(err);
    }
  }

  // ---- Render ----
  function render(artworks) {
    if (!artworks.length) {
      grid.innerHTML = '<div class="gallery-empty">No artwork to show.</div>';
      return;
    }

    grid.innerHTML = artworks.map(a => {
      const chainClass = a.chain ? `chain-badge--${a.chain}` : '';
      const chainLabel = chainName(a.chain);

      const nfcHtml = a.nfc
        ? `<span class="nfc-badge">
             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></svg>
             NFC
           </span>`
        : '';

      const marketsHtml = (a.markets || []).map(m =>
        `<a href="${escapeAttr(m.url)}" class="market-link" target="_blank" rel="noopener noreferrer">${escapeHtml(m.platform)}</a>`
      ).join('');

      return `
        <div class="artwork-card" id="${escapeAttr(a.slug)}" data-chain="${a.chain || ''}">
          <div class="artwork-card__img-wrap">
            <img src="/${escapeAttr(a.image)}" alt="${escapeAttr(a.title)}" class="artwork-card__img" loading="lazy">
          </div>
          <div class="artwork-card__info">
            <div class="artwork-card__title">${escapeHtml(a.title)}</div>
            <div class="artwork-card__desc">${escapeHtml(a.description)}</div>
            <div class="artwork-card__meta">
              ${chainLabel ? `<span class="chain-badge ${chainClass}">${chainLabel}</span>` : ''}
              ${nfcHtml}
            </div>
          </div>
          ${marketsHtml ? `<div class="artwork-card__markets">${marketsHtml}</div>` : ''}
        </div>`;
    }).join('');
  }

  // ---- Filters ----
  function setupFilters() {
    // Hide filter buttons for chains that have no artwork
    const chains = new Set(allArtworks.map(a => a.chain).filter(Boolean));
    filtersWrap.querySelectorAll('.filter-btn').forEach(btn => {
      const chain = btn.dataset.chain;
      if (chain !== 'all' && !chains.has(chain)) {
        btn.style.display = 'none';
      }
    });

    filtersWrap.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      filtersWrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const chain = btn.dataset.chain;
      const filtered = chain === 'all'
        ? allArtworks
        : allArtworks.filter(a => a.chain === chain);
      render(filtered);

      // Re-apply deep link highlight if still relevant
      handleDeepLink();
    });
  }

  // ---- NFC Deep Link ----
  function handleDeepLink() {
    const slug = location.hash.replace('#', '');
    if (!slug) return;

    const card = document.getElementById(slug);
    if (!card) return;

    // Scroll to the card
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('highlight');
      // Remove highlight after animation
      setTimeout(() => card.classList.remove('highlight'), 3000);
    }, 300);
  }

  // Also handle hash changes (e.g., user shares link while on page)
  window.addEventListener('hashchange', handleDeepLink);

  // ---- Helpers ----
  function chainName(chain) {
    const map = { solana: 'SOL', tezos: 'TEZ', ethereum: 'ETH', bitcoin: 'BTC' };
    return map[chain] || '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();

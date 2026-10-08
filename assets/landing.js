/* Presentation only. The checkout, Appwrite and payment scripts in index.html are unchanged. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButtons = [...document.querySelectorAll('[data-motion-toggle], #motionToggle')];
  let motionPreference = null;
  try {
    const saved = sessionStorage.getItem('badai-motion');
    if (saved === 'on' || saved === 'off') motionPreference = saved === 'on';
  } catch (_) { /* Motion also works when browser storage is unavailable. */ }

  const tour = document.getElementById('productTour');
  const tourButtons = [...document.querySelectorAll('[data-tour-step-button]')];
  let tourStep = 0;
  let tourTimer;
  let tourVisible = false;
  let tourManual = false;

  function motionAllowed() {
    return (motionPreference === null ? !reducedMotion.matches : motionPreference) && !document.hidden;
  }

  function showTourStep(step) {
    tourStep = step;
    tour.dataset.tourStep = String(step);
    tourButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === step)));
    // Decorative detail panel covers the preview buttons while a prompt is open.
    tour.querySelector('.demo-grid').inert = step !== 0;
  }

  function scheduleTour() {
    clearTimeout(tourTimer);
    if (!motionAllowed() || !tourVisible || tourManual || tour.contains(document.activeElement)) return;
    tourTimer = setTimeout(() => {
      showTourStep((tourStep + 1) % 3);
      scheduleTour();
    }, tourStep === 0 ? 2600 : 1800);
  }

  function syncMotion() {
    const enabled = motionPreference === null ? !reducedMotion.matches : motionPreference;
    document.body.classList.toggle('motion-enabled', enabled);
    document.body.classList.toggle('motion-paused', !motionAllowed());
    motionButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(!enabled));
      button.querySelector('[data-motion-label]').textContent = enabled ? 'Jeda animasi' : 'Aktifkan animasi';
      button.setAttribute('aria-label', enabled ? 'Jeda semua animasi' : 'Aktifkan animasi halaman');
      const icon = button.querySelector('[data-motion-icon]');
      if (icon) icon.innerHTML = enabled
        ? '<svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true"><path d="M1 1h2v10H1zM7 1h2v10H7z"/></svg>'
        : '<svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true"><path d="M1 1l8 5-8 5z"/></svg>';
    });
    syncZones();
    scheduleTour();
  }

  motionButtons.forEach(button => button.addEventListener('click', () => {
    const enabled = motionPreference === null ? !reducedMotion.matches : motionPreference;
    motionPreference = !enabled;
    try { sessionStorage.setItem('badai-motion', motionPreference ? 'on' : 'off'); } catch (_) {}
    syncMotion();
  }));
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pageshow', syncMotion);
  tourButtons.forEach(button => button.addEventListener('click', () => {
    tourManual = true;
    showTourStep(Number(button.dataset.tourStepButton));
    scheduleTour();
  }));
  document.querySelectorAll('[data-tour-open]').forEach(button => button.addEventListener('click', () => {
    tourManual = true;
    // Move focus to a visible control before the preview buttons become inert.
    tourButtons[1].focus({ preventScroll: true });
    showTourStep(1);
    scheduleTour();
  }));
  tour.addEventListener('focusin', scheduleTour);
  tour.addEventListener('focusout', () => requestAnimationFrame(() => {
    if (!tour.contains(document.activeElement)) tourManual = false;
    scheduleTour();
  }));

  const reveals = [...document.querySelectorAll('[data-reveal]')];
  // Track each moving row separately: a tall parent must not start offscreen rows.
  document.querySelectorAll('.marquee').forEach(element => element.setAttribute('data-motion-zone', ''));
  const zones = [...document.querySelectorAll('[data-motion-zone]')];
  const zoneVisibility = new Map();
  function syncZones() {
    zones.forEach(element => {
      const playing = motionAllowed() && zoneVisibility.get(element) !== false;
      element.classList.toggle('is-playing', playing);
      element.classList.toggle('motion-suspended', !playing);
    });
    syncDays();
    syncCommission();
  }
  // One clock drives the day count, growing bars, progress line and milestones.
  const dayVisual = document.querySelector('.year-visual');
  const dayCount = dayVisual?.querySelector('[data-day-count]');
  let dayProgress = 0, dayLastTime = 0, dayFrame = null, dayWasVisible = false, dayDelay = 150;
  function paintDays(progress) {
    if (!dayVisual || !dayCount) return;
    const eased = 1 - Math.pow(1 - progress, 2);
    const days = 1 + Math.floor(364 * eased);
    dayCount.textContent = String(days);
    dayVisual.style.setProperty('--day-progress', String(eased));
    dayVisual.querySelectorAll('[data-day-threshold]').forEach(marker => {
      marker.classList.toggle('day-reached', days >= Number(marker.dataset.dayThreshold));
    });
  }
  function tickDays(now) {
    dayFrame = null;
    const elapsed = Math.max(0, Math.min(80, now - dayLastTime));
    if (dayDelay > 0) dayDelay = Math.max(0, dayDelay - elapsed);
    else dayProgress = Math.min(1, dayProgress + elapsed / 3200);
    dayLastTime = now;
    paintDays(dayProgress);
    if (dayProgress < 1) dayFrame = requestAnimationFrame(tickDays);
  }
  function syncDays() {
    if (!dayVisual) return;
    const visible = zoneVisibility.get(dayVisual) === true || !('IntersectionObserver' in window);
    if (visible && !dayWasVisible) { dayProgress = 0; dayDelay = 150; paintDays(0); }
    dayWasVisible = visible;
    if (!motionAllowed() || !visible) {
      if (dayFrame !== null) cancelAnimationFrame(dayFrame);
      dayFrame = null;
      // Keep the complete offer readable for visitors who prefer reduced motion.
      if (reducedMotion.matches && motionPreference !== true) paintDays(1);
      return;
    }
    if (dayProgress < 1 && dayFrame === null) {
      dayLastTime = performance.now();
      dayFrame = requestAnimationFrame(tickDays);
    }
  }
  const commissionSection = document.getElementById('affiliate');
  const commissionCount = commissionSection?.querySelector('[data-commission-count]');
  let commissionProgress = 0, commissionLast = 0, commissionFrame = null;
  let commissionWasVisible = false, commissionDelay = 150;
  function paintCommission(progress) {
    if (!commissionSection || !commissionCount) return;
    const eased = 1 - Math.pow(1 - progress, 2);
    commissionCount.textContent = String(Math.floor(50 * eased));
    commissionSection.style.setProperty('--commission-progress', String(eased));
  }
  function tickCommission(now) {
    commissionFrame = null;
    const elapsed = Math.max(0, Math.min(80, now - commissionLast));
    if (commissionDelay > 0) commissionDelay = Math.max(0, commissionDelay - elapsed);
    else commissionProgress = Math.min(1, commissionProgress + elapsed / 2800);
    commissionLast = now;
    paintCommission(commissionProgress);
    if (commissionProgress < 1) commissionFrame = requestAnimationFrame(tickCommission);
  }
  function syncCommission() {
    if (!commissionSection) return;
    const visible = zoneVisibility.get(commissionSection) === true || !('IntersectionObserver' in window);
    if (visible && !commissionWasVisible) { commissionProgress = 0; commissionDelay = 150; paintCommission(0); }
    commissionWasVisible = visible;
    if (!motionAllowed() || !visible) {
      if (commissionFrame !== null) cancelAnimationFrame(commissionFrame);
      commissionFrame = null;
      if (reducedMotion.matches && motionPreference !== true) paintCommission(1);
      return;
    }
    if (commissionProgress < 1 && commissionFrame === null) {
      commissionLast = performance.now();
      commissionFrame = requestAnimationFrame(tickCommission);
    }
  }
  if (commissionSection && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      commissionSection.style.setProperty('--money-height', `${commissionSection.offsetHeight}px`);
    }).observe(commissionSection);
  }
  // Lazy images inside translated tracks can otherwise enter the screen blank.
  const marquees = zones.filter(element => element.matches('.marquee'));
  function prepareImages(element) {
    const images = [...element.querySelectorAll('img')];
    images.forEach(image => { image.loading = 'eager'; });
    // Image decode/network must never gate the animation clock.
    images.forEach(image => {
      if (typeof image.decode === 'function') image.decode().catch(() => {});
    });
  }
  if ('IntersectionObserver' in window) {
    const preloadObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        prepareImages(entry.target);
        preloadObserver.unobserve(entry.target);
      });
    }, { rootMargin: '500px 0px', threshold: 0 });
    marquees.forEach(element => {
      preloadObserver.observe(element);
    });
  }
  // A fixed pixel speed keeps long galleries and short galleries equally readable.
  function sizeMarquees() {
    document.querySelectorAll('.marquee-track').forEach(track => {
      const group = track.querySelector('.marquee-group');
      if (!group || !group.scrollWidth) return;
      const pixelsPerSecond = track.closest('.proof-row') ? 28 : 38;
      track.style.animationDuration = `${group.scrollWidth / pixelsPerSecond}s`;
    });
  }
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(sizeMarquees) : null;
  document.querySelectorAll('.marquee-group:not([aria-hidden])').forEach(group => resizeObserver?.observe(group));
  sizeMarquees();
  // Safari / embedded WebViews may only implement the legacy MediaQueryList API.
  if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change', syncMotion);
  else if (typeof reducedMotion.addListener === 'function') reducedMotion.addListener(syncMotion);
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    reveals.forEach(element => {
      if (!reducedMotion.matches && element.getBoundingClientRect().top >= window.innerHeight) element.classList.add('reveal-ready');
      revealObserver.observe(element);
    });
    const motionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        zoneVisibility.set(entry.target, entry.isIntersecting);
        syncZones();
        if (entry.target === tour) {
          tourVisible = entry.isIntersecting;
          scheduleTour();
        }
      });
    }, { threshold: 0 });
    zones.forEach(element => motionObserver.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-visible'));
    // CSS autoplay remains available if viewport observers are unsupported.
    tourVisible = true;
    marquees.forEach(prepareImages);
  }
  syncMotion();

  // Full original screenshots, native modal focus containment, keyboard navigation.
  const lightbox = document.getElementById('proofLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const imageWrap = lightbox.querySelector('.lightbox-image-wrap');
  const title = document.getElementById('lightboxTitle');
  const counter = document.getElementById('proofCounter');
  const originals = [...document.querySelectorAll('.proof-grid [data-proof-index]')];
  let proofIndex = 0;
  let proofTrigger;

  function renderProof(index) {
    proofIndex = (index + originals.length) % originals.length;
    const thumb = originals[proofIndex];
    const source = thumb.querySelector('img');
    lightboxImage.src = source.src;
    lightboxImage.alt = source.alt;
    title.textContent = thumb.querySelector('span').firstChild.textContent.trim();
    counter.textContent = `${proofIndex + 1} / ${originals.length} · Klik gambar untuk zoom`;
    imageWrap.classList.remove('zoomed');
    imageWrap.scrollTop = 0;
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-proof-index]');
    if (!trigger) return;
    proofTrigger = trigger;
    renderProof(Number(trigger.dataset.proofIndex));
    lightbox.showModal();
    document.body.classList.add('modal-open');
    document.getElementById('closeLightbox').focus({ preventScroll: true });
  });
  document.getElementById('closeLightbox').addEventListener('click', () => lightbox.close());
  document.getElementById('prevProof').addEventListener('click', () => renderProof(proofIndex - 1));
  document.getElementById('nextProof').addEventListener('click', () => renderProof(proofIndex + 1));
  lightboxImage.addEventListener('click', () => imageWrap.classList.toggle('zoomed'));
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox || event.target === imageWrap) lightbox.close();
  });
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); renderProof(proofIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); renderProof(proofIndex + 1); }
  });
  lightbox.addEventListener('close', () => {
    if (!document.getElementById('checkoutModal').classList.contains('show')) document.body.classList.remove('modal-open');
    proofTrigger?.focus({ preventScroll: true });
  });

  // Accessibility wrapper observes the old checkout; does not replace its functions.
  const checkout = document.getElementById('checkoutModal');
  const background = [document.querySelector('.site-header'), document.querySelector('main'), document.querySelector('footer')];
  let checkoutWasOpen = false;
  let checkoutTrigger;
  new MutationObserver(() => {
    const isOpen = checkout.classList.contains('show');
    if (isOpen === checkoutWasOpen) return;
    checkoutWasOpen = isOpen;
    background.forEach(element => { element.inert = isOpen; });
    document.body.classList.toggle('modal-open', isOpen || lightbox.open);
    if (isOpen) {
      checkoutTrigger = document.activeElement;
      checkout.querySelector('.checkout-card').scrollTop = 0;
      checkout.querySelector('.xbtn').focus({ preventScroll: true });
    } else {
      checkoutTrigger?.focus({ preventScroll: true });
    }
  }).observe(checkout, { attributes: true, attributeFilter: ['class'] });
  checkout.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); window.closeCheckout(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...checkout.querySelectorAll('button, input, a[href]')]
      .filter(element => !element.disabled && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === checkout)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
})();

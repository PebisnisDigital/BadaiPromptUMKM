/* Presentation only. The checkout, Appwrite and payment scripts in index.html are unchanged. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.getElementById('motionToggle');
  let userPaused = false;
  const tour = document.getElementById('productTour');
  const tourButtons = [...document.querySelectorAll('[data-tour-step-button]')];
  let tourStep = 0;
  let tourTimer;
  let tourVisible = false;
  let tourManual = false;
  let tourHovered = false;

  function motionAllowed() {
    return !reducedMotion.matches && !userPaused && !document.hidden;
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
    if (!motionAllowed() || !tourVisible || tourManual || tourHovered || tour.contains(document.activeElement)) return;
    tourTimer = setTimeout(() => {
      showTourStep((tourStep + 1) % 3);
      scheduleTour();
    }, tourStep === 0 ? 4300 : 3300);
  }

  function syncMotion() {
    document.body.classList.toggle('motion-paused', !motionAllowed());
    const paused = userPaused || reducedMotion.matches;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.querySelector('[data-motion-label]').textContent = paused ? 'Animasi dijeda' : 'Jeda animasi';
    motionButton.setAttribute('aria-label', reducedMotion.matches
      ? 'Animasi dijeda mengikuti pengaturan perangkat'
      : paused ? 'Lanjutkan animasi' : 'Jeda semua animasi');
    scheduleTour();
  }

  motionButton.addEventListener('click', () => {
    if (reducedMotion.matches) return;
    userPaused = !userPaused;
    syncMotion();
  });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
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
  tour.addEventListener('mouseenter', () => { tourHovered = true; scheduleTour(); });
  tour.addEventListener('mouseleave', () => { tourHovered = false; scheduleTour(); });
  tour.addEventListener('focusin', scheduleTour);
  tour.addEventListener('focusout', () => requestAnimationFrame(scheduleTour));

  const reveals = [...document.querySelectorAll('[data-reveal]')];
  const zones = [...document.querySelectorAll('[data-motion-zone]')];
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    reveals.forEach(element => {
      if (!reducedMotion.matches) element.classList.add('reveal-ready');
      revealObserver.observe(element);
    });
    const motionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-playing', entry.isIntersecting);
        if (entry.target === tour) {
          tourVisible = entry.isIntersecting;
          scheduleTour();
        }
      });
    }, { threshold: 0.12 });
    zones.forEach(element => motionObserver.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-visible'));
    // No continuous animation when viewport visibility cannot be tracked.
    tourManual = true;
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

// animations & interactions (moved from inline)
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateCounter(el, endValue, duration=900) {
    if (reduce) { el.textContent = endValue.toLocaleString(); return; }
    const start = 0; const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime)/duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.floor(start + (endValue - start) * eased);
      el.textContent = current.toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Throttle utility (runs at most once per wait ms)
  function throttle(fn, wait=16) {
    let last = 0; let scheduled = null;
    return function(...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn.apply(this, args);
      } else if (!scheduled) {
        scheduled = setTimeout(() => { scheduled = null; last = Date.now(); fn.apply(this, args); }, remaining);
      }
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    // logo entrance
    const brandMark = document.querySelector('.brand-mark');
    if (!reduce && brandMark) {
      brandMark.style.transform = 'rotate(45deg) scale(.6)';
      brandMark.style.opacity = '0';
      brandMark.style.transition = 'transform .9s cubic-bezier(.2,.9,.2,1), opacity .9s';
      requestAnimationFrame(()=>{
        brandMark.style.transform = 'rotate(45deg) scale(1)';
        brandMark.style.opacity = '1';
      });
    }

    // projects on-scroll reveal
    const projects = document.querySelectorAll('.project');
    const projObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); obs.unobserve(entry.target); }
      });
    }, { root:null, rootMargin:'0px 0px -8%', threshold:0.12 });
    projects.forEach(p => projObserver.observe(p));

    // stats counters
    const stats = document.querySelectorAll('.stat');
    const statsObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          const numEl = entry.target.querySelector('.stat-number');
          const target = parseInt(entry.target.dataset.target || numEl.textContent.replace(/,/g,''), 10) || 0;
          animateCounter(numEl, target, 1200);
          obs.unobserve(entry.target);
        }
      });
    }, { root:null, rootMargin:'0px', threshold:0.25 });
    stats.forEach(s => statsObserver.observe(s));

    // reveal slider smoothing + parallax
    const range = document.querySelector('.range');
    const after = document.querySelector('.reveal .after');
    const before = document.querySelector('.reveal .before');
    const divider = document.querySelector('.reveal-divider');
    if (range && after && divider) {
      let current = parseFloat(range.value);
      let target = current;
      after.style.clipPath = `inset(0 0 0 ${100 - current}%)`;
      divider.style.left = `${current}%`;
      range.addEventListener('input', (e) => { target = parseFloat(e.target.value); });

      function raf() {
        if (Math.abs(target - current) > 0.1) {
          current += (target - current) * 0.18;
          after.style.clipPath = `inset(0 0 0 ${100 - current}%)`;
          divider.style.left = `${current}%`;
          const pct = (current - 50)/50;
          before.style.transform = `translateX(${pct * 6}px) scale(${1 + Math.abs(pct) * 0.01})`;
          after.style.transform = `translateX(${pct * -6}px) scale(${1 + Math.abs(pct) * 0.01})`;
        }
        requestAnimationFrame(raf);
      }
      if (!reduce) requestAnimationFrame(raf);

      // pointer capture for smooth dragging
      range.addEventListener('pointerdown', (ev) => { range.setPointerCapture(ev.pointerId); });

      // keyboard accessibility
      range.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') range.value = Math.max(0, range.value - 2);
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') range.value = Math.min(100, +range.value + 2);
        range.dispatchEvent(new Event('input'));
      });
    }

    // throttle mousemove parallax on reveal
    const revealEl = document.querySelector('.reveal');
    if (revealEl && !reduce) {
      const handler = throttle((e) => {
        const r = revealEl.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width - 0.5;
        const cy = (e.clientY - r.top) / r.height - 0.5;
        const imgs = revealEl.querySelectorAll('img');
        imgs.forEach((img, i) => {
          const depth = (i === 0) ? 6 : -6;
          img.style.transform = `translate(${cx * depth}px, ${cy * depth * 0.5}px) scale(1.01)`;
        });
      }, 18);
      revealEl.addEventListener('mousemove', handler);
      revealEl.addEventListener('mouseleave', () => { revealEl.querySelectorAll('img').forEach(img => img.style.transform = 'translate(0,0) scale(1)'); });
    }

    // settings toggle: disable floating animation
    const toggleId = 'drl_disable_float';
    function applyFloatingPreference() {
      const disabled = localStorage.getItem(toggleId) === '1';
      document.documentElement.style.setProperty('--drl-float-disabled', disabled ? '1' : '0');
      document.querySelectorAll('.reveal img').forEach(img => { img.style.animationPlayState = disabled ? 'paused' : 'running'; });
    }
    applyFloatingPreference();

    // add small UI switch in footer
    const footer = document.querySelector('footer .footer-row');
    if (footer) {
      const wrapper = document.createElement('div'); wrapper.style.display='flex'; wrapper.style.alignItems='center'; wrapper.style.gap='8px';
      const label = document.createElement('label'); label.style.fontSize='11px'; label.style.color='#8c9196'; label.textContent='Disable floating';
      const input = document.createElement('input'); input.type='checkbox'; input.style.transform='scale(.92)'; input.checked = localStorage.getItem(toggleId) === '1';
      input.addEventListener('change', () => { localStorage.setItem(toggleId, input.checked ? '1' : '0'); applyFloatingPreference(); });
      wrapper.appendChild(input); wrapper.appendChild(label); footer.appendChild(wrapper);
    }

    // preload main hero image (hint for LCP)
    const heroBefore = document.querySelector('.reveal .before');
    if (heroBefore) {
      const link = document.createElement('link'); link.rel='preload'; link.as='image'; link.href = heroBefore.src; document.head.appendChild(link);
    }

    // scroll-based parallax for depth effects
    if (!reduce) {
      const parallaxElements = document.querySelectorAll('[class*="parallax"]');
      let scrollY = 0;

      const updateScrollParallax = throttle(() => {
        parallaxElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
          
          if (!isVisible) return;

          // Calculate parallax offset based on element position and scroll
          const centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2;
          
          // Determine speed based on depth class
          let speed = 0.5;
          if (el.classList.contains('parallax-depth-1')) speed = 0.25;
          else if (el.classList.contains('parallax-depth-2')) speed = 0.5;
          else if (el.classList.contains('parallax-depth-3')) speed = 0.75;
          else if (el.classList.contains('text-parallax')) speed = 0.3;
          
          const offset = centerOffset * speed;
          
          // Apply transform with GPU acceleration
          if (el.classList.contains('card-parallax')) {
            el.style.transform = `translate3d(0, ${offset * 0.5}px, 0)`;
          } else if (el.classList.contains('text-parallax')) {
            el.style.transform = `translate3d(0, ${offset}px, 0)`;
          } else {
            el.style.transform = `translate3d(0, ${offset * speed}px, 0)`;
          }
        });
      }, 12);

      // Scroll event listener with passive flag for better performance
      window.addEventListener('scroll', () => { scrollY = window.scrollY; updateScrollParallax(); }, { passive: true });
      
      // Initial call
      updateScrollParallax();
    }
  });
})();

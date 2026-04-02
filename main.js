'use strict';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx7iHERdKpiOLh0dG60OsCJvY0madZip1L6zusqAYevMYSczzDYv7ClDBUlPx31Kf6H/exec';

/* ======= PRELOADER ======= */
(function() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  // Блокируем скролл сразу
  document.body.style.overflow = 'hidden';

  function hidePreloader() {
    preloader.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Ждём загрузки героя-видео
  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo) {
    // canplaythrough — видео может воспроизводиться без буферизации
    heroVideo.addEventListener('canplaythrough', hidePreloader, { once: true });
    heroVideo.addEventListener('loadeddata', hidePreloader, { once: true });
    // Fallback: если видео не грузится за 4 сек — убираем прелоадер
    setTimeout(hidePreloader, 4000);
  } else {
    // Нет видео — убираем быстро
    setTimeout(hidePreloader, 800);
  }
})();

/* ======= HEADER ======= */
(function() {
  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobileNav');

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('open');
    mobileNav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  mobileNav.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
    burger.classList.remove('open');
    mobileNav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }));

  const sections = ['about','floors','tenants','application','contacts'];
  const navLinks = document.querySelectorAll('.nav-link');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting)
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
})();

/* ======= STICKY CTA ======= */
(function() {
  const cta = document.getElementById('stickyCta');
  const hero = document.getElementById('hero');
  if (!cta || !hero) return;
  new IntersectionObserver(e => cta.classList.toggle('visible', !e[0].isIntersecting), { threshold: 0.1 }).observe(hero);
})();

/* ======= REVEAL ======= */
(function() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });
  els.forEach(el => obs.observe(el));
})();

/* ======= COOKIE ======= */
(function() {
  const banner = document.getElementById('cookieBanner');
  const btn = document.getElementById('cookieAccept');
  if (!banner || !btn) return;
  if (document.cookie.indexOf('cookie_ok=1') !== -1) { banner.classList.add('hidden'); return; }
  btn.addEventListener('click', () => {
    document.cookie = 'cookie_ok=1; max-age=31536000; path=/';
    banner.style.transition = 'opacity 0.3s, transform 0.3s';
    banner.style.opacity = '0'; banner.style.transform = 'translateY(16px)';
    setTimeout(() => banner.classList.add('hidden'), 320);
  });
})();

/* ======= FLOOR PLANS ======= */
(function() {
  const tabs      = document.querySelectorAll('.floor-tab');
  const imgEl     = document.getElementById('floorImage');
  const detailsEl = document.getElementById('floorDetails');
  const fsOverlay = document.getElementById('floorFullscreen');
  const fsImg     = document.getElementById('floorFsImg');
  const fsClose   = document.getElementById('floorFsClose');
  const planWrap  = document.querySelector('.floor-plan-wrap');
  if (!tabs.length || !imgEl) return;

  /* ---- Данные по этажам (v4 — из новых планов) ---- */
  const floorData = {
    1: {
      name: '1 этаж — Торговый',
      totalArea: '678 м²',
      spaces: [
        { name: 'Помещение 11', sq: '56.94 м²' },
        { name: 'Помещение 12', sq: '36.29 м²' },
        { name: 'Помещение 13', sq: '36.49 м²' },
        { name: 'Помещение 14', sq: '54.53 м²' },
        { name: 'Помещение 15', sq: '21.79 м²' },
        { name: 'Помещение 16', sq: '16.48 м²' },
        { name: 'Помещение 17', sq: '44.90 м²' },
        { name: 'Помещение 18', sq: '47.97 м²' },
        { name: 'Помещение 19', sq: '364.14 м²' },
      ]
    },
    2: {
      name: '2 этаж — Торговый',
      totalArea: '740 м²',
      spaces: [
        { name: 'Помещение 21', sq: '60.05 м²' },
        { name: 'Помещение 22', sq: '210.01 м²' },
        { name: 'Помещение 23 (2-й свет)', sq: '155.16 м²' },
        { name: 'Помещение 24', sq: '62.05 м²' },
        { name: 'Помещение 25', sq: '193.66 м²' },
        { name: 'Помещение 26', sq: '60.05 м²' },
      ]
    },
    3: {
      name: '3 этаж — Одежда / обувь',
      totalArea: '842 м²',
      spaces: [
        { name: 'Помещение 31', sq: '302.06 м²' },
        { name: 'Помещение 32', sq: '51.16 м²' },
        { name: 'Помещение 33', sq: '51.19 м²' },
        { name: 'Помещение 34', sq: '51.98 м²' },
        { name: 'Помещение 35', sq: '62.05 м²' },
        { name: 'Помещение 36', sq: '273.13 м²' },
        { name: 'Остров 37', sq: '32.73 м²' },
        { name: 'Остров 38', sq: '18.18 м²' },
      ]
    },
    4: {
      name: '4 этаж — Дети / спорт',
      totalArea: '878 м²',
      spaces: [
        { name: 'Помещение 41', sq: '281.62 м²' },
        { name: 'Помещение 42', sq: '98.53 м²' },
        { name: 'Помещение 43', sq: '51.19 м²' },
        { name: 'Помещение 44', sq: '51.99 м²' },
        { name: 'Помещение 45', sq: '61.89 м²' },
        { name: 'Помещение 46', sq: '271.61 м²' },
        { name: 'Остров 47', sq: '32.73 м²' },
        { name: 'Остров 48', sq: '28.72 м²' },
      ]
    },
    5: {
      name: '5 этаж — Фудкорт',
      totalArea: '1 022 м²',
      spaces: [
        { name: 'Зона фудкорта 55', sq: '727.41 м²' },
        { name: 'Доготовочная 51', sq: '93.86 м²' },
        { name: 'Доготовочная 52', sq: '41.61 м²' },
        { name: 'Доготовочная 53', sq: '53.76 м²' },
        { name: 'Доготовочная 54', sq: '105.44 м²' },
      ]
    },
    6: {
      name: '6 этаж — Развлечения',
      totalArea: '529.93 м²',
      spaces: [
        { name: 'Помещение 6.1', sq: '529.93 м²' },
        { name: 'Второй свет фудкорта', sq: 'открытая планировка' },
      ]
    }
  };

  function updateDetails(n) {
    const d = floorData[n];
    if (!d || !detailsEl) return;
    detailsEl.innerHTML = `
      <h4>${d.name}</h4>
      <div class="floor-area">${d.totalArea}</div>
      <div class="floor-area-label">Общая площадь аренды</div>
      <div class="floor-spaces">
        ${d.spaces.map(s => `
          <div class="floor-space-item">
            <span class="floor-space-name">${s.name}</span>
            <span class="floor-space-sq">${s.sq}</span>
          </div>`).join('')}
      </div>`;
  }

  function switchFloor(n) {
    imgEl.classList.add('fading');
    setTimeout(() => {
      imgEl.src = `floor-${n}.png`;
      imgEl.alt = `План ${n} этажа`;
      imgEl.onload = () => imgEl.classList.remove('fading');
    }, 200);
    updateDetails(n);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchFloor(parseInt(tab.dataset.floor, 10));
    });
  });

  updateDetails(1);

  /* ---- Fullscreen overlay ---- */
  if (planWrap && fsOverlay && fsImg && fsClose) {
    planWrap.addEventListener('click', () => {
      fsImg.src = imgEl.src;
      fsImg.alt = imgEl.alt;
      fsOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    function closeFsOverlay() {
      fsOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    fsClose.addEventListener('click', closeFsOverlay);
    fsOverlay.addEventListener('click', e => {
      if (e.target === fsOverlay) closeFsOverlay();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && fsOverlay.classList.contains('active')) closeFsOverlay();
    });
  }
})();

/* ======= YANDEX MAP ======= */
function initYandexMap() {
  const mapEl = document.getElementById('yandexMap');
  if (!mapEl || typeof ymaps === 'undefined') return;
  ymaps.ready(function() {
    // Точные координаты: ул. Космонавтов, 10А, Витебск
    const coords = [55.18635, 30.21195];

    const map = new ymaps.Map('yandexMap', {
      center: coords,
      zoom: 17,
      controls: ['zoomControl'],
      type: 'yandex#map'
    }, {
      suppressMapOpenBlock: true
    });

    map.behaviors.disable('scrollZoom');

    // Кастомная SVG-иконка MP
    const mpPlacemark = new ymaps.Placemark(coords, {
      hintContent: 'Metro Park — ТРЦ',
      balloonContent: '<strong>ТРЦ Metro Park</strong><br>ул. Космонавтов, 10А<br>г. Витебск'
    }, {
      iconLayout: 'default#image',
      iconImageHref: 'map-pin-mp.svg',
      iconImageSize: [48, 60],
      iconImageOffset: [-24, -60]
    });

    map.geoObjects.add(mpPlacemark);
  });
}
if (typeof ymaps !== 'undefined') initYandexMap();
else { window.initYandexMap = initYandexMap; setTimeout(() => { if (typeof ymaps !== 'undefined') initYandexMap(); }, 2000); }

/* ======= FORM ======= */
(function() {
  const form        = document.getElementById('leasingForm');
  const submitBtn   = document.getElementById('submitBtn');
  const btnText     = submitBtn?.querySelector('.btn-text');
  const btnLoader   = submitBtn?.querySelector('.btn-loader');
  const successEl   = document.getElementById('formSuccess');
  const errorGlobal = document.getElementById('formErrorGlobal');
  const appHeader   = document.getElementById('applicationHeader');
  if (!form) return;

  /* v4 валидация:
     - company_name: только русский текст (буквы, пробелы, «», -, ИП/ООО и т.п.)
     - unp: ровно 9 цифр
     - position: русский текст
     - name (ФИО): русский текст
     - phone: ровно 10 цифр (после удаления всего кроме цифр)
     - email: только латинница + проверка формата (EN-символы в имени и домене)
  */
  const RU_TEXT = /^[А-ЯЁа-яё0-9«»\-\s\.,\/\\()"'№#]+$/;
  const EN_EMAIL = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  const validators = {
    company_name: v => {
      const s = v.trim();
      if (s.length < 2) return 'Введите наименование организации или ИП';
      if (!RU_TEXT.test(s)) return 'Наименование должно содержать текст на русском языке';
      return '';
    },
    unp: v => {
      const s = v.trim();
      if (!/^\d{9}$/.test(s)) return 'УНП должен содержать ровно 9 цифр';
      return '';
    },
    position: v => {
      const s = v.trim();
      if (s.length < 2) return 'Введите должность';
      if (!RU_TEXT.test(s)) return 'Должность укажите на русском языке';
      return '';
    },
    name: v => {
      const s = v.trim();
      if (s.length < 2) return 'Введите ФИО';
      if (!RU_TEXT.test(s)) return 'ФИО укажите на русском языке';
      return '';
    },
    phone: v => {
      // Оставляем только цифры
      const digits = v.replace(/\D/g, '');
      if (digits.length !== 12) return 'Телефон должен содержать ровно 12 цифр';
      return '';
    },
    email: v => {
      if (!v.trim()) return ''; // необязательное поле
      if (!EN_EMAIL.test(v.trim())) return 'Email должен содержать только латинские буквы и иметь корректный формат';
      return '';
    },
    consent: v => v ? '' : 'Необходимо ваше согласие на обработку данных'
  };

  function showError(id, msg) {
    const field = document.getElementById(id);
    const err   = document.getElementById(id + 'Error');
    if (field) field.classList.toggle('error', !!msg);
    if (err)   err.textContent = msg || '';
  }
  function validateField(id) {
    if (!validators[id]) return true;
    const field = document.getElementById(id);
    if (!field) return true;
    const val = id === 'consent' ? field.checked : field.value;
    const err = validators[id](val);
    showError(id, err);
    return !err;
  }

  ['company_name','unp','position','name','phone','email'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => validateField(id));
    el.addEventListener('input', () => { if (el.classList.contains('error')) validateField(id); });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const required = ['company_name','unp','position','name','phone','consent'];
    const optEmail = validateField('email');
    const allValid = required.map(id => validateField(id)).every(Boolean) && optEmail;
    if (!allValid) {
      const firstErr = form.querySelector('.error');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submitBtn.disabled = true;
    if (btnText) btnText.hidden = true;
    if (btnLoader) btnLoader.hidden = false;
    errorGlobal.hidden = true;

    const data = {
      company_name: document.getElementById('company_name').value.trim(),
      unp:          document.getElementById('unp').value.trim(),
      position:     document.getElementById('position').value.trim(),
      name:         document.getElementById('name').value.trim(),
      phone:        document.getElementById('phone').value.trim(),
      email:        document.getElementById('email').value.trim(),
      object_name:  document.getElementById('object_name').value.trim(),
      business:     document.getElementById('business').value,
      floor:        document.getElementById('floor').value,
      areaFrom:     document.getElementById('areaFrom').value,
      areaTo:       document.getElementById('areaTo').value,
      maxRate:      document.getElementById('maxRate').value,
      message:      document.getElementById('message').value.trim(),
      consent:      'Да',
      timestamp:    new Date().toISOString()
    };

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      // Скрываем сразу, без анимации — чтобы секция сразу пересчитала высоту
      if (appHeader) {
        appHeader.style.display = 'none';
      }
      form.style.display = 'none';

      // Показываем блок успеха (управляем только через display, без hidden-атрибута)
      successEl.style.display = 'flex';
      successEl.style.opacity = '0';
      successEl.style.transition = 'opacity 0.4s';
      // Принудительный reflow чтобы transition сработал
      successEl.offsetHeight;
      successEl.style.opacity = '1';
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      errorGlobal.hidden = false;
      errorGlobal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      submitBtn.disabled = false;
      if (btnText) btnText.hidden = false;
      if (btnLoader) btnLoader.hidden = true;
    }
  });
})();

/* ======= SMOOTH SCROLL ======= */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - hh - 12, behavior: 'smooth' });
  });
});

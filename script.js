'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const config = typeof WEB_CONFIG !== 'undefined' ? WEB_CONFIG : null;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  // Datos editables da comisión, do calendario, da localización e das redes.
  if (config) {
    $$('[data-edit="nombreComision"]').forEach(el => { el.textContent = config.nombreComision; });
    $$('[data-edit="nombreLugar"]').forEach(el => { el.textContent = config.nombreLugar; });
    if (config.evento) {
      $('#event-date').textContent = config.evento.fecha || 'DATA POR CONFIRMAR';
      $('#event-name').textContent = config.evento.nombre || 'Próximas festas';
      $('#event-description').textContent = config.evento.descripcion || '';
      $('#event-place').textContent = (config.evento.lugar || 'Atios · A Rocha').toLocaleUpperCase('gl');
    }
    if (config.nombreComision) {
      $('.footer-brand').firstChild.textContent = config.nombreComision;
      document.title = `${config.nombreCompleto || config.nombreComision} · Tasca da Rocha`;
    }

    if (config.direccion) {
      // Mostramos o enderezo facilitado pola comisión.
      $('#place-address').textContent = config.direccion;
    }
    // Ligazón directa proporcionada pola comisión; sen depender dunha busca do enderezo.
    if (typeof config.mapa === 'string') {
      try {
        const mapaUrl = new URL(config.mapa);
        const hostsAdmitidos = new Set(['maps.app.goo.gl', 'www.google.com', 'google.com', 'maps.google.com']);
        if (mapaUrl.protocol === 'https:' && hostsAdmitidos.has(mapaUrl.hostname)) {
          $('#maps-link').href = mapaUrl.href;
        }
      } catch (_) {
        // Mantemos a ligazón que está no HTML se a configuración non é válida.
      }
    }

    const redes = config.redes || {};
    const redeInfo = [
      {name: 'instagram', label: 'Instagram'},
      {name: 'facebook', label: 'Facebook'}
    ];
    redeInfo.forEach(({name, label}) => {
      const address = redes[name];
      const card = $(`#${name}-link`);
      if (typeof address === 'string' && /^https:\/\//i.test(address.trim())) {
        card.href = address.trim();
        card.setAttribute('aria-label', `Visitar o noso ${label}`);
        if (name === 'instagram') $(`#${name}-description`).textContent = '@san_benito_da_rocha_atios';
        else $(`#${name}-description`).textContent = 'Comisión de Festas San Benito da Rocha Atios';
        $(`#${name}-cta`).textContent = 'Visitar o perfil ↗';
      }
    });
    if (redes.instagram && redes.facebook) {
      $('#social-disclaimer').textContent = 'Síguenos nas nosas redes sociais para coñecer as novidades da comisión e das festas.';
    }

    const links = $('#contact-links');
    const channels = config.contacto || {};
    const contactButtons = [
      { label: 'Escribir un correo ↗', value: channels.email, href: channels.email ? `mailto:${channels.email}` : '', type: 'email' },
      { label: 'WhatsApp ↗', value: channels.whatsapp, href: channels.whatsapp ? `https://wa.me/${channels.whatsapp.replace(/\D/g, '')}` : '', type: 'phone' }
    ];
    contactButtons.forEach(({label, value, href, type}) => {
      if (!value || !href) return;
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.className = 'button button-contact';
      anchor.textContent = label;
      if (type === 'phone') { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
      links.appendChild(anchor);
    });
    if (links.children.length) {
      $('#contact-info').textContent = 'Podes escribirnos por estas vías:';
    }
  }

  $('#year').textContent = new Date().getFullYear();

  // Menú adaptable ao móbil.
  const menuButton = $('.menu-toggle');
  const menu = $('#main-menu');
  const closeMenu = () => {
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir o menú');
    document.body.classList.remove('menu-open');
  };
  menuButton.addEventListener('click', () => {
    const willOpen = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', willOpen);
    menuButton.setAttribute('aria-expanded', String(willOpen));
    menuButton.setAttribute('aria-label', willOpen ? 'Pechar o menú' : 'Abrir o menú');
    document.body.classList.toggle('menu-open', willOpen);
  });
  $$('#main-menu a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', e => {
    if (menu.classList.contains('is-open') && !e.target.closest('.nav')) closeMenu();
  });

  // Visor de fotos con flechas y tecla Escape.
  const photos = $$('.gallery-photo');
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightbox-image');
  const lightboxCaption = $('#lightbox-caption');
  const lightboxCount = $('#lightbox-count');
  const closeBtn = $('#lightbox-close');
  let currentPhoto = 0;
  let previousFocus = null;
  let touchStartX = 0;
  const renderPhoto = () => {
    const item = photos[currentPhoto];
    lightboxImg.src = item.dataset.full;
    lightboxImg.alt = item.querySelector('img').alt;
    lightboxCaption.textContent = item.dataset.caption;
    lightboxCount.textContent = `${String(currentPhoto + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
  };
  const openLightbox = index => {
    previousFocus = document.activeElement;
    currentPhoto = index;
    renderPhoto();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    closeBtn.focus();
  };
  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    lightboxImg.removeAttribute('src');
    if (previousFocus) previousFocus.focus();
  };
  const step = direction => { currentPhoto = (currentPhoto + direction + photos.length) % photos.length; renderPhoto(); };
  photos.forEach((photo, index) => photo.addEventListener('click', () => openLightbox(index)));
  closeBtn.addEventListener('click', closeLightbox);
  $('#lightbox-prev').addEventListener('click', () => step(-1));
  $('#lightbox-next').addEventListener('click', () => step(1));
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeMenu(); if (lightbox.classList.contains('is-open')) closeLightbox(); }
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'Tab') {
      const controls = $$('.lightbox button');
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
    }
  });
  lightbox.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive:true});
  lightbox.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 65) step(delta < 0 ? 1 : -1);
  }, {passive:true});

  // Animación suave, respectando a preferencia de movemento reducido.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, {threshold: 0.08, rootMargin: '0px 0px 60px 0px'});
    $$('.reveal').forEach(el => observer.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('visible'));


});

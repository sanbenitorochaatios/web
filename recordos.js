/* Recordos da Rocha. Non envía nada ata configurar Supabase + Turnstile. */
(() => {
  'use strict';
  const config = window.RECORDOS_CONFIG || {};
  const form = document.getElementById('recordos-form');
  const submit = document.getElementById('recordos-enviar');
  const feedback = document.getElementById('recordos-feedback');
  const list = document.getElementById('recordos-grid');
  const listStatus = document.getElementById('recordos-list-status');
  const ready = /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/recordos-api\/?$/i.test(config.apiUrl || '')
    && /^[A-Za-z0-9_-]{10,}$/.test(config.turnstileSiteKey || '');
  let widgetId = null;
  let submitting = false;
  let turnstileVerified = false;
  let policyRead = false;
  const privacyCheck = document.getElementById('recordos-privacidade-confirm');
  const publishCheck = document.getElementById('recordos-consentimento');
  const privacyOpen = document.getElementById('recordos-privacy-open');
  const privacyDialog = document.getElementById('recordos-privacy-dialog');
  const privacyClose = document.getElementById('recordos-privacy-close');
  const privacyScroll = document.getElementById('recordos-privacy-scroll');
  const privacyProgress = document.getElementById('recordos-privacy-progress');
  const privacyDone = document.getElementById('recordos-privacy-done');
  let policyLoaded = false;
  let policyReachedEnd = false;

  function refreshSubmit() {
    submit.disabled = !(
      ready && !submitting && policyRead && privacyCheck.checked &&
      publishCheck.checked && turnstileVerified
    );
  }

  function checkPolicyScroll() {
    if (!policyLoaded) return;
    const remaining = privacyScroll.scrollHeight - privacyScroll.scrollTop - privacyScroll.clientHeight;
    if (remaining <= 24) {
      policyReachedEnd = true;
      privacyDone.disabled = false;
      privacyProgress.textContent = 'Chegaches ao final do aviso. Podes confirmar que o consultaches.';
    }
  }

  async function openPrivacy() {
    if (!privacyDialog.open) privacyDialog.showModal();
    privacyDone.disabled = !policyReachedEnd;
    if (policyLoaded) return;
    privacyProgress.textContent = 'Cargando a información…';
    try {
      const response = await fetch('privacidade.html', { cache: 'no-store' });
      if (!response.ok) throw new Error('Non se puido abrir a páxina de privacidade.');
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      const main = source.querySelector('main');
      if (!main) throw new Error('Non se atopou o texto de privacidade.');
      // Este HTML procede do documento da mesma web, non dos comentarios dos visitantes.
      const content = main.cloneNode(true);
      content.querySelectorAll('a[href*="index.html"]').forEach(link => link.remove());
      privacyScroll.replaceChildren(...Array.from(content.childNodes));
      policyLoaded = true;
      privacyScroll.scrollTop = 0;
      privacyProgress.textContent = 'Le o aviso e desprázate ata o final.';
      checkPolicyScroll();
    } catch (err) {
      privacyScroll.replaceChildren();
      const message = document.createElement('p');
      message.textContent = 'Non se puido cargar o aviso. Podes consultalo na ligazón do formulario e probar de novo.';
      privacyScroll.appendChild(message);
      privacyProgress.textContent = 'Non se puido abrir o aviso.';
    }
  }

  privacyOpen.addEventListener('click', openPrivacy);
  privacyClose.addEventListener('click', () => privacyDialog.close());
  privacyScroll.addEventListener('scroll', checkPolicyScroll, { passive: true });
  privacyDone.addEventListener('click', () => {
    if (!policyReachedEnd) return;
    policyRead = true;
    privacyCheck.disabled = false;
    privacyDialog.close();
    privacyCheck.focus();
    refreshSubmit();
  });
  privacyCheck.addEventListener('change', refreshSubmit);
  publishCheck.addEventListener('change', refreshSubmit);
  form.addEventListener('reset', () => {
    // Tras un envío, as dúas caixas volven quedar sen marcar.
    // Se xa se consultou a política, non é necesario abrila outra vez nesta sesión.
    queueMicrotask(refreshSubmit);
  });

  function status(message, kind = '') {
    feedback.textContent = message;
    feedback.dataset.status = kind;
  }
  function el(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function draw(items) {
    list.replaceChildren();
    if (!items.length) {
      listStatus.hidden = false;
      listStatus.textContent = 'Aínda non hai recordos publicados. Podes enviar o primeiro.';
      return;
    }
    listStatus.hidden = true;
    const dateFmt = new Intl.DateTimeFormat('gl-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    for (const item of items) {
      const card = el('article', 'recordos-card');
      if (item.foto_url && /^https:\/\//.test(item.foto_url)) {
        const img = el('img');
        img.src = item.foto_url;
        img.alt = `Foto compartida por ${item.nome || 'unha persoa da veciñanza'}`;
        img.loading = 'lazy';
        card.appendChild(img);
      }
      const content = el('div', 'recordos-card-body');
      const meta = el('div', 'recordos-card-meta');
      meta.appendChild(el('span', 'recordos-card-name', item.nome || 'Persoa da veciñanza'));
      const d = new Date(item.created_at);
      if (!Number.isNaN(d.getTime())) meta.appendChild(el('time', 'recordos-card-date', dateFmt.format(d)));
      content.appendChild(meta);
      if (item.comentario) content.appendChild(el('p', 'recordos-card-text', item.comentario));
      card.appendChild(content);
      list.appendChild(card);
    }
  }
  async function getPosts() {
    listStatus.hidden = false;
    listStatus.textContent = 'Cargando os recordos…';
    try {
      const response = await fetch(config.apiUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('erro');
      const data = await response.json();
      draw(Array.isArray(data.recordos) ? data.recordos : []);
    } catch (_) {
      listStatus.textContent = 'Non se puideron cargar os recordos. Proba de novo máis tarde.';
    }
  }
  async function loadTurnstile() {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      const begin = () => {
        if (!window.turnstile) return;
        try {
          widgetId = window.turnstile.render('#recordos-turnstile', {
            sitekey: config.turnstileSiteKey,
            theme: 'light',
            callback: () => { turnstileVerified = true; refreshSubmit(); },
            'expired-callback': () => { turnstileVerified = false; refreshSubmit(); },
            'error-callback': (codigo) => { turnstileVerified = false; refreshSubmit(); status('Erro de Cloudflare: ' + (codigo || 'descoñecido') + '. Proba a actualizar a páxina.', 'error'); }
          });
        } catch (_) { status('O formulario non se puido activar. Proba máis tarde.', 'error'); }
      };
      begin();
    };
    script.onerror = () => status('Non foi posible cargar a comprobación de seguridade.', 'error');
    document.head.appendChild(script);
  }
  async function cleanPhoto(file) {
    // Canvas borra normalmente metadatos EXIF (incluída a xeolocalización) e comprime.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); throw new Error('Non foi posible preparar a fotografía.'); }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Non foi posible preparar a fotografía.')), 'image/jpeg', .83));
    if (blob.size > 5 * 1024 * 1024) throw new Error('A fotografía é demasiado grande.');
    return new File([blob], 'recordo.jpg', { type: 'image/jpeg' });
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!ready || submitting) return;
    const nome = form.elements.namedItem('nome').value.trim();
    const comentario = form.elements.namedItem('comentario').value.trim();
    const photo = form.elements.namedItem('foto').files[0] || null;
    if (!comentario && !photo) return status('Escribe un comentario ou escolle unha foto.', 'error');
    if (photo && (photo.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type))) {
      return status('A foto debe ser JPG, PNG ou WebP e ocupar como máximo 5 MB.', 'error');
    }
    if (!policyRead || !privacyCheck.checked) return status('Debes consultar e confirmar a información de privacidade.', 'error');
    if (!publishCheck.checked) return status('Debes aceptar a autorización de publicación.', 'error');
    const token = widgetId !== null && window.turnstile ? window.turnstile.getResponse(widgetId) : '';
    if (!token) return status('Completa a comprobación de seguridade.', 'error');
    const body = new FormData();
    body.set('nome', nome);
    body.set('comentario', comentario);
    body.set('consentimento', 'si');
    // A confirmación de información compróbase tamén na interface; non se almacena no servidor.
    body.set('privacidade_confirmada', 'si');
    body.set('turnstile', token);
    if (photo) {
      try { body.set('foto', await cleanPhoto(photo)); }
      catch (err) { return status(err.message || 'Non foi posible preparar a foto.', 'error'); }
    }
    submitting = true;
    refreshSubmit();
    status('Enviando…');
    try {
      const response = await fetch(config.apiUrl, { method: 'POST', body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Non se puido completar o envío.');
      form.reset();
      status('Enviado! A comisión revisará a túa achega antes de que apareza na web.', 'ok');
    } catch (err) {
      status(err.message || 'Produciuse un erro ao enviar. Proba de novo.', 'error');
    } finally {
      submitting = false;
      turnstileVerified = false;
      if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
      refreshSubmit();
    }
  });
  refreshSubmit();
  if (ready) {
    getPosts();
    loadTurnstile();
    status('As achegas revísanse antes de publicarse.');
  } else {
    listStatus.textContent = 'A galería veciñal aínda non está activada. A comisión está preparando esta sección.';
  }
})();

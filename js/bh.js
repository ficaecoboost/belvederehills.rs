/* Belvedere Hills - skripte sajta */
(function ($) {
  'use strict';

  // Godina u futeru
  $('.js-year').text(new Date().getFullYear());

  // Meni: tamna pozadina posle skrola
  var $nav = $('.bh-nav');
  function navState() { $nav.toggleClass('scrolled', $(window).scrollTop() > 40); }
  $(window).on('scroll', navState); navState();

  // Plutajuće dugme na telefonu: pojavi se tek kad se skroluje pored dugmadi u hero delu
  var $mobileCta = $('.bh-mobile-cta');
  var $heroBtns = $('.bh-hero-btns');
  function mobileCtaState() {
    var limit = $heroBtns.length ? $heroBtns.offset().top + $heroBtns.outerHeight() : 300;
    $mobileCta.toggleClass('is-shown', $(window).scrollTop() > limit);
  }
  $(window).on('scroll resize', mobileCtaState); mobileCtaState();

  // Zatvori mobilni meni posle klika na link
  $('#glavniMeni .nav-link').on('click', function () {
    if ($('.navbar-toggler').is(':visible')) { $('#glavniMeni').collapse('hide'); }
  });

  // Animacija pri skrolu
  var $anim = $('.element-animate');
  if ('IntersectionObserver' in window) {
    $('html').addClass('bh-anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { $(en.target).addClass('fadeInUp element-animated'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -5% 0px' });
    $anim.each(function () { io.observe(this); });
  } else {
    $anim.addClass('element-animated');
  }

  // Brojač u traci ispod hero-a: broji od nule kad traka uđe u ekran
  var $counters = $('.bh-facts strong');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ($counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    var NUM = /\d+(?:,\d+)?/g;
    function fmt(val, dec) { return val.toFixed(dec).replace('.', ','); }
    $counters.each(function () {
      var el = this;
      el.setAttribute('data-final', el.textContent);
      el.textContent = el.textContent.replace(NUM, function (m) { return fmt(0, (m.split(',')[1] || '').length); });
    });
    var countIo = new IntersectionObserver(function (entries) {
      if (!entries.some(function (en) { return en.isIntersecting; })) { return; }
      countIo.disconnect();
      var DUR = 1800, start = null;
      function step(ts) {
        if (start === null) { start = ts; }
        var p = Math.min((ts - start) / DUR, 1);
        var e = 1 - Math.pow(1 - p, 3); // usporava pri kraju
        $counters.each(function () {
          var fin = this.getAttribute('data-final');
          this.textContent = p < 1 ? fin.replace(NUM, function (m) {
            var dec = (m.split(',')[1] || '').length;
            return fmt(parseFloat(m.replace(',', '.')) * e, dec);
          }) : fin;
        });
        if (p < 1) { requestAnimationFrame(step); }
      }
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    countIo.observe($('.bh-facts')[0]);
  }

  // Kolaž "O apartmanima": otkrivanje pri dolasku + paralaksa pri skrolu
  $('.bh-collage').each(function () {
    var col = this, $col = $(this);
    $col.find('.c-img').each(function () { this.style.setProperty('--speed', $(this).data('speed') || 0); });
    function done() { $col.addClass('is-in'); setTimeout(function () { $col.addClass('is-done'); }, 2400); }
    if ('IntersectionObserver' in window && !reduceMotion) {
      var cio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { done(); cio.disconnect(); }
      }, { threshold: 0.25 });
      cio.observe(col);
    } else { $col.addClass('is-in is-done'); }

    if (reduceMotion) { return; }
    var ticking = false;
    function parallax() {
      var r = col.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh)); // -1 iznad ... 1 ispod sredine ekrana
      col.style.setProperty('--p', p.toFixed(3));
      ticking = false;
    }
    $(window).on('scroll resize', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } });
    parallax();
  });

  // Recenzije: "Pročitaj više" samo kod skraćenih
  $('.bh-review').each(function () {
    var $r = $(this), q = $r.find('blockquote')[0];
    if (!q || q.scrollHeight <= q.clientHeight + 2) { return; }
    $('<button type="button" class="bh-review-more">Pročitaj više</button>').insertAfter(q).on('click', function () {
      var open = $r.toggleClass('is-open').hasClass('is-open');
      $(this).text(open ? 'Prikaži manje' : 'Pročitaj više');
    });
  });

  // Kolaž: prelaz mišem se računa po POČETNOJ (nepomerenoj) zoni slike, ne po trenutnoj.
  // Inače se slika na ivici pomeri ispod kursora, "izgubi" hover, vrati se i tako u krug (treperenje).
  (function () {
    var col = document.querySelector('.bh-collage');
    if (!col || !(window.matchMedia && window.matchMedia('(hover: hover)').matches)) { return; }
    var slike = [].slice.call(col.querySelectorAll('.c-img'));
    var red = ['c-detail', 'c-main', 'c-small']; // koja je "na vrhu" kad se zone preklapaju
    slike.sort(function (a, b) {
      return red.indexOf(red.filter(function (c) { return a.classList.contains(c); })[0]) - red.indexOf(red.filter(function (c) { return b.classList.contains(c); })[0]);
    });
    var aktivna = null;
    function zona(el) { // položaj u rasporedu + pomeraj od paralakse (bez pomeraja od hovera)
      var p = parseFloat(col.style.getPropertyValue('--p')) || 0, sp = parseFloat(el.getAttribute('data-speed')) || 0;
      return { l: el.offsetLeft, t: el.offsetTop + p * sp, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + p * sp + el.offsetHeight };
    }
    function unutra(z, x, y) { return x >= z.l && x <= z.r && y >= z.t && y <= z.b; }
    function postavi(el) {
      if (el === aktivna) { return; }
      if (aktivna) { aktivna.classList.remove('is-hover'); }
      aktivna = el;
      if (el) { el.classList.add('is-hover'); $(col).trigger('bh:pomeri', [el]); }
    }
    col.addEventListener('mousemove', function (e) {
      if (!col.classList.contains('is-done')) { return; }
      var cr = col.getBoundingClientRect(), x = e.clientX - cr.left, y = e.clientY - cr.top;
      if (aktivna && unutra(zona(aktivna), x, y)) { return; } // ostaje ista dok je kursor u njenoj zoni
      var nova = null;
      for (var i = 0; i < slike.length; i++) { if (unutra(zona(slike[i]), x, y)) { nova = slike[i]; break; } }
      postavi(nova);
    });
    col.addEventListener('mouseleave', function () { postavi(null); });
  })();

  // Kolaž: kad se slika pomeri na hover, strese se snežna prašina (samo zimi, samo uz miš)
  (function () {
    var col = document.querySelector('.bh-collage');
    var mis = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (!col || !mis || reduceMotion) { return; }
    var cv = document.createElement('canvas'); cv.className = 'bh-prasina'; cv.setAttribute('aria-hidden', 'true');
    col.appendChild(cv);
    var cx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), cest = [], radi = false, last = 0, W = 0, H = 0;
    // mekana bela tačkica, iscrtana jednom
    var tacka = document.createElement('canvas'); tacka.width = tacka.height = 16;
    var tg = tacka.getContext('2d'), gr = tg.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(246,249,253,.9)'); gr.addColorStop(.8, 'rgba(170,188,210,.22)'); gr.addColorStop(1, 'rgba(170,188,210,0)'); // senka na ivici: vidi se i na svetloj pozadini
    tg.fillStyle = gr; tg.fillRect(0, 0, 16, 16);
    // pravac pomeranja svake slike (isto kao u CSS-u)
    var smer = { 'c-small': [-0.3, -1], 'c-main': [1, 0], 'c-detail': [-0.3, 1] };
    var PAD = 60; // canvas je malo veći od kolaža, da prašina može da izađe van
    function velicina() {
      W = col.clientWidth + PAD * 2; H = col.clientHeight + PAD * 2;
      cv.width = W * dpr; cv.height = H * dpr;
    }
    velicina(); window.addEventListener('resize', velicina);
    function prospi(img) {
      var cr = col.getBoundingClientRect(), r = img.getBoundingClientRect();
      var k = Object.keys(smer).filter(function (c) { return img.classList.contains(c); })[0], s = smer[k] || [0, -1];
      var x0 = r.left - cr.left + PAD, y0 = r.top - cr.top + PAD, w = r.width, h = r.height, n = 220;
      // sneg se strese sa SVIH ivica osim prednje (one u čijem se smeru slika kreće):
      // svaka čestica odleti od svoje ivice ka spolja, uz blago zanošenje suprotno od pomeranja
      var horiz = Math.abs(s[0]) >= Math.abs(s[1]);
      var prednja = horiz ? (s[0] > 0 ? 'desna' : 'leva') : (s[1] > 0 ? 'donja' : 'gornja');
      var ivice = [
        { ime: 'gornja', duz: w, n: [0, -1] }, { ime: 'donja', duz: w, n: [0, 1] },
        { ime: 'leva', duz: h, n: [-1, 0] }, { ime: 'desna', duz: h, n: [1, 0] }
      ].filter(function (iv) { return iv.ime !== prednja; });
      var ukDuz = ivice.reduce(function (z, iv) { return z + iv.duz; }, 0);
      for (var i = 0; i < n; i++) {
        var q = Math.random() * ukDuz, iv = ivice[0];
        for (var j = 0; j < ivice.length; j++) { if (q < ivice[j].duz) { iv = ivice[j]; break; } q -= ivice[j].duz; }
        var t = Math.random(), x, y;
        if (iv.ime === 'gornja') { x = x0 + t * w; y = y0 + Math.random() * 6; }
        else if (iv.ime === 'donja') { x = x0 + t * w; y = y0 + h - Math.random() * 6; }
        else if (iv.ime === 'leva') { x = x0 + Math.random() * 6; y = y0 + t * h; }
        else { x = x0 + w - Math.random() * 6; y = y0 + t * h; }
        var b = 35 + Math.random() * 100, bok = (Math.random() - 0.5) * 40;
        var vx = iv.n[0] * b + (iv.n[0] ? 0 : bok) - s[0] * 30;
        var vy = iv.n[1] * b * 0.8 + (iv.n[1] ? 0 : bok) - s[1] * 25;
        cest.push({ x: x, y: y, vx: vx, vy: vy, r: 1.2 + Math.random() * 2.8, a: 0.7 + Math.random() * 0.3, t: 0, zivot: 0.7 + Math.random() * 0.8 });
      }
      if (!radi) { radi = true; last = 0; requestAnimationFrame(korak); }
    }
    function korak(ts) {
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
      for (var i = cest.length - 1; i >= 0; i--) {
        var p = cest[i]; p.t += dt;
        if (p.t >= p.zivot) { cest.splice(i, 1); continue; }
        p.vy += 140 * dt; p.vx *= 0.97; p.x += p.vx * dt; p.y += p.vy * dt;
        cx.globalAlpha = p.a * (1 - p.t / p.zivot);
        cx.drawImage(tacka, p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4);
      }
      if (cest.length) { requestAnimationFrame(korak); } else { radi = false; cx.clearRect(0, 0, W, H); }
    }
    // slika je dobila hover (vidi gore) -> jedan nalet prašine po ulasku
    $(col).on('bh:pomeri', function (e, img) {
      if (!document.body.classList.contains('bh-zima')) { return; } // samo zimi (js/sneg.js)
      setTimeout(function () { prospi(img); }, 60); // kad slika krene da se pomera
    });
  })();

  // Potpis u futeru (greben + BH pečat) se iscrta kad futer uđe u ekran
  $('.bh-signet').each(function () {
    var el = this;
    if (!('IntersectionObserver' in window)) { $(el).addClass('is-drawn'); return; }
    var sio = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { $(el).addClass('is-drawn'); sio.disconnect(); }
    }, { threshold: 0.6 });
    sio.observe(el);
  });

  // Mapa se učitava tek na klik
  $('.bh-map-ph').on('click', '.bh-map-btn', function () {
    var $ph = $(this).closest('.bh-map-ph');
    $('<iframe>', { src: $ph.data('map'), title: 'Mapa - Belvedere Hills, Kopaonik', allowfullscreen: true }).insertAfter($ph);
    $ph.remove();
  });

  // Galerija: filter + "prikaži još"
  $('.bh-gallery').each(function () {
    var $gal = $(this);
    var $section = $gal.closest('section');
    var $btns = $section.find('.bh-filter button');
    var $more = $section.find('.bh-more');
    var STEP = 8;
    var shown = STEP;

    function render() {
      var cat = $btns.filter('.active').data('filter');
      var $items = $gal.find('.gal-item').removeClass('is-visible');
      var $inCat = $items.filter('[data-cat="' + cat + '"]');
      $inCat.slice(0, shown).addClass('is-visible');
      $more.toggle($inCat.length > shown);
    }
    $btns.on('click', function () {
      $btns.removeClass('active').attr('aria-selected', 'false');
      $(this).addClass('active').attr('aria-selected', 'true');
      shown = STEP; render();
    });
    $more.on('click', function () { shown += 12; render(); });
    render();

    // Lightbox samo kroz trenutno vidljive fotografije
    $gal.on('click', '.gal-item', function (e) {
      e.preventDefault();
      var $vis = $gal.find('.gal-item.is-visible');
      var items = $vis.map(function () { return { src: $(this).attr('href') }; }).get();
      $.magnificPopup.open({
        items: items, type: 'image', gallery: { enabled: true },
        tClose: 'Zatvori (Esc)', tLoading: 'Učitavanje...',
        mainClass: 'mfp-fade'
      }, $vis.index(this));
    });
  });

  // Stranice apartmana: sve fotografije (i skrivene) i osnove u lightbox-u
  $('.bh-mosaic, .bh-plans').each(function () {
    $(this).magnificPopup({
      delegate: 'a', type: 'image', gallery: { enabled: true },
      tClose: 'Zatvori (Esc)', tLoading: 'Učitavanje...', mainClass: 'mfp-fade'
    });
  });

  // Pojedinačne slike (osnove, raspored)
  $('.image-popup-single').magnificPopup({ type: 'image', tClose: 'Zatvori (Esc)', mainClass: 'mfp-fade' });
  $('.bh-apt-plan').each(function () {
    $(this).find('.image-popup-plan').magnificPopup({ type: 'image', gallery: { enabled: true }, tClose: 'Zatvori (Esc)', mainClass: 'mfp-fade' });
  });

  // ===== Forma za upit =====
  var $form = $('#formaUpit');
  if (!$form.length) { return; }
  var $msg = $('.bh-form-msg');

  function showMsg(ok, text) {
    $msg.removeClass('alert-success alert-danger')
        .addClass(ok ? 'alert-success' : 'alert-danger')
        .text(text).prop('hidden', false);
    $('html, body').animate({ scrollTop: $msg.offset().top - 120 }, 300);
  }

  // Popuni tip apartmana iz linka (kontakt.html?tip=trosoban)
  var params = new URLSearchParams(window.location.search);
  if (params.get('tip')) { $('#tip').val(params.get('tip')); }
  if (params.get('poslato')) { showMsg(true, 'Hvala! Vaš upit je poslat. Javićemo vam se u najkraćem roku.'); }
  if (params.get('greska')) { showMsg(false, 'Upit nije poslat. Proverite podatke ili nas pozovite na +381 62 779 878.'); }

  // Datumi: ne pre danas, odlazak posle dolaska
  function iso(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  var today = iso(new Date());
  $('#dolazak').attr('min', today);
  $('#odlazak').attr('min', today);
  $('#dolazak').on('change', function () {
    var v = this.value; if (!v) { return; }
    var next = new Date(v); next.setDate(next.getDate() + 1);
    $('#odlazak').attr('min', iso(next));
    if (!$('#odlazak').val() || $('#odlazak').val() <= v) { $('#odlazak').val(iso(next)); }
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    var form = this;
    $form.find('.is-invalid').removeClass('is-invalid');

    var bad = $form.find(':input[required]').filter(function () {
      return this.type === 'checkbox' ? !this.checked : !this.checkValidity();
    });
    if ($('#odlazak').val() && $('#odlazak').val() <= $('#dolazak').val()) { bad = bad.add('#odlazak'); }
    if (bad.length) {
      bad.addClass('is-invalid');
      showMsg(false, 'Molimo popunite sva obavezna polja (označena zvezdicom).');
      bad.first().trigger('focus');
      return;
    }

    var $btn = $form.find('[type=submit]').prop('disabled', true).text('Šaljem...');
    $.ajax({
      url: $form.attr('action'), method: 'POST', data: $form.serialize(), dataType: 'json',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).done(function (r) {
      showMsg(r.ok, r.poruka);
      if (r.ok) {
        // Događaj za Google Tag Manager / GA4 (okidač: prilagođeni događaj "upit_poslat")
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'upit_poslat', tip_apartmana: $('#tip').val() });
        form.reset();
      }
    }).fail(function (xhr) {
      var t = (xhr.responseJSON && xhr.responseJSON.poruka) ||
        'Upit trenutno ne može da se pošalje. Pozovite nas na +381 62 779 878 ili pišite na info@belvederehills.rs.';
      showMsg(false, t);
    }).always(function () {
      $btn.prop('disabled', false).text('Pošalji upit');
    });
  });

})(jQuery);

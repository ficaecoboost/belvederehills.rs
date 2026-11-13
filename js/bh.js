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
      if (el) { el.classList.add('is-hover'); }
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

    // Probna verzija na GitHub Pages nema PHP, pa forma tamo ne može da pošalje upit
    if (/github\.io$/.test(location.hostname)) {
      showMsg(false, 'Ovo je probna verzija sajta i forma ovde ne šalje upite. Pozovite nas na +381 62 779 878 ili pišite na info@belvederehills.rs.');
      return;
    }

    var $btn = $form.find('[type=submit]').prop('disabled', true).text('Šaljem...');
    $.ajax({
      url: $form.attr('action'), method: 'POST', data: $form.serialize(), dataType: 'json',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).done(function (r) {
      showMsg(r.ok, r.poruka);
      if (r.ok) {
        // GA4 događaj "poslat upit" (šalje se samo uz pristanak za kolačiće, js/analitika.js)
        if (window.bhDogadjaj) { window.bhDogadjaj('generate_lead', { tip_apartmana: $('#tip').val() || 'nije izabran' }); }
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

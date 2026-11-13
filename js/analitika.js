/* =========================================================
   Google Analytics 4 + saglasnost za kolačiće (baner)
   - GA4 se učitava TEK kad posetilac klikne "Prihvatam" (Consent Mode v2, osnovni režim).
     Bez pristanka se ka Google-u ne šalje ništa i ne postavljaju se kolačići.
   - Izbor se pamti u browseru 12 meseci (localStorage "bh-kolacici"), pa se baner opet pita.
   - Link sa atributom data-kolacici (u futeru: "Podešavanja kolačića") ponovo otvara baner.
   - Događaji: generate_lead (poslat upit, iz js/bh.js), kontakt_klik (telefon, Viber, WhatsApp, e-mail).
   UPISATI pravi GA4 Measurement ID ispod. Dok je tu G-XXXXXXXXXX, GA4 se ne učitava ni uz pristanak.
   ========================================================= */
(function () {
  var GA_ID = 'G-XXXXXXXXXX';
  var KLJUC = 'bh-kolacici', TRAJE = 365 * 24 * 3600 * 1000;
  var aktivan = /^G-[A-Z0-9]+$/.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
  });

  function procitaj() {
    try {
      var z = JSON.parse(localStorage.getItem(KLJUC) || 'null');
      if (z && (z.v === 'da' || z.v === 'ne') && Date.now() - z.t < TRAJE) { return z.v; }
    } catch (e) {}
    return null;
  }
  function upisi(v) {
    try { localStorage.setItem(KLJUC, JSON.stringify({ v: v, t: Date.now() })); } catch (e) {}
  }

  var ucitan = false;
  function ucitajGA() {
    if (!aktivan || ucitan) { return; }
    ucitan = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }
  // Brisanje GA kolačića posle odbijanja / povlačenja pristanka
  function obrisiGA() {
    var delovi = location.hostname.split('.'), domeni = [location.hostname];
    for (var i = 1; i < delovi.length - 1; i++) { domeni.push('.' + delovi.slice(i).join('.')); }
    document.cookie.split(';').forEach(function (c) {
      var ime = c.split('=')[0].trim();
      if (ime === '_ga' || ime.indexOf('_ga_') === 0) {
        domeni.concat(['']).forEach(function (d) {
          document.cookie = ime + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  var izbor = procitaj();
  if (izbor === 'da') { ucitajGA(); }

  // Događaji za analitiku (rade samo ako je GA4 učitan uz pristanak)
  window.bhDogadjaj = function (ime, parametri) {
    if (ucitan) { gtag('event', ime, parametri || {}); }
  };

  // ---------- Baner ----------
  var baner = null;
  function zatvori() { if (baner) { baner.parentNode.removeChild(baner); baner = null; } }
  function odluka(v) {
    var bilo = procitaj();
    upisi(v);
    zatvori();
    if (v === 'da') { ucitajGA(); }
    else {
      gtag('consent', 'update', { analytics_storage: 'denied' });
      obrisiGA();
      if (ucitan || bilo === 'da') { location.reload(); } // da se GA potpuno isključi
    }
  }
  function prikaziBaner() {
    if (baner) { return; }
    baner = document.createElement('div');
    baner.className = 'bh-kolacici';
    baner.setAttribute('role', 'dialog');
    baner.setAttribute('aria-live', 'polite');
    baner.setAttribute('aria-label', 'Saglasnost za kolačiće');
    baner.innerHTML =
      '<div class="bh-kolacici-in">' +
      '<p>Uz vaš pristanak koristimo Google Analytics da vidimo kako se sajt koristi. ' +
      'Bez pristanka nema kolačića za praćenje. <a href="politika-privatnosti.html#kolacici">Više o tome</a></p>' +
      '<div class="bh-kolacici-btns">' +
      '<button type="button" class="bh-kol-btn" data-odluka="ne">Odbijam</button>' +
      '<button type="button" class="bh-kol-btn bh-kol-da" data-odluka="da">Prihvatam</button>' +
      '</div></div>';
    baner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-odluka]');
      if (b) { odluka(b.getAttribute('data-odluka')); }
    });
    document.body.appendChild(baner);
  }

  function start() {
    if (!procitaj()) { prikaziBaner(); }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) { return; }
      if (a.hasAttribute('data-kolacici')) { e.preventDefault(); prikaziBaner(); return; }
      var h = a.getAttribute('href') || '', nacin = '';
      if (h.indexOf('tel:') === 0) { nacin = 'telefon'; }
      else if (h.indexOf('viber:') === 0) { nacin = 'viber'; }
      else if (h.indexOf('wa.me') > -1) { nacin = 'whatsapp'; }
      else if (h.indexOf('mailto:') === 0) { nacin = 'email'; }
      if (nacin) { window.bhDogadjaj('kontakt_klik', { nacin: nacin }); }
    });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); } else { start(); }
})();

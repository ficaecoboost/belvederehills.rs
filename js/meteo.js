/* =========================================================
   Vreme na Kopaoniku u hero-u naslovne (gornji desni ugao)
   - Podaci na pravom sajtu: meteo.php na našem serveru (RHMZ Srbije, stanica Kopaonik).
     Posetilac ne kontaktira nijedan spoljni servis.
   - Samo na probnoj verziji (GitHub Pages, lokalno), gde PHP ne radi: Open-Meteo
     (besplatno samo za nekomercijalnu upotrebu, zato ne i na pravom sajtu).
   - Sunce ili mesac: window.BH_NOC (računa se u index.html po izlasku/zalasku sunca).
   - Računar: cela kartica. Telefon/tablet: mali prikaz (temperatura + sneg), na dodir se otvori.
   - Ako podaci ne stignu, prikaz ostaje sakriven.
   ========================================================= */
(function () {
  var box = document.getElementById('bhMeteo');
  if (!box || !window.fetch) { return; }

  // elevation: nadmorska visina objekta (bez nje API uzima ~1384 m za ove koordinate, pa je toplije nego što jeste).
  // PROVERITI tačnu visinu objekta i upisati je ovde.
  var API = 'https://api.open-meteo.com/v1/forecast?latitude=43.2743&longitude=20.7673&elevation=1650' +
    '&current=temperature_2m,weather_code,snow_depth&hourly=snow_depth&forecast_days=1&timezone=Europe%2FBelgrade';
  var PROBNA = /github\.io$/.test(location.hostname) || location.protocol === 'file:' || /^(localhost|127\.)/.test(location.hostname);
  var KES = PROBNA ? 'bhMeteoProba' : 'bhMeteo', TRAJE = 20 * 60 * 1000; // isti podaci se koriste 20 min
  var SKALA_CM = 150; // pun "termometar" za sneg

  var SUNCE = '<svg viewBox="0 0 48 48" fill="none" stroke="#ffd27a" stroke-width="2.4" stroke-linecap="round"><circle cx="24" cy="24" r="9" fill="#ffd27a" fill-opacity=".9"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2"/></svg>';
  var MESEC = '<svg viewBox="0 0 48 48"><path d="M33.5 30.5A15 15 0 0 1 19.6 8.2 16.5 16.5 0 1 0 39.8 28.4a15 15 0 0 1-6.3 2.1z" fill="#f3e7c6"/><circle cx="36" cy="11" r="1.3" fill="#fff"/><circle cx="41" cy="18" r=".9" fill="#fff"/></svg>';

  function opis(k) {
    if (k === 0) { return 'Vedro'; }
    if (k === 1) { return 'Pretežno vedro'; }
    if (k === 2) { return 'Delimično oblačno'; }
    if (k === 3) { return 'Oblačno'; }
    if (k === 45 || k === 48) { return 'Magla'; }
    if (k >= 51 && k <= 57) { return 'Rosulja'; }
    if (k >= 61 && k <= 67) { return 'Kiša'; }
    if (k >= 71 && k <= 77) { return 'Sneg'; }
    if (k >= 80 && k <= 82) { return 'Pljuskovi'; }
    if (k === 85 || k === 86) { return 'Snežni pljuskovi'; }
    if (k >= 95) { return 'Grmljavina'; }
    return '';
  }

  function obradi(j) {
    var c = j.current || {}, sd = c.snow_depth;
    // ako "current" nema sneg, uzmi vrednost za tekući sat
    if (typeof sd !== 'number' && j.hourly && j.hourly.time) {
      var i = j.hourly.time.indexOf(String(c.time || '').slice(0, 13) + ':00');
      if (i > -1) { sd = j.hourly.snow_depth[i]; }
    }
    if (typeof c.temperature_2m !== 'number') { return null; }
    return { t: Math.round(c.temperature_2m), opis: opis(c.weather_code), cm: typeof sd === 'number' ? Math.max(0, Math.round(sd * 100)) : null, izvor: 'Procena: Open-Meteo' };
  }

  // Odgovor našeg servera (meteo.php, podaci RHMZ)
  function obradiServer(j) {
    if (!j || !j.ok || typeof j.t !== 'number') { return null; }
    return { t: j.t, opis: j.opis || '', cm: typeof j.cm === 'number' ? j.cm : null, izvor: 'Izvor: RHMZ Srbije' };
  }

  function upisi(ime, tekst) {
    var el = box.querySelector('[data-m="' + ime + '"]');
    if (el) { el.textContent = tekst; }
  }

  function prikazi(p) {
    var temp = (p.t > 0 ? '' : p.t < 0 ? '-' : '') + Math.abs(p.t) + '°';
    var imaSnega = p.cm !== null && p.cm >= 1;
    box.querySelector('.bh-meteo-ico').innerHTML = window.BH_NOC ? MESEC : SUNCE;
    upisi('t', temp);
    upisi('opis', p.opis);
    upisi('izvor', p.izvor);
    upisi('cm', imaSnega ? p.cm + ' cm' : (p.cm === null ? '-' : 'Nema snega'));
    upisi('cm-kratko', imaSnega ? p.cm + ' cm' : 'bez snega');
    box.classList.toggle('bez-snega', !imaSnega);
    // nema podatka o snegu (npr. RHMZ van sezone ili podatak prestar): deo o snegu se ne prikazuje
    box.classList.toggle('bez-podatka-sneg', p.cm === null);
    box.querySelector('.bh-meteo-sum').setAttribute('aria-label',
      'Vreme na Kopaoniku: ' + temp + (imaSnega ? ', sneg ' + p.cm + ' cm' : '') + '. Prikaži detalje');
    box.hidden = false;
    box.classList.add('bh-rise');
    // termometar za sneg se "napuni" posle pojavljivanja
    var fill = box.querySelector('.bh-meteo-gauge i');
    setTimeout(function () { fill.style.height = Math.min(100, (p.cm || 0) / SKALA_CM * 100) + '%'; }, 400);
  }

  // Telefon/tablet: otvaranje i zatvaranje na dodir
  var mali = window.matchMedia('(max-width: 991.98px)');
  var dugme = box.querySelector('.bh-meteo-sum');
  function postavi(otv) { box.classList.toggle('is-open', otv); dugme.setAttribute('aria-expanded', otv ? 'true' : 'false'); }
  dugme.addEventListener('click', function () { if (mali.matches) { postavi(!box.classList.contains('is-open')); } });
  document.addEventListener('click', function (e) { if (!box.contains(e.target)) { postavi(false); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { postavi(false); } });

  // Keš u browseru (ako nije dostupan, samo se ponovo učita)
  try {
    var k = JSON.parse(sessionStorage.getItem(KES) || 'null');
    if (k && Date.now() - k.vreme < TRAJE && k.p) { prikazi(k.p); return; }
  } catch (e) {}

  fetch(PROBNA ? API : 'meteo.php')
    .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
    .then(function (j) {
      var p = PROBNA ? obradi(j) : obradiServer(j);
      if (!p) { return; }
      try { sessionStorage.setItem(KES, JSON.stringify({ vreme: Date.now(), p: p })); } catch (e) {}
      prikazi(p);
    })
    .catch(function () { /* bez podataka: prikaz ostaje sakriven */ });
})();

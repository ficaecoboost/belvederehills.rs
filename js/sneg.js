/* Belvedere Hills - zimski efekat u hero-u naslovne (novembar-mart)
   - Pahulje padaju sa vrha; ~80% pada na krovove/ograde i tamo se sneg lokalno podiže,
     ~20% pada pored zgrade. Kad se pokrivač napuni, zum kreće, a ledenice počinju da kaplju.
   - Sneg, ledenice i kapi su SVG sloj u .bh-hero-media (isto isecanje i zum kao fotografija),
     pahulje su canvas preko hero-a (ispod teksta). Veza između njih: svg.getScreenCTM().
   - Podaci (ivice, površine, ledenice) su u js/sneg-krov.js.
   Isti kod koristi i alat ../_alati/sneg-krov-alat.html (napravi + crtaj). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) { e.setAttribute(k, attrs[k]); }
    return e;
  }
  // Ponovljiv pseudo-slučajan niz
  function generator(seed) {
    var r = seed;
    return function () { r = (r * 16807) % 2147483647; return r / 2147483647; };
  }
  // Šum gornje ivice snega: blagi nanosi + sitnije grudve
  function sum(i, seed) {
    return 0.82 + 0.16 * Math.sin(i * 0.21 + seed) + 0.1 * Math.sin(i * 0.67 + seed * 2.3) + 0.05 * Math.sin(i * 1.9 + seed * 4.1);
  }
  // Tačke duž izlomljene linije, na svakih ~korak px
  function uzorkuj(tacke, korak) {
    var u = [];
    for (var s = 0; s < tacke.length - 1; s++) {
      var a = tacke[s], b = tacke[s + 1];
      var n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / korak));
      var ugao = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0]));
      if (ugao > Math.PI / 2) { ugao = Math.PI - ugao; }
      for (var j = (s === 0 ? 0 : 1); j <= n; j++) {
        u.push({ x: a[0] + (b[0] - a[0]) * j / n, y: a[1] + (b[1] - a[1]) * j / n, ugao: ugao });
      }
    }
    return u;
  }
  // Glatka linija kroz tačke (kvadratne krive kroz sredine)
  function glatko(p, nastavak) {
    var d = (nastavak ? ' L' : 'M') + p[0][0].toFixed(1) + ',' + p[0][1].toFixed(1);
    for (var i = 1; i < p.length - 1; i++) {
      d += ' Q' + p[i][0].toFixed(1) + ',' + p[i][1].toFixed(1) + ' ' +
        ((p[i][0] + p[i + 1][0]) / 2).toFixed(1) + ',' + ((p[i][1] + p[i + 1][1]) / 2).toFixed(1);
    }
    var z = p[p.length - 1];
    return d + ' L' + z[0].toFixed(1) + ',' + z[1].toFixed(1);
  }

  // Visina snega u tački i ivice (0 kad je H[i] = 0)
  function visina(o, i) {
    var N = o.u.length, kraj = Math.min(i, N - 1 - i) / 4;
    var suzenje = kraj >= 1 ? 1 : Math.sin(kraj * Math.PI / 2);
    var nagib = 0.55 + 0.45 * Math.cos(o.u[i].ugao); // na strmim kosinama manje snega
    return o.deb * sum(i, o.seed) * suzenje * nagib * o.H[i];
  }
  // Putanje jedne kape, slojevito: cela kapa (sa "strehom" koja visi preko ivice u grudvama),
  // srednji i gornji sloj (talasaste granice između slojeva) i konture slojeva
  function kapa(o) {
    var N = o.u.length, gore = [], s2 = [], s3 = [], dole = [], l2 = [], l3 = [], ld = [];
    for (var i = 0; i < N; i++) {
      var h = visina(o, i), u = o.u[i], sd = o.seed;
      gore.push([u.x, u.y - h]);
      var y2 = u.y - h * (0.4 + 0.08 * Math.sin(i * 0.37 + sd * 1.3));
      var y3 = u.y - h * (0.7 + 0.06 * Math.sin(i * 0.53 + sd * 2.1));
      s2.unshift([u.x, y2]); s3.unshift([u.x, y3]); l2.push([u.x, y2]); l3.push([u.x, y3]);
      // streha: sneg visi preko ivice krova, u mekanim grudvama
      var y = u.y + h * (0.16 + 0.16 * Math.max(0, Math.sin(i * 0.55 + sd)) + 0.05 * Math.sin(i * 1.7 + sd * 2)) + 0.6;
      dole.unshift([u.x, y]); ld.push([u.x, y]);
    }
    return {
      cela: glatko(gore) + glatko(dole, true) + ' Z',
      sloj2: glatko(gore) + glatko(s2, true) + ' Z',
      sloj3: glatko(gore) + glatko(s3, true) + ' Z',
      konture: glatko(l2) + ' ' + glatko(l3),
      rub: glatko(ld)
    };
  }

  // Ledenice duž linije: različite dužine, poneka duga
  function napraviLedenice(d) {
    var lista = [];
    (d.ledenice || []).forEach(function (l, k) {
      var rnd = generator(101 + k * 37);
      var u = uzorkuj(l.tacke, 1), i = Math.floor(rnd() * 6);
      while (i < u.length) {
        var duz = l.duzina * (0.22 + Math.pow(rnd(), 2.2) * 0.95);
        lista.push({ x: u[i].x, y: u[i].y, duz: duz, sir: 1.6 + duz * 0.13 });
        i += 6 + Math.floor(rnd() * 12);
      }
    });
    return lista;
  }
  function putanjaLedenice(l, t) {
    var x = l.x, y = l.y, w = l.sir, h = l.duz * t;
    return 'M' + (x - w / 2).toFixed(1) + ',' + y.toFixed(1) +
      ' Q' + (x - w * 0.18).toFixed(1) + ',' + (y + h * 0.55).toFixed(1) + ' ' + x.toFixed(1) + ',' + (y + h).toFixed(1) +
      ' Q' + (x + w * 0.18).toFixed(1) + ',' + (y + h * 0.55).toFixed(1) + ' ' + (x + w / 2).toFixed(1) + ',' + y.toFixed(1) + ' Z';
  }
  // Kap vode sa vrha ledenice: naraste, padne i nestane (SVG animacija)
  function kap(l, kasnjenje, trajanje) {
    var vrh = l.y + l.duz, pad = 150;
    var e = el('ellipse', { cx: l.x.toFixed(1), cy: vrh.toFixed(1), rx: 0, ry: 0, fill: '#e6f1fc', opacity: 0 });
    var zaj = { dur: trajanje + 's', begin: kasnjenje + 's', repeatCount: 'indefinite' };
    function anim(attr, vals, keyT, extra) {
      var a = el('animate', { attributeName: attr, values: vals, keyTimes: keyT });
      for (var k in zaj) { a.setAttribute(k, zaj[k]); }
      for (var x in (extra || {})) { a.setAttribute(x, extra[x]); }
      e.appendChild(a);
    }
    anim('rx', '0;1.1;1.1;0.9', '0;0.62;0.64;1');
    anim('ry', '0;1.5;2.3;2.6', '0;0.62;0.64;1');
    anim('cy', vrh + ';' + (vrh + 1.2) + ';' + (vrh + 2) + ';' + (vrh + pad), '0;0.62;0.64;1',
      { calcMode: 'spline', keySplines: '0 0 1 1;0 0 1 1;0.55 0 1 1' });
    anim('opacity', '0;0.95;0.95;0', '0;0.3;0.85;1');
    return e;
  }

  // SVG sloj: kape snega, posut sneg, ledenice, kapi
  function napravi(kontejner, d, bezKapi) {
    var svg = el('svg', {
      'class': 'bh-sneg', viewBox: '0 0 ' + d.sirina + ' ' + d.visina,
      preserveAspectRatio: 'xMidYMin slice', 'aria-hidden': 'true'
    });
    var defs = el('defs', {});
    var grad = el('linearGradient', { id: 'bhLed', x1: '0', y1: '0', x2: '0', y2: '1' });
    [['0', '#ffffff', '0.95'], ['0.55', '#d9e9f7', '0.8'], ['1', '#cfe3f7', '0.25']].forEach(function (s) {
      grad.appendChild(el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] }));
    });
    defs.appendChild(grad); svg.appendChild(defs);

    // Zimska verzija fotografije (jači kontrast)
    // (bez dodatnog sloja: zamenjuje sliku u istom elementu, da zum ostane brz)
    if (d.slikaZima && kontejner.classList.contains('bh-hero-media')) {
      var izvor = d.slikaZima.replace(/\.(jpe?g|png)$/i, '.webp'), pr = new Image();
      // WebP ako ga pregledač podržava (učita se), inače JPG
      pr.onload = function () { kontejner.style.backgroundImage = 'url(' + izvor + ')'; };
      pr.onerror = function () { if (izvor !== d.slikaZima) { izvor = d.slikaZima; pr.src = izvor; } };
      pr.src = izvor;
    }

    // Posut sneg po površini krova: sitne pahulje iscrtane jednom u sliku
    var gPov = el('g', { opacity: '0' });
    if ((d.povrsine || []).length) {
      var cv = document.createElement('canvas'); cv.width = d.sirina; cv.height = d.visina;
      var cx = cv.getContext('2d'), rnd = generator(7);
      d.povrsine.forEach(function (p) {
        cx.save(); cx.beginPath();
        p.forEach(function (q, i) { if (i) { cx.lineTo(q[0], q[1]); } else { cx.moveTo(q[0], q[1]); } });
        cx.closePath(); cx.clip();
        var xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; });
        var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
        var n = Math.round((x1 - x0) * (y1 - y0) / 8);
        for (var i = 0; i < n; i++) {
          cx.globalAlpha = 0.3 + rnd() * 0.5; cx.fillStyle = '#eef3f8';
          cx.beginPath();
          cx.ellipse(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 1 + rnd() * 2.8, 0.6 + rnd() * 1.2, -0.35, 0, Math.PI * 2);
          cx.fill();
        }
        cx.restore();
      });
      gPov.appendChild(el('image', { href: cv.toDataURL('image/png'), x: 0, y: 0, width: d.sirina, height: d.visina }));
    }

    var gLed = el('g', { fill: 'url(#bhLed)' });
    var ledenice = napraviLedenice(d).map(function (l) { var p = el('path', { d: '' }); gLed.appendChild(p); return { el: p, l: l }; });
    var gKapi = el('g', {});

    // Slojevit, "mesnat" sneg: senka, donji sloj u senci (plavosiv), srednji sloj, gornji sloj
    // obasjan suncem, tanke konture između slojeva i tamniji donji rub strehe
    var gSenka = el('g', { fill: '#4f6680', opacity: '0.35', transform: 'translate(0 2.6)' });
    var gOsnova = el('g', { fill: '#c2d0de' }); // bez obruba: pre nego što sneg napada ne vidi se linija po krovu
    var gSloj2 = el('g', { fill: '#dbe5ef' });
    var gSloj3 = el('g', { fill: '#fbfaf6' }); // gornji sloj obasjan suncem (topliji)
    var gKont = el('g', { fill: 'none', stroke: '#a9bbcd', 'stroke-opacity': '0.35', 'stroke-width': '0.7', style: 'display:none' }); // konture slojeva: postoje, ali skrivene
    var gRub = el('g', { fill: 'none', stroke: '#8a7b6e', 'stroke-opacity': '0.25', 'stroke-width': '0.8', style: 'display:none' }); // donji rub: postoji, ali skriven
    var kape = (d.ivice || []).map(function (iv, k) {
      var u = uzorkuj(iv.tacke, 4);
      var o = { s: el('path', {}), b: el('path', {}), v2: el('path', {}), v3: el('path', {}), kn: el('path', {}), r: el('path', {}),
        u: u, H: new Float32Array(u.length), deb: iv.debljina, seed: k * 1.7 + 0.3, prljavo: true };
      gSenka.appendChild(o.s); gOsnova.appendChild(o.b); gSloj2.appendChild(o.v2); gSloj3.appendChild(o.v3);
      gKont.appendChild(o.kn); gRub.appendChild(o.r);
      return o;
    });
    [gPov, gLed, gKapi, gSenka, gOsnova, gSloj2, gSloj3, gKont, gRub].forEach(function (g) { svg.appendChild(g); });
    kontejner.appendChild(svg);

    function osveziKape() {
      kape.forEach(function (o) {
        if (!o.prljavo) { return; }
        var p = kapa(o);
        o.s.setAttribute('d', p.cela); o.b.setAttribute('d', p.cela);
        o.v2.setAttribute('d', p.sloj2); o.v3.setAttribute('d', p.sloj3);
        o.kn.setAttribute('d', p.konture); o.r.setAttribute('d', p.rub);
        o.prljavo = false;
      });
    }
    function napredak(t) {
      var tl = Math.max(0, (t - 0.5) / 0.5);
      ledenice.forEach(function (o) { o.el.setAttribute('d', putanjaLedenice(o.l, tl)); });
      gPov.setAttribute('opacity', (0.85 * t).toFixed(3));
    }
    // Ravnomerno postavi ceo sneg (alat, bez animacije)
    function crtaj(t) {
      kape.forEach(function (o) { o.H.fill(t); o.prljavo = true; });
      osveziKape(); napredak(t);
    }
    var kapiPustene = false;
    function pustiKapi() {
      if (bezKapi || kapiPustene) { return; }
      kapiPustene = true;
      ledenice.map(function (o) { return o.l; }).sort(function (a, b) { return b.duz - a.duz; }).slice(0, 7)
        .forEach(function (l, i) { gKapi.appendChild(kap(l, 0.6 + i * 1.3, 3.2 + (i % 3) * 1.1)); });
    }
    return { svg: svg, kape: kape, osveziKape: osveziKape, napredak: napredak, crtaj: crtaj, pustiKapi: pustiKapi };
  }

  // Pahulja (isti izgled za padanje na krov i za izručivanje): mekano belo jezgro sa blagom senkom;
  // grudva = više spojenih kuglica
  function snegSprajt(r, grudva) {
    var s = Math.ceil(r * 2.6 + 4), k = document.createElement('canvas'); k.width = k.height = s;
    var g = k.getContext('2d'), n = grudva ? 4 : 1, rr = generator(Math.round(r * 97) + (grudva ? 3 : 1));
    for (var i = 0; i < n; i++) {
      var q = grudva ? r * (0.45 + rr() * 0.3) : r;
      var x = s / 2 + (grudva ? (rr() - 0.5) * r : 0), y = s / 2 + (grudva ? (rr() - 0.5) * r : 0);
      // blaga senka ispod (da se vidi na svetloj pozadini), pa mekano belo jezgro bez prstena
      var sh = g.createRadialGradient(x, y + q * 0.35, 0, x, y + q * 0.35, q * 1.05);
      sh.addColorStop(0, 'rgba(110,132,158,.35)'); sh.addColorStop(1, 'rgba(110,132,158,0)');
      g.fillStyle = sh; g.beginPath(); g.arc(x, y + q * 0.35, q * 1.05, 0, Math.PI * 2); g.fill();
      var gr = g.createRadialGradient(x - q * 0.2, y - q * 0.25, 0, x, y, q);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(250,252,255,.95)');
      gr.addColorStop(0.8, 'rgba(232,239,247,.6)'); gr.addColorStop(1, 'rgba(225,233,243,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, q, 0, Math.PI * 2); g.fill();
    }
    return k;
  }

  // Sprajtovi za padanje: sitan prah (daleke pahulje) i grudvice različitih veličina (bliže)
  function sprajtovi() {
    return {
      prah: [1, 1.3, 1.7, 2.1].map(function (r) { return snegSprajt(r, false); }),
      gruve: [2.8, 3.4, 4.1, 4.9, 5.8].map(function (r) { return snegSprajt(r, true); })
    };
  }

  // Padanje snega: pahulje (canvas) koje pune kape snega na krovovima
  function padanje(hero, s, gotovo) {
    var cv = document.createElement('canvas');
    cv.className = 'bh-pahulje'; cv.setAttribute('aria-hidden', 'true');
    hero.insertBefore(cv, hero.querySelector('.container'));
    var cx = cv.getContext('2d'), w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var sp = sprajtovi(), rnd = Math.random;
    // veličina pahulja: na velikim ekranima 40% manje, na telefonu 60% manje
    var VEL = window.innerWidth < 768 ? 0.4 : 0.6;
    // Pahulje padaju samo na krovove (gornje ivice). Ograde terasa i ivica iznad prizemlja su ispod
    // fasade, pa bi pahulje do njih morale da prođu ispred zgrade - one se pune zajedno sa krovom.
    var sveKape = s.kape, kape = [], nize = [], ukupno = 0, zgrada = [];
    sveKape.forEach(function (o) {
      var minY = Math.min.apply(0, o.u.map(function (q) { return q.y; }));
      if (minY < 560) {
        kape.push(o); ukupno += o.u.length;
        var xs = o.u.map(function (q) { return q.x; });
        zgrada.push([Math.min.apply(0, xs) - 15, Math.max.apply(0, xs) + 15]); // kolone iznad kojih je krov
      } else { nize.push(o); }
    });
    function ispodKrova(x) { for (var k = 0; k < zgrada.length; k++) { if (x > zgrada[k][0] && x < zgrada[k][1]) { return true; } } return false; }
    // koliko pahulja treba da pokrivač bude pun (jedna pahulja pokrije ~2.4 tačke ivice)
    // jedna pahulja podigne sneg na ~4.4 tačke ivice; 1.4 = rezerva za preklapanja
    var POTREBNO = Math.ceil(ukupno / 4.4 * 2.8), TRAJANJE = 2.6; // 2x više pahulja, svaka nosi upola manje // s: koliko dugo sneg pada sve jače
    var BUMP = [], SIG = 2.2;
    for (var b = -6; b <= 6; b++) { BUMP.push(0.4 * Math.exp(-b * b / (2 * SIG * SIG))); }

    function velicina() {
      w = hero.clientWidth; h = hero.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    velicina();
    var tm; window.addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(velicina, 150); });

    // Preslikavanje: koordinate fotografije -> canvas (prati isecanje i zum)
    var M = { a: 1, d: 1, e: 0, f: 0 }, HR = { left: 0, top: 0, right: 0, bottom: 0 };
    function mapa() {
      var m = s.svg.getScreenCTM(); if (m) { M = m; }
      HR = hero.getBoundingClientRect();
    }
    function vidljivo() { // vidljiv deo fotografije, u koordinatama fotografije
      return { x0: (HR.left - M.e) / M.a, x1: (HR.right - M.e) / M.a, y0: (HR.top - M.f) / M.d, y1: (HR.bottom - M.f) / M.d };
    }

    // Izbor mesta za pahulju: ivica sa najviše praznog prostora, pa niže mesto od dva slučajna
    function cilj() {
      var total = 0;
      kape.forEach(function (o) { total += o.prazno; });
      var r = rnd() * (total > 1 ? total : ukupno), o = kape[0];
      for (var k = 0; k < kape.length; k++) {
        r -= total > 1 ? kape[k].prazno : kape[k].u.length;
        if (r <= 0) { o = kape[k]; break; }
      }
      var N = o.u.length, j1 = Math.floor(rnd() * N), j2 = Math.floor(rnd() * N);
      return { o: o, j: o.H[j1] < o.H[j2] ? j1 : j2 };
    }
    function povrsina(o, j) { return o.u[j].y - visina(o, j); }

    var lista = [];
    function nova(usmerena, uVazduhu, nebo) {
      var z = rnd(), V = vidljivo(), sc = M.a || 1;
      var p = {
        r: 0.8 + z * z * 2.4, vy: (130 + z * 170) / sc, t: 0,
        vx: (5 + z * 12) / sc, amp: (5 + z * 16) / sc, f: 0.5 + rnd() * 1.1, faza: rnd() * 6.28,
        a: 0.5 + z * 0.45, rot: rnd() * 6.28, vr: (rnd() - 0.5) * 1.4,
        // dalje = sitan prah, bliže = češće veće grudvice; svaka malo drugačije veličine
        sp: (rnd() < 0.35 + z * 0.5) ? sp.gruve[Math.min(4, Math.floor(z * 3 + rnd() * 2.5))] : sp.prah[Math.floor(rnd() * 4)],
        sk: 0.7 + z * 0.5 + rnd() * 0.2
      };
      if (usmerena) {
        var c = cilj(); p.o = c.o; p.j = c.j;
        var tx = c.o.u[c.j].x, ty = povrsina(c.o, c.j);
        // sve pahulje kreću sa vrha (iznad ekrana) i padaju do svog mesta na krovu
        p.y = V.y0 - 10 - rnd() * 60;
        if (p.y > ty - 5) { p.y = ty - 5 - rnd() * 30; }
        var T = (ty - p.y) / p.vy;
        p.x0 = tx - p.vx * T - p.amp * Math.sin(p.f * T + p.faza);
      } else {
        // i ove kreću sa vrha; na početku su raspoređene iznad ekrana, pa ulaze jedna za drugom
        // pored zgrade = samo tamo gde iznad nema krova (da ne prolaze kroz zgradu)
        p.y = uVazduhu ? V.y0 - 10 - rnd() * (V.y1 - V.y0) * 0.5 : V.y0 - 10 - rnd() * 50;
        var xx = 0, nasao = false;
        for (var pok = 0; pok < 10 && !nasao; pok++) { xx = V.x0 + rnd() * (V.x1 - V.x0); nasao = !ispodKrova(xx); }
        if (!nasao) { return; } // na uskom ekranu nema mesta pored zgrade
        p.x0 = xx - p.vx * 2;
      }
      if (!usmerena) { p.a *= 0.55; } // pahulje pored zgrade: providnije
      if (nebo) { // sitne kapljice po celom nebu
        p.nebo = true; p.sp = sp.prah[Math.floor(rnd() * 2)]; p.sk = 0.45 + rnd() * 0.35; p.a = 0.45 + rnd() * 0.35;
        p.vy *= 0.8;
      }
      lista.push(p);
    }
    function sleti(o, j) {
      var N = o.u.length;
      for (var k = -6; k <= 6; k++) {
        var i = j + k;
        if (i >= 0 && i < N) { o.H[i] = Math.min(1, o.H[i] + BUMP[k + 6]); }
      }
      o.prljavo = true;
    }

    mapa();
    kape.forEach(function (o) { o.prazno = o.u.length; });
    // Na početku je deo snega već u vazduhu, da pokrivač krene da raste odmah
    for (var i0 = 0; i0 < POTREBNO * 0.04; i0++) { nova(true, true); } // na početku tek poneka pahulja
    // odnos: od svih pahulja 70% pada na krov, 30% pored zgrade (pola njih su sitne kapljice)
    var UDEO_KROV = 0.7;
    function pored(uVazduhu) { nova(false, uVazduhu, rnd() < 0.5); }
    for (var i1 = 0; i1 < POTREBNO * 0.04 * 3 / 7; i1++) { pored(true); }

    var faza = 'puni', vreme = 0, kvotaU = 0, kvotaS = 0, zavrseno = false, tKraj = 0, STISAVANJE = 0.01;
    var vidljiv = true, radi = false, last = 0, stalo = false;
    function korak(ts) {
      if (!vidljiv || document.hidden) { radi = false; return; }
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; vreme += dt;
      mapa();
      var V = vidljivo();

      // koliko je pokrivač pun
      var puno = 0;
      kape.forEach(function (o) {
        var sH = 0; for (var i = 0; i < o.H.length; i++) { sH += o.H[i]; }
        o.prazno = o.H.length - sH; puno += sH;
      });
      var napredak = puno / ukupno;
      // niže ivice (ograde, ivica iznad prizemlja) prate krov
      nize.forEach(function (o) {
        var cilj = Math.min(1, napredak * 1.05);
        for (var i = 0; i < o.H.length; i++) { if (o.H[i] < cilj) { o.H[i] = cilj; } }
        o.prljavo = true;
      });

      // nove pahulje: jako dok se puni, posle blago
      if (faza === 'puni') {
        // gust sneg koji puni krov; pahulje pored zgrade ostaju retke kao ranije
        // sneg pada sve jače (linearno raste), a krov se puni samo od pahulja koje padnu na njega
        // pred kraj punjenja sneg jenjava: od 40% do 70% punog krova jačina pada na nulu (pahulje koje su
        // tad u vazduhu nose dovoljno snega da dopune krov),
        // pa pahulje koje su već u vazduhu dopune krov i padanje se završi zajedno sa punjenjem
        var jenjava = Math.max(0, 1 - Math.max(0, napredak - 0.4) / 0.3);
        var jace = Math.min(1, vreme / TRAJANJE) * jenjava, dU = dt * POTREBNO * 2 / TRAJANJE * jace;
        // pahulje pored zgrade prestaju malo ranije (do 45% punog krova), da i poslednje stignu do dna
        // otprilike kad se krov napuni
        kvotaU += dU; kvotaS += dU * (1 - UDEO_KROV) / UDEO_KROV * (napredak < 0.45 ? 1 : 0);
        var uVazduhuKrov = 0; for (var q = 0; q < lista.length; q++) { if (lista[q].o) { uVazduhuKrov++; } }
        if (napredak > 0.95 || (jenjava === 0 && !uVazduhuKrov) || vreme > TRAJANJE + 4) { faza = 'dopuni'; }
      }
      // kad je krov (skoro) pun, nove pahulje prestaju - padanje traje koliko i punjenje krova
      if (faza === 'dopuni') { // dovrši pokrivač glatko
        sveKape.forEach(function (o) {
          for (var i = 0; i < o.H.length; i++) { o.H[i] += (1 - o.H[i]) * Math.min(1, dt * 5); }
          o.prljavo = true;
        });
        if (napredak > 0.99) { faza = 'gotovo'; }
      }
      if (faza === 'gotovo' && !zavrseno) { zavrseno = true; tKraj = vreme; s.pustiKapi(); if (gotovo) { gotovo(); } }
      // posle punjenja sneg se za STISAVANJE s stiša i prestane
      if (zavrseno) {
        var jacina = Math.max(0, 1 - (vreme - tKraj) / STISAVANJE);
        kvotaU *= jacina; kvotaS *= jacina;
        // pahulje koje su još u vazduhu padnu do kraja (na krov ili do dna hero-a), pa animacija staje
        if (jacina === 0 && !lista.length) {
          cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
          stalo = true; radi = false; s.osveziKape(); s.napredak(1); return;
        }
      }
      while (kvotaU >= 1 && lista.length < 1800) { nova(true, false); kvotaU--; }
      while (kvotaS >= 1 && lista.length < 1800) { pored(false); kvotaS--; }

      // pomeranje, sletanje i crtanje
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, cv.width, cv.height);
      var ox = M.e - HR.left, oy = M.f - HR.top;
      for (var n = lista.length - 1; n >= 0; n--) {
        var p = lista[n];
        p.t += dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        var x = p.x0 + p.vx * p.t + p.amp * Math.sin(p.f * p.t + p.faza);
        if (p.o) {
          if (p.y >= povrsina(p.o, p.j)) { sleti(p.o, p.j); lista.splice(n, 1); continue; }
        } else if (p.y > V.y1 + 20) { lista.splice(n, 1); continue; }
        var X = M.a * x + ox, Y = M.d * p.y + oy;
        if (X < -20 || X > w + 20 || Y < -20 || Y > h + 20) { continue; }
        var vel = p.sp.width * p.sk * VEL;
        cx.globalAlpha = p.a * Math.min(1, p.t / 0.35); // blago pojavljivanje (iznad ekrana)
        cx.setTransform(dpr * Math.cos(p.rot), dpr * Math.sin(p.rot), -dpr * Math.sin(p.rot), dpr * Math.cos(p.rot), X * dpr, Y * dpr);
        cx.drawImage(p.sp, -vel / 2, -vel / 2, vel, vel);
      }
      s.osveziKape();
      s.napredak(Math.min(1, napredak));
      requestAnimationFrame(korak);
    }
    function start() { if (!stalo && !radi && vidljiv && !document.hidden) { radi = true; last = 0; requestAnimationFrame(korak); } }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { vidljiv = en[0].isIntersecting; start(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', start);
    start();
  }

  // Izručivanje: pri skrolovanju sneg sa dna hero-a pada po stranici (prah + pahulje)
  // i nestaje u sekciji "O apartmanima" (~70%) i na vrhu "Naši apartmani" (~30%).
  function izrucivanje(hero) {
    var oNama = document.getElementById('o-nama'), apt = document.getElementById('apartmani');
    if (!oNama) { return; }
    var cv = document.createElement('canvas');
    cv.className = 'bh-izrucivanje'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    var cx = cv.getContext('2d'), w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var BUDZET = window.innerWidth < 768 ? 140 : 280, izruceno = 0, rnd = Math.random; // jedan diskretan nalet praha
    var VELI = window.innerWidth < 768 ? 0.4 : 0.6; // isto smanjenje kao u hero-u
    var prah = [1, 1.5, 2].map(function (r) { return snegSprajt(r, false); });
    var gruve = [3.5, 4.5, 5.5, 6.5].map(function (r) { return snegSprajt(r, true); });
    function velicina() { w = window.innerWidth; h = window.innerHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    velicina(); window.addEventListener('resize', velicina);
    function docTop(e) { return e.getBoundingClientRect().top + window.pageYOffset; }

    var lista = [], radi = false, last = 0;
    function nova() {
      var heroDno = docTop(hero) + hero.offsetHeight;
      var jePrah = rnd() < 0.9, cilj;
      if (rnd() < 0.7 || !apt) { cilj = docTop(oNama) + 40 + rnd() * (oNama.offsetHeight - 80); }
      else { cilj = docTop(apt) + rnd() * apt.offsetHeight * 0.35; }
      lista.push({
        x: rnd() * w, y: heroDno - 10 - rnd() * 140, cilj: cilj,
        vy: jePrah ? 70 + rnd() * 80 : 110 + rnd() * 110, max: jePrah ? 150 + rnd() * 60 : 230 + rnd() * 90,
        vx: (rnd() - 0.4) * 20, amp: jePrah ? 6 + rnd() * 14 : 4 + rnd() * 10, f: 0.6 + rnd() * 1.4, faza: rnd() * 6.28,
        sp: jePrah ? prah[Math.floor(rnd() * 3)] : gruve[Math.floor(rnd() * 4)],
        a: jePrah ? 0.55 + rnd() * 0.35 : 0.85 + rnd() * 0.15, t: 0, topi: 0
      });
    }
    function korak(ts) {
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      var sy = window.pageYOffset;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, h);
      for (var n = lista.length - 1; n >= 0; n--) {
        var p = lista[n];
        p.t += dt; p.vy = Math.min(p.max, p.vy + 60 * dt); p.y += p.vy * dt; p.x += p.vx * dt;
        if (p.y >= p.cilj) { p.topi += dt / 0.6; p.vy *= 0.85; } // stigao: istopi se
        if (p.topi >= 1) { lista.splice(n, 1); continue; }
        var Y = p.y - sy; if (Y < -20 || Y > h + 20) { continue; }
        var X = p.x + Math.sin(p.f * p.t + p.faza) * p.amp, s = p.sp.width * VELI;
        cx.globalAlpha = p.a * (1 - p.topi);
        cx.drawImage(p.sp, X - s / 2, Y - s / 2, s, s);
      }
      if (lista.length) { requestAnimationFrame(korak); } else { radi = false; cx.clearRect(0, 0, w, h); }
    }
    function start() { if (!radi && lista.length) { radi = true; last = 0; requestAnimationFrame(korak); } }
    // čim posetilac krene da skroluje: jedan nalet praha, i to je to
    function naSkrol() {
      if (izruceno || window.pageYOffset < 40) { return; }
      for (; izruceno < BUDZET; izruceno++) { nova(); }
      window.removeEventListener('scroll', naSkrol);
      start();
    }
    window.addEventListener('scroll', naSkrol, { passive: true });
  }

  window.BHSneg = { napravi: napravi, padanje: padanje, izrucivanje: izrucivanje };

  // Sajt: zimski efekat na naslovnoj, samo u sezoni (ili u režimu pregleda).
  // Ken Burns zum kreće tek kad se pokrivač napuni; van sezone odmah.
  var d = window.BH_SNEG_KROV;
  var media = document.querySelector('.bh-hero-media');
  if (!media) { return; }
  function zum() { media.classList.add('is-zoom'); }
  var mesec = new Date().getMonth() + 1;
  if (!d || (!d.pregled && (d.sezona || []).indexOf(mesec) < 0)) { zum(); return; }
  var mirno = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  media.classList.add('is-zima'); document.body.classList.add('bh-zima');
  var heroEl = media.closest('.site-hero'); if (heroEl) { heroEl.classList.add('has-sunce'); }
  var s = napravi(media, d, mirno);
  var hero = media.closest('.site-hero');
  if (mirno || !hero) { s.crtaj(1); zum(); return; }
  s.crtaj(0);
  padanje(hero, s, zum);
  izrucivanje(hero);
})();

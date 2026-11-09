/* Belvedere Hills - sneg na krovu hero fotografije (crta ga js/sneg.js)
   Koordinate su u pikselima fotografije (sirina x visina ispod).
   Kad se promeni hero slika, ovaj fajl se pravi iznova alatom
   ../_alati/sneg-krov-alat.html (klik po ivicama krova -> "Sačuvaj"). */
window.BH_SNEG_KROV = {
  slika: 'images/hero/naslovna.jpg',
  // zimska verzija iste slike (jači kontrast); ako je nema, koristi se obična
  slikaZima: 'images/hero/naslovna-zima.jpg',
  sirina: 1200,
  visina: 993,

  // Meseci kada se sneg prikazuje (novembar-mart)
  sezona: [11, 12, 1, 2, 3],
  // PRIVREMENO: true = sneg se vidi i van sezone (za pregled). Vratiti na false.
  pregled: true,

  // Ivice na koje pada sneg: tačke [x, y] i debljina snega
  ivice: [
    { tacke: [[482, 127], [595, 50], [683, 175]], debljina: 24 },     // krov levog tornja
    { tacke: [[683, 176], [732, 152], [760, 186]], debljina: 16 },    // mali krov između
    { tacke: [[655, 245], [845, 142], [923, 299]], debljina: 27 },   // veliki desni krov
    { tacke: [[923, 300], [960, 294], [1012, 400]], debljina: 19 },   // niži krov desno
    { tacke: [[158, 445], [300, 494], [428, 538]], debljina: 30 },   // kuća levo, sleme
    { tacke: [[300, 616], [553, 606]], debljina: 11 },                // ograda leve terase
    { tacke: [[563, 619], [805, 621]], debljina: 11 },                // ograda srednje terase
    { tacke: [[860, 620], [1014, 623]], debljina: 11 },               // ograda desne terase
    { tacke: [[255, 686], [856, 686], [1082, 693]], debljina: 14 }    // ivica iznad prizemlja
  ],

  // Ledenice: linije ispod kojih vise (dužina = najduža ledenica)
  ledenice: [
    { tacke: [[597, 54], [683, 178]], duzina: 16 },                    // levi toranj, desna kosina
    { tacke: [[847, 146], [921, 300]], duzina: 18 },                   // veliki krov, desna kosina
    { tacke: [[962, 298], [1010, 400]], duzina: 14 },                  // niži krov desno
    { tacke: [[166, 598], [300, 621]], duzina: 18 },                   // oluk kuće levo
    { tacke: [[258, 697], [856, 697], [1080, 703]], duzina: 26 }       // ivica iznad prizemlja
  ],
  // Površine po kojima se sneg "posipa" (tanak sloj)
  povrsine: [
    [[160, 447], [428, 539], [428, 603], [172, 597]]                 // krov kuće levo
  ]
};

<?php
/**
 * Belvedere Hills - podešavanja serverskih skripti (forma za upit, vremenska prognoza).
 *
 * LOZINKE NE UPISIVATI OVDE. Ovaj fajl ide na GitHub.
 * Lozinku za SMTP (i sve što je tajno) upisati u inc/podesavanja.lokalno.php
 * direktno na hostingu. Primer tog fajla je u inc/podesavanja.lokalno.primer.php.
 * Folder inc/ je zaključan za posetioce (inc/.htaccess).
 */

$BH = [

    // ---------- Forma za upit (posalji-upit.php) ----------
    // PRIVREMENO ZA TEST: vratiti na 'info@belvederehills.rs' pre puštanja u rad
    'primalac'      => 'ficolica@gmail.com',      // kome stižu upiti (može i više: 'a@x.rs, b@x.rs')
    'posiljalac'    => 'info@belvederehills.rs',  // adresa sa koje se šalje (mora biti na domenu sajta)
    'naziv'         => 'Belvedere Hills - sajt',  // ime pošiljaoca u mejlu

    // SMTP: slanje preko pravog mejl naloga (pouzdano, ne završava u spamu).
    // Ako 'smtp_lozinka' ostane prazna, koristi se PHP mail() (rezervna varijanta).
    'smtp_server'   => '',                        // npr. 'mail.belvederehills.rs' (dobija se od hostinga)
    'smtp_port'     => 465,                       // 465 = SSL, 587 = STARTTLS
    'smtp_zastita'  => 'ssl',                     // 'ssl' za 465, 'tls' za 587
    'smtp_korisnik' => 'info@belvederehills.rs',
    'smtp_lozinka'  => '',                        // UPISATI u podesavanja.lokalno.php, ne ovde

    // ---------- Vremenska prognoza (meteo.php) ----------
    // Podaci RHMZ Srbije, stanica Kopaonik. false = prikaz vremena se ne pojavljuje.
    'meteo_ukljuceno' => true,
    'meteo_kes_min'   => 30,   // koliko minuta se čuvaju preuzeti podaci pre novog preuzimanja
    'meteo_sneg_sati' => 48,   // podatak o snegu stariji od ovoga se ne prikazuje
];

// Tajna podešavanja sa hostinga (ne ide na GitHub)
if (is_file(__DIR__ . '/podesavanja.lokalno.php')) {
    $BH = array_merge($BH, (array) require __DIR__ . '/podesavanja.lokalno.php');
}

return $BH;

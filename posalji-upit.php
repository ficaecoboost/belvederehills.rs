<?php
/**
 * Belvedere Hills - slanje upita za slobodne termine
 * Prima podatke iz forme na kontakt.html i šalje ih mejlom.
 *
 * PODEŠAVANJE: inc/podesavanja.php (kome stiže, SMTP), lozinka u inc/podesavanja.lokalno.php.
 * Slanje: preko SMTP-a (mejl nalog na domenu) ako je upisana lozinka,
 * inače preko PHP mail() kao rezervne varijante.
 */

$BH = require __DIR__ . '/inc/podesavanja.php';
require __DIR__ . '/inc/smtp.php';
$PRIMALAC   = $BH['primalac'];
$POSILJALAC = $BH['posiljalac'];
$NAZIV      = $BH['naziv'];
date_default_timezone_set('Europe/Belgrade');

header('Content-Type: application/json; charset=utf-8');
$ajax = isset($_SERVER['HTTP_X_REQUESTED_WITH']);

function odgovor($ok, $poruka, $ajax) {
    if ($ajax) {
        echo json_encode(['ok' => $ok, 'poruka' => $poruka], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: kontakt.html?' . ($ok ? 'poslato=1' : 'greska=1') . '#upit', true, 303);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    odgovor(false, 'Neispravan zahtev.', $ajax);
}

// Spam zaštita: skriveno polje mora biti prazno
if (!empty($_POST['website'])) {
    odgovor(true, 'Hvala! Vaš upit je poslat.', $ajax);
}

function polje($ime, $max = 200) {
    $v = isset($_POST[$ime]) ? trim((string)$_POST[$ime]) : '';
    $v = str_replace(["\r", "\0"], '', $v);
    return mb_substr($v, 0, $max, 'UTF-8');
}

$ime      = polje('ime', 100);
$telefon  = polje('telefon', 40);
$email    = polje('email', 150);
$dolazak  = polje('dolazak', 10);
$odlazak  = polje('odlazak', 10);
$odrasli  = polje('odrasli', 2);
$deca     = polje('deca', 2);
$tip      = polje('tip', 30);
$ljubimac = polje('ljubimac', 2) === 'da' ? 'Da' : 'Ne';
$poruka   = polje('poruka', 2000);
$saglas   = polje('saglasnost', 2) === 'da';

// Provera
$greske = [];
if ($ime === '')                                   $greske[] = 'ime i prezime';
if ($telefon === '')                               $greske[] = 'telefon';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))    $greske[] = 'ispravan e-mail';
$d1 = DateTime::createFromFormat('Y-m-d', $dolazak);
$d2 = DateTime::createFromFormat('Y-m-d', $odlazak);
if (!$d1 || !$d2)                                  $greske[] = 'datume dolaska i odlaska';
elseif ($d2 <= $d1)                                $greske[] = 'datum odlaska posle datuma dolaska';
if (!$saglas)                                      $greske[] = 'saglasnost za obradu podataka';

if ($greske) {
    http_response_code(422);
    odgovor(false, 'Molimo unesite: ' . implode(', ', $greske) . '.', $ajax);
}

$nocenja = $d1->diff($d2)->days;
$fmt = function ($d) { return $d->format('d.m.Y.'); };

$tekst  = "Novi upit za slobodne termine sa sajta belvederehills.rs\n";
$tekst .= str_repeat('-', 50) . "\n";
$tekst .= "Ime i prezime:   $ime\n";
$tekst .= "Telefon:         $telefon\n";
$tekst .= "E-mail:          $email\n\n";
$tekst .= "Dolazak:         " . $fmt($d1) . "\n";
$tekst .= "Odlazak:         " . $fmt($d2) . " ($nocenja noćenja)\n";
$tekst .= "Odrasli:         $odrasli\n";
$tekst .= "Deca:            $deca\n";
$tekst .= "Tip apartmana:   $tip\n";
$tekst .= "Kućni ljubimac:  $ljubimac\n\n";
$tekst .= "Poruka:\n" . ($poruka !== '' ? $poruka : '-') . "\n";
$tekst .= str_repeat('-', 50) . "\n";
$tekst .= "Poslato: " . date('d.m.Y. H:i') . "\n";

$naslov = 'Upit za termin: ' . $fmt($d1) . ' - ' . $fmt($d2) . ' (' . $ime . ')';

if ($BH['smtp_server'] !== '' && $BH['smtp_lozinka'] !== '') {
    // Glavni način: SMTP preko mejl naloga na domenu
    list($poslato, $greska) = bh_smtp_posalji($BH, $PRIMALAC, $naslov, $tekst, $email);
    if (!$poslato) { error_log('Belvedere Hills upit, SMTP greška: ' . $greska); }
} else {
    // Rezervno: PHP mail() (dok SMTP nije podešen)
    $headers  = 'From: =?UTF-8?B?' . base64_encode($NAZIV) . "?= <$POSILJALAC>\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: 8bit\r\n";
    $poslato = @mail($PRIMALAC, '=?UTF-8?B?' . base64_encode($naslov) . '?=', $tekst, $headers, '-f' . $POSILJALAC);
}

if ($poslato) {
    odgovor(true, 'Hvala! Vaš upit je poslat. Javićemo vam se u najkraćem roku.', $ajax);
} else {
    http_response_code(500);
    odgovor(false, 'Upit trenutno ne može da se pošalje. Pozovite nas na +381 62 779 878 ili pišite na info@belvederehills.rs.', $ajax);
}

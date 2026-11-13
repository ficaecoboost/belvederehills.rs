<?php
/**
 * Belvedere Hills - trenutno vreme na Kopaoniku za naslovnu (js/meteo.js)
 *
 * Izvor: RHMZ Srbije, meteorološka stanica Kopaonik.
 *  - temperatura i opis vremena: XML feed https://www.hidmet.gov.rs/latin/osmotreni/index.xml
 *  - visina snega: https://www.hidmet.gov.rs/latin/osmotreni/sneg.php (objavljuje se u zimskoj sezoni)
 *
 * Server preuzima podatke najviše jednom na 30 min (inc/podesavanja.php) i čuva ih u inc/kes/.
 * Posetioci sajta ne kontaktiraju RHMZ, samo naš server.
 * Ako RHMZ ne odgovori, vraća se poslednji sačuvani podatak (ako nije stariji od 6 sati).
 *
 * Odgovor (JSON): {"ok":true,"t":-4,"opis":"Pretežno oblačno","cm":45,"izvor":"RHMZ Srbije","vreme":"..."}
 * "cm" je null kad nema svežeg podatka o snegu.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=600');

$BH = require __DIR__ . '/inc/podesavanja.php';
if (empty($BH['meteo_ukljuceno'])) {
    echo json_encode(['ok' => false]);
    exit;
}

$KES_DIR = __DIR__ . '/inc/kes';
$KES     = $KES_DIR . '/meteo.json';
$TRAJE   = max(5, (int) $BH['meteo_kes_min']) * 60;
$MAX_STARO = 6 * 3600;

function bh_kes_citaj($fajl) {
    if (!is_file($fajl)) { return null; }
    $p = json_decode((string) @file_get_contents($fajl), true);
    return is_array($p) ? $p : null;
}

function bh_preuzmi($url) {
    $ua = 'BelvedereHills-sajt/1.0 (+https://belvederehills.rs; info@belvederehills.rs)';
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_USERAGENT => $ua,
        ]);
        $t = curl_exec($c);
        $kod = curl_getinfo($c, CURLINFO_HTTP_CODE);
        curl_close($c);
        return ($t !== false && $kod === 200) ? $t : null;
    }
    $ctx = stream_context_create(['http' => ['timeout' => 10, 'header' => "User-Agent: $ua\r\n"]]);
    $t = @file_get_contents($url, false, $ctx);
    return $t !== false ? $t : null;
}

// Temperatura i opis za stanicu Kopaonik iz XML feeda
function bh_rhmz_temperatura() {
    $xml = bh_preuzmi('https://www.hidmet.gov.rs/latin/osmotreni/index.xml');
    if (!$xml) { return null; }
    if (!preg_match('~Stanica:\s*Kopaonik;.*?<summary>(.*?)</summary>~su', $xml, $m)) { return null; }
    $s = html_entity_decode($m[1], ENT_QUOTES, 'UTF-8');
    if (!preg_match('~Temperatura:\s*(-?\d+(?:[.,]\d+)?)\s*°C~u', $s, $t)) { return null; }
    $opis = preg_match('~Opis vremena:\s*([^;]+);~u', $s, $o) ? trim($o[1]) : '';
    return ['t' => (int) round((float) str_replace(',', '.', $t[1])), 'opis' => $opis];
}

// Visina snega (cm) za Kopaonik: kolona sa najnovijim osmatranjem
function bh_rhmz_sneg($maxSati) {
    $html = bh_preuzmi('https://www.hidmet.gov.rs/latin/osmotreni/sneg.php');
    if (!$html) { return null; }
    if (!preg_match('~<thead>(.*?)</thead>~su', $html, $th)) { return null; }
    preg_match_all('~<th[^>]*>(.*?)</th>~su', $th[1], $kolone);
    $vremena = [];
    foreach ($kolone[1] as $i => $k) {
        if (preg_match('~(\d{2}):(\d{2})\s*UTC.*?(\d{2})\.(\d{2})\.(\d{4})~su', strip_tags(str_replace('<br />', ' ', $k)), $v)) {
            $vremena[$i] = gmmktime((int) $v[1], (int) $v[2], 0, (int) $v[4], (int) $v[3], (int) $v[5]);
        }
    }
    if (!$vremena) { return null; }
    if (!preg_match('~<tr[^>]*>\s*<td[^>]*>(?:\s|&nbsp;)*Kopaonik\s*</td>(.*?)</tr>~su', $html, $red)) { return null; }
    preg_match_all('~<td[^>]*>(.*?)</td>~su', $red[1], $celije);
    // kolona 0 je naziv stanice, pa je vrednost za kolonu $i u ćeliji $i - 1
    arsort($vremena);
    foreach ($vremena as $i => $ts) {
        $vr = trim(str_replace("\xC2\xA0", ' ', preg_replace('~&nbsp;?~', ' ', strip_tags(isset($celije[1][$i - 1]) ? $celije[1][$i - 1] : ''))));
        if ($vr === '' || !is_numeric($vr)) { continue; }
        if (time() - $ts > $maxSati * 3600) { return null; } // najnoviji podatak je prestar
        return ['cm' => (int) $vr, 'cm_vreme' => gmdate('c', $ts)];
    }
    return null;
}

$kes = bh_kes_citaj($KES);
if ($kes && time() - (int) $kes['_ts'] < $TRAJE) {
    unset($kes['_ts']);
    echo json_encode($kes, JSON_UNESCAPED_UNICODE);
    exit;
}

// Novo preuzimanje (zaključavanje da dva posetioca ne preuzimaju istovremeno)
if (!is_dir($KES_DIR)) { @mkdir($KES_DIR, 0755, true); }
$lock = @fopen($KES_DIR . '/meteo.lock', 'c');
if ($lock && !flock($lock, LOCK_EX | LOCK_NB)) {
    // neko drugi upravo preuzima: vrati stari keš ako postoji
    if ($kes && time() - (int) $kes['_ts'] < $MAX_STARO) { unset($kes['_ts']); echo json_encode($kes, JSON_UNESCAPED_UNICODE); }
    else { echo json_encode(['ok' => false]); }
    exit;
}

$temp = bh_rhmz_temperatura();
if ($temp) {
    $sneg = bh_rhmz_sneg((int) $BH['meteo_sneg_sati']);
    $novo = [
        'ok' => true, 't' => $temp['t'], 'opis' => $temp['opis'],
        'cm' => $sneg ? $sneg['cm'] : null, 'cm_vreme' => $sneg ? $sneg['cm_vreme'] : null,
        'izvor' => 'RHMZ Srbije', 'vreme' => date('c'),
    ];
    @file_put_contents($KES, json_encode($novo + ['_ts' => time()], JSON_UNESCAPED_UNICODE), LOCK_EX);
    echo json_encode($novo, JSON_UNESCAPED_UNICODE);
} elseif ($kes && time() - (int) $kes['_ts'] < $MAX_STARO) {
    unset($kes['_ts']);
    echo json_encode($kes, JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['ok' => false]);
}

if ($lock) { flock($lock, LOCK_UN); fclose($lock); }

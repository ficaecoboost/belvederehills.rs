<?php
/**
 * Minimalno slanje mejla preko SMTP-a (bez spoljnih biblioteka).
 * Podržava SSL (port 465) i STARTTLS (port 587), prijavu AUTH LOGIN,
 * UTF-8 tekst (base64, pa nema problema sa dužinom redova i tačkama).
 *
 * bh_smtp_posalji($cfg, $za, $naslov, $tekst, $replyTo)
 *   $cfg  = podešavanja iz inc/podesavanja.php
 *   $za   = jedna ili više adresa odvojenih zarezom
 * Vraća [true, ''] ili [false, 'opis greške'].
 */

function bh_smtp_posalji(array $cfg, $za, $naslov, $tekst, $replyTo = '')
{
    $server  = $cfg['smtp_server'];
    $port    = (int) $cfg['smtp_port'];
    $zastita = strtolower($cfg['smtp_zastita']);
    $od      = $cfg['posiljalac'];
    $primaoci = array_filter(array_map('trim', explode(',', $za)));

    $adresa = ($zastita === 'ssl' ? 'ssl://' : 'tcp://') . $server . ':' . $port;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $server]]);
    $s = @stream_socket_client($adresa, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$s) {
        return [false, "Konekcija na $adresa nije uspela: $errstr ($errno)"];
    }
    stream_set_timeout($s, 15);

    // Pročitaj odgovor servera (može imati više redova: "250-...", poslednji "250 ...")
    $citaj = function () use ($s) {
        $sve = '';
        while (($red = fgets($s, 1024)) !== false) {
            $sve .= $red;
            if (strlen($red) < 4 || $red[3] === ' ') { break; }
        }
        return $sve;
    };
    // Pošalji komandu i proveri kod odgovora
    $komanda = function ($cmd, $ocekivano) use ($s, $citaj) {
        if ($cmd !== null) { fwrite($s, $cmd . "\r\n"); }
        $odg = $citaj();
        if ((int) substr($odg, 0, 3) !== $ocekivano) {
            throw new RuntimeException(trim(($cmd !== null ? preg_replace('/^AUTH.*|^[A-Za-z0-9+\/=]{8,}$/', '[skriveno]', $cmd) . ' -> ' : '') . $odg));
        }
        return $odg;
    };

    try {
        $komanda(null, 220);
        $domen = substr(strrchr($od, '@'), 1) ?: 'localhost';
        $komanda('EHLO ' . $domen, 250);
        if ($zastita === 'tls') {
            $komanda('STARTTLS', 220);
            if (!stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('STARTTLS nije uspeo');
            }
            $komanda('EHLO ' . $domen, 250);
        }
        $komanda('AUTH LOGIN', 334);
        $komanda(base64_encode($cfg['smtp_korisnik']), 334);
        $komanda(base64_encode($cfg['smtp_lozinka']), 235);
        $komanda('MAIL FROM:<' . $od . '>', 250);
        foreach ($primaoci as $p) { $komanda('RCPT TO:<' . $p . '>', 250); }
        $komanda('DATA', 354);

        $enc = function ($t) { return '=?UTF-8?B?' . base64_encode($t) . '?='; };
        $h  = 'Date: ' . date('r') . "\r\n";
        $h .= 'From: ' . $enc($cfg['naziv']) . ' <' . $od . ">\r\n";
        $h .= 'To: ' . implode(', ', $primaoci) . "\r\n";
        if ($replyTo !== '') { $h .= 'Reply-To: ' . $replyTo . "\r\n"; }
        $h .= 'Subject: ' . $enc($naslov) . "\r\n";
        $h .= 'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domen . ">\r\n";
        $h .= "MIME-Version: 1.0\r\n";
        $h .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $h .= "Content-Transfer-Encoding: base64\r\n";
        $telo = rtrim(chunk_split(base64_encode($tekst), 76, "\r\n"));

        fwrite($s, $h . "\r\n" . $telo . "\r\n.\r\n");
        $komanda(null, 250);
        fwrite($s, "QUIT\r\n");
        fclose($s);
        return [true, ''];
    } catch (Exception $e) {
        @fwrite($s, "QUIT\r\n");
        @fclose($s);
        return [false, $e->getMessage()];
    }
}

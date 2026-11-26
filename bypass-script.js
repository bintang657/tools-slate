import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const url = process.env.TARGET_URL || 'https://sfl.gl/fallback';
  console.log(`Memulai bypass untuk: ${url}`);
  
  // Pake headless: false (jika di server) atau argumen anti-deteksi
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled', // Trik sembunyiin kalau ini robot
      '--disable-web-security'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: 'id-ID'
  });
  
  // Sembunyiin webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  const page = await context.newPage();
  let finalUrl = null;
  
  // Sensor jaringan: Abaikan link cloudflare/google/khaddavi
  page.on('request', request => {
    const reqUrl = request.url();
    if (reqUrl.startsWith('http') && 
        !reqUrl.includes('khaddavi') && 
        !reqUrl.includes('sfl.gl') && 
        !reqUrl.includes('cloudflare') && 
        !reqUrl.includes('google') &&
        !reqUrl.includes('gstatic')) {
      console.log(`[Network] Ketemu URL baru: ${reqUrl}`);
      finalUrl = reqUrl;
    }
  });

  try {
    console.log("Membuka halaman...");
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log("Halaman dimuat. Menunggu verifikasi Cloudflare (10 detik)...");
    
    // Tunggu 10 detik buat ngelewatin Cloudflare "Checking your browser"
    await page.waitForTimeout(10000);
    
    // Cek dulu, apakah kita nyangkut di halaman Cloudflare
    if (page.url().includes('cloudflare')) {
       console.log("Masih nyangkut di halaman verifikasi Cloudflare. Coba tunggu 15 detik lagi...");
       await page.waitForTimeout(15000);
    }

    // Terakhir, scan semua link di HTML (abaikan cloudflare)
    const allLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href));
    const externalLink = allLinks.find(l => 
        l.startsWith('http') && 
        !l.includes('khaddavi') && 
        !l.includes('sfl.gl') && 
        !l.includes('javascript:') &&
        !l.includes('cloudflare') &&
        !l.includes('google')
    );
    
    if (externalLink && !finalUrl) {
      finalUrl = externalLink;
      console.log(`[HTML scan] Link ditemukan: ${externalLink}`);
    }

    // Kalau URL halaman akhirnya berubah dan bukan cloudflare
    const currentUrl = page.url();
    if (currentUrl !== url && !currentUrl.includes('cloudflare')) {
      finalUrl = currentUrl;
    }

    if (finalUrl) {
        console.log(`\n✅ BERHASIL: ${finalUrl}`);
        fs.writeFileSync('result.json', JSON.stringify({ success: true, destination: finalUrl }, null, 2));
    } else {
        throw new Error("Link tujuan tidak ditemukan.");
    }
    
  } catch (err) {
    console.log(`\n❌ ERROR: ${err.message}`);
    fs.writeFileSync('result.json', JSON.stringify({ success: false, error: err.message }, null, 2));
  } finally {
    await browser.close();
  }
})();

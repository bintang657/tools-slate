import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const url = process.env.TARGET_URL || 'https://sfl.gl/fallback';
  console.log(`Memulai bypass untuk: ${url}`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'id-ID'
  });
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();
  
  // LOG SEMUA REQUEST
  page.on('request', request => {
    const reqUrl = request.url();
    // Print semua request yang bukan gambar/css
    if (!reqUrl.match(/\.(png|jpg|jpeg|gif|css|woff|svg|ico)(\?.*)?$/i)) {
        console.log(`[REQ] ${request.method()} ${reqUrl}`);
    }
  });

  try {
    console.log("Membuka halaman...");
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log("Halaman dimuat. Menunggu proses JS (30 detik)...");
    
    // Tunggu 30 detik biar semua JS & redirect jalan
    await page.waitForTimeout(30000);
    
    // Cek URL akhir
    console.log(`[FINAL URL] ${page.url()}`);
    
    // Ambil semua text di halaman buat liat apakah ada link tersembunyi
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("--- POTONGAN TEXT HALAMAN ---");
    console.log(bodyText.substring(0, 500));

  } catch (err) {
    console.log(`\n❌ ERROR: ${err.message}`);
  } finally {
    await browser.close();
  }
})();

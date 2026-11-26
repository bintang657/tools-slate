import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const url = process.env.TARGET_URL || 'https://sfl.gl/fallback';
  console.log(`Memulai bypass untuk: ${url}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  // Sensor: Tangkap setiap request yang keluar
  page.on('request', request => {
    const reqUrl = request.url();
    if (reqUrl.startsWith('http') && 
        !reqUrl.includes('khaddavi') && 
        !reqUrl.includes('sfl.gl') && 
        !reqUrl.includes('cloudflare') &&
        !reqUrl.includes('google')) {
      console.log(`[Network] Ketemu URL baru: ${reqUrl}`);
      // Simpan URL ini sebagai kandidat link tujuan
      fs.writeFileSync('result.json', JSON.stringify({ success: true, destination: reqUrl }, null, 2));
    }
  });

  try {
    console.log("Membuka halaman...");
    // Pakai domcontentloaded biar nggak nunggu iklan yang muter terus
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log("Halaman dimuat. Menunggu countdown JS...");
    
    // Kasih waktu 15 detik buat JS ngejalanin countdown dan klik otomatis
    await page.waitForTimeout(15000);
    
    // Terakhir, scan semua link di HTML
    const allLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href));
    const externalLink = allLinks.find(l => l.startsWith('http') && !l.includes('khaddavi') && !l.includes('sfl.gl') && !l.includes('javascript:'));
    
    if (externalLink) {
      console.log(`[HTML scan] Link ditemukan: ${externalLink}`);
      fs.writeFileSync('result.json', JSON.stringify({ success: true, destination: externalLink }, null, 2));
    }

    const currentData = JSON.parse(fs.readFileSync('result.json', 'utf8'));
    if (currentData.destination) {
      console.log(`\n✅ BERHASIL: ${currentData.destination}`);
    } else {
      throw new Error("Nggak nemu link tujuan.");
    }
    
  } catch (err) {
    console.log(`\n❌ ERROR: ${err.message}`);
    // Kalau error, coba cek apakah sensor network udah nyimpen link
    if (!fs.existsSync('result.json')) {
        fs.writeFileSync('result.json', JSON.stringify({ success: false, error: err.message }, null, 2));
    }
  } finally {
    await browser.close();
  }
})();

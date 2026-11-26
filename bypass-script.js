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
  let finalUrl = url;
  
  try {
    console.log("Membuka halaman...");
    // Tunggu sampai halaman bener-bener idle (termasuk eksekusi JS)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    console.log("Halaman dimuat. Menunggu proses JS...");
    
    // Kasih waktu tambahan 10 detik buat jaga-jaga kalau ada countdown
    await page.waitForTimeout(10000);

    // Trik 1: Kumpulin semua link (<a href>) yang bukan domain khaddavi/sfl.gl
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => a.href);
    });
    
    console.log('Total link ditemukan:', links.length);
    
    // Cari link yang bukan bagian dari gateway atau script kosong
    const externalLink = links.find(l => 
      l.startsWith('http') && 
      !l.includes('khaddavi') && 
      !l.includes('sfl.gl') && 
      !l.includes('javascript:') &&
      !l.includes('google.com') &&
      !l.includes('facebook.com')
    );

    if (externalLink) {
      finalUrl = externalLink;
      console.log(`[HTML scan] Link tujuan ditemukan: ${externalLink}`);
    } else {
      // Trik 2: Kalau nggak nemu di <a>, coba cari URL di dalam script/teks halaman
      const html = await page.content();
      const urlRegex = /(https?:\/\/(?!(?:www\.)?(?:khaddavi|sfl\.gl|google|facebook|instagram|cloudflare))[^\s"'<>]+)/g;
      const matches = html.match(urlRegex);
      if (matches && matches.length > 0) {
         // Ambil yang paling akhir (biasanya link tujuan ada di script bawah)
         finalUrl = matches[matches.length - 1];
         console.log(`[Script scan] Link ditemukan: ${finalUrl}`);
      }
    }

    // Trik 3: Kalau URL halaman ternyata udah berubah (redirect otomatis)
    if (page.url() !== url && !page.url().includes('khaddavi')) {
      finalUrl = page.url();
      console.log(`[URL Page] URL berubah jadi: ${finalUrl}`);
    }
    
    fs.writeFileSync('result.json', JSON.stringify({ success: true, destination: finalUrl }, null, 2));
    console.log(`\n✅ BERHASIL: ${finalUrl}`);
    
  } catch (err) {
    fs.writeFileSync('result.json', JSON.stringify({ success: false, error: err.message }, null, 2));
    console.log(`\n❌ ERROR: ${err.message}`);
  } finally {
    await browser.close();
  }
})();

const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.env.TARGET_URL;
  if (!url) throw new Error('URL kosong');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Tunggu sampai tombol "DOWNLOAD NOW" atau "Get Link" muncul (max 15 detik)
    const selector = 'a:has-text("DOWNLOAD NOW"), a:has-text("Get Link"), button:has-text("DOWNLOAD NOW")';
    await page.waitForSelector(selector, { timeout: 15000 });
    
    // Ambil URL href dari tombol tersebut sebelum diklik
    const href = await page.locator(selector).first().getAttribute('href');
    
    // Kadang href-nya kosong, dan URL diambil via onclick JS. Kita coba klik juga.
    if (!href || href === '#' || href === 'javascript:void(0)') {
      await page.locator(selector).first().click();
      await page.waitForTimeout(3000); // tunggu redirect
    }
    
    const finalUrl = page.url(); // URL setelah navigasi
    
    fs.writeFileSync('result.json', JSON.stringify({ success: true, destination: finalUrl }, null, 2));
    console.log('BERHASIL:', finalUrl);
    
  } catch (err) {
    fs.writeFileSync('result.json', JSON.stringify({ success: false, error: err.message }, null, 2));
    console.log('GAGAL:', err.message);
  } finally {
    await browser.close();
  }
})();

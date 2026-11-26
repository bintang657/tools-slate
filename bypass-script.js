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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    console.log("Halaman dimuat.");
    
    page.on('request', request => {
      const reqUrl = request.url();
      if (!reqUrl.includes('khaddavi') && !reqUrl.includes('sfl.gl') && reqUrl.startsWith('http') && !reqUrl.includes('google')) {
         console.log(`[Network] Ketemu URL baru: ${reqUrl}`);
         finalUrl = reqUrl;
      }
    });

    const texts = ["DOWNLOAD NOW", "Get Link", "Lanjut", "Continue", "Download", "Open"];
    for (const t of texts) {
      const btn = page.locator(`a:has-text("${t}"), button:has-text("${t}")`).first();
      if (await btn.count() > 0) {
        console.log(`Menemukan tombol: ${t}. Mencoba klik...`);
        const href = await btn.getAttribute('href');
        if (href && href.startsWith('http') && !href.includes('khaddavi')) {
            finalUrl = href;
            console.log(`[Href] Link ditemukan: ${href}`);
            break;
        } else {
            await btn.click({ force: true }).catch(e => console.log('Gagal klik:', e.message));
            await page.waitForTimeout(5000);
        }
      }
    }

    if (page.url() !== url) {
      finalUrl = page.url();
      console.log(`[URL Page] URL berubah jadi: ${finalUrl}`);
    }

    if (finalUrl === url) {
        const allLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href));
        const externalLink = allLinks.find(l => l.startsWith('http') && !l.includes('khaddavi') && !l.includes('sfl.gl') && !l.includes('javascript:'));
        if (externalLink) {
            finalUrl = externalLink;
            console.log(`[HTML scan] Link ditemukan: ${externalLink}`);
        }
    }
    
    fs.writeFileSync('result.json', JSON.stringify({ success: true, destination: finalUrl }, null, 2));
    console.log(`\n✅ BERHASIL: ${finalUrl}`);
    
  } catch (err) {
    fs.writeFileSync('result.json', JSON.stringify({ success: false, error: err.message }, null, 2));
    console.log(`\n❌ ERROR: ${err.message}`);
    const html = await page.content().catch(()=>'');
    console.log('--- POTONGAN HTML ---');
    console.log(html.substring(0, 3000)); 
  } finally {
    await browser.close();
  }
})();

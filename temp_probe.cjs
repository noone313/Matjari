const API = "https://matjari.world";

async function probe(label, url, opts = {}) {
  try {
    const r = await fetch(url, opts);
    const t = await r.text();
    console.log(`${label}: status=${r.status} len=${t.length}`);
    if (t.length > 0) console.log("  body:", t.substring(0, 200));
  } catch(e) {
    console.log(`${label}: ERROR ${e.message}`);
  }
}

(async () => {
  // 1. Plain GET / (worked before - 200)
  await probe("GET /", API + "/");

  // 2. With browser-like User-Agent
  const browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
  await probe("GET /api/health (browser UA)", API + "/api/health", { headers: { "User-Agent": browserUA } });

  // 3. GET /api/health with Origin header
  await probe("GET /api/health (Origin)", API + "/api/health", {
    headers: { "User-Agent": browserUA, "Origin": "https://matjari.world", "Accept": "application/json" },
  });

  // 4. Try /health (without /api prefix)
  await probe("GET /health", API + "/health", { headers: { "User-Agent": browserUA } });

  // 5. Storefront with browser UA
  await probe("GET /api/stores/cake-corner (browser UA)", API + "/api/stores/cake-corner", {
    headers: { "User-Agent": browserUA, "Accept": "application/json" },
  });

  // 6. Try a series of rapid requests to detect flapping
  console.log("\n=== 5 rapid requests to /api/health ===");
  for (let i = 1; i <= 5; i++) {
    await probe(`req ${i}`, API + "/api/health", { headers: { "User-Agent": browserUA } });
    await new Promise(r => setTimeout(r, 1000));
  }
})();

const API = "https://matjari.world";

async function probe(label, url, opts = {}) {
  try {
    const r = await fetch(url, opts);
    const t = await r.text();
    console.log(`${label}: status=${r.status} len=${t.length}`);
    if (t.length > 0) console.log("  body:", t.substring(0, 300));
    return r.status;
  } catch(e) {
    console.log(`${label}: ERROR ${e.message}`);
    return null;
  }
}

(async () => {
  // The REAL health endpoint is /api/healthz
  await probe("GET /api/healthz", API + "/api/healthz");

  // Storefront
  await probe("GET /api/stores/cake-corner", API + "/api/stores/cake-corner");

  // Login
  await probe("POST /api/auth/login", API + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "mwmlly35@gmail.com", password: "baqerali123" }),
  });

  // Also check /healthz without /api
  await probe("GET /healthz", API + "/healthz");

  // And the root API base
  await probe("GET /api", API + "/api");
})();

const { Pool } = require("./node_modules/.pnpm/pg@8.23.0/node_modules/pg");

const DB = "postgresql://neondb_owner:npg_R9lZiphx2CUs@ep-spring-lab-ayc20rv2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
const API = "https://matjari.world/api";
const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

(async () => {
  // 1. Health
  console.log("=== /api/health ===");
  try { const r = await fetch(`${API}/health`); console.log(r.status, (await r.text()).substring(0, 200)); } catch(e) { console.log("ERR:", e.message); }

  // 2. Storefront (public, no auth)
  console.log("\n=== /api/stores/cake-corner ===");
  try {
    const r = await fetch(`${API}/stores/cake-corner`);
    const t = await r.text();
    console.log("Status:", r.status);
    console.log("Body (first 400):", t.substring(0, 400));
  } catch(e) { console.log("ERR:", e.message); }

  // 3. Login
  console.log("\n=== POST /api/auth/login ===");
  let token = null;
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "mwmlly35@gmail.com", password: "baqerali123" }),
    });
    const t = await r.text();
    console.log("Status:", r.status);
    console.log("Body (first 300):", t.substring(0, 300));
    try { token = JSON.parse(t).token; console.log("TOKEN:", token ? "YES" : "NO"); } catch {}
  } catch(e) { console.log("ERR:", e.message); }

  // 4. If token, do the full save cycle
  if (token) {
    console.log("\n=== PUT /api/dashboard/settings (save test) ===");
    const testVal = "SAVE_PROOF_" + Date.now();
    const put = await fetch(`${API}/dashboard/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        aboutUs: testVal,
        contactUs: "CONTACT_PROOF",
        storeEmail: "proof@test.com",
        location: "Baghdad",
      }),
    });
    const putTxt = await put.text();
    console.log("PUT status:", put.status);
    console.log("PUT body (first 400):", putTxt.substring(0, 400));

    console.log("\n=== DB AFTER PUT ===");
    const db1 = await pool.query("SELECT id, about_us, contact_us, store_email, location FROM merchants WHERE id = 2");
    console.table(db1.rows);

    console.log("\n=== GET settings again (simulate refresh) ===");
    const get2 = await fetch(`${API}/dashboard/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const s2 = await get2.json();
    console.log("aboutUs:", JSON.stringify(s2.aboutUs));
    console.log("contactUs:", JSON.stringify(s2.contactUs));
    console.log("storeEmail:", JSON.stringify(s2.storeEmail));

    // Cleanup
    console.log("\n=== CLEANUP ===");
    await pool.query("UPDATE merchants SET about_us=NULL, contact_us=NULL, store_email=NULL, location=NULL WHERE id=2");
    console.log("Done.");
  }

  await pool.end();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });

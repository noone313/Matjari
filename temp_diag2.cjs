const { Pool } = require("./node_modules/.pnpm/pg@8.23.0/node_modules/pg");

const DB = "postgresql://neondb_owner:npg_R9lZiphx2CUs@ep-spring-lab-ayc20rv2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
const p = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

(async () => {
  // Step A: Directly write a test value to merchant 1
  console.log("=== STEP A: Direct SQL write ===");
  const writeResult = await p.query(
    "UPDATE merchants SET about_us = 'TEST_DIRECT_WRITE' WHERE id = 1 RETURNING id, store_name, about_us"
  );
  console.table(writeResult.rows);

  // Step B: Read it back
  console.log("\n=== STEP B: Read back ===");
  const readResult = await p.query(
    "SELECT id, store_name, about_us, contact_us FROM merchants WHERE id = 1"
  );
  console.table(readResult.rows);

  // Step C: Now test what drizzle's UPDATE would do with ?? undefined pattern
  // Simulate: set(about_us = undefined) means SKIP the column
  // Simulate: set(about_us = '') means set to empty string
  // Simulate: set(about_us = 'FORM_VALUE') means set to value
  console.log("\n=== STEP C: Test empty string write ===");
  await p.query("UPDATE merchants SET about_us = '' WHERE id = 1");
  const r3 = await p.query("SELECT about_us FROM merchants WHERE id = 1");
  console.table(r3.rows);

  // Step D: Reset to null for clean state
  console.log("\n=== STEP D: Reset to null ===");
  await p.query("UPDATE merchants SET about_us = NULL WHERE id = 1");
  const r4 = await p.query("SELECT about_us FROM merchants WHERE id = 1");
  console.table(r4.rows);

  await p.end();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

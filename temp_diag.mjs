import pg from "pg";
const { Pool } = pg;
const DB = "postgresql://neondb_owner:npg_R9lZiphx2CUs@ep-spring-lab-ayc20rv2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
const p = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log("=== CHECK 1: Do the 7 columns exist? ===");
    const c1 = await p.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='merchants' AND column_name IN ('about_us','contact_us','store_email','location','facebook','twitter','tiktok')"
    );
    console.table(c1.rows);

    console.log("\n=== CHECK 2: Current merchant data ===");
    const c2 = await p.query(
      "SELECT id, store_name, about_us, contact_us, store_email, location, facebook, twitter, tiktok FROM merchants LIMIT 5"
    );
    console.table(c2.rows);

    console.log("\n=== CHECK 3: ALL columns in merchants table ===");
    const c3 = await p.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='merchants' ORDER BY ordinal_position"
    );
    console.table(c3.rows);
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    await p.end();
  }
}
run();

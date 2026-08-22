const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_R9lZiphx2CUs@ep-spring-lab-ayc20rv2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require' });
(async () => {
  const m = await pool.query('SELECT id, slug, store_name, hero_enabled FROM merchants WHERE id = 2');
  console.log('merchant:', JSON.stringify(m.rows[0]));
  const s = await pool.query("SELECT id, position, octet_length(image_data) AS bytes, image_mime FROM hero_slides ORDER BY position");
  console.table(s.rows);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });

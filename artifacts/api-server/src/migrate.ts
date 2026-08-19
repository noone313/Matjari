import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

const STATEMENTS = [
  `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS hero_enabled boolean NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS hero_slides (
    id serial PRIMARY KEY,
    merchant_id integer NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    title varchar(150),
    subtitle varchar(300),
    link_url varchar(500),
    position integer NOT NULL DEFAULT 0,
    image_data bytea,
    image_mime varchar(50),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS about_us text`,
  `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS contact_us text`,
  `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS store_email varchar(150)`,
  `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS location text`,
  `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS facebook varchar(200)`,
  `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS twitter varchar(200)`,
  `ALTER TABLE merchants ADD COLUMN IF NOT EXISTS tiktok varchar(200)`,
];

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const statement of STATEMENTS) {
      await client.query(statement);
    }
    logger.info("Database migrations applied");
  } finally {
    client.release();
  }
}

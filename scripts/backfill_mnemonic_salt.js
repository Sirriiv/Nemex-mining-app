// scripts/backfill_mnemonic_salt.js
// Usage: export DATABASE_URL=postgres://user:pass@host:port/dbname && node scripts/backfill_mnemonic_salt.js

const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    const res = await client.query(`SELECT id, encrypted_mnemonic FROM user_wallets WHERE encrypted_mnemonic IS NOT NULL`);
    console.log(`Found ${res.rows.length} wallets with encrypted_mnemonic`);

    for (const row of res.rows) {
      try {
        let data = row.encrypted_mnemonic;
        if (typeof data === 'string') data = JSON.parse(data);
        const salt = data && (data.salt || data.saltHex || data.mnemonic_salt);
        if (salt) {
          await client.query(`UPDATE user_wallets SET mnemonic_salt = $1 WHERE id = $2`, [salt, row.id]);
          console.log(`Updated wallet id=${row.id} salt=${String(salt).slice(0,12)}...`);
        } else {
          // no salt available in encrypted payload
        }
      } catch (e) {
        console.warn(`Skipping id=${row.id} due to parse error: ${e.message}`);
      }
    }

    console.log('Backfill complete');
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(2); });

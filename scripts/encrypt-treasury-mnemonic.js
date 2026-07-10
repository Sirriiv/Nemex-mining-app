// scripts/encrypt-treasury-mnemonic.js
// ONE-TIME LOCAL UTILITY - Encrypts Treasury mnemonic for Settle Engine use.
// Runs entirely locally. Mnemonic never leaves this machine.
//
// Usage:
//   MNEMONIC="word1 word2 ... word24" node scripts/encrypt-treasury-mnemonic.js
//
// The script reads the mnemonic from the MNEMONIC environment variable,
// encrypts it using AES-256-GCM + Argon2id (same format as wallet-routes.js),
// and outputs TREASURY_MNEMONIC_ENCRYPTED for your .env file.

const crypto = require('crypto');
const argon2 = require('argon2');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

async function encryptMnemonic(mnemonic, password) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(16);

    const key = await argon2.hash(password, {
        salt,
        raw: true,
        hashLength: 32,
        type: argon2.argon2id,
        timeCost: 3,
        memoryCost: 1 << 16
    });

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex'),
        algorithm,
        salt: salt.toString('hex'),
        kdf: 'argon2id',
        kdfParams: { timeCost: 3, memoryCost: 1 << 16, hashLength: 32 }
    };
}

(async () => {
    if (!ENCRYPTION_KEY) {
        console.error('ERROR: ENCRYPTION_KEY not found in .env');
        process.exit(1);
    }

    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) {
        console.error('ERROR: Set MNEMONIC env var with your 24-word phrase.');
        console.error('Example: MNEMONIC="word1 word2 ... word24" node scripts/encrypt-treasury-mnemonic.js');
        process.exit(1);
    }

    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 24) {
        console.error('ERROR: Mnemonic must be exactly 24 words. Got ' + words.length + ' words.');
        process.exit(1);
    }

    try {
        const encrypted = await encryptMnemonic(mnemonic, ENCRYPTION_KEY);
        const encoded = Buffer.from(JSON.stringify(encrypted)).toString('base64');

        console.log('\nEncrypted successfully. Add this to your .env file:\n');
        console.log('TREASURY_MNEMONIC_ENCRYPTED=' + encoded);
        console.log('');
    } catch (err) {
        console.error('Encryption failed:', err.message);
        process.exit(1);
    }
})();

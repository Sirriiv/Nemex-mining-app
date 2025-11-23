// frontend/assets/js/crypto-utils.js - PRODUCTION GRADE ENCRYPTION
class CryptoUtils {
    // Encrypt private key with user password
    static async encryptPrivateKey(privateKey, password, salt = null) {
        try {
            // Generate salt if not provided
            salt = salt || this.generateRandomBytes(16);
            
            // Import password as key
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);
            const saltBuffer = salt;
            
            // Derive key from password
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );
            
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: saltBuffer,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
            
            // Generate IV
            const iv = this.generateRandomBytes(12);
            
            // Encrypt private key
            const privateKeyBuffer = this.hexToBuffer(privateKey);
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                privateKeyBuffer
            );
            
            return {
                encrypted: this.arrayBufferToBase64(encrypted),
                iv: this.arrayBufferToBase64(iv),
                salt: this.arrayBufferToBase64(salt)
            };
            
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt private key: ' + error.message);
        }
    }

    // Decrypt private key with user password
    static async decryptPrivateKey(encryptedData, password) {
        try {
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);
            const saltBuffer = this.base64ToArrayBuffer(encryptedData.salt);
            const ivBuffer = this.base64ToArrayBuffer(encryptedData.iv);
            const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.encrypted);
            
            // Derive key from password
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );
            
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: saltBuffer,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
            
            // Decrypt private key
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: ivBuffer
                },
                key,
                encryptedBuffer
            );
            
            return this.arrayBufferToHex(decrypted);
            
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt private key. Wrong password?');
        }
    }

    // Generate key pair from mnemonic
    static async generateKeyPairFromMnemonic(mnemonic) {
        try {
            // Use the existing TON crypto library
            const { mnemonicToWalletKey } = await import('https://unpkg.com/@ton/crypto@1.0.0/dist/crypto.min.js');
            return await mnemonicToWalletKey(mnemonic.split(' '));
        } catch (error) {
            console.error('Key pair generation error:', error);
            throw new Error('Failed to generate key pair from mnemonic');
        }
    }

    // Hash password for verification
    static async hashPassword(password, salt = null) {
        try {
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);
            salt = salt || this.generateRandomBytes(16);
            
            const key = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );
            
            const hashBuffer = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                key,
                256
            );
            
            return {
                hash: this.arrayBufferToBase64(hashBuffer),
                salt: this.arrayBufferToBase64(salt)
            };
            
        } catch (error) {
            console.error('Password hashing error:', error);
            throw new Error('Failed to hash password');
        }
    }

    // Verify password
    static async verifyPassword(password, hash, salt) {
        try {
            const newHash = await this.hashPassword(password, this.base64ToArrayBuffer(salt));
            return newHash.hash === hash;
        } catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }

    // Helper methods
    static generateRandomBytes(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    }

    static arrayBufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    static hexToBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes.buffer;
    }

    static arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    static bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

// Make it available globally
window.CryptoUtils = CryptoUtils;
console.log('✅ CryptoUtils loaded - Production Grade Encryption Ready');
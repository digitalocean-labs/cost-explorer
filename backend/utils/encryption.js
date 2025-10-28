const crypto = require('crypto');

/**
 * Encrypts text using AES-256-GCM
 * @param {string} text - The text to encrypt
 * @param {string} key - The encryption key (32 bytes)
 * @returns {string} - Encrypted data in format "iv:authTag:encryptedData" (all hex-encoded)
 */
function encrypt(text, key) {
  if (!key || key.length !== 64) {
    throw new Error('Encryption key must be 64 hex characters (32 bytes)');
  }
  
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }
  
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.randomBytes(12);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts encrypted data using AES-256-GCM
 * @param {string} encryptedData - The encrypted data in format "iv:authTag:encryptedData"
 * @param {string} key - The encryption key (32 bytes)
 * @returns {string} - The decrypted text
 */
function decrypt(encryptedData, key) {
  if (!key || key.length !== 64) {
    throw new Error('Encryption key must be 64 hex characters (32 bytes)');
  }
  
  if (!encryptedData) {
    throw new Error('Encrypted data cannot be empty');
  }
  
  // Split the encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected "iv:authTag:encryptedData"');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  
  try {
    // Parse IV and auth tag
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

module.exports = {
  encrypt,
  decrypt
};

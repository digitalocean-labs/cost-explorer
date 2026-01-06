const config = {
    port: process.env.PORT || 5000,
    clientId: process.env.DO_CLIENT_ID,
    clientSecret: process.env.DO_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    frontendUrl: process.env.FRONTEND_URL,
    redis: {
        url: process.env.REDIS_URL
    },
    encryptionKey: process.env.ENCRYPTION_KEY
  };

  // Validate encryption key
  if (!config.encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  if (config.encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  module.exports = config;
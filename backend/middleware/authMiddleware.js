const axios = require('axios');
const config = require('../config/config');
const { encrypt, decrypt } = require('../utils/encryption');

const authMiddleware = async (req, res, next) => {
    // Check if user has a valid session with DO access token
    if (!req.session || !req.session.doAccessToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Decrypt the access token
    let accessToken;
    try {
      accessToken = decrypt(req.session.doAccessToken, config.encryptionKey);
    } catch (error) {
      console.error('Failed to decrypt access token:', error.message);
      req.session.destroy();
      return res.status(401).json({ message: 'Invalid session data' });
    }
    
    // Attach decrypted token to request object for use in routes
    req.doAccessToken = accessToken;
    
    // Check if token is expired and refresh if needed
    if (req.session.doRefreshToken) {
      try {
        // Check if token is still valid by making a test API call
        const testResponse = await axios.get('https://api.digitalocean.com/v2/account', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        // If we get here, token is still valid
        next();
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // Token is expired, try to refresh it
          try {
            // Decrypt the refresh token
            let refreshToken;
            try {
              refreshToken = decrypt(req.session.doRefreshToken, config.encryptionKey);
            } catch (decryptError) {
              console.error('Failed to decrypt refresh token:', decryptError.message);
              req.session.destroy();
              return res.status(401).json({ message: 'Invalid session data' });
            }
            
            const refreshResponse = await axios.post(
              'https://cloud.digitalocean.com/v1/oauth/token',
              new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: config.clientId,
                client_secret: config.clientSecret
              }),
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
              }
            );
            
            // Update session with new encrypted tokens
            req.session.doAccessToken = encrypt(refreshResponse.data.access_token, config.encryptionKey);
            if (refreshResponse.data.refresh_token) {
              req.session.doRefreshToken = encrypt(refreshResponse.data.refresh_token, config.encryptionKey);
            }
            
            // Update the request object with the new decrypted token
            req.doAccessToken = refreshResponse.data.access_token;
            
            next();
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError.response?.data || refreshError.message);
            req.session.destroy((destroyErr) => {
              if (destroyErr) {
                console.error('Session destruction failed:', destroyErr);
              }
              return res.status(401).json({ message: 'Session expired' });
            });
          }
        } else {
          // Other error, proceed with current token
          next();
        }
      }
    } else {
      // No refresh token, proceed with current token
      next();
    }
  };
  
  module.exports = authMiddleware;
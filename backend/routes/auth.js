// Fixed backend/routes/auth.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');
const config = require('../config/config');
const { encrypt } = require('../utils/encryption');

// Initiate OAuth flow
router.get('/login', (req, res) => {
  const authUrl = 'https://cloud.digitalocean.com/v1/oauth/authorize';
  const scope = 'read';
  
  const url = `${authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=${scope}`;
  
  res.redirect(url);
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect(`${config.frontendUrl}/login?error=Missing authorization code`);
  }
  
  try {
    // Exchange code for access token using form-urlencoded format
    const tokenResponse = await axios.post(
      'https://cloud.digitalocean.com/v1/oauth/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    // Store encrypted tokens in session
    req.session.doAccessToken = encrypt(tokenResponse.data.access_token, config.encryptionKey);
    if (tokenResponse.data.refresh_token) {
      req.session.doRefreshToken = encrypt(tokenResponse.data.refresh_token, config.encryptionKey);
    }
    
    // Redirect to frontend dashboard
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (error) {
    console.error('Error during token exchange:', error.response?.data || error.message);
    
    // Add more detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    }
    
    res.redirect(`${config.frontendUrl}/login?error=Authentication failed`);
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Check auth status
router.get('/status', (req, res) => {
  if (req.session && req.session.doAccessToken) {
    res.json({ isAuthenticated: true });
  } else {
    res.json({ isAuthenticated: false });
  }
});

module.exports = router;
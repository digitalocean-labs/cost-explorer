const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');

// Get list of available billing periods
router.get('/billing-periods', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get('https://api.digitalocean.com/v2/customers/my/invoices', {
      headers: {
        'Authorization': `Bearer ${req.doAccessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Store invoice mapping in session for later use
    req.session.invoiceMap = {};
    
    // Process invoices from the response
    const invoices = [...response.data.invoices];
    
    // Add invoice preview if it exists
    if (response.data.invoice_preview) {
      invoices.push(response.data.invoice_preview);
    }
    
    // Extract and format billing periods from the response
    const billingPeriods = invoices.map(invoice => {
      // Store the mapping between invoice_id and invoice_uuid
      req.session.invoiceMap[invoice.invoice_id] = invoice.invoice_uuid;
      
      return {
        id: invoice.invoice_id,
        uuid: invoice.invoice_uuid,
        period: invoice.invoice_period,
        amount: invoice.amount,
        status: invoice.status || 'PENDING',
        description: `Invoice ${invoice.invoice_id} - ${invoice.invoice_period}`
      };
    });
    
    // Sort by invoice period (most recent first)
    billingPeriods.sort((a, b) => b.period.localeCompare(a.period));
    
    console.log('Available billing periods:', billingPeriods);
    console.log('Invoice mapping:', req.session.invoiceMap);
    
    res.json(billingPeriods);
  } catch (error) {
    console.error('Error fetching billing periods:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch billing periods' });
  }
});

// Get invoice details for a specific period
router.get('/invoice/:invoiceId', authMiddleware, async (req, res) => {
  const { invoiceId } = req.params;
  const safeInvoiceId = String(invoiceId).replace(/[^\w-]/g, '');
  
  try {
    // Get the invoice UUID from the session mapping
    let invoiceUuid = req.session.invoiceMap?.[safeInvoiceId];
    
    // If we don't have the UUID in the session, fetch the invoice list again
    if (!invoiceUuid) {
      console.log(`Invoice UUID for ID ${safeInvoiceId} not found in session, fetching invoices...`);
      
      const invoicesResponse = await axios.get('https://api.digitalocean.com/v2/customers/my/invoices', {
        headers: {
          'Authorization': `Bearer ${req.doAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Initialize or update invoice mapping
      req.session.invoiceMap = req.session.invoiceMap || {};
      
      // Process all invoices including preview
      const allInvoices = [...invoicesResponse.data.invoices];
      if (invoicesResponse.data.invoice_preview) {
        allInvoices.push(invoicesResponse.data.invoice_preview);
      }
      
      // Update the mapping and find our invoice
      allInvoices.forEach(invoice => {
        req.session.invoiceMap[invoice.invoice_id] = invoice.invoice_uuid;
      });
      
      invoiceUuid = req.session.invoiceMap[safeInvoiceId];
      
      if (!invoiceUuid) {
        console.error(`Invoice with ID ${safeInvoiceId} not found in API response`);
        return res.status(404).json({ message: `Invoice with ID ${safeInvoiceId} not found` });
      }
      
      console.log(`Found UUID ${invoiceUuid} for invoice ID ${safeInvoiceId}`);
    }
    
    // Get invoice CSV using the UUID
    console.log(`Fetching CSV for invoice UUID: ${invoiceUuid}`);
    const response = await axios.get(`https://api.digitalocean.com/v2/customers/my/invoices/${invoiceUuid}/csv`, {
      headers: {
        'Authorization': `Bearer ${req.doAccessToken}`,
        'Content-Type': 'application/json'
      },
      responseType: 'text'
    });
    
    // Return the raw CSV data
    res.setHeader('Content-Type', 'text/csv');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching invoice:', error.response?.data || error.message);
    
    // Log more details about the error
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch invoice data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
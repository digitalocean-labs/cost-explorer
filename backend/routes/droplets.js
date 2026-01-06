const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');

// Helper function to process droplet cost data
const calculateDropletCosts = (droplets) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Cap billing hours at 672 (28 days * 24 hours) per DO's billing policy
  const hoursInMonth = Math.min(lastDayOfMonth * 24, 672);
  
  // Calculate cost metrics for this month
  return droplets.map(droplet => {
    const createdAt = new Date(droplet.created_at);
    let hoursRunning;
    
    // Check if created in current month
    if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
      // Calculate hours from creation to end of month
      const daysRemaining = lastDayOfMonth - createdAt.getDate();
      const hoursRemainingInCreationDay = 24 - createdAt.getHours();
      hoursRunning = Math.min((daysRemaining * 24) + hoursRemainingInCreationDay, 672);
    } else {
      // Assume it runs for the whole month (capped at 672 hours)
      hoursRunning = hoursInMonth;
    }
    
    // Calculate costs
    const monthlyCost = droplet.size.price_monthly;
    const hourlyCost = droplet.size.price_hourly;
    const projectedCost = hoursRunning * hourlyCost;
    const fullMonthCost = 672 * hourlyCost; // DigitalOcean caps monthly billing at 672 hours
    
    return {
      id: droplet.id,
      name: droplet.name,
      region: droplet.region.slug,
      regionName: droplet.region.name,
      memory: droplet.size.memory,
      vcpus: droplet.size.vcpus,
      disk: droplet.size.disk,
      size: droplet.size.slug,
      created_at: droplet.created_at,
      hourly_price: hourlyCost,
      monthly_price: monthlyCost,
      projected_cost: projectedCost,
      full_month_cost: fullMonthCost,
      hours_running: hoursRunning,
      tags: droplet.tags || []
    };
  });
};

// Get all droplets with cost data
router.get('/live-costs', authMiddleware, async (req, res) => {
  try {
    const droplets = [];
    let page = 1;
    let hasMorePages = true;
    
    // Handle pagination to get all droplets
    while (hasMorePages) {
      const response = await axios.get(
        `https://api.digitalocean.com/v2/droplets?page=${page}&per_page=200`,
        {
          headers: {
            'Authorization': `Bearer ${req.doAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.droplets && response.data.droplets.length > 0) {
        droplets.push(...response.data.droplets);
        
        // Check if there are more pages
        if (response.data.links && 
            response.data.links.pages && 
            response.data.links.pages.next) {
          page++;
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
      
      // Safety check for too many droplets
      if (page > 25) { // 5000 droplets / 200 per page = 25 pages max
        hasMorePages = false;
      }
    }
    
    // Calculate costs for all droplets
    const dropletsWithCosts = calculateDropletCosts(droplets);
    
    // Calculate summary by region
    const regionSummary = dropletsWithCosts.reduce((acc, droplet) => {
      if (!acc[droplet.region]) {
        acc[droplet.region] = {
          regionName: droplet.regionName,
          count: 0,
          totalCost: 0,
          fullMonthCost: 0
        };
      }
      
      acc[droplet.region].count++;
      acc[droplet.region].totalCost += droplet.projected_cost;
      acc[droplet.region].fullMonthCost += droplet.full_month_cost;
      return acc;
    }, {});
    
    // Calculate summary by tag
    const tagSummary = dropletsWithCosts.reduce((acc, droplet) => {
      if (droplet.tags && droplet.tags.length > 0) {
        droplet.tags.forEach(tag => {
          if (!acc[tag]) {
            acc[tag] = {
              count: 0,
              totalCost: 0,
              fullMonthCost: 0
            };
          }
          
          acc[tag].count++;
          acc[tag].totalCost += droplet.projected_cost;
          acc[tag].fullMonthCost += droplet.full_month_cost;
        });
      }
      return acc;
    }, {});
    
    // Calculate total cost
    const totalCost = dropletsWithCosts.reduce((sum, droplet) => sum + droplet.projected_cost, 0);
    const totalFullMonthCost = dropletsWithCosts.reduce((sum, droplet) => sum + droplet.full_month_cost, 0);
    
    res.json({
      droplets: dropletsWithCosts,
      regionSummary,
      tagSummary,
      totalCost,
      totalFullMonthCost,
      count: dropletsWithCosts.length
    });
    
  } catch (error) {
    console.error('Error fetching droplet data:', error);
    
    // Handle specific API errors
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      
      return res.status(error.response.status).json({
        message: 'Error fetching droplet data from DigitalOcean API',
        error: error.response.data
      });
    }
    
    res.status(500).json({
      message: 'Error fetching droplet data',
      error: error.message
    });
  }
});

// Get droplet names by IDs
router.post('/names', authMiddleware, async (req, res) => {
  try {
    const { dropletIds } = req.body;
    
    if (!dropletIds || !Array.isArray(dropletIds)) {
      return res.status(400).json({
        message: 'dropletIds array is required'
      });
    }

    if (dropletIds.length === 0) {
      return res.json({});
    }

    // Limit to prevent abuse
    if (dropletIds.length > 100) {
      return res.status(400).json({
        message: 'Maximum 100 droplet IDs allowed per request'
      });
    }

    const dropletNames = {};
    
    // Fetch droplets in batches to avoid URL length limits
    const batchSize = 20;
    for (let i = 0; i < dropletIds.length; i += batchSize) {
      const batch = dropletIds.slice(i, i + batchSize);
      const idsParam = batch.join(',');
      
      const response = await axios.get(
        `https://api.digitalocean.com/v2/droplets?ids=${idsParam}`,
        {
          headers: {
            'Authorization': `Bearer ${req.doAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.droplets) {
        response.data.droplets.forEach(droplet => {
          dropletNames[droplet.id.toString()] = droplet.name;
        });
      }
    }
    
    res.json(dropletNames);
    
  } catch (error) {
    console.error('Error fetching droplet names:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        message: 'Error fetching droplet names from DigitalOcean API',
        error: error.response.data
      });
    }
    
    res.status(500).json({
      message: 'Error fetching droplet names',
      error: error.message
    });
  }
});

module.exports = router; 
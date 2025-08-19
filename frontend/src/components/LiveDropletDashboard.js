import React from 'react';
import LiveDropletCosts from './LiveDropletCosts';
import Footer from './Footer';

const LiveDropletDashboard = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">DigitalOcean Droplet Costs</h1>
          <p className="text-gray-600">View and analyze your Droplet costs by region, tag, and more.</p>
        </div>
        
        <LiveDropletCosts />
      </div>
      
      <Footer />
    </div>
  );
};

export default LiveDropletDashboard; 
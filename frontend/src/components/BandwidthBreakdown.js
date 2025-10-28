import React, { useState } from 'react';
import { dropletService } from '../services/api';

const BandwidthBreakdown = () => {
  const [csvData, setCsvData] = useState(null);
  const [dropletNames, setDropletNames] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row.');
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim());
      const expectedHeaders = ['Region', 'Product', 'Resource ID', 'Resource UUID', 'Bandwidth Usage (GiB)'];
      
      // Check if headers match expected format
      const hasAllHeaders = expectedHeaders.every(expected => 
        headers.some(header => header.toLowerCase().includes(expected.toLowerCase()))
      );

      if (!hasAllHeaders) {
        throw new Error('CSV file does not have the expected headers. Expected: Region, Product, Resource ID, Resource UUID, Bandwidth Usage (GiB)');
      }

      // Parse data rows
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 5) {
          const region = values[0];
          const product = values[1];
          const resourceId = values[2];
          const resourceUuid = values[3];
          const bandwidthUsage = parseFloat(values[4]) || 0;

          data.push({
            region,
            product,
            resourceId: resourceId || null,
            resourceUuid: resourceUuid || null,
            bandwidthUsage
          });
        }
      }

      setCsvData(data);

      // Extract unique droplet IDs for name lookup
      const dropletIds = [...new Set(data
        .filter(item => item.product === 'droplet' && item.resourceId)
        .map(item => item.resourceId.toString()) // Ensure string format
      )];

      if (dropletIds.length > 0) {
        try {
          const names = await dropletService.getDropletNames(dropletIds);
          setDropletNames(names);
        } catch (nameError) {
          console.warn('Could not fetch droplet names:', nameError);
          // Continue without names - we'll show IDs instead
        }
      }

    } catch (err) {
      setError(err.message || 'Error parsing CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    if (!csvData || !sortField) return csvData;

    return [...csvData].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'bandwidth':
          aValue = a.bandwidthUsage;
          bValue = b.bandwidthUsage;
          break;
        case 'region':
          aValue = a.region;
          bValue = b.region;
          break;
        case 'product':
          aValue = a.product;
          bValue = b.product;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSummaryStats = () => {
    if (!csvData) return null;

    const totalBandwidth = csvData.reduce((sum, item) => sum + item.bandwidthUsage, 0);
    const dropletCount = csvData.filter(item => item.product === 'droplet').length;
    const k8sCount = csvData.filter(item => item.product === 'kubernetes').length;
    const dropletBandwidth = csvData
      .filter(item => item.product === 'droplet')
      .reduce((sum, item) => sum + item.bandwidthUsage, 0);
    const k8sBandwidth = csvData
      .filter(item => item.product === 'kubernetes')
      .reduce((sum, item) => sum + item.bandwidthUsage, 0);

    return {
      totalBandwidth,
      dropletCount,
      k8sCount,
      dropletBandwidth,
      k8sBandwidth
    };
  };

  const sortedData = getSortedData();
  const summaryStats = getSummaryStats();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-none">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Bandwidth Breakdown</h2>
        <p className="text-gray-600 mb-4">
          Upload a bandwidth CSV report from your DigitalOcean cloud panel to analyze bandwidth usage by resource.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How to get your bandwidth CSV report:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to your DigitalOcean billing page: <a href="https://cloud.digitalocean.com/account/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://cloud.digitalocean.com/account/billing</a></li>
            <li>In the "Droplet Transfer (Bandwidth) Overview" section, click "Bandwidth Detail CSV (Beta)"</li>
            <li>Download the CSV file and upload it below</li>
          </ol>
          <p className="text-xs text-blue-700 mt-2">
            The CSV contains bandwidth usage details for Droplets, load balancers, and Kubernetes clusters across your account.
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="csv-upload" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Bandwidth CSV Report
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-2 text-gray-600">Processing CSV file...</span>
          </div>
        )}
      </div>



        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700 mb-1">Total Bandwidth</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatBytes(summaryStats.totalBandwidth * 1024 * 1024 * 1024)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-700 mb-1">Droplets</p>
            <p className="text-2xl font-bold text-green-900">
              {summaryStats.dropletCount}
            </p>
            <p className="text-xs text-green-600">
              {formatBytes(summaryStats.dropletBandwidth * 1024 * 1024 * 1024)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-700 mb-1">Kubernetes</p>
            <p className="text-2xl font-bold text-purple-900">
              {summaryStats.k8sCount}
            </p>
            <p className="text-xs text-purple-600">
              {formatBytes(summaryStats.k8sBandwidth * 1024 * 1024 * 1024)}
            </p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm text-indigo-700 mb-1">Average per Resource</p>
            <p className="text-2xl font-bold text-indigo-900">
              {formatBytes((summaryStats.totalBandwidth / (summaryStats.dropletCount + summaryStats.k8sCount)) * 1024 * 1024 * 1024)}
            </p>
          </div>
        </div>
      )}

      {sortedData && sortedData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                  Resource
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Region
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-1/6"
                  onClick={() => handleSort('bandwidth')}
                >
                  <div className="flex items-center">
                    Bandwidth Usage
                    <SortIcon field="bandwidth" />
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                  Resource ID/UUID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item, index) => {
                const isActiveDroplet = item.product === 'droplet' && item.resourceId && dropletNames[item.resourceId.toString()];
                const displayName = isActiveDroplet
                  ? dropletNames[item.resourceId.toString()]
                  : item.product === 'droplet' && item.resourceId
                  ? `Droplet ${item.resourceId}`
                  : item.product === 'kubernetes' && item.resourceUuid
                  ? `K8s Cluster ${item.resourceUuid.substring(0, 8)}...`
                  : 'Unknown Resource';

                const status = item.product === 'droplet' 
                  ? (isActiveDroplet ? 'Active' : 'Inactive/Deleted')
                  : 'N/A';


                return (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {displayName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.product === 'droplet' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.product}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.product === 'droplet' ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isActiveDroplet 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.region}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatBytes(item.bandwidthUsage * 1024 * 1024 * 1024)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                      {item.resourceId || item.resourceUuid || 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {csvData && csvData.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No data found in the uploaded CSV file.</p>
        </div>
      )}
    </div>
  );
};

export default BandwidthBreakdown;

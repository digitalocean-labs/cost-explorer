import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import PrivateRoute from './components/PrivateRoute';
import LiveDropletDashboard from './components/LiveDropletDashboard';
import BandwidthDashboard from './components/BandwidthDashboard';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <>
                <Navigation />
                <Dashboard />
              </>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/droplets" 
          element={
            <PrivateRoute>
              <>
                <Navigation />
                <LiveDropletDashboard />
              </>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/bandwidth" 
          element={
            <PrivateRoute>
              <>
                <Navigation />
                <BandwidthDashboard />
              </>
            </PrivateRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
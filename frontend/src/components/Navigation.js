import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/api';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <nav className="bg-[#0080FF] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="65.2 173.5 32 32" width="36" height="36" fill="#ffffff" className="mr-2"><path d="M81.202 205.5v-6.2c6.568 0 11.666-6.5 9.144-13.418a9.27 9.27 0 0 0-5.533-5.531c-6.912-2.502-13.425 2.575-13.425 9.14H65.2c0-10.463 10.124-18.622 21.1-15.195 4.8 1.505 8.618 5.313 10.105 10.1 3.43 10.99-4.717 21.107-15.203 21.107z"/><path d="M75.05 199.317v-6.165h6.168v6.165zm-4.753 4.75v-4.75h4.753v4.75h-4.753zm0-4.75h-3.973v-3.97h3.973v3.97z"/></svg>
              <span className="font-semibold text-xl">DO Cost Explorer</span>
            </Link>
            
            <div className="ml-6 flex space-x-4">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/dashboard' 
                    ? 'bg-[#0069d9] text-white' 
                    : 'text-white hover:bg-[#0069d9]'
                }`}
              >
                Historical Costs
              </Link>
              <Link
                to="/droplets"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/droplets' 
                    ? 'bg-[#0069d9] text-white' 
                    : 'text-white hover:bg-[#0069d9]'
                }`}
              >
                Droplet Costs
              </Link>
              <Link
                to="/bandwidth"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/bandwidth' 
                    ? 'bg-[#0069d9] text-white' 
                    : 'text-white hover:bg-[#0069d9]'
                }`}
              >
                Bandwidth Breakdown
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-white bg-[#0069d9] hover:bg-[#005cbf]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
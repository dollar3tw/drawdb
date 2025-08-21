import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // 設置 axios 默認 headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // 檢查用戶是否已登入
  useEffect(() => {
    const checkAuth = async () => {
      // 首先檢查 URL 是否有 SSO 回調的 token
      const urlParams = new URLSearchParams(window.location.search);
      const ssoToken = urlParams.get('token');
      const ssoEmail = urlParams.get('email');
      const ssoName = urlParams.get('name');
      
      if (ssoToken) {
        // 處理 SSO 登入
        console.log('Processing SSO token...');
        setToken(ssoToken);
        localStorage.setItem('auth_token', ssoToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${ssoToken}`;
        
        // 清理 URL 參數
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
          console.log('Verifying SSO token with /api/auth/me...');
          const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${ssoToken}` }
          });
          console.log('SSO login successful:', response.data);
          setUser(response.data.user);
          return; // 重要：避免執行後續的 token 檢查
        } catch (error) {
          console.error('SSO auth check failed:', error);
          console.error('Response:', error.response?.data);
          logout();
        }
      } else if (token) {
        // 一般的 token 檢查
        try {
          const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token, API_BASE_URL]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('auth_token', newToken);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || '登入失敗' 
      };
    }
  };

  const register = async (username, email, password, role = 'user') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        username,
        email,
        password,
        role
      });

      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || '註冊失敗' 
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${API_BASE_URL}/api/auth/logout`);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, profileData);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || '更新失敗' 
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isRoot: user?.role === 'admin', // 向後相容
    isMitAdmin: user?.role === 'admin', // 向後相容
    isEditor: user?.role === 'editor' || user?.role === 'admin',
    API_BASE_URL
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
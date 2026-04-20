import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import * as authService from '@/services/authService';
import * as addressService from '@/services/addressService';
import { decodeJwtPayload, userFromJwtPayload } from '@/utils/jwt';
import { setAddressesInStorage, clearAddressesStorage } from '@/utils/addressStorage';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

function parseStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const setAuthFromTokens = useCallback((accessToken, refreshToken = null, apiUser = null) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken != null && refreshToken !== '') {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    const user = apiUser && typeof apiUser === 'object'
      ? apiUser
      : userFromJwtPayload(decodeJwtPayload(accessToken));
    if (user && typeof user === 'object') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    setState({
      user,
      token: accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    if (exp && typeof exp === 'number' && exp * 1000 < Date.now()) {
      const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refresh) {
        authService.refreshToken(refresh).then(
          (data) => setAuthFromTokens(data.accessToken, data.refreshToken, data.user),
          () => {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        );
        return;
      }
    }
    const user = parseStoredUser() ?? userFromJwtPayload(payload);
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  }, [setAuthFromTokens]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setAuthFromTokens(data.accessToken, data.refreshToken, data.user);
    addressService.getAddresses().then(setAddressesInStorage).catch(() => {});
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearAddressesStorage();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const register = async (userData) => {
    const data = await authService.register({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
    });
    setAuthFromTokens(data.accessToken, data.refreshToken, data.user);
  };

  /** Update stored user (e.g. after profile edit). Persists to localStorage. */
  const updateUser = useCallback((updatedUser) => {
    if (!updatedUser || typeof updatedUser !== 'object') return;
    const user = { ...updatedUser };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState((prev) => (prev.user ? { ...prev, user } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

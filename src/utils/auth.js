import { API_URL } from './config';

// Funkcja do szyfrowania hasła
// Funkcja hashująca SHA-512 (taka sama jak w login/page.tsx)
const hashPassword = async (msg) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(msg);
  const hashBuffer = await window.crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
};

export const saveLoginCredentials = (email, password) => {
  if (typeof window !== 'undefined') {
    // Zapisujemy email i hasło (niezahashowane)
    localStorage.setItem('savedEmail', email);
    localStorage.setItem('savedPassword', btoa(password)); // Proste szyfrowanie dla zapisanego hasła
  }
};

export const getLoginCredentials = () => {
  if (typeof window !== 'undefined') {
    const email = localStorage.getItem('savedEmail');
    const encodedPassword = localStorage.getItem('savedPassword');
    if (email && encodedPassword) {
      return {
        email,
        password: atob(encodedPassword)
      };
    }
  }
  return null;
};

// Funkcja do automatycznego ponownego logowania
export const autoReLogin = async () => {
  const creds = getLoginCredentials();
  if (!creds) return false;

  try {
    const hashedPassword = await hashPassword(creds.password);
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        email: creds.email, 
        password: hashedPassword 
      })
    });

    const data = await res.json();
    if (res.ok && data.token) {
      setToken(data.token);
      if (data.user && typeof data.user.role !== "undefined") {
        localStorage.setItem("userRole", String(data.user.role));
      }
      return true;
    }
  } catch {
    // Błąd sieci lub logowania
  }
  return false;
};

export const getAuthHeader = () => {
  const token = getToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const setToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    // Nie usuwamy danych logowania, zostaną użyte do auto-logowania
  }
};

// Funkcja do sprawdzania i odświeżania tokena
export const refreshToken = async () => {
  // Bez endpointu refresh, po prostu używamy auto-logowania
  return await autoReLogin();
};
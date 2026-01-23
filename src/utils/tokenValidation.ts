// Add this to your auth.ts file or create a new tokenValidation.ts file

import { getToken, removeToken } from "./auth";
import { API_URL } from "./config";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface TokenPayload {
    exp?: number;
    [key: string]: unknown;
}

/**
 * Validates if the current JWT token is still active
 * Returns true if valid, false if expired/invalid
 * Automatically removes invalid tokens
 */
export async function validateToken(): Promise<boolean> {
    const token = getToken();

    if (!token) {
        return false;
    }

    try {
        // Try to fetch user data - if token is invalid, this will fail
        const res = await fetch(`${API_URL}/users/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (res.ok) {
            return true; // Token is valid
        } else {
            // Token is expired or invalid
            removeToken();
            if (typeof window !== "undefined") {
                localStorage.removeItem("userRole");
            }
            return false;
        }
    } catch (error) {
        // Network error or other issue
        console.error("Token validation error:", error);
        return false;
    }
}

/**
 * Checks token validity and redirects to login if invalid
 * Use this in protected pages
 */
export async function requireAuth(router: AppRouterInstance): Promise<boolean> {
    const isValid = await validateToken();

    if (!isValid) {
        router.push("/login");
        return false;
    }

    return true;
}

/**
 * Decodes JWT payload without verification (client-side only for expiry check)
 * Returns null if token is malformed
 */
export function decodeToken(token: string): TokenPayload | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload) as TokenPayload;
    } catch (error) {
        console.error("Error decoding token:", error);
        return null;
    }
}

/**
 * Checks if token is expired based on exp claim
 * Returns true if expired, false if still valid
 */
export function isTokenExpired(token: string): boolean {
    const decoded = decodeToken(token);

    if (!decoded || !decoded.exp) {
        return true; // Invalid token or no expiration
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
}

/**
 * React Hook: Automatically validates token on mount and periodically
 * Redirects to login if token expires
 * 
 * Usage in components:
 * useAuthValidation();
 */
export function useAuthValidation(checkInterval: number = 60000) {
    const router = useRouter();

    useEffect(() => {
        // Check immediately on mount
        const checkToken = async () => {
            const token = getToken();
            if (token) {
                const isValid = await validateToken();
                if (!isValid) {
                    router.push("/login");
                }
            }
        };

        checkToken();

        // Set up periodic checking (default: every 60 seconds)
        const interval = setInterval(checkToken, checkInterval);

        return () => clearInterval(interval);
    }, [router, checkInterval]);
}

/**
 * Auto-logout if token is expired (synchronous check)
 * Call this in useEffect on protected pages for immediate check
 */
export function useTokenExpiration(router: AppRouterInstance) {
    const token = getToken();

    if (token && isTokenExpired(token)) {
        removeToken();
        if (typeof window !== "undefined") {
            localStorage.removeItem("userRole");
        }
        router.push("/login");
    }
}
// Create this as utils/apiHelper.ts
// This provides a fetch wrapper that automatically handles expired tokens

import { getToken, removeToken } from "./auth";
import { API_URL } from "./config";

interface FetchOptions extends RequestInit {
    requiresAuth?: boolean;
}

/**
 * Enhanced fetch that automatically handles token expiration
 * Usage: const data = await apiFetch('/users/me');
 */
export async function apiFetch(
    endpoint: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { requiresAuth = false, ...fetchOptions } = options;

    // Add token to headers if authentication is required
    if (requiresAuth) {
        const token = getToken();
        if (!token) {
            throw new Error("No authentication token found");
        }

        fetchOptions.headers = {
            ...fetchOptions.headers,
            Authorization: `Bearer ${token}`,
        };
    }

    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
    const response = await fetch(url, fetchOptions);

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401 && requiresAuth) {
        // Remove invalid token
        removeToken();
        if (typeof window !== "undefined") {
            localStorage.removeItem("userRole");
            // Redirect to login
            window.location.href = "/login";
        }
        throw new Error("Authentication expired. Please log in again.");
    }

    return response;
}

/**
 * Helper for GET requests with authentication
 */
export async function apiGet<T = unknown>(endpoint: string): Promise<T> {
    const response = await apiFetch(endpoint, {
        method: "GET",
        requiresAuth: true,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
}

/**
 * Helper for POST requests with authentication
 */
export async function apiPost<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const response = await apiFetch(endpoint, {
        method: "POST",
        requiresAuth: true,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
}

/**
 * Example usage in components:
 * 
 * // Instead of:
 * const res = await fetch(`${API_URL}/users/me`, {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * 
 * // Use:
 * const userData = await apiGet<UserData>('/users/me');
 * 
 * // For POST:
 * const rental = await apiPost<RentalResponse>('/rent', { inventory_id: 123 });
 */
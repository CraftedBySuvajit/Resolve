/**
 * Frontend API Configuration
 * This file contains all API endpoints and configuration
 */

// Development
const API_CONFIG = {
    development: {
        baseURL: 'http://localhost:5000/api',
        timeout: 10000
    },
    production: {
        baseURL: 'https://your-production-api.com/api',
        timeout: 10000
    }
};

// Determine environment
const ENV = process.env.NODE_ENV || 'development';
const CONFIG = API_CONFIG[ENV];

// API Endpoints
const API_ENDPOINTS = {
    // Public endpoints
    CREATE_COMPLAINT: '/complaints',
    TRACK_COMPLAINT: (token) => `/complaints/track/${token}`,
    GET_RECENT_COMPLAINTS: '/complaints/recent',
    
    // Admin endpoints
    GET_ALL_COMPLAINTS: '/admin/complaints',
    UPDATE_COMPLAINT: (id) => `/admin/complaints/${id}`,
    DELETE_COMPLAINT: (id) => `/admin/complaints/${id}`,
    GET_STATS: '/admin/stats',
    
    // Health
    HEALTH_CHECK: '/health'
};

// Helper function to build full API URL
function getApiUrl(endpoint) {
    return `${CONFIG.baseURL}${endpoint}`;
}

// HTTP Methods
const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH'
};

// Status codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500
};

// Complaint statuses
const COMPLAINT_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved'
};

// Categories
const COMPLAINT_CATEGORIES = {
    BILLING: 'billing',
    SERVICE: 'service',
    PRODUCT: 'product',
    DELIVERY: 'delivery',
    OTHER: 'other'
};

// Generic API caller
async function apiCall(method, endpoint, data = null) {
    const url = getApiUrl(endpoint);
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        return {
            success: response.ok,
            status: response.status,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            status: 0,
            error: error.message
        };
    }
}

// Export for use
export {
    CONFIG,
    API_ENDPOINTS,
    HTTP_METHODS,
    HTTP_STATUS,
    COMPLAINT_STATUS,
    COMPLAINT_CATEGORIES,
    getApiUrl,
    apiCall
};

/**
 * Frontend Utilities
 * Helper functions for the frontend application
 */

// Token Generation (for local use)
function generateLocalToken() {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
}

// Format date to readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Format date to short format
function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// Validate phone number
function validatePhone(phone) {
    const re = /^\d{10,}$/;
    return re.test(String(phone).replace(/\D/g, ''));
}

// Capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Replace underscores with spaces and capitalize
function formatStatus(status) {
    return status.replace(/_/g, ' ').split(' ').map(capitalize).join(' ');
}

// Truncate text
function truncateText(text, length = 100) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

// Show loading spinner
function showLoading(element, show = true) {
    if (show) {
        element.innerHTML = '<div class="spinner">Loading...</div>';
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    });
}

// Get query parameter from URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Local storage helpers
const StorageHelper = {
    set: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    get: (key) => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    },
    remove: (key) => {
        localStorage.removeItem(key);
    },
    clear: () => {
        localStorage.clear();
    }
};

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export utilities
export {
    generateLocalToken,
    formatDate,
    formatDateShort,
    validateEmail,
    validatePhone,
    capitalize,
    formatStatus,
    truncateText,
    showLoading,
    copyToClipboard,
    getQueryParam,
    StorageHelper,
    debounce,
    throttle
};

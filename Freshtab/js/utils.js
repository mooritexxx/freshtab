// js/utils.js

const Utils = {
    /**
     * Formats a time string (HH:MM:SS or HH:MM) to H:MM AM/PM.
     * @param {string} timeString - The time string to format.
     * @returns {string} Formatted time string or empty if input is invalid.
     */
    formatTime: function(timeString) {
        if (!timeString || typeof timeString !== 'string') return '';
        const parts = timeString.split(':');
        if (parts.length < 2) return ''; 
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        return `${hours}:${minutes} ${ampm}`;
    },

    /**
     * Formats a UNIX timestamp (seconds) to a readable time string, considering timezone offset.
     * @param {number} timestamp - UNIX timestamp in seconds.
     * @param {number} locationTimezoneOffsetSeconds - Timezone offset from UTC in seconds.
     * @param {object} options - Options for toLocaleTimeString.
     * @returns {string} Formatted time string or 'N/A'.
     */
    formatUnixTimestampToTime: function(timestamp, locationTimezoneOffsetSeconds, options = { hour: 'numeric', minute: '2-digit', hour12: true }) { 
        if (typeof timestamp !== 'number' || typeof locationTimezoneOffsetSeconds !== 'number') return 'N/A';
        // Convert OpenWeatherMap's UTC timestamp and location's timezone offset to a Date object representing local time at that location
        const localTimeForLocationEpoch = (timestamp + locationTimezoneOffsetSeconds) * 1000;
        const date = new Date(localTimeForLocationEpoch);
        // Display this time as if it's UTC, because the epoch has already been adjusted to be the correct "wall clock" time for the location.
        return date.toLocaleTimeString([], { ...options, timeZone: 'UTC' });
    },

    /**
     * Converts wind direction from degrees to a cardinal direction.
     * @param {number} degrees - Wind direction in degrees.
     * @returns {string} Cardinal wind direction or 'N/A'.
     */
    convertWindDirection: function(degrees) { 
        if (typeof degrees !== 'number') return 'N/A';
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return directions[Math.round(degrees / 22.5) % 16];
    },

    /**
     * Attempts to parse an error message from an API response.
     * @param {Response} response - The Fetch API Response object.
     * @param {string} apiName - Name of the API for logging purposes.
     * @returns {Promise<string>} A promise that resolves to the error message.
     */
    getApiErrorMessage: async function(response, apiName = "API") {
        try {
            const errorData = await response.json();
            // Cater to different possible error structures
            if (errorData.message) return `${apiName}: ${errorData.message}`;
            if (errorData.errors && Array.isArray(errorData.errors)) return `${apiName}: ${errorData.errors.join(', ')}`;
            if (errorData._embedded?.errors?.[0]?.detail) return `${apiName}: ${errorData._embedded.errors[0].detail}`;
            if (errorData.fault?.faultstring) return `${apiName}: ${errorData.fault.faultstring}`;
            return `${apiName}: HTTP error ${response.status} - No specific message.`;
        } catch (e) {
            return `${apiName}: HTTP error ${response.status} - Could not parse error response.`;
        }
    },

    /**
     * Debounces a function to limit how often it's called.
     * @param {Function} func - The function to debounce.
     * @param {number} delay - The delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    debounce: function(func, delay) {
        let timeoutId;
        return function(...args) {
            const context = this;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(context, args);
            }, delay);
        };
    }
};
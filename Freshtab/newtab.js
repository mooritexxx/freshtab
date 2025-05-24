// newtab.js - Main Orchestrator V3.0 (Cleanup)

// --- API Keys (Developer to Replace Placeholders) ---
const OPENWEATHERMAP_API_KEY = '2e6131b7dc031b9230bcb21bc91f6264';
const TICKETMASTER_API_KEY = 'W4CowrxLGqMzoa1uo23YxQRlpNZMPIUG';
const GNEWS_API_KEY = '85dd73afcd583fd0266d793bcd7689e1';

// Developer Check for API Keys (runs once on load)
(function checkApiKeys() {
    if (OPENWEATHERMAP_API_KEY === 'YOUR_OWN_HARDCODED_API_KEY_HERE') console.warn("DEV_NOTE: OpenWeatherMap API key is a placeholder!");
    if (TICKETMASTER_API_KEY === 'YOUR_TICKETMASTER_API_KEY_HERE') console.warn("DEV_NOTE: Ticketmaster API key is a placeholder!");
    if (GNEWS_API_KEY === 'YOUR_GNEWS_API_KEY_HERE') console.warn("DEV_NOTE: GNews API key is a placeholder!");
})();


// --- DOM Elements ---
const locationErrorDiv = document.getElementById('location-error');
const openOptionsPageBtn = document.getElementById('openOptionsPageBtn');
const mainHeader = document.querySelector('#dashboard > h1'); 
const widgetGrid = document.querySelector('.widget-grid'); 
const themeToggleButton = document.getElementById('themeToggleButton');
const googleSearchForm = document.getElementById('googleSearchForm'); 
const googleSearchInput = document.getElementById('googleSearchInput'); 

const widgetSettingsModal = document.getElementById('widgetSettingsModal');
const modalTitleEl = document.getElementById('modalTitleEl'); 
const modalBodyEl = document.getElementById('modalBodyEl');   
const modalCloseBtn = document.getElementById('modalCloseBtn');
let currentModalCloseCallback = null;

// Widget Configuration
const WIDGET_CONFIG = {
    weather: { id: 'weather-widget-container', title: 'Weather & Air Quality', order: 1, priority: 'high' },
    events: { id: 'events-widget-container', title: 'Events', order: 2, priority: 'medium' },
    news: { id: 'news-widget-container', title: 'News', order: 3, priority: 'medium' },
    todo: { id: 'todo-widget-container', title: 'To-Do List', order: 4, priority: 'high' },
    notes: { id: 'notes-widget-container', title: 'Quick Notes', order: 5, priority: 'high' },
    topSites: { id: 'topsites-widget-container', title: 'Top Sites / Favorites', order: 6, priority: 'high' }
};

// Default settings
const defaultWidgetSettings = Object.fromEntries(
    Object.keys(WIDGET_CONFIG).map(key => [key, true])
);

// Helper to get sorted widget keys based on current order
function getSortedWidgetKeys(customOrder = null) {
    if (customOrder?.length > 0) {
        // Convert container IDs to widget keys and filter out any unknown widgets
        const validKeys = customOrder
            .map(id => Object.entries(WIDGET_CONFIG).find(([_, config]) => config.id === id)?.[0])
            .filter(key => key);
        
        // Add any missing widgets at the end in their default order
        Object.keys(WIDGET_CONFIG)
            .filter(key => !validKeys.includes(key))
            .forEach(key => validKeys.push(key));
            
        return validKeys;
    }
    
    // Return default order if no custom order provided
    return Object.entries(WIDGET_CONFIG)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([key]) => key);
}

// Apply widget order to both grid and settings
function applyWidgetOrder(order = null) {
    if (!widgetGrid) return;

    const sortedKeys = getSortedWidgetKeys(order);
    const fragment = document.createDocumentFragment();
    
    // Apply order to main grid
    sortedKeys.forEach(key => {
        const widget = document.getElementById(WIDGET_CONFIG[key].id);
        if (widget) {
            fragment.appendChild(widget);
        }
    });
    
    widgetGrid.innerHTML = '';
    widgetGrid.appendChild(fragment);

    // Update settings modal if open
    const widgetOrderContainer = document.querySelector('#widgetOrderOptionsContainer');
    if (widgetOrderContainer) {
        const modalFragment = document.createDocumentFragment();
        
        sortedKeys.forEach(key => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'widget-order-item';
            itemDiv.dataset.widgetKey = key;
            itemDiv.innerHTML = `
                <label>
                    <input type="checkbox" name="${key}" ${widgetSettings?.[key] !== false ? 'checked' : ''}>
                    <span class="drag-handle">⠿</span>
                    ${WIDGET_CONFIG[key].title}
                </label>
            `;
            modalFragment.appendChild(itemDiv);
        });

        widgetOrderContainer.innerHTML = '';
        widgetOrderContainer.appendChild(modalFragment);

        // Reattach event listeners
        widgetOrderContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => saveSettingsFromModal(modalBodyEl));
        });

        // Reinitialize Dragula if needed
        if (window.settingsDrake) {
            window.settingsDrake.destroy();
        }
        window.settingsDrake = dragula([widgetOrderContainer], {
            moves: (el, container, handle) => handle.classList.contains('drag-handle')
        });
        window.settingsDrake.on('drop', () => saveSettingsFromModal(modalBodyEl));
    }
}

// Save current widget order
function saveWidgetOrder() {
    if (!widgetGrid) return;
    
    const order = Array.from(widgetGrid.children)
        .map(el => el.id)
        .filter(id => Object.values(WIDGET_CONFIG).some(config => config.id === id));
    
    chrome.storage.sync.set({ widgetOrder: order }, () => {
        if (chrome.runtime.lastError) {
            console.error("Save order error:", chrome.runtime.lastError.message);
        } else {
            applyWidgetOrder(order);
        }
    });
}

// --- Modal Utility Functions ---
function openModal(title, populateCallback, onCloseCallback) {
    if (!widgetSettingsModal || !modalTitleEl || !modalBodyEl) { console.error("Modal elements not found!"); return; }
    modalTitleEl.textContent = title; modalBodyEl.innerHTML = ''; 
    if (typeof populateCallback === 'function') populateCallback(modalBodyEl); 
    else if (typeof populateCallback === 'string') modalBodyEl.innerHTML = populateCallback;
    widgetSettingsModal.style.display = 'flex'; setTimeout(() => { widgetSettingsModal.classList.add('active'); }, 10);
    currentModalCloseCallback = onCloseCallback;
}
function closeModal() {
    if (!widgetSettingsModal) return; widgetSettingsModal.classList.remove('active');
    setTimeout(() => { widgetSettingsModal.style.display = 'none'; if(modalBodyEl) modalBodyEl.innerHTML = ''; if (typeof currentModalCloseCallback === 'function') { currentModalCloseCallback(); currentModalCloseCallback = null; } }, 300);
}


// --- Theme Function ---
function applyTheme(isDarkMode) {
    if (isDarkMode) { document.body.classList.add('dark-mode'); if (themeToggleButton) themeToggleButton.textContent = '☀️'; } 
    else { document.body.classList.remove('dark-mode'); if (themeToggleButton) themeToggleButton.textContent = '🌓'; }
}


// --- Location Utility ---
function getUserLocation() {
    return new Promise((resolve, reject) => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition( (position) => { resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }); }, (error) => { console.error("getUserLocation: Error:", error.message, error.code); reject(error); }, { timeout: 10000 } ); } else { reject(new Error("Geolocation is not supported.")); } });
}
// --- Geocoding Helper ---
async function geocodeCityName(cityName, apiKey) {
    if (!cityName) return null; try { const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${apiKey}`; const response = await fetch(geocodeUrl); if (!response.ok) { const errorData = await response.json().catch(() => null); console.error("Geocoding API error:", errorData ? errorData.message : response.status); return null; } const data = await response.json(); if (data && data.length > 0) { return { latitude: data[0].lat, longitude: data[0].lon, name: `${data[0].name}${data[0].country ? ', ' + data[0].country : ''}` }; } else { console.warn("Geocoding: No results for", cityName); return null; } } catch (error) { console.error("Geocoding city error:", error); return null; }
}


// --- Widget Container Display Logic ---
function showWidget(id) { const el = document.getElementById(id); if (el) el.style.display = 'block';}
function hideWidget(id) { const el = document.getElementById(id); if (el) el.style.display = 'none';}
function displayLocationError(msg="Could not get location.") { 
    if(locationErrorDiv) { locationErrorDiv.textContent = msg; locationErrorDiv.style.display = 'block';} 
    const locationDependentKeys = ['weather', 'events', 'news'];
    locationDependentKeys.forEach(key => {
        if (WIDGET_CONFIG[key].id) hideWidget(WIDGET_CONFIG[key].id);
    });
}


// --- Settings Modal Logic (with TABS) ---
const ORDERABLE_WIDGETS = {
    weather: "Weather & Air Quality", 
    events: "Events",
    news: "News",
    todo: "To-Do List",
    notes: "Quick Notes",
    topSites: "Top Sites / Favorites" 
};

function populateSettingsModal(modalBody) {
    chrome.storage.sync.get(['userName', 'manualLocation', 'widgetSettings', 'widgetOrder'], (data) => {
        const { userName, manualLocation, widgetSettings, widgetOrder } = data;
        
        // Main modal structure with tabs
        modalBody.innerHTML = `
            <div class="settings-tabs">
                <button class="tab-link active" data-tab="general-settings">General</button>
                <button class="tab-link" data-tab="widget-settings">Widgets</button>
            </div>

            <div id="general-settings" class="tab-content active">
                <div class="form-row">
                    <div class="form-group">
                        <label for="userNameInput">Your First Name:</label>
                        <input type="text" id="userNameInput" placeholder="Enter name for greeting" value="${userName || ''}">
                        <span class="status-placeholder"></span>
                        <small>Used in the welcome message.</small>
                    </div>
                    <div class="form-group">
                        <label for="manualLocation">Primary Location:</label>
                        <div class="location-input-group">
                            <input type="text" id="manualLocation" placeholder="e.g., City, Country" value="${manualLocation?.name || ''}">
                            <button id="useCurrentLocationBtn" class="small-btn" title="Use current location">📍</button>
                        </div>
                        <span id="currentLocationStatus"></span>
                        <small>Used for Weather, Events, and News widgets.</small>
                    </div>
                </div>
            </div>

            <div id="widget-settings" class="tab-content">
                <p><small>Check to show a widget. Drag and drop to reorder.</small></p>
                <div id="widgetOrderOptionsContainer"></div>
            </div>

            <div id="settings-status" class="settings-status"></div>
        `;

        // Get the widget order container
        const widgetOrderContainer = modalBody.querySelector('#widgetOrderOptionsContainer');
        const loadedSettings = { ...defaultWidgetSettings, ...(widgetSettings || {}) };
        
        // Get sorted widget keys
        const sortedKeys = getSortedWidgetKeys(widgetOrder);
        
        // Populate widgets in the correct order
        sortedKeys.forEach(key => {
            const config = WIDGET_CONFIG[key];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'widget-order-item';
            itemDiv.dataset.widgetKey = key;
            itemDiv.innerHTML = `
                <label>
                    <input type="checkbox" name="${key}" ${loadedSettings[key] ? 'checked' : ''}>
                    <span class="drag-handle">⠿</span>
                    ${config.title}
                </label>
            `;
            widgetOrderContainer.appendChild(itemDiv);
        });

        // Initialize Dragula for the settings modal
        if (window.settingsDrake) {
            window.settingsDrake.destroy();
        }
        window.settingsDrake = dragula([widgetOrderContainer], {
            moves: (el, container, handle) => handle.classList.contains('drag-handle')
        });
        window.settingsDrake.on('drop', () => saveSettingsFromModal(modalBody));

        // Add event listeners for modal buttons and tabs
        attachSettingsModalListeners(modalBody);

        // Add auto-save listeners for inputs
        const userNameInput = modalBody.querySelector('#userNameInput');
        const manualLocationInput = modalBody.querySelector('#manualLocation');
        const checkboxes = modalBody.querySelectorAll('input[type="checkbox"]');

        userNameInput.addEventListener('input', debounce(() => saveSettingsFromModal(modalBody), 500));
        manualLocationInput.addEventListener('input', debounce(() => saveSettingsFromModal(modalBody), 500));
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => saveSettingsFromModal(modalBody));
        });
    });
}

// Debounce helper function
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

function saveSettingsFromModal(modalBody) {
    if (!modalBody) return;

    const statusDiv = modalBody.querySelector('#settings-status');
    const userNameValue = modalBody.querySelector('#userNameInput').value.trim();
    const manualLocationValue = modalBody.querySelector('#manualLocation').value.trim();

    // Get current widget settings
    const currentSettings = window.widgetSettings || {};

    // Update widget settings based on checkboxes
    const newWidgetSettings = {};
    const newWidgetOrder = Array.from(modalBody.querySelectorAll('.widget-order-item'))
        .map(item => {
            const key = item.dataset.widgetKey;
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (key && checkbox) {
                // Update the widget settings
                newWidgetSettings[key] = checkbox.checked;
                // Only include in order if widget is enabled
                return checkbox.checked ? WIDGET_CONFIG[key].id : null;
            }
            return null;
        })
        .filter(id => id);

    // Update the global widget settings
    window.widgetSettings = { ...currentSettings, ...newWidgetSettings };

    const dataToSave = {
        userName: userNameValue,
        widgetSettings: newWidgetSettings,
        widgetOrder: newWidgetOrder,
        manualLocation: manualLocationValue ? { name: manualLocationValue } : null
    };

    if (statusDiv) {
        statusDiv.textContent = 'Saving...';
        statusDiv.style.opacity = '1';
    }

    chrome.storage.sync.set(dataToSave, () => {
        if (chrome.runtime.lastError) {
            if (statusDiv) {
                statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
                statusDiv.style.opacity = '1';
            }
        } else {
            if (statusDiv) {
                statusDiv.textContent = 'Changes saved!';
                statusDiv.style.opacity = '1';
                setTimeout(() => {
                    statusDiv.style.opacity = '0';
                }, 1500);
            }
            
            // Apply changes immediately
            if (mainHeader && dataToSave.userName) {
                mainHeader.textContent = `Welcome, ${dataToSave.userName}!`;
            }
            
            // Update widget visibility and order
            Object.entries(newWidgetSettings).forEach(([key, isVisible]) => {
                const containerId = WIDGET_CONFIG[key].id;
                if (containerId) {
                    const widget = document.getElementById(containerId);
                    if (widget) {
                        widget.style.display = isVisible ? 'block' : 'none';
                    }
                }
            });
            
            // Apply the new widget order
            applyWidgetOrder(newWidgetOrder);
        }
    });
}

function attachSettingsModalListeners(modalBody) {
    const useCurrentLocationBtn = modalBody.querySelector('#useCurrentLocationBtn');
    const tabLinks = modalBody.querySelectorAll('.tab-link');

    if (useCurrentLocationBtn) {
        useCurrentLocationBtn.addEventListener('click', async () => {
            const manualLocationInput = modalBody.querySelector('#manualLocation');
            const statusSpan = modalBody.querySelector('#currentLocationStatus');
            
            if (!navigator.geolocation) { statusSpan.textContent = 'Geolocation not supported.'; return; }
            statusSpan.textContent = 'Fetching...';
            useCurrentLocationBtn.disabled = true;

            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
                });
                const { latitude, longitude } = position.coords;
                statusSpan.textContent = 'Coordinates found...';
                
                const geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`;
                const response = await fetch(geoUrl);
                if (!response.ok) throw new Error('Reverse geocoding failed.');
                const data = await response.json();
                
                if (data && data.length > 0) {
                    const locName = data[0].name || "";
                    const country = data[0].country || "";
                    manualLocationInput.value = country ? `${locName}, ${country}` : locName;
                    statusSpan.textContent = 'Location filled!';
                } else {
                    throw new Error('Could not determine city from coordinates.');
                }
            } catch (error) {
                console.error('Geolocation/Geocoding error:', error);
                statusSpan.textContent = `Error: ${error.message}`;
            } finally {
                useCurrentLocationBtn.disabled = false;
            }
        });
    }

    // Tab switching logic
    tabLinks.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            modalBody.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
            modalBody.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            modalBody.querySelector(`#${tabId}`).classList.add('active');
        });
    });
}

// Performance optimization utilities
const PerformanceManager = {
    initialized: new Set(),
    observer: null,
    
    async initializeWidget(widgetKey, effectiveLocation = null) {
        if (this.initialized.has(widgetKey)) return;
        
        const widget = WIDGET_CONFIG[widgetKey];
        if (!widget) return;

        try {
            let initPromise = null;
            
            // Initialize based on widget type
            switch (widgetKey) {
                case 'weather':
                    if (effectiveLocation && typeof WeatherWidget?.init === 'function') {
                        initPromise = WeatherWidget.init(effectiveLocation, OPENWEATHERMAP_API_KEY, widgetSettings);
                    }
                    break;
                case 'events':
                    if (effectiveLocation && typeof EventsWidget?.init === 'function') {
                        initPromise = EventsWidget.init(effectiveLocation, TICKETMASTER_API_KEY);
                    }
                    break;
                case 'news':
                    if (effectiveLocation && typeof NewsWidget?.init === 'function') {
                        initPromise = NewsWidget.init(effectiveLocation, GNEWS_API_KEY);
                    }
                    break;
                case 'todo':
                    if (typeof TodoWidget?.init === 'function') {
                        initPromise = TodoWidget.init();
                    }
                    break;
                case 'notes':
                    if (typeof NotesWidget?.init === 'function') {
                        initPromise = NotesWidget.init();
                    }
                    break;
                case 'topSites':
                    if (typeof TopSitesWidget?.init === 'function') {
                        initPromise = TopSitesWidget.init();
                    }
                    break;
            }

            if (initPromise) {
                await initPromise;
                this.initialized.add(widgetKey);
                console.log(`Widget ${widgetKey} initialized`);
            }
        } catch (error) {
            console.error(`Error initializing widget ${widgetKey}:`, error);
        }
    },

    setupIntersectionObserver(effectiveLocation) {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const widgetKey = Object.entries(WIDGET_CONFIG)
                        .find(([_, config]) => config.id === entry.target.id)?.[0];
                    
                    if (widgetKey) {
                        this.initializeWidget(widgetKey, effectiveLocation);
                        // Stop observing after initialization
                        this.observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            rootMargin: '50px', // Start loading when widget is 50px from viewport
            threshold: 0.1 // Trigger when at least 10% of the widget is visible
        });
    },

    observeWidgets() {
        if (!this.observer) return;
        
        // Start observing all widget containers
        Object.entries(WIDGET_CONFIG).forEach(([key, config]) => {
            const widget = document.getElementById(config.id);
            if (widget && !this.initialized.has(key)) {
                this.observer.observe(widget);
            }
        });
    },

    // Initialize high priority widgets immediately
    async initializeHighPriorityWidgets(effectiveLocation) {
        const highPriorityWidgets = Object.entries(WIDGET_CONFIG)
            .filter(([_, config]) => config.priority === 'high')
            .map(([key]) => key);

        await Promise.all(
            highPriorityWidgets.map(key => this.initializeWidget(key, effectiveLocation))
        );
    }
};

// Initialize dashboard with performance optimizations
async function initializeDashboard() {
    if (typeof TimeWidget?.init === 'function') TimeWidget.init();
    else console.error("TimeWidget missing or not initializable.");

    chrome.storage.sync.get(['userName', 'manualLocation', 'widgetSettings', 'widgetOrder', 'darkModeEnabled'], async (data) => {
        const { userName, manualLocation, widgetSettings: savedWidgetSettings, widgetOrder, darkModeEnabled } = data;
        applyTheme(darkModeEnabled);
        
        // Initialize widget settings
        window.widgetSettings = { ...defaultWidgetSettings, ...(savedWidgetSettings || {}) };
        
        if (mainHeader) {
            mainHeader.textContent = userName?.trim() ? `Welcome, ${userName.trim()}!` : 'Welcome!';
        }

        // Handle location setup
        let effectiveLocation = null;
        try {
            effectiveLocation = manualLocation?.name 
                ? await geocodeCityName(manualLocation.name, OPENWEATHERMAP_API_KEY)
                : await getUserLocation();
                
            if (!effectiveLocation) throw new Error('Could not determine location');
            if (locationErrorDiv) locationErrorDiv.style.display = 'none';
        } catch (error) {
            console.error('Location setup error:', error);
            displayLocationError(error.message);
        }

        // Show/hide widgets based on settings
        Object.entries(WIDGET_CONFIG).forEach(([key, config]) => {
            widgetSettings[key] ? showWidget(config.id) : hideWidget(config.id);
        });

        // Apply widget order
        applyWidgetOrder(widgetOrder);

        // Setup performance optimizations
        PerformanceManager.setupIntersectionObserver(effectiveLocation);
        
        // Initialize high priority widgets immediately
        await PerformanceManager.initializeHighPriorityWidgets(effectiveLocation);
        
        // Start observing other widgets
        PerformanceManager.observeWidgets();

        // Setup drag and drop for main grid
        if (widgetGrid) {
            const drake = dragula([widgetGrid], {
                moves: (el, container, handle) => handle.classList.contains('drag-handle-icon')
            });
            drake.on('drop', saveWidgetOrder);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => { 
    initializeDashboard();
    
    // Updated listener to open settings modal
    if (openOptionsPageBtn) {
        openOptionsPageBtn.addEventListener('click', () => {
            openModal("Freshtab Settings", populateSettingsModal);
        });
    }

    if (themeToggleButton) themeToggleButton.addEventListener('click', () => { const iDM = document.body.classList.toggle('dark-mode'); applyTheme(iDM); chrome.storage.sync.set({ darkModeEnabled: iDM }); });
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (widgetSettingsModal) {
        widgetSettingsModal.addEventListener('click', function(event) { if (event.target === widgetSettingsModal) closeModal(); });
        document.addEventListener('keydown', function(event) { if (event.key === 'Escape' && widgetSettingsModal.classList.contains('active')) closeModal(); });
    }
    if (googleSearchForm) {
        googleSearchForm.addEventListener('submit', function(event) {
            if (googleSearchInput && googleSearchInput.value.trim() === '') {
                event.preventDefault(); googleSearchInput.focus();
            }
        });
    }
});
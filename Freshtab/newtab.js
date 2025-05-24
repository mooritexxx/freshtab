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

const WIDGET_CONTAINER_IDS = { 
    weather: 'weather-widget-container', events: 'events-widget-container',
    news: 'news-widget-container', todo: 'todo-widget-container',
    notes: 'notes-widget-container', topSites: 'topsites-widget-container'
};
const defaultWidgetSettings = {
    weather: true, events: true, news: true,   
    todo: true, notes: true, topSites: true 
};
const DEFAULT_WIDGET_ORDER = [ 
    WIDGET_CONTAINER_IDS.weather, WIDGET_CONTAINER_IDS.todo, 
    WIDGET_CONTAINER_IDS.notes, WIDGET_CONTAINER_IDS.events, 
    WIDGET_CONTAINER_IDS.news, WIDGET_CONTAINER_IDS.topSites
];


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
        if (WIDGET_CONTAINER_IDS[key]) hideWidget(WIDGET_CONTAINER_IDS[key]);
    });
}


// --- Draggable Widget Order Logic ---
function applyWidgetOrder(order) { if (!widgetGrid || !order?.length) return; order.forEach(id => { const el = document.getElementById(id); if (el?.parentElement === widgetGrid) widgetGrid.appendChild(el); });}
function saveWidgetOrder() { if (!widgetGrid) return; const order = Array.from(widgetGrid.children).map(c => c.id).filter(id => Object.values(WIDGET_CONTAINER_IDS).includes(id)); chrome.storage.sync.set({ widgetOrder: order }, () => { if (chrome.runtime.lastError) console.error("Save order error:", chrome.runtime.lastError.message); });}


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

            <div class="modal-footer">
                <button class="settings-save-button">Save Settings</button>
                <div id="settings-status"></div>
            </div>
        `;

        // Populate widget order/visibility in the "Widgets" tab
        const widgetOrderContainer = modalBody.querySelector('#widgetOrderOptionsContainer');
        const loadedSettings = { ...defaultWidgetSettings, ...(widgetSettings || {}) };
        
        let orderKeysToUse = Object.keys(ORDERABLE_WIDGETS); 
        if (widgetOrder && Array.isArray(widgetOrder) && widgetOrder.length > 0) {
            const savedContainerIds = widgetOrder;
            const validOrderedKeys = []; const knownOrderableKeys = Object.keys(ORDERABLE_WIDGETS);
            savedContainerIds.forEach(containerId => {
                const key = containerId.replace('-widget-container', '');
                if (knownOrderableKeys.includes(key) && !validOrderedKeys.includes(key)) validOrderedKeys.push(key);
            });
            knownOrderableKeys.forEach(key => { if (!validOrderedKeys.includes(key)) validOrderedKeys.push(key); });
            orderKeysToUse = validOrderedKeys;
        }

        orderKeysToUse.forEach(widgetKey => {
            if (ORDERABLE_WIDGETS.hasOwnProperty(widgetKey)) {
                const widgetDisplayName = ORDERABLE_WIDGETS[widgetKey];
                const itemDiv = document.createElement('div');
                itemDiv.className = 'widget-order-item';
                itemDiv.dataset.widgetKey = widgetKey; 
                const isChecked = loadedSettings[widgetKey];
                itemDiv.innerHTML = `
                    <label>
                        <input type="checkbox" name="${widgetKey}" ${isChecked ? 'checked' : ''}>
                        <span class="widget-order-drag-handle">⠿</span>
                        ${widgetDisplayName}
                    </label>
                `;
                widgetOrderContainer.appendChild(itemDiv);
            }
        });

        // Make the list sortable
        if (typeof Sortable !== 'undefined') {
            new Sortable(widgetOrderContainer, { animation: 150, handle: '.widget-order-drag-handle', ghostClass: 'widget-order-ghost'});
        }

        // Add event listeners for modal buttons and tabs
        attachSettingsModalListeners(modalBody);
    });
}

function attachSettingsModalListeners(modalBody) {
    const saveButton = modalBody.querySelector('.settings-save-button');
    const useCurrentLocationBtn = modalBody.querySelector('#useCurrentLocationBtn');
    const tabLinks = modalBody.querySelectorAll('.tab-link');

    if (saveButton) {
        saveButton.addEventListener('click', saveSettingsFromModal);
    }

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

function saveSettingsFromModal() {
    const modalBody = document.getElementById('modalBodyEl');
    if (!modalBody) return;

    const statusDiv = modalBody.querySelector('#settings-status');
    const userNameValue = modalBody.querySelector('#userNameInput').value.trim();
    const manualLocationValue = modalBody.querySelector('#manualLocation').value.trim();

    const newWidgetSettings = {};
    const newWidgetOrderContainerIds = [];
    const orderedWidgetItems = modalBody.querySelectorAll('.widget-order-item');

    orderedWidgetItems.forEach(item => {
        const key = item.dataset.widgetKey;
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (key && checkbox) {
            newWidgetSettings[key] = checkbox.checked;
            newWidgetOrderContainerIds.push(`${key}-widget-container`);
        }
    });

    const dataToSave = {
        userName: userNameValue,
        widgetSettings: newWidgetSettings,
        widgetOrder: newWidgetOrderContainerIds,
        manualLocation: manualLocationValue ? { name: manualLocationValue } : null
    };

    statusDiv.textContent = 'Saving...';
    chrome.storage.sync.set(dataToSave, () => {
        if (chrome.runtime.lastError) {
            statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
        } else {
            statusDiv.textContent = 'Settings saved! Reloading...';
            setTimeout(() => {
                location.reload();
            }, 750);
        }
    });
}


// --- Main Initialization Logic ---
async function initializeDashboard() {
    if (typeof TimeWidget?.init === 'function') TimeWidget.init(); 
    else console.error("TimeWidget missing or not initializable.");

    chrome.storage.sync.get(['userName', 'manualLocation', 'widgetSettings', 'widgetOrder', 'darkModeEnabled'], async (data) => {
        const { userName, manualLocation, widgetSettings, widgetOrder: savedWidgetOrder, darkModeEnabled } = data;
        applyTheme(darkModeEnabled);
        const currentWidgetSettings = { ...defaultWidgetSettings, ...(widgetSettings || {}) };
        let effectiveLocation = null;

        if (mainHeader) mainHeader.textContent = (userName?.trim()) ? `Welcome, ${userName.trim()}!` : 'Welcome!';

        if (manualLocation?.name) {
            effectiveLocation = await geocodeCityName(manualLocation.name, OPENWEATHERMAP_API_KEY);
            if (!effectiveLocation) displayLocationError(`Could not find coordinates for "${manualLocation.name}".`);
        } else {
            try {
                effectiveLocation = await getUserLocation();
                if (effectiveLocation.latitude && !effectiveLocation.name) { 
                   try {const gUrl=`https://api.openweathermap.org/geo/1.0/reverse?lat=${effectiveLocation.latitude}&lon=${effectiveLocation.longitude}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`;const r=await fetch(gUrl);if(r.ok){const gD=await r.json();if(gD?.[0]){const cN=gD[0].name||"";const cC=gD[0].country||"";if(cN)effectiveLocation.name=cC?`${cN}, ${cC}`:cN;}}}catch(e){/* Silently fail on non-critical reverse geocode */}
                }
                if(locationErrorDiv) locationErrorDiv.style.display = 'none'; // Hide if previously shown
            } catch (error) { displayLocationError(error.message); }
        }
        
        const activeWidgetKeys = {};
        Object.keys(WIDGET_CONTAINER_IDS).forEach(key => {
            activeWidgetKeys[key] = !!currentWidgetSettings[key];
        });

        Object.keys(WIDGET_CONTAINER_IDS).forEach(key => {
            activeWidgetKeys[key] ? showWidget(WIDGET_CONTAINER_IDS[key]) : hideWidget(WIDGET_CONTAINER_IDS[key]);
        });
        
        const initPromises = [];
        const locationNeededWidgetKeys = ['weather', 'events', 'news'];
        let someLocationWidgetActiveAndNeedsLocation = locationNeededWidgetKeys.some(key => activeWidgetKeys[key]);

        if (effectiveLocation) {
            if (activeWidgetKeys.weather && typeof WeatherWidget?.init === 'function') initPromises.push(WeatherWidget.init(effectiveLocation, OPENWEATHERMAP_API_KEY, currentWidgetSettings));
            if (activeWidgetKeys.events && typeof EventsWidget?.init === 'function') initPromises.push(EventsWidget.init(effectiveLocation, TICKETMASTER_API_KEY));
            if (activeWidgetKeys.news && typeof NewsWidget?.init === 'function') initPromises.push(NewsWidget.init(effectiveLocation, GNEWS_API_KEY));
        } else if (someLocationWidgetActiveAndNeedsLocation) {
             if(locationErrorDiv && (locationErrorDiv.style.display === 'none' || !locationErrorDiv.textContent.trim())) {
                 displayLocationError("Location data needed for some active widgets. Please set in options or allow browser location.");
             }
        }

        if (activeWidgetKeys.todo && typeof TodoWidget?.init === 'function') initPromises.push(TodoWidget.init());
        if (activeWidgetKeys.notes && typeof NotesWidget?.init === 'function') initPromises.push(NotesWidget.init());
        if (activeWidgetKeys.topSites && typeof TopSitesWidget?.init === 'function') initPromises.push(TopSitesWidget.init());
        
        try { await Promise.allSettled(initPromises); } catch(e) { console.error("Error during widget initializations", e); }

        if (widgetGrid) {
            let orderToApply = DEFAULT_WIDGET_ORDER.filter(id => activeWidgetKeys[id.replace('-widget-container','')]);
            if (savedWidgetOrder?.length > 0) {
                const validSO = savedWidgetOrder.filter(id => Object.values(WIDGET_CONTAINER_IDS).includes(id) && activeWidgetKeys[id.replace('-widget-container','')]);
                const currentOrderSet = new Set(validSO);
                DEFAULT_WIDGET_ORDER.forEach(id => { if(activeWidgetKeys[id.replace('-widget-container','')] && !currentOrderSet.has(id)) validSO.push(id); });
                if (validSO.length > 0 || Object.values(activeWidgetKeys).some(v => v)) orderToApply = validSO; else orderToApply = [];
            }
            applyWidgetOrder(orderToApply);
            if (typeof Sortable !== 'undefined') new Sortable(widgetGrid, { animation: 150, ghostClass: 'widget-sortable-ghost', handle: '.drag-handle-icon', onEnd: saveWidgetOrder });
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
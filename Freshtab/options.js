// options.js - V3.1.2 (Removed Favorite Links Management UI from this page)

const HARDCODED_OPENWEATHERMAP_API_KEY = '2e6131b7dc031b9230bcb21bc91f6264'; 

const ORDERABLE_WIDGETS = {
    weather: "Weather & Air Quality", 
    events: "Events",
    news: "News",
    todo: "To-Do List",
    notes: "Quick Notes",
    topSites: "Top Sites / Favorites" 
};

function applyOptionsTheme(isDarkMode) {
    if (isDarkMode) { document.body.classList.add('dark-mode'); } 
    else { document.body.classList.remove('dark-mode'); }
}

document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get('darkModeEnabled', (data) => {
        applyOptionsTheme(data.darkModeEnabled);
    });

    const userNameInput = document.getElementById('userNameInput');
    const manualLocationInput = document.getElementById('manualLocation');
    const useCurrentLocationBtn = document.getElementById('useCurrentLocationBtn');
    const currentLocationStatusSpan = document.getElementById('currentLocationStatus');
    const widgetOrderOptionsContainer = document.getElementById('widgetOrderOptionsContainer');
    const saveButton = document.getElementById('saveOptions');
    const statusDiv = document.getElementById('status');

    const defaultWidgetSettings = {
        weather: true, events: true, news: true,   
        todo: true, notes: true, topSites: true 
    };

    function populateWidgetOrderOptions(currentSettings, orderKeys) {
        if (!widgetOrderOptionsContainer) { console.error("OptionsPage: widgetOrderOptionsContainer not found!"); return; }
        widgetOrderOptionsContainer.innerHTML = ''; 
        if (!Array.isArray(orderKeys) || orderKeys.length === 0) { orderKeys = Object.keys(ORDERABLE_WIDGETS); }
        orderKeys.forEach(widgetKey => {
            if (ORDERABLE_WIDGETS.hasOwnProperty(widgetKey)) {
                const widgetDisplayName = ORDERABLE_WIDGETS[widgetKey];
                const itemDiv = document.createElement('div');
                itemDiv.className = 'widget-order-item';
                itemDiv.dataset.widgetKey = widgetKey; 
                const isChecked = currentSettings.hasOwnProperty(widgetKey) ? currentSettings[widgetKey] : (defaultWidgetSettings[widgetKey] || false);
                itemDiv.innerHTML = `
                    <span class="widget-order-drag-handle">⠿</span>
                    <label>
                        <input type="checkbox" name="${widgetKey}" ${isChecked ? 'checked' : ''}>
                        ${widgetDisplayName}
                    </label>
                `;
                widgetOrderOptionsContainer.appendChild(itemDiv);
            }
        });
        if (widgetOrderOptionsContainer.children.length > 0 && typeof Sortable !== 'undefined') {
            new Sortable(widgetOrderOptionsContainer, { animation: 150, handle: '.widget-order-drag-handle', ghostClass: 'widget-order-ghost'});
        } else if (typeof Sortable === 'undefined') { console.warn("SortableJS not loaded for options page."); }
    }

    function loadOptions() {
        chrome.storage.sync.get(['userName', 'manualLocation', 'widgetSettings', 'widgetOrder', 'darkModeEnabled'], (data) => {
            applyOptionsTheme(data.darkModeEnabled); 
            if (data.userName && typeof data.userName === 'string') userNameInput.value = data.userName;
            if (data.manualLocation && data.manualLocation.name) manualLocationInput.value = data.manualLocation.name;

            const loadedSettings = { ...defaultWidgetSettings, ...(data.widgetSettings || {}) };
            let orderKeysToUse = Object.keys(ORDERABLE_WIDGETS); 
            if (data.widgetOrder && Array.isArray(data.widgetOrder) && data.widgetOrder.length > 0) {
                const savedContainerIds = data.widgetOrder;
                const validOrderedKeys = []; const knownOrderableKeys = Object.keys(ORDERABLE_WIDGETS);
                savedContainerIds.forEach(containerId => {
                    const key = containerId.replace('-widget-container', '');
                    if (knownOrderableKeys.includes(key) && !validOrderedKeys.includes(key)) validOrderedKeys.push(key);
                });
                knownOrderableKeys.forEach(key => { if (!validOrderedKeys.includes(key)) validOrderedKeys.push(key); });
                if (validOrderedKeys.length >= knownOrderableKeys.filter(k => ORDERABLE_WIDGETS[k] !== undefined).length) {
                    orderKeysToUse = validOrderedKeys;
                }
            }
            populateWidgetOrderOptions(loadedSettings, orderKeysToUse);
            // Favorite links are no longer loaded/rendered by this options page
        });
    }

    function saveOptions() { 
        const userNameValue = userNameInput.value.trim();
        const manualLocationValue = manualLocationInput.value.trim();
        const newWidgetSettings = {};
        const orderedWidgetItems = widgetOrderOptionsContainer.querySelectorAll('.widget-order-item');
        
        orderedWidgetItems.forEach(item => {
            const key = item.dataset.widgetKey;
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (key && checkbox && ORDERABLE_WIDGETS.hasOwnProperty(key)) {
                newWidgetSettings[key] = checkbox.checked;
            }
        });
        newWidgetSettings.aqi = newWidgetSettings.weather;

        const newWidgetOrderContainerIds = [];
        orderedWidgetItems.forEach(item => {
            const widgetKey = item.dataset.widgetKey;
            if(widgetKey && ORDERABLE_WIDGETS.hasOwnProperty(widgetKey)) {
                 newWidgetOrderContainerIds.push(`${widgetKey}-widget-container`);
            }
        });

        const dataToSave = {
            userName: userNameValue,
            widgetSettings: newWidgetSettings,
            widgetOrder: newWidgetOrderContainerIds,
        };
        if (manualLocationValue) dataToSave.manualLocation = { name: manualLocationValue };
        else dataToSave.manualLocation = null; 

        chrome.storage.sync.set(dataToSave, () => {
            if (chrome.runtime.lastError) {
                console.error("Error saving options:", chrome.runtime.lastError.message);
                if (statusDiv) statusDiv.textContent = 'Error saving options!'; return;
            }
            if (statusDiv) statusDiv.textContent = 'Options saved! Redirecting...';
            setTimeout(() => { window.location.href = chrome.runtime.getURL('newtab.html'); }, 750);
        });
    }

    if (useCurrentLocationBtn) { 
        useCurrentLocationBtn.addEventListener('click', async () => {
            if (!navigator.geolocation) { currentLocationStatusSpan.textContent = 'Geolocation not supported.'; return; }
            const apiKey = HARDCODED_OPENWEATHERMAP_API_KEY;
            if (!apiKey || apiKey === 'YOUR_OWN_HARDCODED_API_KEY_HERE') { currentLocationStatusSpan.textContent = 'Dev: API key issue.'; return; }
            currentLocationStatusSpan.textContent = 'Fetching...'; useCurrentLocationBtn.disabled = true;
            navigator.geolocation.getCurrentPosition(
                async (position) => { const lat = position.coords.latitude; const lon = position.coords.longitude; currentLocationStatusSpan.textContent = 'Coordinates found...';
                    try {
                        const geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
                        const response = await fetch(geoUrl);
                        if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(`Reverse geocoding failed: ${errorData.message || response.status}`); }
                        const data = await response.json();
                        if (data && data.length > 0) { const locName = data[0].name || ""; const country = data[0].country || ""; manualLocationInput.value = country ? `${locName}, ${country}` : locName; currentLocationStatusSpan.textContent = ''; }
                        else { throw new Error('Could not determine city.'); }
                    } catch (geoError) { console.error('Reverse geocoding error:', geoError); currentLocationStatusSpan.textContent = `Error: ${geoError.message}`; }
                    finally { useCurrentLocationBtn.disabled = false; }
                },
                (error) => { console.error('Geolocation error:', error); let msg = 'Could not get location. '; if (error.code === 1) msg += 'Permission denied.'; else if (error.code === 2) msg += 'Position unavailable.'; else if (error.code === 3) msg += 'Timed out.'; currentLocationStatusSpan.textContent = msg; useCurrentLocationBtn.disabled = false; },
                { timeout: 10000 }
            );
        });
    }
    
    if (saveButton) saveButton.addEventListener('click', saveOptions);
    loadOptions(); 
});
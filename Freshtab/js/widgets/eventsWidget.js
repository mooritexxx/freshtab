// js/widgets/eventsWidget.js - V3.0 (Uses Utils)

const EventsWidget = {
    apiKey: null,
    eventsWidgetDiv: null,
    dateInput: null,
    settingsButton: null,
    currentLocation: null,
    placeholderApiKey: 'YOUR_TICKETMASTER_API_KEY_HERE', // Original placeholder for comparison
    cacheDuration: 10 * 60 * 1000, 
    numberOfEventsToShow: 5,

    // _formatTime: function(timeString) { ... } // REMOVED - Now in Utils.js

    init: async function(location, ticketmasterApiKey) {
        this.apiKey = ticketmasterApiKey;
        this.currentLocation = location;
        this.eventsWidgetDiv = document.getElementById('events-widget');
        this.dateInput = document.getElementById('eventDateInput');
        this.settingsButton = document.getElementById('eventsSettingsBtn');

        if (!this.eventsWidgetDiv || !this.dateInput) {
            console.error("EventsWidget: Required DOM element(s) missing.");
            if(this.eventsWidgetDiv) this.eventsWidgetDiv.innerHTML = "<p>Events Widget failed to initialize.</p>";
            return;
        }
        // Check against the original placeholder string, not the actual key value,
        // in case the developer accidentally reverts the hardcoded key in newtab.js.
        if (!this.apiKey || this.apiKey === 'YOUR_TICKETMASTER_API_KEY_HERE') { 
            this.eventsWidgetDiv.innerHTML = "<p>Events service temporarily unavailable. (Dev: API key issue)</p>";
            console.warn("Developer: Ticketmaster API key is placeholder or missing.");
            return;
        }

        await this._loadWidgetSettings();

        const today = new Date();
        const initialDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        this.dateInput.value = initialDateStr;
        this.dateInput.addEventListener('change', () => {
            if (this.currentLocation && this.dateInput.value) {
                this._fetchAndDisplayEvents(this.currentLocation, this.dateInput.value);
            }
        });

        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', () => {
                if (typeof openModal === 'function') {
                    openModal("Events Settings", (modalBodyEl) => this._populateSettingsModal(modalBodyEl));
                } else { console.error("EventsWidget: openModal function not found.");}
            });
        }
        
        await this._fetchAndDisplayEvents(this.currentLocation, initialDateStr);
    },

    _loadWidgetSettings: async function() { /* ... (no changes from V2.9) ... */ 
        return new Promise(resolve => {
            chrome.storage.sync.get({eventsWidgetSettings: { numberOfEvents: 5 }}, (data) => {
                if (chrome.runtime.lastError) console.error("EventsWidget: Error loading settings:", chrome.runtime.lastError.message);
                this.numberOfEventsToShow = data.eventsWidgetSettings.numberOfEvents || 5;
                resolve();
            });
        });
    },
    _saveWidgetSettings: async function() { /* ... (no changes from V2.9) ... */ 
        return new Promise(resolve => {
            const settingsToSave = { numberOfEvents: this.numberOfEventsToShow };
            chrome.storage.sync.set({eventsWidgetSettings: settingsToSave}, () => {
                if (chrome.runtime.lastError) console.error("EventsWidget: Error saving settings:", chrome.runtime.lastError.message);
                resolve();
            });
        });
    },
    _populateSettingsModal: function(modalBodyElement) { /* ... (no changes from V2.9) ... */ 
        modalBodyElement.innerHTML = `<div><label for="eventCountSelect">Number of events:</label><select id="eventCountSelect"><option value="5" ${this.numberOfEventsToShow===5?'selected':''}>5</option><option value="10" ${this.numberOfEventsToShow===10?'selected':''}>10</option><option value="20" ${this.numberOfEventsToShow===20?'selected':''}>20</option><option value="50" ${this.numberOfEventsToShow===50?'selected':''}>50</option></select></div><button id="saveEventSettingsBtn" class="modal-save-btn" style="margin-top:15px; float:right;">Save</button>`;
        const saveBtn=modalBodyElement.querySelector('#saveEventSettingsBtn');const selectEl=modalBodyElement.querySelector('#eventCountSelect');
        if(saveBtn&&selectEl){saveBtn.addEventListener('click',async()=>{this.numberOfEventsToShow=parseInt(selectEl.value,10);await this._saveWidgetSettings();if(typeof closeModal==='function')closeModal();if(this.currentLocation&&this.dateInput?.value)await this._fetchAndDisplayEvents(this.currentLocation,this.dateInput.value);});}
    },
    // _getApiErrorMessage: async function(response, apiName = "API") { /* REMOVED - Now in Utils.js */ },

    _renderEvents: function(apiData, selectedDateStr) { 
        if(!this.eventsWidgetDiv)return;
        if(apiData._embedded?.events?.length>0){
            let h='<ul class="events-list">';
            apiData._embedded.events.forEach(e=>{
                let dS='Date TBD',tS='',dO;
                if(e.dates?.start){
                    const s=e.dates.start;
                    if(typeof s.localDate==='string'){
                        let pS=s.localDate;
                        if(typeof s.localTime==='string'){pS+=`T${s.localTime}`;tS=Utils.formatTime(s.localTime)} // USE UTILS
                        dO=new Date(pS)
                    }else if(typeof s.dateTime==='string'){
                        dO=new Date(s.dateTime);
                        if(dO instanceof Date&&!isNaN(dO.getTime()))tS=dO.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})
                    }
                    if(dO instanceof Date&&!isNaN(dO.getTime()))dS=dO.toLocaleDateString(undefined,{month:'short',day:'numeric'})
                }
                const dT_S=tS?`${dS} - ${tS}`:dS;
                let eP_U='#';if(typeof e.url==='string')eP_U=e.url.startsWith('http')?e.url:`https://www.ticketmaster.com${e.url}`;
                const aN=e._embedded?.attractions?.[0]?.name||'';const tAS=aN?`${e.name} by ${aN}`:e.name;
                let vND='Venue TBD',vGU='#';
                if(e._embedded?.venues?.[0]){
                    const v=e._embedded.venues[0];vND=v.name||'Venue TBD';
                    const aP=[v.name,v.address?.line1,v.city?.name,v.state?.name,v.postalCode].filter(p=>p&&typeof p==='string'&&p.trim()!=='');
                    if(aP.length>0)vGU=`https://www.google.com/maps/search/?api=1&query=Your+Encoded+Address+String0{encodeURIComponent(aP.join(', '))}` // Corrected Google Maps link
                }
                let iU='images/event-placeholder.png';
                if(e.images?.length>0){const pI=e.images.find(i=>(i.ratio==='16_9'||i.ratio==='3_2')&&i.width>=100&&i.width<=400)||e.images[0];if(pI)iU=pI.url}
                h+=`
                    <li class="event-item">
                        <div class="event-image-container"><img src="${iU}" alt="${e.name||'Event'}" class="event-image" onerror="this.onerror=null; this.src='images/event-placeholder.png';"></div>
                        <div class="event-details-column">
                            <div class="event-datetime">${dT_S}</div>
                            <div class="event-title-artist"><a href="${eP_U}" target="_blank" rel="noopener noreferrer">${tAS}</a></div>
                            <div class="event-venue-location"><a href="${vGU}" target="_blank" rel="noopener noreferrer">${vND}</a></div>
                        </div>
                    </li>`;
            });
            h+='</ul>';this.eventsWidgetDiv.innerHTML=h
        }else{
            let dDS="the selected date";
            if(this.dateInput?.value){const sD=new Date(this.dateInput.value+"T00:00:00");if(sD instanceof Date&&!isNaN(sD.getTime()))dDS=sD.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}
            this.eventsWidgetDiv.innerHTML=`<p>No upcoming events found for ${dDS}.</p>`;
        }
    },

    _fetchAndDisplayEvents: async function(location, selectedDateStr) { /* ... (Caching logic uses Utils.getApiErrorMessage) ... */
        if (!this.eventsWidgetDiv) return;
        this.eventsWidgetDiv.innerHTML = '<p>Loading events...</p>';
        const cacheKeyData = `cachedEventsData_${selectedDateStr}_${this.numberOfEventsToShow}`;
        const cacheKeyTimestamp = `cachedEventsTimestamp_${selectedDateStr}_${this.numberOfEventsToShow}`;
        const cachedItems = await new Promise(resolve => {
            chrome.storage.local.get([cacheKeyData, cacheKeyTimestamp], result => {
                if (chrome.runtime.lastError) { console.error("EventsWidget: Cache get error:", chrome.runtime.lastError.message); resolve({});}
                else resolve(result);
            });
        });
        const cachedData = cachedItems[cacheKeyData];
        const lastFetchTime = cachedItems[cacheKeyTimestamp];
        if (cachedData && lastFetchTime && (Date.now() - lastFetchTime < this.cacheDuration)) {
            this._renderEvents(cachedData, selectedDateStr); return;
        }
        const localStartDate = new Date(selectedDateStr + "T00:00:00");
        const localEndDate = new Date(selectedDateStr + "T23:59:59");
        const startDateTimeISO = localStartDate.toISOString().split('.')[0] + "Z";
        const endDateTimeISO = localEndDate.toISOString().split('.')[0] + "Z";
        let queryParams = `apikey=${this.apiKey}&sort=date,asc&size=${this.numberOfEventsToShow}&startDateTime=${startDateTimeISO}&endDateTime=${endDateTimeISO}`; 
        if (location.latitude && location.longitude) queryParams += `&latlong=${location.latitude},${location.longitude}&radius=10&unit=km`; 
        else if (location.name) { const city = location.name.split(',')[0].trim(); queryParams += `&city=${encodeURIComponent(city)}&radius=10&unit=km`;}
        else { this.eventsWidgetDiv.innerHTML = "<p>Location information needed.</p>"; return; }
        const url = `https://app.ticketmaster.com/discovery/v2/events.json?${queryParams}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorMsg = await Utils.getApiErrorMessage(response, "Ticketmaster Events"); // USE UTILS
                throw new Error(errorMsg);
            }
            const data = await response.json();
            const itemsToCache = {}; itemsToCache[cacheKeyData] = data; itemsToCache[cacheKeyTimestamp] = Date.now();
            chrome.storage.local.set(itemsToCache, () => { if (chrome.runtime.lastError) console.error("EventsWidget: Cache set error - ", chrome.runtime.lastError.message); });
            this._renderEvents(data, selectedDateStr);
        } catch (error) { console.error("EventsWidget: API Error:", error.message); this.eventsWidgetDiv.innerHTML = '<p>Could not load events.</p>';}
    }
};
// js/widgets/weatherWidget.js - V3.0 (Uses Utils)

const WeatherWidget = {
    apiKey: null,
    weatherWidgetDiv: null,
    placeholderApiKey: 'YOUR_OWN_HARDCODED_API_KEY_HERE', 
    settings: null, 
    cacheDuration: 3 * 60 * 60 * 1000,
    containerDiv: null,

    // _formatUnixTimestampToTime: function(...) { /* REMOVED - Now in Utils.js */ },
    // _convertWindDirection: function(...) { /* REMOVED - Now in Utils.js */ },
    _getUviMeaning: function(uvi) { /* ... (no change from V2.7) ... */ 
        if(typeof uvi!=='number')return '';if(uvi<=2)return"(Low)";if(uvi<=5)return"(Moderate)";if(uvi<=7)return"(High)";if(uvi<=10)return"(Very High)";return"(Extreme)";
    },

    _showLoadingState: function() {
        if (!this.weatherWidgetDiv) return;
        
        // Add loading class to container
        if (this.containerDiv) {
            this.containerDiv.classList.add('loading');
        }

        this.weatherWidgetDiv.innerHTML = `
            <div class="weather-main">
                <div class="skeleton skeleton-circle"></div>
                <div class="skeleton skeleton-text large" style="width: 80px; margin: 15px auto;"></div>
                <div class="skeleton skeleton-text" style="width: 150px; margin: 10px auto;"></div>
                <div class="skeleton skeleton-text" style="width: 120px; margin: 10px auto;"></div>
            </div>
            <div class="weather-details-grid">
                ${Array(8).fill('<div class="skeleton skeleton-text" style="width: 90%;"></div>').join('')}
            </div>
            <div class="weather-forecast-hourly">
                <div class="skeleton skeleton-text" style="width: 60px; margin: 15px 0;"></div>
                <div style="display: flex; justify-content: space-between;">
                    ${Array(4).fill(`
                        <div style="flex: 1; margin: 0 5px;">
                            <div class="skeleton skeleton-text small" style="width: 40px;"></div>
                            <div class="skeleton skeleton-circle" style="width: 30px; height: 30px; margin: 10px auto;"></div>
                            <div class="skeleton skeleton-text small" style="width: 30px; margin: 5px auto;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="weather-forecast-daily">
                <div class="skeleton skeleton-text" style="width: 60px; margin: 15px 0;"></div>
                <div style="display: flex; justify-content: space-between;">
                    ${Array(4).fill(`
                        <div style="flex: 1; margin: 0 5px;">
                            <div class="skeleton skeleton-text small" style="width: 30px;"></div>
                            <div class="skeleton skeleton-circle" style="width: 30px; height: 30px; margin: 10px auto;"></div>
                            <div class="skeleton skeleton-text small" style="width: 50px; margin: 5px auto;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    _hideLoadingState: function() {
        if (this.containerDiv) {
            this.containerDiv.classList.remove('loading');
        }
    },

    init: async function(location, openWeatherMapApiKey, currentSettings) {
        this.apiKey = openWeatherMapApiKey;
        this.settings = currentSettings;
        this.weatherWidgetDiv = document.getElementById('weather-widget');
        this.containerDiv = document.getElementById('weather-widget-container');
        
        if (!this.weatherWidgetDiv) {
            console.error("WeatherWidget: #weather-widget DOM element not found.");
            return;
        }

        if (this.settings.weather) {
            this._showLoadingState();
            await this._fetchAndDisplayFullWeather(location);
            this._hideLoadingState();
        } else {
            this.weatherWidgetDiv.innerHTML = "";
        }
    },

    // _getApiErrorMessage: async function(...) { /* REMOVED - Now in Utils.js */ },

    _processRawForecastData: function(rawData, locationTimezoneOffset) { /* ... (uses Utils.formatUnixTimestampToTime) ... */
        const hourly = []; const daily = {};
        if (!rawData || !Array.isArray(rawData.list)) return { hourly: [], daily: [] };
        for (let i = 0; i < rawData.list.length && hourly.length < 4; i++) {
            const item = rawData.list[i];
            hourly.push({
                time: Utils.formatUnixTimestampToTime(item.dt, locationTimezoneOffset), // USE UTILS
                temp: Math.round(item.main.temp), icon: item.weather[0].icon,
                description: item.weather[0].description, pop: Math.round((item.pop || 0) * 100)
            });
        }
        rawData.list.forEach(item => {
            const itemDate = new Date((item.dt + locationTimezoneOffset) * 1000);
            const dateKey = `${itemDate.getUTCFullYear()}-${String(itemDate.getUTCMonth() + 1).padStart(2, '0')}-${String(itemDate.getUTCDate()).padStart(2, '0')}`;
            if (!daily[dateKey]) daily[dateKey] = {date: itemDate, dayName: itemDate.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' }), temps: [], icons: {}, pops: [], descriptions: {}};
            daily[dateKey].temps.push(item.main.temp); daily[dateKey].pops.push(item.pop || 0);
            const icon = item.weather[0].icon.substring(0, 2); daily[dateKey].icons[icon] = (daily[dateKey].icons[icon] || 0) + 1;
            daily[dateKey].descriptions[item.weather[0].main] = (daily[dateKey].descriptions[item.weather[0].main] || 0) + 1;
        });
        const dailySummary = Object.values(daily).map(dayData => {
            const tempMin = Math.round(Math.min(...dayData.temps)); const tempMax = Math.round(Math.max(...dayData.temps));
            const avgPop = dayData.pops.length > 0 ? Math.round((dayData.pops.reduce((a, b) => a + b, 0) / dayData.pops.length) * 100) : 0;
            let mostFrequentIcon = '01', maxIconCount = 0; let representativeDescription = "Clear", maxDescCount = 0;
            for (const icon in dayData.icons) if (dayData.icons[icon] > maxIconCount) { mostFrequentIcon = icon; maxIconCount = dayData.icons[icon]; }
            for (const desc in dayData.descriptions) if (dayData.descriptions[desc] > maxDescCount) { representativeDescription = desc; maxDescCount = dayData.descriptions[desc];}
            return {dayName: dayData.dayName, tempMin, tempMax, icon: mostFrequentIcon + "d", description: representativeDescription, pop: avgPop};
        }).slice(0, 4);
        return { hourly, daily: dailySummary };
    },

    _getProcessedForecastData: async function(lat, lon, locationTimezoneOffset) { /* ... (uses Utils.getApiErrorMessage) ... */
        const cacheKeySuffix = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cacheKeyData = `cachedForecastData_${cacheKeySuffix}`; const cacheKeyTimestamp = `cachedForecastTimestamp_${cacheKeySuffix}`;
        const cachedItems = await new Promise(resolve => { chrome.storage.local.get([cacheKeyData, cacheKeyTimestamp], result => { if(chrome.runtime.lastError){console.error("WeatherWidget: Cache get error:", chrome.runtime.lastError.message);resolve({});}else resolve(result);});});
        const cachedData = cachedItems[cacheKeyData]; const lastFetchTime = cachedItems[cacheKeyTimestamp];
        if (cachedData && lastFetchTime && (Date.now() - lastFetchTime < this.cacheDuration)) {
            return this._processRawForecastData(cachedData, locationTimezoneOffset);
        }
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
        try {
            const response = await fetch(forecastUrl);
            if (!response.ok) { const errorMsg = await Utils.getApiErrorMessage(response, "Forecast API"); throw new Error(errorMsg);} // USE UTILS
            const rawForecastData = await response.json();
            const itemsToCache = {}; itemsToCache[cacheKeyData] = rawForecastData; itemsToCache[cacheKeyTimestamp] = Date.now();
            chrome.storage.local.set(itemsToCache, () => { if(chrome.runtime.lastError) console.error("WeatherWidget: Cache set error:", chrome.runtime.lastError.message); });
            return this._processRawForecastData(rawForecastData, locationTimezoneOffset);
        } catch (error) { console.error("WeatherWidget (Forecast Fetch) Error:", error.message); return { hourly: [], daily: [] };}
    },

    _formatTime: function(timeStr) {
        // Input format example: "2:00 PM" or "11:00 AM"
        const [time, period] = timeStr.split(' ');
        const [hours] = time.split(':');
        return `${parseInt(hours)}${period.toLowerCase()}`;
    },

    _fetchAndDisplayFullWeather: async function(location) {
        if (!this.weatherWidgetDiv) return;
        
        if (!this.apiKey || this.apiKey === this.placeholderApiKey) {
            this.weatherWidgetDiv.innerHTML = "<p>Weather service unavailable (Dev: API key).</p>";
            return;
        }

        let currentWeatherData;
        let weatherUrl;

        if (location.latitude && location.longitude) {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${this.apiKey}&units=metric`;
        } else if (location.name) {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.name)}&appid=${this.apiKey}&units=metric`;
        } else {
            this.weatherWidgetDiv.innerHTML = "<p>Location not available.</p>";
            return;
        }

        try {
            const weatherResponse = await fetch(weatherUrl);
            if (!weatherResponse.ok) {
                const errorMsg = await Utils.getApiErrorMessage(weatherResponse, "Current Weather");
                throw new Error(errorMsg);
            }
            currentWeatherData = await weatherResponse.json();
        } catch (error) {
            console.error("WeatherWidget (Current Weather) Error:", error.message);
            this.weatherWidgetDiv.innerHTML = `<p>Could not load current weather.</p>`;
            return;
        }

        const latForForecast = currentWeatherData.coord?.lat || location.latitude;
        const lonForForecast = currentWeatherData.coord?.lon || location.longitude;
        const locationTimezoneOffset = currentWeatherData.timezone || 0;
        let forecastData = { hourly: [], daily: [] };
        
        if (latForForecast && lonForForecast) {
            forecastData = await this._getProcessedForecastData(latForForecast, lonForForecast, locationTimezoneOffset);
        }

        let aqiHtml = '';
        if (latForForecast && lonForForecast) {
            const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latForForecast}&lon=${lonForForecast}&appid=${this.apiKey}`;
            try {
                const aqiResponse = await fetch(aqiUrl);
                if (!aqiResponse.ok) {
                    const errorMsg = await Utils.getApiErrorMessage(aqiResponse, "AQI");
                    throw new Error(errorMsg);
                }
                const aqiResult = await aqiResponse.json();
                if (aqiResult.list?.length > 0) {
                    const aqiValue = aqiResult.list[0].main.aqi;
                    const aqiMeaning = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqiValue - 1] || 'Unknown';
                    aqiHtml = `<div class="weather-detail-item"><strong>AQI</strong>${aqiValue} (${aqiMeaning})</div>`;
                }
            } catch (aqiError) {
                console.error("WeatherWidget (AQI) Error:", aqiError.message);
            }
        }

        const c = currentWeatherData;
        const lastUpdatedTime = Utils.formatUnixTimestampToTime(c.dt, locationTimezoneOffset);
        const sunriseTime = Utils.formatUnixTimestampToTime(c.sys.sunrise, locationTimezoneOffset);
        const sunsetTime = Utils.formatUnixTimestampToTime(c.sys.sunset, locationTimezoneOffset);

        // Main weather section
        const mainHtml = `
            <div class="weather-main">
                <img src="https://openweathermap.org/img/wn/${c.weather[0].icon}@2x.png" alt="${c.weather[0].description}" class="weather-icon-large">
                <div class="weather-temp-current">${Math.round(c.main.temp)}°</div>
                <div class="weather-condition">${c.weather[0].description}</div>
                <div class="weather-location">${c.name}</div>
            </div>`;

        // Forecast sections
        let hourlyHtml = '';
        if (forecastData.hourly.length > 0) {
            hourlyHtml = `
                <div class="weather-forecast-hourly">
                    <h4>Next Hours</h4>
                    <div class="hourly-items-container">
                        ${forecastData.hourly.map(h => `
                            <div class="hourly-item">
                                <div class="hourly-time">${this._formatTime(h.time)}</div>
                                <img src="https://openweathermap.org/img/wn/${h.icon}.png" alt="${h.description}" class="hourly-icon">
                                <div class="hourly-temp">${h.temp}°</div>
                                ${h.pop > 0 ? `<div class="hourly-pop">${h.pop}%💧</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        let dailyHtml = '';
        if (forecastData.daily.length > 0) {
            dailyHtml = `
                <div class="weather-forecast-daily">
                    <h4>Next Days</h4>
                    <div class="daily-items-container">
                        ${forecastData.daily.map(d => `
                            <div class="daily-item">
                                <div class="daily-dayName">${d.dayName}</div>
                                <img src="https://openweathermap.org/img/wn/${d.icon}.png" alt="${d.description}" class="daily-icon">
                                <div class="daily-temp">${d.tempMax}°/${d.tempMin}°</div>
                                ${d.pop > 0 ? `<div class="daily-pop">${d.pop}%💧</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        // Details grid
        const detailsHtml = `
            <div class="weather-details-grid">
                <div class="weather-detail-item"><strong>Feels</strong>${Math.round(c.main.feels_like)}°</div>
                <div class="weather-detail-item"><strong>Wind</strong>${Math.round(c.wind.speed*3.6)} km/h</div>
                <div class="weather-detail-item"><strong>Humidity</strong>${c.main.humidity}%</div>
                <div class="weather-detail-item"><strong>Rise</strong>${sunriseTime}</div>
                <div class="weather-detail-item"><strong>Set</strong>${sunsetTime}</div>
                <div class="weather-detail-item"><strong>Press</strong>${c.main.pressure}</div>
                ${c.visibility ? `<div class="weather-detail-item"><strong>Vis</strong>${(c.visibility/1000).toFixed(1)}km</div>` : ''}
                ${aqiHtml}
            </div>`;

        const footerHtml = `<div class="weather-last-updated">Updated: ${lastUpdatedTime}</div>`;

        // Combine all sections
        this.weatherWidgetDiv.innerHTML = mainHtml + hourlyHtml + dailyHtml + detailsHtml + footerHtml;
    }
};
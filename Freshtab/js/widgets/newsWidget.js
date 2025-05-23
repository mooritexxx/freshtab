// js/widgets/newsWidget.js

const NewsWidget = {
    apiKey: null,
    newsWidgetDiv: null,
    placeholderApiKey: 'YOUR_GNEWS_API_KEY_HERE', // Not used if key is directly hardcoded

    init: async function(location, gnewsApiKey) {
        this.apiKey = gnewsApiKey; // GNEWS_API_KEY from newtab.js
        this.newsWidgetDiv = document.getElementById('news-widget');

        if (!this.newsWidgetDiv) {
            console.error("NewsWidget: #news-widget DOM element not found.");
            return;
        }

        // Use the actual key value here, not the placeholder string for comparison
        if (!this.apiKey || this.apiKey === 'YOUR_GNEWS_API_KEY_HERE') { 
            this.newsWidgetDiv.innerHTML = "News service temporarily unavailable. (Dev: GNews API key issue)";
            console.warn("Developer: GNews API key is placeholder or missing in newsWidget.js.");
            return;
        }
        
        await this._fetchAndDisplayNews(location);
        this._addEventListeners(); // Add event listeners after content is potentially rendered
    },

    _fetchAndDisplayNews: async function(location) {
        if (!this.newsWidgetDiv) return;

        this.newsWidgetDiv.innerHTML = 'Loading news...';
        let query = '';
        let country = 'ca'; 

        if (location.name) { 
            const parts = location.name.split(',');
            query = encodeURIComponent(parts[0].trim()); 
            if (parts.length > 1) {
                const countryGuess = parts[1].trim().toLowerCase();
                if (countryGuess === "canada" || countryGuess === "ca") country = "ca";
                else if (countryGuess === "usa" || countryGuess === "us" || countryGuess === "united states") country = "us";
            }
        } else if (location.latitude && location.longitude) {
            if (location.latitude > 49 && location.latitude < 50 && location.longitude < -122 && location.longitude > -124) { // Approx Vancouver
                country = 'ca';
                query = 'Vancouver';
            } else {
                console.warn("NewsWidget: Only lat/lon available. Fetching top headlines for default country.");
            }
        } else {
            this.newsWidgetDiv.innerHTML = "Location information needed to fetch relevant news.";
            return;
        }

        let url = `https://gnews.io/api/v4/top-headlines?lang=en&country=${country}&max=5&token=${this.apiKey}`;
        if (query) { 
            url += `&q=${query}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({message: `HTTP error ${response.status}`}));
                const errorMessage = errorData.errors ? errorData.errors.join(', ') : (errorData.message || `HTTP error ${response.status}`);
                throw new Error(errorMessage);
            }
            const data = await response.json();

            if (data.articles && data.articles.length > 0) {
                let newsHtml = '<ul class="news-list">';
                data.articles.forEach((article, index) => {
                    const imageUrl = article.image || 'images/news-placeholder.png';
                    const description = article.description || "";
                    const descriptionId = `news-desc-${index}`; // Unique ID for each description

                    newsHtml += `
                        <li class="news-item">
                            <div class="news-item-image-container">
                                <img src="${imageUrl}" alt="${article.title || 'News image'}" class="news-item-image" onerror="this.onerror=null; this.src='images/news-placeholder.png';">
                            </div>
                            <div class="news-item-details">
                                <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-item-title">${article.title}</a>
                                <small class="news-item-source">Source: ${article.source.name}</small>
                                ${ description ? `
                                    <a href="#" class="news-expand-link" data-target-id="${descriptionId}">Expand &#9662;</a>
                                    <div class="news-item-full-description" id="${descriptionId}" style="display:none;">
                                        ${description}
                                    </div>
                                ` : ''}
                            </div>
                        </li>`;
                });
                newsHtml += '</ul>';
                this.newsWidgetDiv.innerHTML = newsHtml;
            } else {
                this.newsWidgetDiv.innerHTML = 'No recent news found for your criteria.';
            }
        } catch (error) {
            console.error("NewsWidget._fetchAndDisplayNews Error:", error.message);
            this.newsWidgetDiv.innerHTML = 'Could not load news.';
        }
    },

    _addEventListeners: function() {
        if (!this.newsWidgetDiv) {
            // console.warn("NewsWidget: _addEventListeners called but newsWidgetDiv is null.");
            return;
        }
        // Use event delegation on the newsWidgetDiv
        this.newsWidgetDiv.addEventListener('click', function(event) {
            // console.log("News widget clicked, target:", event.target); // DEBUG: See what was clicked
            if (event.target.classList.contains('news-expand-link')) {
                event.preventDefault(); // Prevent default anchor behavior
                const targetId = event.target.dataset.targetId; // Ensure you use data-target-id
                const descriptionDiv = document.getElementById(targetId);

                // console.log("Expand link clicked! Target ID:", targetId, "Description Div:", descriptionDiv); // DEBUG

                if (descriptionDiv) {
                    const isHidden = descriptionDiv.style.display === 'none' || descriptionDiv.style.display === '';
                    descriptionDiv.style.display = isHidden ? 'block' : 'none';
                    event.target.innerHTML = isHidden ? 'Collapse &#9652;' : 'Expand &#9662;';
                } else {
                    // console.warn("NewsWidget: Description div not found for ID:", targetId); // DEBUG
                }
            }
        });
    }
};
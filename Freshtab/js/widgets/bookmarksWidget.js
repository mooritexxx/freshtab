// js/widgets/bookmarksWidget.js
const BookmarksWidget = {
    bookmarksWidgetDiv: null,

    init: async function() {
        this.bookmarksWidgetDiv = document.getElementById('bookmarks-widget');
        if (!this.bookmarksWidgetDiv) {
            console.error("BookmarksWidget: #bookmarks-widget DOM element not found.");
            return;
        }
        await this._fetchAndDisplayTopSites();
    },

    _fetchAndDisplayTopSites: async function() {
        if (!chrome.topSites) {
            this.bookmarksWidgetDiv.innerHTML = "<p>Top Sites API not available.</p>";
            return;
        }
        this.bookmarksWidgetDiv.innerHTML = '<p>Loading top sites...</p>';
        try {
            const topSites = await new Promise(resolve => chrome.topSites.get(resolve));
            if (topSites && topSites.length > 0) {
                let bookmarksHtml = '<ul class="bookmarks-list">';
                // Display up to a certain number, e.g., 10
                topSites.slice(0, 10).forEach(site => {
                    // Favicon URL (Google's favicon service as an example, can be slow or blocked by some sites)
                    //
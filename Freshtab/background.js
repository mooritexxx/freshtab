// background.js (Service Worker)

// Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Freshtab extension installed or updated:", details);

  // Set up default settings on first install
  if (details.reason === 'install') {
    const defaultWidgetSettings = {
        time: true,
        weather: true,
        events: false,
        news: false,
        aqi: false,
    };
    const defaultUserApiKeys = {
        openweathermap: '', // User should fill this in
        // news: '',
        // ticketmaster: ''
    };

    chrome.storage.sync.set({
        widgetSettings: defaultWidgetSettings,
        userApiKeys: defaultUserApiKeys,
        manualLocation: null // Explicitly null
    }, () => {
        console.log("Default settings initialized on first install.");
    });
  }
});

// The chrome.action.onClicked listener has been removed.

console.log("Background service worker for Freshtab started.");
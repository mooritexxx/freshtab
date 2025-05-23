// background.js (Service Worker)

// Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Personalized New Tab extension installed or updated:", details);

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
        // Optionally open the options page for the user to configure API keys
        // chrome.runtime.openOptionsPage();
    });
  }
});

// Open options page when the action icon (extension icon in toolbar) is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage();
});

console.log("Background service worker for Personalized New Tab started.");

// Example: Periodically fetch data (if you had a need for background updates for badges etc.)
// chrome.alarms.create('myPeriodicTask', { periodInMinutes: 30 });
// chrome.alarms.onAlarm.addListener((alarm) => {
//   if (alarm.name === 'myPeriodicTask') {
//     console.log("Alarm triggered: Time for a background task!");
//     // Perform background tasks here, e.g., fetch data and update a badge
//   }
// });
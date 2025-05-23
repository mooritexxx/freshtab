// js/widgets/timeWidget.js

const TimeWidget = {
    init: function() {
        const dateTimeDisplayDiv = document.getElementById('page-datetime-display');
        
        if (!dateTimeDisplayDiv) {
            console.error("TimeWidget: Could not find #page-datetime-display DOM element.");
            return;
        }
        this.displayTime(dateTimeDisplayDiv);
    },

    displayTime: function(displayElement) {
        function updateClock() {
            const now = new Date();
            const hours = now.getHours();
            
            // Day/Night icon logic (e.g., 6 AM to 7 PM is day time)
            // Adjust these hours based on your preference for "day" vs "night"
            const isDayTime = hours >= 6 && hours < 19; 
            const dayNightIcon = isDayTime ? '☀️' : '🌙';

            const dateString = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            // HH:MM AM/PM format, no seconds
            const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); 

            displayElement.innerHTML = `
                <div class="datetime-icon">${dayNightIcon}</div>
                <div class="datetime-text-content">
                    <h3>${dateString}</h3>
                    <p>${timeString}</p>
                </div>`;
        }
        updateClock(); 
        setInterval(updateClock, 1000 * 30); // Update every 30 seconds is enough for time display without seconds
    }
};
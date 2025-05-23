// js/widgets/notesWidget.js

const NotesWidget = {
    notesTextArea: null,
    debouncedSave: null, // To store the debounced save function

    init: function() {
        this.notesTextArea = document.getElementById('quickNotesArea');

        if (!this.notesTextArea) {
            console.error("NotesWidget: Could not find #quickNotesArea DOM element.");
            // Attempt to find the main widget div to display an error
            const mainNotesDiv = document.getElementById('notes-widget');
            if(mainNotesDiv) mainNotesDiv.innerHTML = "<p>Quick Notes could not initialize.</p>";
            return;
        }

        this._loadNotes();
        
        // Debounce the save function to avoid saving on every keystroke
        // Saves 750ms after the user stops typing
        this.debouncedSave = this._debounce(() => this._saveNotes(), 750);

        this.notesTextArea.addEventListener('input', () => {
            this.debouncedSave();
        });
    },

    _loadNotes: function() {
        if (!this.notesTextArea) return;

        chrome.storage.local.get({quickNotes: ''}, (data) => { // Default to empty string
            if (chrome.runtime.lastError) {
                console.error("NotesWidget: Error loading notes:", chrome.runtime.lastError.message);
            } else {
                this.notesTextArea.value = data.quickNotes || ''; // Ensure it's a string
            }
        });
    },

    _saveNotes: function() {
        if (!this.notesTextArea) return;

        const notesText = this.notesTextArea.value;
        chrome.storage.local.set({quickNotes: notesText}, () => {
            if (chrome.runtime.lastError) {
                console.error("NotesWidget: Error saving notes:", chrome.runtime.lastError.message);
            }
            // console.log("NotesWidget: Notes saved."); // For debugging
        });
    },

    // Debounce helper function
    // Limits the rate at which a function can fire.
    _debounce: function(func, delay) {
        let timeoutId;
        return function(...args) {
            // If 'this' context is important for func, ensure it's bound correctly
            // or use an arrow function for func if it relies on the outer 'this'.
            // For this._saveNotes, it correctly uses 'this.notesTextArea' which is part of NotesWidget.
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
};
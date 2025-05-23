// js/widgets/topSitesWidget.js - V3.0

const TopSitesWidget = {
    topSitesListArea: null,
    favoriteLinksArea: null, 
    hiddenSites: [], 
    userFavorites: [], 
    settingsButton: null,    // For gear icon (manage hidden sites)
    addFavoriteButton: null, // For + icon (add new favorite)
    modalBodyContent: null, 

    init: async function() {
        const mainWidgetContentDiv = document.getElementById('topsites-widget');
        if (!mainWidgetContentDiv) {
            console.error("TopSitesWidget: Could not find #topsites-widget DOM element.");
            return;
        }
        mainWidgetContentDiv.innerHTML = ''; 

        this.favoriteLinksArea = document.createElement('div');
        this.favoriteLinksArea.id = 'userFavoriteLinksArea';
        mainWidgetContentDiv.appendChild(this.favoriteLinksArea);

        this.topSitesListArea = document.createElement('ul');
        this.topSitesListArea.id = 'topSitesListArea'; 
        this.topSitesListArea.className = 'topsites-list-area'; 
        mainWidgetContentDiv.appendChild(this.topSitesListArea);
        
        this.settingsButton = document.getElementById('topSitesSettingsBtn'); 
        this.addFavoriteButton = document.getElementById('addFavoriteLinkBtn'); // New button

        await this._loadHiddenSites();
        await this._loadUserFavorites(); 
        this._loadTopSites();      

        this._addEventListeners();
    },

    _addEventListeners: function() {
        // Listener for hiding top sites
        if (this.topSitesListArea) {
            this.topSitesListArea.addEventListener('click', (event) => {
                const hideButton = event.target.closest('.topsite-hide-btn');
                if (hideButton) {
                    event.preventDefault();
                    const siteUrlToHide = hideButton.dataset.url;
                    if (siteUrlToHide) this._hideSite(siteUrlToHide);
                }
            });
        }

        // Listener for removing user favorites from the main widget display
        if (this.favoriteLinksArea) {
            this.favoriteLinksArea.addEventListener('click', (event) => {
                const removeButton = event.target.closest('.favorite-remove-btn');
                if (removeButton) {
                    event.preventDefault();
                    const urlToRemove = removeButton.dataset.url;
                    if (urlToRemove) this._removeUserFavorite(urlToRemove);
                }
            });
        }

        // Listener for the settings gear icon (manages hidden sites)
        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', () => {
                if (typeof openModal === 'function') {
                    openModal(
                        "Manage Hidden Sites", 
                        (modalBodyEl) => { 
                            this._populateHiddenSitesManageModal(modalBodyEl);
                            if (this.boundHandleHiddenSitesModalClick) modalBodyEl.removeEventListener('click', this.boundHandleHiddenSitesModalClick);
                            this.boundHandleHiddenSitesModalClick = this._handleHiddenSitesModalClick.bind(this);
                            modalBodyEl.addEventListener('click', this.boundHandleHiddenSitesModalClick);
                        }
                    );
                } else { console.error("TopSitesWidget: openModal function not found."); }
            });
        }

        // Listener for the Add Favorite (+) button
        if (this.addFavoriteButton) {
            this.addFavoriteButton.addEventListener('click', () => {
                if (typeof openModal === 'function') {
                    openModal(
                        "Add New Favorite Link",
                        (modalBodyEl) => {
                            this._populateAddFavoriteFormModal(modalBodyEl);
                            const addFavForm = modalBodyEl.querySelector('#modalAddFavoriteForm');
                            if (addFavForm) {
                                if (this.boundHandleAddFavoriteSubmit) addFavForm.removeEventListener('submit', this.boundHandleAddFavoriteSubmit);
                                this.boundHandleAddFavoriteSubmit = this._handleAddFavoriteSubmit.bind(this);
                                addFavForm.addEventListener('submit', this.boundHandleAddFavoriteSubmit);
                            }
                        }
                    );
                } else { console.error("TopSitesWidget: openModal function not found."); }
            });
        }
    },

    _populateAddFavoriteFormModal: function(modalBodyElement) {
        modalBodyElement.innerHTML = `
            <form id="modalAddFavoriteForm" class="modal-form">
                <div>
                    <label for="modalFavoriteNameInput">Name:</label>
                    <input type="text" id="modalFavoriteNameInput" required>
                </div>
                <div>
                    <label for="modalFavoriteUrlInput">URL:</label>
                    <input type="url" id="modalFavoriteUrlInput" placeholder="https://example.com" required>
                </div>
                <button type="submit" class="action-btn modal-save-btn">Add Favorite</button>
            </form>
        `;
        // Focus the first input
        const nameInput = modalBodyElement.querySelector('#modalFavoriteNameInput');
        if (nameInput) nameInput.focus();
    },

    _populateHiddenSitesManageModal: function(modalBodyElement) {
        modalBodyElement.innerHTML = ''; // Clear
        const hiddenTitle = document.createElement('h4'); // No longer needed if modal title is set by openModal
        // hiddenTitle.textContent = 'Hidden Frequently Visited Sites';
        // modalBodyElement.appendChild(hiddenTitle);

        if (this.hiddenSites.length === 0) {
            modalBodyElement.innerHTML = '<p><small>No sites have been hidden from the "Frequently Visited" list.</small></p>';
            return;
        }
        const hiddenUl = document.createElement('ul');
        this.hiddenSites.forEach((url) => {
            const li = document.createElement('li');
            const siteNameSpan = document.createElement('span');
            siteNameSpan.className = 'item-text';
            let displayName = url; try {displayName = new URL(url).hostname;} catch (e) {}
            siteNameSpan.textContent = displayName; siteNameSpan.title = url;
            const unhideBtn = document.createElement('button');
            unhideBtn.textContent = 'Unhide'; unhideBtn.className = 'action-btn unhide-topsite-btn-modal';
            unhideBtn.dataset.url = url;
            li.appendChild(siteNameSpan); li.appendChild(unhideBtn); hiddenUl.appendChild(li);
        });
        modalBodyElement.appendChild(hiddenUl);
    },
    
    _handleAddFavoriteSubmit: async function(event) {
        event.preventDefault();
        const form = event.target;
        const nameInput = form.querySelector('#modalFavoriteNameInput');
        const urlInput = form.querySelector('#modalFavoriteUrlInput');

        if (nameInput && urlInput) {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            if (name && url) {
                if (!url.startsWith('http://') && !url.startsWith('https://')) { alert('Please enter a valid URL (http:// or https://).'); urlInput.focus(); return; }
                if (this.userFavorites.some(link => link.url === url)) { alert('This URL is already in your favorites.'); return; }
                this.userFavorites.push({ name, url });
                await this._saveUserFavorites(); // This now also re-renders the main widget favorites
                if (typeof closeModal === 'function') closeModal();
                // Modal content will be rebuilt next time it's opened
            } else { alert('Please enter both a name and a URL.'); }
        }
    },

    _handleHiddenSitesModalClick: async function(event) { // Renamed to be specific
        if (event.target.classList.contains('unhide-topsite-btn-modal')) {
            const urlToUnhide = event.target.dataset.url;
            if (urlToUnhide) {
                this.hiddenSites = this.hiddenSites.filter(url => url !== urlToUnhide);
                await this._saveHiddenSites();
                this._loadTopSites(); // Re-render main top sites list
                if (event.target.closest('.modal-body')) this._populateHiddenSitesManageModal(event.target.closest('.modal-body')); // Refresh modal
            }
        }
    },
        
    _loadHiddenSites: async function() { /* ... (no changes from V2.8) ... */ 
        return new Promise(r=>{chrome.storage.sync.get({hiddenTopSites:[]},(d)=>{this.hiddenSites=chrome.runtime.lastError?[]:(Array.isArray(d.hiddenTopSites)?d.hiddenTopSites:[]);r()})});
    },
    _saveHiddenSites: function() { /* ... (no changes from V2.8) ... */ 
        chrome.storage.sync.set({hiddenTopSites: this.hiddenSites},()=>{if(chrome.runtime.lastError)console.error("TSW: Save hidden error:",chrome.runtime.lastError.message)});
    },
    _hideSite: function(siteUrl) { /* ... (no changes from V2.8) ... */ 
        if(!this.hiddenSites.includes(siteUrl)){this.hiddenSites.push(siteUrl);this._saveHiddenSites();this._loadTopSites();}
    },

    _loadUserFavorites: async function() { 
        return new Promise(resolve => {
            chrome.storage.sync.get({userFavoriteLinks: []}, (data) => {
                if (chrome.runtime.lastError) { this.userFavorites = []; console.error("TSW: Load favorites error:", chrome.runtime.lastError.message); }
                else { this.userFavorites = Array.isArray(data.userFavoriteLinks) ? data.userFavoriteLinks : []; }
                this._renderUserFavorites(); 
                resolve();
            });
        });
    },
    _saveUserFavorites: async function() { 
        return new Promise(resolve => {
            chrome.storage.sync.set({userFavoriteLinks: this.userFavorites}, () => {
                if (chrome.runtime.lastError) console.error("TSW: Save favorites error:", chrome.runtime.lastError.message);
                this._renderUserFavorites(); 
                resolve();
            });
        });
    },
    _removeUserFavorite: async function(urlToRemove) {
        this.userFavorites = this.userFavorites.filter(link => link.url !== urlToRemove);
        await this._saveUserFavorites(); // This will re-render
    },
    _renderUserFavorites: function() { 
        if(!this.favoriteLinksArea)return;this.favoriteLinksArea.innerHTML='';
        if(this.userFavorites.length > 0){
            const t = document.createElement('h4');t.className='widget-subtitle';t.textContent='Your Favorites';this.favoriteLinksArea.appendChild(t);
            const ul = document.createElement('ul');ul.className='favorites-list-area';
            this.userFavorites.forEach(link => {
                if(!link.url||!link.name)return;
                const li = document.createElement('li');li.className='favorite-item';
                const anchor = document.createElement('a');anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.title=`${link.name}\n${link.url}`;
                let fU='images/link-placeholder.png';try{const hN=new URL(link.url).hostname;fU=`https://www.google.com/s2/favicons?domain=${hN}&sz=16`}catch(e){}
                const fI=document.createElement('img');fI.src=fU;fI.alt='';fI.className='favorite-favicon';fI.onerror=function(){this.onerror=null;this.src='images/link-placeholder.png';};
                const tS=document.createElement('span');tS.className='favorite-title';tS.textContent=link.name;
                
                const removeBtn = document.createElement('button'); // New remove button
                removeBtn.className = 'favorite-remove-btn';
                removeBtn.innerHTML = '&times;'; // Simple 'x' icon
                removeBtn.title = 'Remove favorite';
                removeBtn.dataset.url = link.url;

                anchor.appendChild(fI);anchor.appendChild(tS);
                li.appendChild(anchor);
                li.appendChild(removeBtn); // Add remove button to the li
                ul.appendChild(li);
            });
            this.favoriteLinksArea.appendChild(ul);
        }
    },

    _loadTopSites: function() { /* ... (no changes from V2.8) ... */ 
        if(!this.topSitesListArea)return;if(chrome.topSites?.get){if(this.userFavorites.length===0)this.topSitesListArea.innerHTML='<li>Loading...</li>';else this.topSitesListArea.innerHTML='';chrome.topSites.get((s)=>{if(chrome.runtime.lastError){this.topSitesListArea.innerHTML='<li>Could not load.</li>';return}this._renderTopSites(s);});}else{this.topSitesListArea.innerHTML='<li>Not available.</li>';}
    },
    _renderTopSites: function(sitesArray) { /* ... (no changes from V2.8, hide button logic is here) ... */ 
        if(!this.topSitesListArea)return;this.topSitesListArea.innerHTML='';const fS=sitesArray.filter(s=>!this.hiddenSites.includes(s.url));if(!fS||fS.length===0){if(this.userFavorites.length===0)this.topSitesListArea.innerHTML='<li class="topsites-empty-message">No top sites.</li>';return;}const tS_T=document.createElement('h4');tS_T.className='widget-subtitle';if(this.userFavorites.length>0){tS_T.style.marginTop='15px';tS_T.style.paddingTop='10px';tS_T.style.borderTop='1px solid var(--widget-border-light)';}tS_T.textContent='Frequently Visited';this.topSitesListArea.appendChild(tS_T);const sTD=fS.slice(0,10);sTD.forEach(s=>{if(!s.url||!s.title)return;const li=document.createElement('li');li.className='topsite-item';const l=document.createElement('a');l.href=s.url;l.target='_blank';l.rel='noopener noreferrer';l.title=`${s.title}\n${s.url}`;let fU='images/link-placeholder.png';try{const hN=new URL(s.url).hostname;fU=`https://www.google.com/s2/favicons?domain=${hN}&sz=16`}catch(e){}const fI=document.createElement('img');fI.src=fU;fI.alt='';fI.className='topsite-favicon';fI.onerror=function(){this.onerror=null;this.src='images/link-placeholder.png';};const tSp=document.createElement('span');tSp.className='topsite-title';tSp.textContent=s.title;const hB=document.createElement('span');hB.className='topsite-hide-btn';hB.innerHTML='👁️';hB.title='Hide';hB.dataset.url=s.url;const cW=document.createElement('div');cW.className='topsite-content-wrapper';l.appendChild(fI);l.appendChild(tSp);cW.appendChild(l);cW.appendChild(hB);li.appendChild(cW);this.topSitesListArea.appendChild(li);});
    }
};
// Acts of Life - script.js
// Telescoping Data Model: App -> Modes -> Facets -> Goals -> Items

const STORAGE_KEY = 'acts_of_life_data_v2'; // New key for new model

// --- Data Model ---
let appData = {
    modes: [
        { id: 'mode_circle', title: 'Circle', type: 'circle' },
        { id: 'mode_line', title: 'Line', type: 'line' },
        { id: 'mode_web', title: 'Web', type: 'web' }
    ],
    facets: [], // { id, title, color, modeId }
    goals: [],  // { id, title, icon, deadline, facetId }
    items: [],  // { id, title, type: 'task'|'ritual', recurrence, scheduled_date, deadline, facetId, goalId, status: 'active'|'completed', history: {} }
    // history: { 'YYYY-MM-DD': { itemId: 'completed', ... } }  <-- For completed rituals tracking
    history: {}
};

// --- persistence ---
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            appData = JSON.parse(saved);
            // Ensure history exists if migrating from a version without it (safety)
            if (!appData.history) appData.history = {};
        } catch (e) {
            console.error('Failed to parse data', e);
        }
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// --- Navigation State ---
let currentView = {
    level: 0, // 0=Daily, 1=Facet, 2=Goal
    contextId: null // facetId or goalId
};

// --- Initialization ---
function init() {
    loadData();
    if (appData.facets.length === 0) {
        renderOnboarding();
    } else {
        renderDailyView();
    }
}

// --- Core Logic Helpers ---

// Check if a ritual is active for a given date
function isRitualDue(item, dateObj) {
    if (item.type !== 'ritual') return false;
    if (item.status === 'completed') return false; // "Completed" for a ritual means archived/stopped? Or just completed today? 
    // For rituals, 'status' usually means 'active habit'. Completion is tracked in history.

    if (item.status === 'archived') return false;

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    // Simple recurrence parsing
    if (item.recurrence === 'daily') return true;
    if (item.recurrence === 'weekdays' && !['saturday', 'sunday'].includes(dayName)) return true;
    if (item.recurrence === 'weekends' && ['saturday', 'sunday'].includes(dayName)) return true;
    if (item.recurrence === dayName) return true; // e.g. "monday"

    return false;
}

// Check if an item is completed for a specific date
function isItemCompleted(itemId, dateStr) {
    if (!appData.history[dateStr]) return false;
    return appData.history[dateStr][itemId] === true;
}

// Toggle completion
function toggleItemCompletion(itemId, dateStr) {
    if (!appData.history[dateStr]) appData.history[dateStr] = {};

    const current = appData.history[dateStr][itemId];
    if (current) {
        delete appData.history[dateStr][itemId];
    } else {
        appData.history[dateStr][itemId] = true;
    }
    saveData();
    render(); // Re-render current view
}

// Get items for the "Daily View" (Today)
function getDailyItems() {
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const todayDate = new Date();

    return appData.items.filter(item => {
        if (item.status === 'archived') return false;

        if (item.type === 'ritual') {
            return isRitualDue(item, todayDate);
        }
        if (item.type === 'task') {
            return item.scheduled_date === todayStr;
        }
        return false;
    });
}

// --- Rendering Switch ---
function render() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = '';

    if (currentView.level === 0) {
        renderDailyView(appDiv);
    } else if (currentView.level === 1) {
        renderFacetView(appDiv, currentView.contextId);
    } else if (currentView.level === 2) {
        renderGoalView(appDiv, currentView.contextId);
    }
}

// --- View: Level 0 (Daily) ---
function renderDailyView(container = document.getElementById('app')) {
    currentView = { level: 0, contextId: null };
    const todayStr = new Date().toLocaleDateString('en-CA');

    // Header
    const header = document.createElement('header');
    header.innerHTML = `<h1>Today's Acts</h1>`;
    container.appendChild(header);

    // Mode Navigation (Top chips)
    const navDiv = document.createElement('div');
    navDiv.className = 'mode-nav';
    appData.modes.forEach(mode => {
        const btn = document.createElement('button');
        btn.className = `mode-chip ${mode.type}`;
        btn.textContent = mode.title;
        btn.onclick = () => showFacetsList(mode.id); // Placeholder for Zoom-in menu or Bottom Sheet?
        // User interaction: "Zoom out to cascade". 
        // Maybe checking Facets under this mode?
        // Let's implement a simple "Filter/Zoom" logic. 
        // For now, these buttons will open a "Facet Picker" for that mode.
        navDiv.appendChild(btn);
    });
    container.appendChild(navDiv);

    // Task List
    const dailyItems = getDailyItems();
    const listDiv = document.createElement('div');
    listDiv.className = 'daily-list';

    if (dailyItems.length === 0) {
        listDiv.innerHTML = '<p class="empty-state">No acts planned for today.</p>';
    } else {
        // Group by Mode -> Facet
        // Helper to get ancestry
        dailyItems.forEach(item => {
            const itemEl = renderItemCard(item, todayStr);
            listDiv.appendChild(itemEl);
        });
    }
    container.appendChild(listDiv);

    // Quick Add FAB
    renderFAB(container);
}

function renderItemCard(item, dateStr) {
    const div = document.createElement('div');
    div.className = 'item-card';
    const completed = isItemCompleted(item.id, dateStr);
    if (completed) div.classList.add('completed');

    // Metadata lookups
    const goal = appData.goals.find(g => g.id === item.goalId) || { title: 'Unknown Goal' };
    const facet = appData.facets.find(f => f.id === goal.facetId) || { title: '', color: '#ccc' };

    // Visuals
    div.style.borderLeft = `4px solid ${facet.color || '#ccc'}`;

    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox';
    checkbox.textContent = completed ? '✓' : '';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        toggleItemCompletion(item.id, dateStr);
    };

    const content = document.createElement('div');
    content.className = 'content';
    content.innerHTML = `
    <div class="item-title">${item.title}</div>
    <div class="item-meta">${facet.title} • ${goal.title}</div>
  `;
    // Click content to edit/details
    content.onclick = () => openItemEditor(item);

    div.appendChild(checkbox);
    div.appendChild(content);

    return div;
}

function renderFAB(container) {
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = '+';
    fab.onclick = () => openItemEditor(); // New item
    container.appendChild(fab);
}

// --- Navigation Helpers ---
function showFacetsList(modeId) {
    // Simple "Zoom In" to Facets of this mode
    // For simplicity, let's just pick the first facet or show a selector if multiple? 
    // User asked "Click Mode -> List Facets". 
    // Since we don't have a "Mode View" in requirements, maybe we show a bottom sheet of facets?
    // OR we just assume the user wants to see the layout of this mode. 

    // Let's perform a "Zoom" animation to a "Mode Overview" which lists active Facets.
    // Ideally, valid Level 1 is "Facet View". 
    // Let's prompt user to pick a facet to drill into.
    const facets = appData.facets.filter(f => f.modeId === modeId);
    if (facets.length === 0) {
        alert('No facets in this mode yet.');
        return;
    }
    // For MVP, just go to the first one or open a chooser? 
    // Let's open a chooser modal.
    openSelectionModal('Select Area', facets, (selectedFacet) => {
        currentView = { level: 1, contextId: selectedFacet.id };
        render();
    });
}

function renderFacetView(container, facetId) {
    // Level 1
    const facet = appData.facets.find(f => f.id === facetId);
    if (!facet) return renderDailyView(); // Safety

    container.innerHTML = `
    <header class="view-header" style="background-color: ${facet.color}20;">
      <button onclick="renderDailyView()">← Back</button>
      <h1>${facet.title}</h1>
    </header>
  `;

    // Goals List
    const goals = appData.goals.filter(g => g.facetId === facetId);
    const list = document.createElement('div');
    list.className = 'list-group';

    goals.forEach(goal => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<span class="icon">${goal.icon || '🎯'}</span> <span>${goal.title}</span>`;
        div.onclick = () => {
            currentView = { level: 2, contextId: goal.id };
            render();
        };
        list.appendChild(div);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-text';
    addBtn.textContent = '+ Add Goal';
    addBtn.onclick = () => openGoalEditor({ facetId: facet.id });

    container.appendChild(list);

    container.appendChild(addBtn);
}


function renderGoalView(container, goalId) {
    // Level 2
    const goal = appData.goals.find(g => g.id === goalId);
    if (!goal) return renderDailyView();

    const facet = appData.facets.find(f => f.id === goal.facetId);

    container.innerHTML = `
        < header class="view-header" >
      <button onclick="currentView={level:1, contextId:'${goal.facetId}'}; render()">← ${facet.title}</button>
      <h1>${goal.title}</h1>
      <div class="meta">Deadline: ${goal.deadline || 'None'}</div>
    </header >
        `;

    // Container for lists
    const listContainer = document.createElement('div');
    listContainer.className = 'list-group';

    const items = appData.items.filter(i => i.goalId === goalId && i.status !== 'archived');

    // Segment items
    const rituals = items.filter(i => i.type === 'ritual');
    const tasks = items.filter(i => i.type === 'task');
    const unscheduled = tasks.filter(t => !t.scheduled_date);
    const scheduled = tasks.filter(t => t.scheduled_date).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

    // Helper to render section
    const renderSection = (title, itemList) => {
        if (itemList.length === 0) return '';
        const itemsHtml = itemList.map(item => {
            const meta = item.type === 'ritual'
                ? `↻ ${item.recurrence} `
                : (item.scheduled_date ? `📅 ${item.scheduled_date} ` : 'Unscheduled');

            return `
        < div class="list-item" onclick = "openItemEditor(appData.items.find(i=>i.id==='${item.id}'))" >
           <div style="flex:1">
             <div>${item.title}</div>
             <div class="item-meta">${meta}</div>
           </div>
           <div style="font-size:0.8rem; color:#aaa">✎</div>
        </div > `;
        }).join('');

        return `< h3 style = "padding:16px 16px 8px; font-size:0.9rem; color:#666; text-transform:uppercase; letter-spacing:1px" > ${title}</h3 > ${itemsHtml} `;
    };

    listContainer.innerHTML =
        renderSection('Rituals', rituals) +
        renderSection('Scheduled Tasks', scheduled) +
        renderSection('Unscheduled / Someday', unscheduled);

    if (items.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No items yet. Add one +</p>';
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'fab';
    addBtn.textContent = '+';
    addBtn.onclick = () => openItemEditor(null, { goalId: goal.id }); // Pre-fill goal

    container.appendChild(listContainer);
    container.appendChild(addBtn);
}


// --- Onboarding (Simplified) ---
// --- Onboarding (Simplified) ---
// --- Onboarding (Wizard) ---
function renderOnboarding() {
    const appDiv = document.getElementById('app');
    let step = 1;

    const state = {
        facets: [
            { id: 'f_health', title: 'Health', modeId: 'mode_circle', active: true },
            { id: 'f_family', title: 'Family', modeId: 'mode_circle', active: true },
            { id: 'f_work', title: 'Work', modeId: 'mode_line', active: true },
            { id: 'f_learn', title: 'Learning', modeId: 'mode_line', active: false },
            { id: 'f_social', title: 'Friends', modeId: 'mode_web', active: false }
        ],
        selectedFacetId: null,
        goalTitle: '',
        taskTitle: '',
        taskType: 'task'
    };

    const renderStep = () => {
        appDiv.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'onboarding-wizard';

        // Header
        container.innerHTML = `<div style="margin-bottom:24px; color:#888; text-transform:uppercase; font-size:0.8rem; letter-spacing:1px; text-align:center">Setup Step ${step}/4</div>`;

        if (step === 1) {
            // Philosophy
            container.innerHTML += `
        <h1 style="font-size:2rem; margin-bottom:16px; text-align:center">The Philosophy</h1>
        <p style="margin-bottom:24px; line-height:1.6; color:#555">
          Life isn't just a list. It's a structure.<br><br>
          <b>Circles</b> are your anchors (Health, Home).<br>
          <b>Lines</b> remain your path forward (Work, Learning).<br>
          <b>Webs</b> connect you to others (Community, Family).<br><br>
          Let's define yours.
        </p>
        <button class="btn-primary" onclick="window.nextStep()">Let's Start</button>
      `;
        } else if (step === 2) {
            // Facets
            container.innerHTML += `
        <h2 style="text-align:center; margin-bottom:8px">Your Areas of Focus</h2>
        <p style="text-align:center; color:#666; margin-bottom:24px">Tap to select the areas important to you right now.</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px">
          ${state.facets.map(f => `
            <div onclick="window.toggleFacet('${f.id}')" 
                 style="padding:16px; border:2px solid ${f.active ? 'var(--color-text-main)' : '#eee'}; 
                        background:${f.active ? '#f0f4f8' : 'white'}; border-radius:12px; font-weight:600; text-align:center; cursor:pointer; transition:all 0.2s">
              ${f.title}
              <div style="font-size:0.75rem; color:#888; font-weight:normal; margin-top:4px">${f.modeId.replace('mode_', '')}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" onclick="window.nextStep()">Continue</button>
      `;
        } else if (step === 3) {
            // Goal
            // Filter active facets
            const activeFacets = state.facets.filter(f => f.active);
            state.selectedFacetId = state.selectedFacetId || activeFacets[0].id;

            const facetOpts = activeFacets.map(f => `<option value="${f.id}" ${state.selectedFacetId === f.id ? 'selected' : ''}>${f.title}</option>`).join('');

            container.innerHTML += `
        <h2 style="text-align:center; margin-bottom:8px">Set a Primary Goal</h2>
        <p style="text-align:center; color:#666; margin-bottom:24px">Pick one area and define a clear objective.</p>
        
        <label>Area
          <select id="wiz-facet" onchange="window.updateState('selectedFacetId', this.value)">${facetOpts}</select>
        </label>
        <label style="margin-top:16px">Goal Title
          <input type="text" placeholder="e.g. Run a Marathon, Launch MVP" oninput="window.updateState('goalTitle', this.value)" value="${state.goalTitle}">
        </label>
        
        <div style="margin-top:24px">
          <button class="btn-primary" onclick="window.nextStep()" ${!state.goalTitle ? 'disabled style="opacity:0.5"' : ''}>Next</button>
        </div>
      `;
        } else if (step === 4) {
            // First Item
            container.innerHTML += `
        <h2 style="text-align:center; margin-bottom:8px">First Step</h2>
        <p style="text-align:center; color:#666; margin-bottom:24px">What is the very first action for <b>${state.goalTitle}</b>?</p>
        
        <label>Action Title
          <input type="text" placeholder="e.g. Buy running shoes" oninput="window.updateState('taskTitle', this.value)">
        </label>
        
        <div style="display:flex; gap:12px; margin-top:16px; margin-bottom:24px">
           <div onclick="window.updateState('taskType', 'task'); window.renderStep()" 
                style="flex:1; padding:12px; border:2px solid ${state.taskType === 'task' ? 'black' : '#eee'}; border-radius:12px; text-align:center; cursor:pointer">
             One-off Task
           </div>
           <div onclick="window.updateState('taskType', 'ritual'); window.renderStep()" 
                style="flex:1; padding:12px; border:2px solid ${state.taskType === 'ritual' ? 'black' : '#eee'}; border-radius:12px; text-align:center; cursor:pointer">
             Recurring
           </div>
        </div>

        <button class="btn-primary" onclick="window.finishSetup()">Finish Setup</button>
      `;
        }
        appDiv.appendChild(container);
        // Add wizard styles specific if needed, or use inline for speed
        container.style.padding = '24px';
        container.style.maxWidth = '480px';
        container.style.margin = '0 auto';
    };

    // Expose helpers globally for the string onclicks
    window.nextStep = () => { step++; renderStep(); };
    window.toggleFacet = (id) => {
        const f = state.facets.find(x => x.id === id);
        if (f) f.active = !f.active;
        renderStep();
    };
    window.updateState = (key, val) => { state[key] = val; renderStep(); }; // Re-render to update dependent UI
    window.renderStep = renderStep;

    window.finishSetup = () => {
        // 1. Facets
        state.facets.filter(f => f.active).forEach(f => {
            appData.facets.push({
                id: 'facet_' + Date.now() + Math.random().toString(36).substr(2, 4),
                title: f.title,
                color: f.modeId === 'mode_circle' ? '#4caf50' : (f.modeId === 'mode_line' ? '#2196f3' : '#9c27b0'),
                modeId: f.modeId
            });
        });

        // 2. Goal
        const targetFacet = appData.facets.find(f => f.title === state.facets.find(x => x.id === state.selectedFacetId).title); // Match by title since we generated new IDs
        const goalId = 'goal_' + Date.now();
        if (targetFacet) {
            appData.goals.push({
                id: goalId,
                title: state.goalTitle,
                icon: '🎯',
                facetId: targetFacet.id,
                deadline: ''
            });

            // 3. Item
            if (state.taskTitle) {
                appData.items.push({
                    id: 'item_' + Date.now(),
                    title: state.taskTitle,
                    type: state.taskType,
                    goalId: goalId,
                    status: 'active',
                    recurrence: state.taskType === 'ritual' ? 'daily' : 'none',
                    scheduled_date: state.taskType === 'task' ? new Date().toLocaleDateString('en-CA') : null,
                    deadline: ''
                });
            }
        }

        saveData();
        // Cleanup globals
        delete window.nextStep; delete window.toggleFacet; delete window.updateState; delete window.finishSetup; delete window.renderStep;
        render();
    };

    renderStep();
}

// --- Modal System ---
function renderModal(title, contentHtml, onSave) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">${contentHtml}</div>
      <div class="modal-footer">
        <button class="btn-save">Save</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    modal.querySelector('.btn-save').onclick = () => {
        if (onSave(modal)) {
            modal.remove();
            saveData();
            render();
        }
    };
}

// --- Editors ---
function openItemEditor(item = null, prefill = {}) {
    const isEditing = !!item && !!item.id;
    const titleVal = isEditing ? item.title : '';
    const typeVal = isEditing ? item.type : (prefill.type || 'task');
    const dateVal = isEditing ? (item.scheduled_date || '') : (prefill.scheduled_date || new Date().toLocaleDateString('en-CA'));
    const recurVal = isEditing ? (item.recurrence || 'none') : 'none';
    const goalIdVal = isEditing ? item.goalId : (prefill.goalId || '');

    // Goal Selector Options
    const goalOpts = appData.goals.map(g => `<option value="${g.id}" ${g.id === goalIdVal ? 'selected' : ''}>${g.title}</option>`).join('');

    // Helper for chips
    const renderChips = (name, opts, activeVal) => `
    <div style="display:flex; gap:8px; margin-top:4px">
      ${opts.map(o => `
        <label style="flex:1; cursor:pointer">
          <input type="radio" name="${name}" value="${o.val}" ${activeVal === o.val ? 'checked' : ''} style="display:none" onchange="this.closest('.modal-body').dataset.${name}=this.value; window.updateEditorUI()">
          <div class="chip-select" style="padding:10px; border:1px solid #ddd; border-radius:8px; text-align:center; font-size:0.9rem; transition:all 0.2s; background:${activeVal === o.val ? '#2c3e50' : '#fff'}; color:${activeVal === o.val ? '#fff' : '#333'}">
            ${o.label}
          </div>
        </label>
      `).join('')}
    </div>
  `;

    // We rely on re-rendering the modal content or simple DOM toggling.
    // Let's use simple string replacement for now, but really we need a stateful render function for the modal body if we want it properly reactive.
    // For simplicity: We will just write the HTML. The 'window.updateEditorUI' is a hack we need to implement or just use inline logic.
    // Let's stick to inline JS in the HTML string for valid visibility toggling.

    const html = `
    <label>Title <input id="inp-title" type="text" value="${titleVal}" autofocus></label>
    <label>Goal <select id="inp-goal">${goalOpts}</select></label>
    
    <label>Type</label>
    <div style="display:flex; gap:8px;">
      <label style="flex:1; cursor:pointer">
        <input type="radio" name="inp-type" value="task" ${typeVal === 'task' ? 'checked' : ''} onchange="toggleGroups(this.value)">
        <div class="chip-select-ui" style="padding:10px; border:1px solid #ddd; border-radius:8px; text-align:center; background:${typeVal === 'task' ? '#2c3e50' : '#fff'}; color:${typeVal === 'task' ? '#fff' : '#333'}">One-off</div>
      </label>
      <label style="flex:1; cursor:pointer">
        <input type="radio" name="inp-type" value="ritual" ${typeVal === 'ritual' ? 'checked' : ''} onchange="toggleGroups(this.value)">
        <div class="chip-select-ui" style="padding:10px; border:1px solid #ddd; border-radius:8px; text-align:center; background:${typeVal === 'ritual' ? '#2c3e50' : '#fff'}; color:${typeVal === 'ritual' ? '#fff' : '#333'}">Ritual</div>
      </label>
    </div>
    
    <div id="recur-group" style="display:${typeVal === 'ritual' ? 'block' : 'none'}; margin-top:16px;">
      <label>Recurrence</label>
      <select id="inp-recur">
        <option value="daily" ${recurVal === 'daily' ? 'selected' : ''}>Daily</option>
        <option value="weekdays" ${recurVal === 'weekdays' ? 'selected' : ''}>Weekdays (M-F)</option>
        <option value="weekly" ${recurVal === 'weekly' ? 'selected' : ''}>Weekly</option>
      </select>
    </div>
    
    <div id="date-group" style="display:${typeVal === 'task' ? 'block' : 'none'}; margin-top:16px;">
      <label>Schedule Date <input id="inp-date" type="date" value="${dateVal}"></label>
      <small style="color:#888; margin-top:4px; display:block">Leave empty to save for Someday</small>
    </div>
    
    <script>
      function toggleGroups(val) {
        document.getElementById('recur-group').style.display = val === 'ritual' ? 'block' : 'none';
        document.getElementById('date-group').style.display = val === 'task' ? 'block' : 'none';
        
        // Update styling manually since we can't use React
        document.querySelectorAll('.chip-select-ui').forEach(el => {
           const input = el.previousElementSibling;
           const checked = input.value === val;
           el.style.background = checked ? '#2c3e50' : '#fff';
           el.style.color = checked ? '#fff' : '#333';
        });
      }
    </script>
  `;

    renderModal(isEditing ? 'Edit Item' : 'New Item', html, (modal) => {
        const title = modal.querySelector('#inp-title').value;
        if (!title) return false;

        const goalId = modal.querySelector('#inp-goal').value;
        // Get radio value
        const type = modal.querySelector('input[name="inp-type"]:checked').value;

        const newItem = {
            id: isEditing ? item.id : 'item_' + Date.now(),
            title,
            type,
            goalId,
            status: isEditing ? item.status : 'active',
            recurrence: type === 'ritual' ? modal.querySelector('#inp-recur').value : 'none',
            scheduled_date: type === 'task' ? modal.querySelector('#inp-date').value : null,
            deadline: ''
        };

        if (isEditing) {
            Object.assign(item, newItem);
        } else {
            appData.items.push(newItem);
        }
        return true;
    });
}

function openGoalEditor(defaults = {}) {
    const facetOpts = appData.facets.map(f => `<option value="${f.id}" ${f.id === defaults.facetId ? 'selected' : ''}>${f.title}</option>`).join('');

    const html = `
    <label>Goal Title <input id="inp-g-title" type="text" autofocus></label>
    <label>Area (Facet) <select id="inp-g-facet">${facetOpts}</select></label>
    <label>Deadline <input id="inp-g-deadline" type="date"></label>
  `;

    renderModal('New Goal', html, (modal) => {
        const title = modal.querySelector('#inp-g-title').value;
        if (!title) return false;

        appData.goals.push({
            id: 'goal_' + Date.now(),
            title,
            icon: '🎯',
            facetId: modal.querySelector('#inp-g-facet').value,
            deadline: modal.querySelector('#inp-g-deadline').value
        });
        return true;
    });
}

function openSelectionModal(title, options, callback) {
    const listHtml = options.map((o, i) => `
    <div class="select-opt" data-idx="${i}" style="padding:12px; border-bottom:1px solid #eee; cursor:pointer">
      ${o.title}
    </div>
  `).join('');

    renderModal(title, `<div id="sel-list">${listHtml}</div>`, () => false); // No save button action

    // Hacky attach
    document.querySelectorAll('.select-opt').forEach(el => {
        el.onclick = () => {
            const idx = parseInt(el.dataset.idx);
            callback(options[idx]);
            document.querySelector('.modal-overlay').remove();
        };
    });
    // Hide footer for selection
    document.querySelector('.modal-footer').style.display = 'none';
}


// Init
init();

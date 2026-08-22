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
    level: 0, // 0=Daily, 'mode'=Mode overview, 1=Facet, 2=Goal
    contextId: null // modeId, facetId or goalId
};

// Navigation helpers (globals, also used by inline onclick handlers)
function goHome() {
    currentView = { level: 0, contextId: null };
    render();
}

function goToMode(modeId) {
    currentView = { level: 'mode', contextId: modeId };
    render();
}

function goToFacet(facetId) {
    currentView = { level: 1, contextId: facetId };
    render();
}

function openItemEditorById(itemId) {
    const item = appData.items.find(i => i.id === itemId);
    if (item) openItemEditor(item);
}

function openGoalEditorById(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    if (goal) openGoalEditor({}, goal);
}

function goToTimeline() {
    currentView = { level: 'timeline', contextId: null };
    render();
}

function goToReview() {
    currentView = { level: 'review', contextId: 'week' };
    render();
}

function setReviewRange(range) {
    currentView = { level: 'review', contextId: range };
    render();
}

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
    if (item.recurrence === 'weekly') return dayName === 'monday'; // legacy option from old editor: treat as every Monday

    return false;
}

// Check if an item is completed for a specific date
function isItemCompleted(itemId, dateStr) {
    if (!appData.history[dateStr]) return false;
    return appData.history[dateStr][itemId] === true;
}

// Items under a completed goal are paused: hidden from daily/overdue/someday
function isGoalCompleted(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    return !!goal && goal.status === 'completed';
}

// Line-mode areas (Work, Learning) hold ongoing "Streams"; elsewhere "Goal" reads better
function goalNoun(facetId) {
    const facet = appData.facets.find(f => f.id === facetId);
    const mode = facet ? appData.modes.find(m => m.id === facet.modeId) : null;
    return (mode && mode.type === 'line') ? 'Stream' : 'Goal';
}

function toggleMilestone(goalId, msId) {
    const goal = appData.goals.find(g => g.id === goalId);
    const milestones = goal ? (goal.milestones || []) : [];
    const milestone = milestones.find(m => m.id === msId);
    if (!milestone) return;
    milestone.done = !milestone.done;
    saveData();
    render();

    if (!milestone.done) return;

    // Keep momentum: offer the next phase's first action, or close out the stream
    const next = milestones.find(m => !m.done);
    if (next) {
        if (confirm(`"${milestone.title}" complete! Add a first action for the next phase, "${next.title}"?`)) {
            openItemEditor(null, { goalId: goal.id, milestoneId: next.id });
        }
    } else if (goal.status !== 'completed') {
        if (confirm(`All phases of "${goal.title}" are done! Mark it complete? 🏁`)) {
            goal.status = 'completed';
            saveData();
            render();
        }
    }
}

// Count consecutive due-days (ending today) on which this ritual was completed.
// An incomplete today doesn't break the streak — it just doesn't count yet.
function computeStreak(item) {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
        if (isRitualDue(item, d)) {
            if (isItemCompleted(item.id, d.toLocaleDateString('en-CA'))) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        d.setDate(d.getDate() - 1);
    }
    return streak;
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
        if (isGoalCompleted(item.goalId)) return false;

        if (item.type === 'ritual') {
            return isRitualDue(item, todayDate);
        }
        if (item.type === 'task') {
            return item.scheduled_date === todayStr;
        }
        return false;
    });
}

// Tasks scheduled before today and never checked off on their scheduled day
function getOverdueTasks() {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return appData.items.filter(item =>
        item.type === 'task' &&
        item.status !== 'archived' &&
        !isGoalCompleted(item.goalId) &&
        item.scheduled_date &&
        item.scheduled_date < todayStr &&
        !isItemCompleted(item.id, item.scheduled_date)
    ).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}

// Tasks scheduled after today, soonest first
function getUpcomingTasks() {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return appData.items.filter(item =>
        item.type === 'task' &&
        item.status !== 'archived' &&
        !isGoalCompleted(item.goalId) &&
        item.scheduled_date &&
        item.scheduled_date > todayStr &&
        !isItemCompleted(item.id, item.scheduled_date)
    ).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}

// Active rituals that simply aren't due today (e.g. weekday rituals on a weekend)
function getNotDueRituals() {
    const today = new Date();
    return appData.items.filter(item =>
        item.type === 'ritual' &&
        item.status !== 'archived' &&
        !isGoalCompleted(item.goalId) &&
        !isRitualDue(item, today)
    );
}

// Unscheduled one-off tasks (the "Someday" inbox)
function getSomedayTasks() {
    return appData.items.filter(item =>
        item.type === 'task' &&
        item.status !== 'archived' &&
        !isGoalCompleted(item.goalId) &&
        !item.scheduled_date
    );
}

// --- Rendering Switch ---
// Zoom ladder, widest to closest: timeline/review (0) → mode (1) → facet (2) → goal (3) → today's acts (4).
// Moving to a smaller depth = zooming out (camera pulls back); larger = zooming in.
const VIEW_DEPTHS = { timeline: 0, review: 0, mode: 1, 1: 2, 2: 3, 0: 4 };
let lastDepth = 4;

function render() {
    const appDiv = document.getElementById('app');
    const depth = VIEW_DEPTHS[currentView.level];
    const dir = depth < lastDepth ? 'zoom-out' : (depth > lastDepth ? 'zoom-in' : null);
    lastDepth = depth;
    appDiv.innerHTML = '';
    appDiv.classList.remove('zoom-in', 'zoom-out');
    if (dir) {
        void appDiv.offsetWidth; // restart the CSS animation
        appDiv.classList.add(dir);
    }

    if (currentView.level === 0) {
        renderDailyView(appDiv);
    } else if (currentView.level === 'review') {
        renderReviewView(appDiv);
    } else if (currentView.level === 'timeline') {
        renderTimelineView(appDiv);
    } else if (currentView.level === 'mode') {
        renderModeView(appDiv, currentView.contextId);
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
    header.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center">
      <h1>Today's Acts</h1>
      <div style="display:flex; gap:4px">
        <button class="icon-btn" onclick="goToTimeline()" title="Timeline">🗓</button>
        <button class="icon-btn" onclick="goToReview()" title="Weekly review">📊</button>
        <button class="icon-btn" onclick="openDataModal()" title="Backup &amp; restore">⚙</button>
      </div>
    </div>
  `;
    container.appendChild(header);

    // Mode Navigation (Top chips)
    const navDiv = document.createElement('div');
    navDiv.className = 'mode-nav';
    appData.modes.forEach(mode => {
        const btn = document.createElement('button');
        btn.className = `mode-chip ${mode.type}`;
        btn.textContent = mode.title;
        btn.onclick = () => goToMode(mode.id);
        navDiv.appendChild(btn);
    });
    container.appendChild(navDiv);

    // Task List: every act is visible somewhere on this page
    const dailyItems = getDailyItems();
    const overdue = getOverdueTasks();
    const upcoming = getUpcomingTasks();
    const notDueRituals = getNotDueRituals();
    const someday = getSomedayTasks();
    const listDiv = document.createElement('div');
    listDiv.className = 'daily-list';

    const addHeading = (text, extraClass = '') => {
        const h = document.createElement('h3');
        h.className = `section-heading ${extraClass}`.trim();
        h.textContent = text;
        listDiv.appendChild(h);
    };

    const hasOtherSections = overdue.length + upcoming.length + notDueRituals.length + someday.length > 0;

    if (overdue.length > 0) {
        addHeading(`Overdue (${overdue.length})`, 'overdue');
        // Completion for an overdue task is recorded against its scheduled day
        overdue.forEach(item => listDiv.appendChild(renderItemCard(item, item.scheduled_date)));
    }

    if (hasOtherSections) addHeading('Today');
    if (dailyItems.length === 0) {
        listDiv.insertAdjacentHTML('beforeend', '<p class="empty-state">No acts due today.</p>');
    } else {
        dailyItems.forEach(item => {
            listDiv.appendChild(renderItemCard(item, todayStr));
        });
    }

    if (upcoming.length > 0) {
        addHeading('Upcoming');
        // Checking one off early records against its scheduled day
        upcoming.forEach(item => listDiv.appendChild(renderItemCard(item, item.scheduled_date)));
    }

    if (notDueRituals.length > 0) {
        addHeading('Rituals · not due today');
        notDueRituals.forEach(item => listDiv.appendChild(renderItemCard(item, todayStr)));
    }

    if (someday.length > 0) {
        const det = document.createElement('details');
        det.className = 'collapsed-group';
        det.open = true;
        det.innerHTML = `<summary>Someday (${someday.length})</summary>`;
        someday.forEach(item => det.appendChild(renderItemCard(item, todayStr)));
        listDiv.appendChild(det);
    }

    // Archived items without a goal have no goal view to live in — surface them
    // here so they stay reachable (and unarchivable)
    const looseArchived = appData.items.filter(i =>
        i.status === 'archived' && !appData.goals.some(g => g.id === i.goalId));
    if (looseArchived.length > 0) {
        const det = document.createElement('details');
        det.className = 'collapsed-group';
        det.innerHTML = `<summary>Archived (${looseArchived.length})</summary>`;
        looseArchived.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-card';
            row.style.opacity = '0.6';
            row.innerHTML = `<div class="content"><div class="item-title">${item.title}</div></div>`;
            row.onclick = () => openItemEditor(item);
            det.appendChild(row);
        });
        listDiv.appendChild(det);
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

    // Metadata lookups (items may have no goal)
    const goal = appData.goals.find(g => g.id === item.goalId) || null;
    const facet = goal ? (appData.facets.find(f => f.id === goal.facetId) || null) : null;

    // Visuals
    div.style.borderLeft = `4px solid ${(facet && facet.color) || '#ccc'}`;

    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox';
    checkbox.textContent = completed ? '✓' : '';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        toggleItemCompletion(item.id, dateStr);
    };

    const metaParts = [];
    if (facet) metaParts.push(facet.title);
    if (goal) metaParts.push(goal.title);
    if (item.type === 'ritual') {
        const streak = computeStreak(item);
        if (streak > 0) metaParts.push(`🔥 ${streak}`);
        if (!isRitualDue(item, new Date())) {
            metaParts.push(`↻ ${item.recurrence}`);
            div.classList.add('not-due');
        }
    }
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (item.type === 'task' && item.scheduled_date && item.scheduled_date !== todayStr) {
        metaParts.unshift(`📅 ${item.scheduled_date}`);
    }

    const content = document.createElement('div');
    content.className = 'content';
    content.innerHTML = `
    <div class="item-title">${item.title}</div>
    <div class="item-meta${goal ? ' zoomable' : ''}"${goal ? ' title="Zoom out to ' + goal.title + '"' : ''}>${metaParts.join(' • ')}</div>
  `;
    // Click content to edit; click the meta line to zoom out to the item's stream
    content.onclick = () => openItemEditor(item);
    if (goal) {
        content.querySelector('.item-meta').onclick = (e) => {
            e.stopPropagation();
            currentView = { level: 2, contextId: goal.id };
            render();
        };
    }

    div.appendChild(checkbox);
    div.appendChild(content);

    if (item.type === 'task' && item.scheduled_date && item.scheduled_date < todayStr) {
        const moveBtn = document.createElement('button');
        moveBtn.className = 'btn-move-today';
        moveBtn.textContent = '→ Today';
        moveBtn.title = 'Reschedule to today';
        moveBtn.onclick = (e) => {
            e.stopPropagation();
            item.scheduled_date = todayStr;
            saveData();
            render();
        };
        div.appendChild(moveBtn);
    }

    return div;
}

function renderFAB(container) {
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = '+';
    fab.onclick = () => openItemEditor(); // New item
    container.appendChild(fab);
}

// --- View: Timeline ---
// Zoom: 0 = fit everything to the screen; otherwise pixels per day
const TL_SCALES = [0, 4, 8, 16];
let timelineScale = 0;

function tlZoom(dir) {
    if (dir === 0) {
        timelineScale = 0;
    } else {
        const idx = TL_SCALES.indexOf(timelineScale);
        timelineScale = TL_SCALES[Math.min(Math.max(idx + dir, 0), TL_SCALES.length - 1)];
    }
    render();
}

function renderTimelineView(container) {
    container.innerHTML = `
    <header class="view-header">
      <button onclick="goHome()">← Today</button>
      <h1>Timeline</h1>
      <div class="item-meta">Active goals &amp; streams over time</div>
      <div class="review-toggle">
        <button onclick="tlZoom(-1)" ${timelineScale === 0 ? 'disabled' : ''}>−</button>
        <button onclick="tlZoom(0)" class="${timelineScale === 0 ? 'active' : ''}">Fit</button>
        <button onclick="tlZoom(1)" ${timelineScale === TL_SCALES[TL_SCALES.length - 1] ? 'disabled' : ''}>+</button>
      </div>
    </header>
  `;

    const active = appData.goals.filter(g => g.status !== 'completed');
    const dated = active.filter(g => g.start_date && g.deadline);
    const undated = active.filter(g => !g.start_date || !g.deadline);

    const wrap = document.createElement('div');
    wrap.className = 'list-group';

    if (dated.length === 0) {
        wrap.innerHTML = '<p class="empty-state">Nothing to plot yet.<br>Give a goal a start date and deadline to see it here.</p>';
    } else {
        const DAY = 864e5;
        const today = +new Date(new Date().toLocaleDateString('en-CA'));
        let min = Math.min(...dated.map(g => +new Date(g.start_date)), today);
        let max = Math.max(...dated.map(g => +new Date(g.deadline)), today);
        const pad = Math.max(Math.round((max - min) / 20), 3 * DAY);
        min -= pad; max += pad;
        const pos = t => (t - min) / (max - min) * 100;
        const fmt = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const totalDays = (max - min) / DAY;

        // Month markers when the range is long or zoomed in
        let monthMarks = '';
        if (totalDays > 45 || timelineScale > 0) {
            const d = new Date(min);
            d.setDate(1);
            d.setMonth(d.getMonth() + 1);
            while (+d < max) {
                monthMarks += `<span class="tl-month" style="left:${pos(+d)}%">${d.toLocaleDateString('en-US', { month: 'short' })}</span>`;
                d.setMonth(d.getMonth() + 1);
            }
        }

        const chart = document.createElement('div');
        chart.className = 'timeline';
        if (timelineScale > 0) chart.style.width = `${Math.round(totalDays * timelineScale)}px`;
        chart.innerHTML = `
      <div class="tl-axis"><span>${fmt(min)}</span><span>${fmt(max)}</span></div>
      ${monthMarks}
      <div class="tl-today" style="left:${pos(today)}%"><span>Today</span></div>`;

        // Group bars by area, in facet order
        const byFacet = new Map();
        dated.forEach(g => {
            const key = g.facetId || '_none';
            if (!byFacet.has(key)) byFacet.set(key, []);
            byFacet.get(key).push(g);
        });

        byFacet.forEach((goals, facetId) => {
            const facet = appData.facets.find(f => f.id === facetId);
            const heading = document.createElement('div');
            heading.className = 'tl-facet';
            heading.textContent = facet ? facet.title : 'Other';
            heading.style.color = (facet && facet.color) || 'var(--color-text-muted)';
            chart.appendChild(heading);

            goals.forEach(g => {
                const s = +new Date(g.start_date);
                const e = +new Date(g.deadline);
                const left = pos(Math.min(s, e));
                const width = Math.max(pos(Math.max(s, e)) - left, 1.5);

                const ticks = (g.milestones || []).filter(m => m.target_date).map(m => {
                    const p = (pos(+new Date(m.target_date)) - left) / width * 100;
                    if (p < 0 || p > 100) return '';
                    return `<span class="tl-tick${m.done ? ' done' : ''}" style="left:${p}%" title="${m.title} · ${m.target_date}"></span>`;
                }).join('');

                const row = document.createElement('div');
                row.className = 'tl-row';
                row.innerHTML = `
          <div class="tl-bar" style="left:${left}%; width:${width}%; background:${(facet && facet.color) || '#888'}">
            ${ticks}<span class="tl-label">${g.title}</span>
          </div>`;
                row.onclick = () => { currentView = { level: 2, contextId: g.id }; render(); };
                chart.appendChild(row);
            });
        });

        const scroller = document.createElement('div');
        scroller.className = 'timeline-scroll';
        scroller.appendChild(chart);
        wrap.appendChild(scroller);

        // When zoomed, center the viewport on today
        if (timelineScale > 0) {
            container.appendChild(wrap);
            const todayPx = pos(today) / 100 * chart.offsetWidth;
            scroller.scrollLeft = Math.max(0, todayPx - scroller.clientWidth / 2);
        }
    }

    if (undated.length > 0) {
        const det = document.createElement('details');
        det.className = 'collapsed-group';
        det.innerHTML = `<summary>Needs dates (${undated.length})</summary>`;
        undated.forEach(g => {
            const facet = appData.facets.find(f => f.id === g.facetId);
            const row = document.createElement('div');
            row.className = 'list-item';
            row.innerHTML = `<span class="icon">🎯</span><div style="flex:1"><div>${g.title}</div><div class="item-meta">${facet ? facet.title + ' — ' : ''}add a start date &amp; deadline to plot</div></div>`;
            row.onclick = () => openGoalEditor({}, g);
            det.appendChild(row);
        });
        wrap.appendChild(det);
    }

    container.appendChild(wrap);
}

// --- View: Weekly Review ---
function renderReviewView(container) {
    const range = currentView.contextId === 'month' ? 'month' : 'week';
    const numDays = range === 'month' ? 30 : 7;

    container.innerHTML = `
    <header class="view-header">
      <button onclick="goHome()">← Today</button>
      <h1>${range === 'month' ? 'Monthly' : 'Weekly'} Review</h1>
      <div class="item-meta">Ritual consistency, last ${numDays} days</div>
      <div class="review-toggle">
        <button class="${range === 'week' ? 'active' : ''}" onclick="setReviewRange('week')">Week</button>
        <button class="${range === 'month' ? 'active' : ''}" onclick="setReviewRange('month')">Month</button>
      </div>
    </header>
  `;

    // Last N days, oldest first
    const days = [];
    for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }
    const dayLabels = days.map(d => d.toLocaleDateString('en-US', { weekday: 'narrow' }));

    const rituals = appData.items.filter(i =>
        i.type === 'ritual' && i.status !== 'archived' && !isGoalCompleted(i.goalId));

    const wrap = document.createElement('div');
    wrap.className = 'list-group';

    if (rituals.length === 0) {
        wrap.innerHTML = '<p class="empty-state">No active rituals to review yet.<br>Add a recurring item and check back here.</p>';
        container.appendChild(wrap);
        return;
    }

    // Group rituals by facet (via their goal); goal-less rituals go under "Other"
    const groups = new Map();
    rituals.forEach(item => {
        const goal = appData.goals.find(g => g.id === item.goalId);
        const facet = goal ? appData.facets.find(f => f.id === goal.facetId) : null;
        const key = facet ? facet.id : '_other';
        if (!groups.has(key)) groups.set(key, { facet, items: [] });
        groups.get(key).items.push(item);
    });

    groups.forEach(({ facet, items }) => {
        const section = document.createElement('div');
        section.innerHTML = `<h3 class="section-heading" style="color:${(facet && facet.color) || 'var(--color-text-muted)'}">${facet ? facet.title : 'Other'}</h3>`;

        items.forEach(item => {
            let due = 0, done = 0;
            const dots = days.map((d, idx) => {
                const isDue = isRitualDue(item, d);
                const isDone = isDue && isItemCompleted(item.id, d.toLocaleDateString('en-CA'));
                if (isDue) due++;
                if (isDone) done++;
                const cls = isDue ? (isDone ? 'dot done' : 'dot missed') : 'dot off';
                const style = isDone ? `style="background:${(facet && facet.color) || '#4caf50'}"` : '';
                const label = range === 'week' ? `<small>${dayLabels[idx]}</small>` : '';
                return `<span class="review-day"><span class="${cls}" ${style}></span>${label}</span>`;
            }).join('');

            const pct = due > 0 ? Math.round(done / due * 100) : null;
            const row = document.createElement('div');
            row.className = 'review-row';
            row.innerHTML = `
        <div class="review-info">
          <div>${item.title}</div>
          <div class="item-meta">${pct === null ? 'Not due this week' : `${done}/${due} days • ${pct}%`}</div>
        </div>
        <div class="review-dots${range === 'month' ? ' month' : ''}">${dots}</div>`;
            section.appendChild(row);
        });

        wrap.appendChild(section);
    });

    container.appendChild(wrap);
}

// --- View: Mode Overview ---
const MODE_TAGLINES = {
    circle: 'Your anchors — the areas you maintain.',
    line: 'Your paths forward — the areas you advance.',
    web: 'Your connections — the people around you.'
};

function renderModeView(container, modeId) {
    const mode = appData.modes.find(m => m.id === modeId);
    if (!mode) return goHome();

    container.innerHTML = `
    <header class="view-header">
      <div style="display:flex; justify-content:space-between; align-items:center; align-self:stretch">
        <button onclick="goToTimeline()">← Timeline</button>
        <button class="icon-btn" onclick="goHome()" title="Today's acts">⌂</button>
      </div>
      <h1>${mode.title}</h1>
      <div class="item-meta">${MODE_TAGLINES[mode.type] || ''}</div>
    </header>
  `;

    const facets = appData.facets.filter(f => f.modeId === modeId);
    const list = document.createElement('div');
    list.className = 'list-group';

    if (facets.length === 0) {
        list.innerHTML = '<p class="empty-state">No areas in this mode yet.</p>';
    }

    facets.forEach(facet => {
        const goals = appData.goals.filter(g => g.facetId === facet.id);
        const goalIds = goals.map(g => g.id);
        const activeItems = appData.items.filter(i => goalIds.includes(i.goalId) && i.status !== 'archived');

        // Per-stream phase progress, e.g. "NextCandle 2/5 · Marathon 0/3"
        const phaseLine = goals
            .filter(g => g.status !== 'completed' && (g.milestones || []).length > 0)
            .map(g => `${g.title} ${g.milestones.filter(m => m.done).length}/${g.milestones.length}`)
            .join(' · ');

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
      <span style="width:12px; height:12px; border-radius:50%; background:${facet.color || '#ccc'}; flex-shrink:0"></span>
      <div style="flex:1">
        <div>${facet.title}</div>
        <div class="item-meta">${goals.length} goal${goals.length === 1 ? '' : 's'} • ${activeItems.length} active item${activeItems.length === 1 ? '' : 's'}</div>
        ${phaseLine ? `<div class="item-meta">⚑ ${phaseLine}</div>` : ''}
      </div>
      <span style="color:#aaa">›</span>
    `;
        div.onclick = () => goToFacet(facet.id);
        list.appendChild(div);
    });

    container.appendChild(list);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-text';
    addBtn.textContent = '+ Add Area';
    addBtn.onclick = () => openFacetEditor(modeId);
    container.appendChild(addBtn);
}

const FACET_COLORS = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#e91e63', '#009688', '#795548', '#607d8b'];

function openFacetEditor(modeId) {
    const swatches = FACET_COLORS.map((c, i) => `
    <label style="cursor:pointer">
      <input type="radio" name="inp-f-color" value="${c}" ${i === 0 ? 'checked' : ''} style="display:none">
      <span class="color-swatch" style="display:inline-block; width:28px; height:28px; border-radius:50%; background:${c}; border:3px solid transparent"></span>
    </label>
  `).join('');

    const html = `
    <label>Area Title <input id="inp-f-title" type="text" placeholder="e.g. Fitness, Side Project" autofocus></label>
    <label>Color</label>
    <div style="display:flex; gap:8px; flex-wrap:wrap">${swatches}</div>
  `;

    const modal = renderModal('New Area', html, (m) => {
        const title = m.querySelector('#inp-f-title').value.trim();
        if (!title) return false;
        appData.facets.push({
            id: 'facet_' + Date.now() + Math.random().toString(36).substr(2, 4),
            title,
            color: m.querySelector('input[name="inp-f-color"]:checked').value,
            modeId
        });
        return true;
    });

    const highlightSwatch = () => {
        modal.querySelectorAll('input[name="inp-f-color"]').forEach(input => {
            input.nextElementSibling.style.borderColor = input.checked ? '#2c3e50' : 'transparent';
        });
    };
    modal.querySelectorAll('input[name="inp-f-color"]').forEach(input => input.addEventListener('change', highlightSwatch));
    highlightSwatch();
}

function renderFacetView(container, facetId) {
    // Level 1
    const facet = appData.facets.find(f => f.id === facetId);
    if (!facet) return goHome(); // Safety
    const mode = appData.modes.find(m => m.id === facet.modeId);

    container.innerHTML = `
    <header class="view-header" style="background-color: ${facet.color}20;">
      <div style="display:flex; justify-content:space-between; align-items:center; align-self:stretch">
        <button onclick="goToMode('${facet.modeId}')">← ${mode ? mode.title : 'Back'}</button>
        <button class="icon-btn" onclick="goHome()" title="Today's acts">⌂</button>
      </div>
      <h1>${facet.title}</h1>
    </header>
  `;

    // Goals List
    const goals = appData.goals.filter(g => g.facetId === facetId);
    const activeGoals = goals.filter(g => g.status !== 'completed');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const list = document.createElement('div');
    list.className = 'list-group';

    const goalRow = (goal) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        if (goal.status === 'completed') div.style.opacity = '0.6';
        const metaParts = [];
        if (goal.status === 'completed') {
            metaParts.push('Completed 🏁');
        } else {
            const msArr = goal.milestones || [];
            if (msArr.length > 0) {
                const done = msArr.filter(m => m.done).length;
                const current = msArr.find(m => !m.done);
                metaParts.push(`⚑ ${done}/${msArr.length}${current ? ' · ' + current.title : ''}`);
            }
            if (goal.deadline) metaParts.push(`Deadline: ${goal.deadline}`);
        }
        const meta = metaParts.join(' • ');
        div.innerHTML = `
      <span class="icon">${goal.icon || '🎯'}</span>
      <div style="flex:1">
        <div>${goal.title}</div>
        ${meta ? `<div class="item-meta">${meta}</div>` : ''}
      </div>`;
        div.onclick = () => {
            currentView = { level: 2, contextId: goal.id };
            render();
        };
        return div;
    };

    activeGoals.forEach(goal => list.appendChild(goalRow(goal)));

    if (completedGoals.length > 0) {
        const det = document.createElement('details');
        det.className = 'collapsed-group';
        det.innerHTML = `<summary>Completed (${completedGoals.length})</summary>`;
        completedGoals.forEach(goal => det.appendChild(goalRow(goal)));
        list.appendChild(det);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-text';
    addBtn.textContent = `+ Add ${goalNoun(facetId)}`;
    addBtn.onclick = () => openGoalEditor({ facetId: facet.id });

    container.appendChild(list);

    container.appendChild(addBtn);
}


function renderGoalView(container, goalId) {
    // Level 2
    const goal = appData.goals.find(g => g.id === goalId);
    if (!goal) return goHome();

    const facet = appData.facets.find(f => f.id === goal.facetId);

    container.innerHTML = `
    <header class="view-header">
      <div style="display:flex; justify-content:space-between; align-items:center; align-self:stretch">
        <button onclick="goToFacet('${goal.facetId}')">← ${facet ? facet.title : 'Back'}</button>
        <div>
          <button class="icon-btn" onclick="openGoalEditorById('${goal.id}')" title="Edit">✎</button>
          <button class="icon-btn" onclick="goHome()" title="Today's acts">⌂</button>
        </div>
      </div>
      <h1>${goal.title}${goal.status === 'completed' ? ' 🏁' : ''}</h1>
      <div class="meta">Deadline: ${goal.deadline || 'None'}</div>
    </header>
  `;

    // Container for lists
    const listContainer = document.createElement('div');
    listContainer.className = 'list-group';

    const items = appData.items.filter(i => i.goalId === goalId && i.status !== 'archived');

    // Row markup shared by phase groups and the classic sections
    const itemRowHtml = (item) => {
        const meta = item.type === 'ritual'
            ? `↻ ${item.recurrence}`
            : (item.scheduled_date ? `📅 ${item.scheduled_date}` : 'Unscheduled');
        return `
        <div class="list-item" onclick="openItemEditorById('${item.id}')">
           <div style="flex:1">
             <div>${item.title}</div>
             <div class="item-meta">${meta}</div>
           </div>
           <div style="font-size:0.8rem; color:#aaa">✎</div>
        </div>`;
    };

    const sectionHeading = (title) =>
        `<h3 style="padding:16px 16px 8px; font-size:0.9rem; color:#666; text-transform:uppercase; letter-spacing:1px">${title}</h3>`;

    const milestones = goal.milestones || [];
    let sectionsHtml = '';

    if (milestones.length > 0) {
        // Phase view: group items under their milestone; first undone phase is "current"
        const currentId = (milestones.find(m => !m.done) || {}).id;
        milestones.forEach((m, idx) => {
            const phaseItems = items.filter(i => i.milestoneId === m.id);
            const isCurrent = m.id === currentId;
            sectionsHtml += `
        <div class="phase-header${m.done ? ' done' : ''}${isCurrent ? ' current' : ''}">
          <button class="phase-check" onclick="toggleMilestone('${goal.id}','${m.id}')" title="${m.done ? 'Reopen phase' : 'Mark phase done'}">${m.done ? '✓' : idx + 1}</button>
          <span class="phase-title">${m.title}</span>
          ${isCurrent ? '<span class="phase-badge">current</span>' : ''}
          ${m.target_date ? `<span class="item-meta">${m.target_date}</span>` : ''}
        </div>
        ${phaseItems.length ? phaseItems.map(itemRowHtml).join('') : '<div class="item-meta" style="padding:2px 16px 10px">No items in this phase.</div>'}`;
        });
        const loose = items.filter(i => !i.milestoneId || !milestones.some(m => m.id === i.milestoneId));
        if (loose.length > 0) {
            sectionsHtml += sectionHeading('Other Items') + loose.map(itemRowHtml).join('');
        }
    } else {
        // Classic view: segment by kind and schedule
        const rituals = items.filter(i => i.type === 'ritual');
        const tasks = items.filter(i => i.type === 'task');
        const unscheduled = tasks.filter(t => !t.scheduled_date);
        const scheduled = tasks.filter(t => t.scheduled_date).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

        const renderSection = (title, itemList) =>
            itemList.length === 0 ? '' : sectionHeading(title) + itemList.map(itemRowHtml).join('');

        sectionsHtml =
            renderSection('Rituals', rituals) +
            renderSection('Scheduled Tasks', scheduled) +
            renderSection('Unscheduled / Someday', unscheduled);

        if (items.length === 0) {
            sectionsHtml = '<p class="empty-state">No items yet. Add one +</p>';
        }
    }

    const archived = appData.items.filter(i => i.goalId === goalId && i.status === 'archived');
    if (archived.length > 0) {
        sectionsHtml += `
        <details class="collapsed-group" style="padding:0 16px">
          <summary>Archived (${archived.length})</summary>
          ${archived.map(item => `
          <div class="list-item" style="opacity:0.6" onclick="openItemEditorById('${item.id}')">
             <div style="flex:1">
               <div>${item.title}</div>
               <div class="item-meta">${item.type === 'ritual' ? '↻ ' + item.recurrence : (item.scheduled_date ? '📅 ' + item.scheduled_date : 'Unscheduled')}</div>
             </div>
             <div style="font-size:0.8rem; color:#aaa">✎</div>
          </div>`).join('')}
        </details>`;
    }

    listContainer.innerHTML = sectionsHtml;

    const addBtn = document.createElement('button');
    addBtn.className = 'fab';
    addBtn.textContent = '+';
    addBtn.onclick = () => openItemEditor(null, { goalId: goal.id }); // Pre-fill goal

    container.appendChild(listContainer);
    container.appendChild(addBtn);
}


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
          <input type="text" placeholder="e.g. Run a Marathon, Launch MVP" oninput="window.updateState('goalTitle', this.value); window.syncWizNext()" value="${state.goalTitle}">
        </label>

        <div style="margin-top:24px">
          <button id="wiz-next" class="btn-primary" onclick="window.nextStep()">Next</button>
        </div>
      `;
        } else if (step === 4) {
            // First Item
            container.innerHTML += `
        <h2 style="text-align:center; margin-bottom:8px">First Step</h2>
        <p style="text-align:center; color:#666; margin-bottom:24px">What is the very first action for <b>${state.goalTitle}</b>?</p>
        
        <label>Action Title
          <input type="text" placeholder="e.g. Buy running shoes" oninput="window.updateState('taskTitle', this.value)" value="${state.taskTitle}">
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

        if (step === 3) window.syncWizNext();
    };

    // Expose helpers globally for the string onclicks
    window.nextStep = () => { step++; renderStep(); };
    window.toggleFacet = (id) => {
        const f = state.facets.find(x => x.id === id);
        if (f) f.active = !f.active;
        renderStep();
    };
    // Quiet update: re-rendering on every keystroke would rebuild the DOM and
    // kick focus out of the input. Callers that need a redraw call renderStep().
    window.updateState = (key, val) => { state[key] = val; };
    window.syncWizNext = () => {
        const btn = document.getElementById('wiz-next');
        if (!btn) return;
        const ok = !!state.goalTitle.trim();
        btn.disabled = !ok;
        btn.style.opacity = ok ? '' : '0.5';
    };
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
        delete window.nextStep; delete window.toggleFacet; delete window.updateState; delete window.finishSetup; delete window.renderStep; delete window.syncWizNext;
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
    return modal;
}

// --- Editors ---
function openItemEditor(item = null, prefill = {}) {
    const isEditing = !!item && !!item.id;
    const titleVal = isEditing ? item.title : '';
    const typeVal = isEditing ? item.type : (prefill.type || 'task');
    const dateVal = isEditing ? (item.scheduled_date || '') : (prefill.scheduled_date || new Date().toLocaleDateString('en-CA'));
    const recurVal = isEditing ? (item.recurrence || 'daily') : 'daily';
    const goalIdVal = isEditing ? (item.goalId || '') : (prefill.goalId || '');

    const goalOpts = ['<option value="">— No goal —</option>']
        .concat(appData.goals.map(g => `<option value="${g.id}" ${g.id === goalIdVal ? 'selected' : ''}>${g.title}</option>`))
        .join('');

    // Recurrence options — every value here is understood by isRitualDue()
    const RECUR_OPTIONS = [
        ['daily', 'Daily'],
        ['weekdays', 'Weekdays (M-F)'],
        ['weekends', 'Weekends'],
        ['monday', 'Every Monday'],
        ['tuesday', 'Every Tuesday'],
        ['wednesday', 'Every Wednesday'],
        ['thursday', 'Every Thursday'],
        ['friday', 'Every Friday'],
        ['saturday', 'Every Saturday'],
        ['sunday', 'Every Sunday']
    ];
    if (recurVal === 'weekly') RECUR_OPTIONS.push(['weekly', 'Weekly (Mondays)']); // legacy value on existing items
    const recurOpts = RECUR_OPTIONS.map(([val, label]) =>
        `<option value="${val}" ${recurVal === val ? 'selected' : ''}>${label}</option>`).join('');

    const html = `
    <label>Title <input id="inp-title" type="text" value="${titleVal}" autofocus></label>
    <label>Goal <select id="inp-goal">${goalOpts}</select></label>
    <div id="ms-group" style="display:none">
      <label>Phase (Milestone) <select id="inp-ms"></select></label>
    </div>

    <label>Type</label>
    <div style="display:flex; gap:8px;">
      <label style="flex:1; cursor:pointer">
        <input type="radio" name="inp-type" value="task" ${typeVal === 'task' ? 'checked' : ''} style="display:none">
        <div class="chip-select-ui" style="padding:10px; border:1px solid #ddd; border-radius:8px; text-align:center;">One-off</div>
      </label>
      <label style="flex:1; cursor:pointer">
        <input type="radio" name="inp-type" value="ritual" ${typeVal === 'ritual' ? 'checked' : ''} style="display:none">
        <div class="chip-select-ui" style="padding:10px; border:1px solid #ddd; border-radius:8px; text-align:center;">Ritual</div>
      </label>
    </div>

    <div id="recur-group" style="display:${typeVal === 'ritual' ? 'block' : 'none'};">
      <label>Recurrence
        <select id="inp-recur">${recurOpts}</select>
      </label>
    </div>

    <div id="date-group" style="display:${typeVal === 'task' ? 'block' : 'none'};">
      <label>Schedule Date <input id="inp-date" type="date" value="${dateVal}"></label>
      <small style="color:#888; margin-top:4px; display:block">Leave empty to save for Someday</small>
    </div>
    ${isEditing ? `
    <button id="btn-archive" class="btn-secondary">${item.status === 'archived' ? 'Unarchive Item' : 'Archive Item'}</button>
    <button id="btn-delete" class="btn-secondary" style="color:#c0392b">Delete Item</button>` : ''}
  `;

    const modal = renderModal(isEditing ? 'Edit Item' : 'New Item', html, (m) => {
        const title = m.querySelector('#inp-title').value.trim();
        if (!title) return false;

        const goalId = m.querySelector('#inp-goal').value;
        const type = m.querySelector('input[name="inp-type"]:checked').value;

        const newItem = {
            id: isEditing ? item.id : 'item_' + Date.now(),
            title,
            type,
            goalId,
            milestoneId: m.querySelector('#inp-ms').value || null,
            status: isEditing ? item.status : 'active',
            recurrence: type === 'ritual' ? m.querySelector('#inp-recur').value : 'none',
            scheduled_date: type === 'task' ? (m.querySelector('#inp-date').value || null) : null,
            deadline: ''
        };

        if (isEditing) {
            Object.assign(item, newItem);
        } else {
            appData.items.push(newItem);
        }
        return true;
    });

    // Type toggle: <script> tags inserted via innerHTML never execute, so wire it up here
    const syncTypeUI = () => {
        const val = modal.querySelector('input[name="inp-type"]:checked').value;
        modal.querySelector('#recur-group').style.display = val === 'ritual' ? 'block' : 'none';
        modal.querySelector('#date-group').style.display = val === 'task' ? 'block' : 'none';
        modal.querySelectorAll('input[name="inp-type"]').forEach(input => {
            const chip = input.nextElementSibling;
            chip.style.background = input.checked ? '#2c3e50' : '#fff';
            chip.style.color = input.checked ? '#fff' : '#333';
        });
    };
    modal.querySelectorAll('input[name="inp-type"]').forEach(input => input.addEventListener('change', syncTypeUI));
    syncTypeUI();

    // Phase selector follows the chosen goal's milestones
    const msGroup = modal.querySelector('#ms-group');
    const msSelect = modal.querySelector('#inp-ms');
    const syncMilestoneUI = () => {
        const g = appData.goals.find(x => x.id === modal.querySelector('#inp-goal').value);
        const list = (g && g.milestones) || [];
        if (list.length === 0) {
            msGroup.style.display = 'none';
            msSelect.innerHTML = '<option value=""></option>';
            return;
        }
        const cur = (isEditing ? item.milestoneId : prefill.milestoneId) || '';
        msSelect.innerHTML = '<option value="">— None —</option>' +
            list.map(mst => `<option value="${mst.id}" ${mst.id === cur ? 'selected' : ''}>${mst.title}</option>`).join('');
        msGroup.style.display = 'block';
    };
    modal.querySelector('#inp-goal').addEventListener('change', syncMilestoneUI);
    syncMilestoneUI();

    if (isEditing) {
        modal.querySelector('#btn-archive').onclick = () => {
            item.status = item.status === 'archived' ? 'active' : 'archived';
            modal.remove();
            saveData();
            render();
        };
        modal.querySelector('#btn-delete').onclick = () => {
            if (confirm(`Delete "${item.title}"? This cannot be undone.`)) {
                appData.items = appData.items.filter(i => i.id !== item.id);
                modal.remove();
                saveData();
                render();
            }
        };
    }
}

function openGoalEditor(defaults = {}, goal = null) {
    const isEditing = !!goal;
    const facetIdVal = isEditing ? goal.facetId : (defaults.facetId || '');
    const noun = goalNoun(facetIdVal);
    const facetOpts = appData.facets.map(f => `<option value="${f.id}" ${f.id === facetIdVal ? 'selected' : ''}>${f.title}</option>`).join('');
    const isCompleted = isEditing && goal.status === 'completed';

    // Working copy of milestones — committed to the goal only on Save
    const ms = (isEditing ? (goal.milestones || []) : []).map(m => ({ ...m }));

    const html = `
    <label>${noun} Title <input id="inp-g-title" type="text" value="${isEditing ? goal.title : ''}" autofocus></label>
    <label>Area (Facet) <select id="inp-g-facet">${facetOpts}</select></label>
    <div style="display:flex; gap:12px">
      <label style="flex:1">Start <input id="inp-g-start" type="date" value="${isEditing ? (goal.start_date || '') : ''}"></label>
      <label style="flex:1">Deadline <input id="inp-g-deadline" type="date" value="${isEditing ? (goal.deadline || '') : ''}"></label>
    </div>
    <label>Milestones (phases)</label>
    <div id="ms-list"></div>
    <button type="button" id="btn-ms-add" class="btn-text" style="padding:4px 0; text-align:left">+ Add milestone</button>
    ${isEditing ? `
      <button id="btn-g-complete" class="btn-secondary">${isCompleted ? `Reactivate ${noun}` : 'Mark Complete 🏁'}</button>
      <button id="btn-g-delete" class="btn-secondary" style="color:#c0392b">Delete ${noun}</button>` : ''}
  `;

    const modal = renderModal(isEditing ? `Edit ${noun}` : `New ${noun}`, html, (m) => {
        const title = m.querySelector('#inp-g-title').value.trim();
        if (!title) return false;

        const data = {
            title,
            facetId: m.querySelector('#inp-g-facet').value,
            start_date: m.querySelector('#inp-g-start').value,
            deadline: m.querySelector('#inp-g-deadline').value,
            milestones: ms.filter(x => x.title.trim())
        };
        if (isEditing) {
            Object.assign(goal, data);
        } else {
            appData.goals.push({ id: 'goal_' + Date.now(), icon: '🎯', status: 'active', ...data });
        }
        return true;
    });

    const msList = modal.querySelector('#ms-list');
    const renderMsRows = () => {
        msList.innerHTML = '';
        if (ms.length === 0) {
            msList.innerHTML = '<div class="item-meta" style="padding:2px 0 6px">Optional phases, e.g. Build → Test → Launch.</div>';
            return;
        }
        ms.forEach((mst, idx) => {
            const row = document.createElement('div');
            row.className = 'ms-row';
            row.innerHTML = `
        <input type="checkbox" class="ms-done" ${mst.done ? 'checked' : ''} title="Done">
        <input type="text" class="ms-title" placeholder="e.g. Build" value="${mst.title}">
        <input type="date" class="ms-date" value="${mst.target_date || ''}" title="Target date">
        <button type="button" class="ms-up" title="Move up" ${idx === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="ms-del" title="Remove">×</button>`;
            row.querySelector('.ms-done').onchange = (e) => { mst.done = e.target.checked; };
            row.querySelector('.ms-title').oninput = (e) => { mst.title = e.target.value; };
            row.querySelector('.ms-date').onchange = (e) => { mst.target_date = e.target.value; };
            row.querySelector('.ms-up').onclick = () => {
                [ms[idx - 1], ms[idx]] = [ms[idx], ms[idx - 1]];
                renderMsRows();
            };
            row.querySelector('.ms-del').onclick = () => { ms.splice(idx, 1); renderMsRows(); };
            msList.appendChild(row);
        });
    };
    renderMsRows();
    modal.querySelector('#btn-ms-add').onclick = () => {
        ms.push({ id: 'ms_' + Date.now() + Math.random().toString(36).substr(2, 3), title: '', target_date: '', done: false });
        renderMsRows();
        const titles = msList.querySelectorAll('.ms-title');
        titles[titles.length - 1].focus();
    };

    if (isEditing) {
        modal.querySelector('#btn-g-complete').onclick = () => {
            goal.status = isCompleted ? 'active' : 'completed';
            modal.remove();
            saveData();
            render();
        };
        modal.querySelector('#btn-g-delete').onclick = () => {
            const itemCount = appData.items.filter(i => i.goalId === goal.id).length;
            const msg = itemCount > 0
                ? `Delete "${goal.title}"? Its ${itemCount} item(s) will be kept, without a goal.`
                : `Delete "${goal.title}"?`;
            if (confirm(msg)) {
                appData.items.forEach(i => { if (i.goalId === goal.id) i.goalId = ''; });
                appData.goals = appData.goals.filter(g => g.id !== goal.id);
                modal.remove();
                saveData();
                goToFacet(goal.facetId);
            }
        };
    }
}

// --- Backup & Restore ---
function openDataModal() {
    const html = `
    <p style="font-size:0.9rem; color:#666">Your data lives only in this browser. Export a backup file regularly, and import it to restore or move to another device.</p>
    <button id="btn-export" class="btn-secondary">Export backup (JSON)</button>
    <label class="btn-secondary" style="text-align:center; cursor:pointer">Import backup…
      <input id="inp-import" type="file" accept=".json,application/json" style="display:none">
    </label>
  `;
    const modal = renderModal('Backup & Restore', html, () => false);
    modal.querySelector('.modal-footer').style.display = 'none';

    modal.querySelector('#btn-export').onclick = () => {
        const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `acts-of-life-backup-${new Date().toLocaleDateString('en-CA')}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    modal.querySelector('#inp-import').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            let data;
            try {
                data = JSON.parse(reader.result);
            } catch (err) {
                alert('Could not read this file as JSON.');
                return;
            }
            if (!Array.isArray(data.modes) || !Array.isArray(data.facets) || !Array.isArray(data.items)) {
                alert('This file does not look like an Acts of Life backup.');
                return;
            }
            if (!confirm('Importing replaces everything currently in the app. Continue?')) return;
            appData = data;
            if (!appData.goals) appData.goals = [];
            if (!appData.history) appData.history = {};
            saveData();
            modal.remove();
            goHome();
        };
        reader.readAsText(file);
    };
}

// Init
init();

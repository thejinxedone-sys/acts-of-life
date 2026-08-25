// Acts of Life — script.js
// A telescope for a life. Zoom ladder: act → stream → today → life's horizon.
// After Hannah Arendt: Labour (the loop) · Work (the line) · Action (the star).

const STORAGE_KEY = 'acts_of_life_data_v2';

// --- Data Model ---
let appData = {
    modes: [
        { id: 'mode_circle', title: 'Labour', type: 'labour' },
        { id: 'mode_line', title: 'Work', type: 'work' },
        { id: 'mode_web', title: 'Action', type: 'action' }
    ],
    facets: [], // { id, title, modeId }
    goals: [],  // { id, title, status, facetId, start_date, deadline, milestones: [{id,title,target_date,done}] }
    items: [],  // { id, title, type:'task'|'ritual', recurrence, scheduled_date, goalId, milestoneId, status }
    history: {},    // { 'YYYY-MM-DD': { itemId: true } }
    principles: { marks: {}, notes: {} },  // marks: { 'date': {0:true,...} }, notes: { 'date': '...' }
    meta: {}
};

const MODE_META = {
    labour: {
        word: 'Labour', kicker: 'Labour · the loop you keep',
        tagline: 'the anchors you tend so everything else can move',
        c: 'oklch(58% 0.08 145)', ink: 'oklch(42% 0.07 145)',
        tint: 'oklch(93% 0.025 145)', bright: 'oklch(72% 0.09 145)'
    },
    work: {
        word: 'Work', kicker: 'Work · the path you extend',
        tagline: 'what you build that outlasts the day',
        c: 'oklch(58% 0.08 240)', ink: 'oklch(42% 0.07 240)',
        tint: 'oklch(93% 0.025 240)', bright: 'oklch(70% 0.08 240)'
    },
    action: {
        word: 'Action', kicker: 'Action · acts that define your life',
        tagline: 'beginnings no one could predict',
        c: 'oklch(58% 0.08 320)', ink: 'oklch(42% 0.08 320)',
        tint: 'oklch(94% 0.03 320)', bright: 'oklch(70% 0.09 320)'
    }
};

const PRINCIPLES = [
    ['Force Eyes Open', 'Fight comforting lies; look directly at reality.'],
    ['Make Your Dent', 'Step into the open; disclose your unique self.'],
    ['Seize the Initiative', 'Act on what matters; ignite the unpredictable.'],
    ['Befriend Your Divergence', "Don't repress inner friction; think to understand."],
    ['Love the World', 'Stay fiercely awake; respond to life authentically.']
];

// --- Persistence + migration ---
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            appData = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse data', e);
        }
    }
    // Arendt migration: retitle the fixed modes (ids stay stable so facets keep working)
    appData.modes = [
        { id: 'mode_circle', title: 'Labour', type: 'labour' },
        { id: 'mode_line', title: 'Work', type: 'work' },
        { id: 'mode_web', title: 'Action', type: 'action' }
    ];
    if (!appData.history) appData.history = {};
    if (!appData.goals) appData.goals = [];
    if (!appData.principles) appData.principles = { marks: {}, notes: {} };
    if (!appData.principles.marks) appData.principles.marks = {};
    if (!appData.principles.notes) appData.principles.notes = {};
    if (!appData.meta) appData.meta = {};
    if (!Array.isArray(appData.principlesList) || appData.principlesList.length === 0) {
        appData.principlesList = PRINCIPLES.map(p => p.slice());
    }
}

function getPrinciples() {
    return (Array.isArray(appData.principlesList) && appData.principlesList.length)
        ? appData.principlesList : PRINCIPLES;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// --- Automatic snapshots: a silent local safety net ---
// Once per day, before any of today's changes, the previous state is copied
// aside. The last 7 copies are kept and can be restored from Backup & restore.
const SNAPSHOT_PREFIX = 'acts_of_life_snap_';

function snapshotKeys() {
    return Object.keys(localStorage).filter(k => k.startsWith(SNAPSHOT_PREFIX)).sort();
}

function takeDailySnapshot() {
    try {
        const hasData = appData.items.length > 0 || appData.facets.length > 0 ||
            Object.keys(appData.history).length > 0;
        if (!hasData) return;
        const key = SNAPSHOT_PREFIX + todayStr();
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(appData));
        }
        const keys = snapshotKeys();
        while (keys.length > 7) localStorage.removeItem(keys.shift());
    } catch (e) {
        // Storage full or unavailable — snapshots are best-effort
    }
}

// --- Small helpers ---
function todayStr() { return new Date().toLocaleDateString('en-CA'); }

function modeOf(facetId) {
    const facet = appData.facets.find(f => f.id === facetId);
    return facet ? appData.modes.find(m => m.id === facet.modeId) : null;
}

function modeTypeOfGoal(goal) {
    const m = goal ? modeOf(goal.facetId) : null;
    return m ? m.type : null;
}

function facetOfItem(item) {
    const goal = appData.goals.find(g => g.id === item.goalId);
    if (goal) return appData.facets.find(f => f.id === goal.facetId) || null;
    if (item.facetId) return appData.facets.find(f => f.id === item.facetId) || null;
    return null;
}

function modeTypeOfItem(item) {
    const facet = facetOfItem(item);
    const m = facet ? appData.modes.find(x => x.id === facet.modeId) : null;
    return m ? m.type : null;
}

function goalNoun(facetId) {
    const m = modeOf(facetId);
    return (m && m.type === 'work') ? 'Stream' : 'Goal';
}

function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

// Glyphs: labour loop, work line, action star
function glyph(type, size, extraStyle = '') {
    if (type === 'labour') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="oklch(45% 0.08 145)" stroke-width="2.75" style="${extraStyle}"><circle cx="12" cy="12" r="8"></circle></svg>`;
    if (type === 'work') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="oklch(50% 0.08 240)" stroke-width="2.75" stroke-linecap="round" style="${extraStyle}"><path d="M4 17L20 7"></path></svg>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="oklch(48% 0.09 320)" style="${extraStyle}"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"></path></svg>`;
}

function starSVG(size, fill, stroke, extraStyle = '') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="1.8"` : ''} style="flex:none;${extraStyle}"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"></path></svg>`;
}

const CHECK_SVG_LIGHT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5ead8" stroke-width="3.2"><path d="M5 13l4 4L19 7"></path></svg>';

// Telescope-ring backdrop
function ringsSVG(night, cy = 120) {
    const radii = [90, 190, 310, 450, 620];
    const ops = night ? [0.05, 0.04, 0.035, 0.03, 0.025] : [0.05, 0.045, 0.04, 0.035, 0.03];
    const base = night ? '245,234,216' : '32,30,29';
    let s = `<svg viewBox="0 0 390 780" preserveAspectRatio="xMidYMin slice" class="rings" aria-hidden="true">`;
    radii.forEach((r, i) => {
        s += `<circle cx="195" cy="${cy}" r="${r}" fill="none" stroke="rgba(${base},${ops[i]})" stroke-width="1.5"></circle>`;
    });
    if (night) s += '<circle cx="60" cy="420" r="1.8" fill="rgba(245,234,216,0.2)"></circle><circle cx="330" cy="300" r="1.5" fill="rgba(245,234,216,0.16)"></circle><circle cx="290" cy="620" r="2" fill="rgba(245,234,216,0.14)"></circle><circle cx="110" cy="680" r="1.5" fill="rgba(245,234,216,0.14)"></circle>';
    return s + '</svg>';
}

// --- Core logic (rituals, completion, streaks) ---
function isRitualDue(item, dateObj) {
    if (item.type !== 'ritual') return false;
    if (item.status === 'completed' || item.status === 'archived') return false;
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (item.recurrence === 'daily') return true;
    if (item.recurrence === 'weekdays' && !['saturday', 'sunday'].includes(dayName)) return true;
    if (item.recurrence === 'weekends' && ['saturday', 'sunday'].includes(dayName)) return true;
    if (item.recurrence === dayName) return true;
    if (item.recurrence === 'weekly') return dayName === 'monday'; // legacy value
    return false;
}

function isItemCompleted(itemId, dateStr) {
    if (!appData.history[dateStr]) return false;
    return appData.history[dateStr][itemId] === true;
}

function isGoalCompleted(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    return !!goal && goal.status === 'completed';
}

function toggleItemCompletion(itemId, dateStr) {
    if (!appData.history[dateStr]) appData.history[dateStr] = {};
    if (appData.history[dateStr][itemId]) {
        delete appData.history[dateStr][itemId];
    } else {
        appData.history[dateStr][itemId] = true;
    }
    saveData();
    render();
}

// Consecutive due-days (ending today) completed; an incomplete today doesn't break it
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

function toggleMilestone(goalId, msId) {
    const goal = appData.goals.find(g => g.id === goalId);
    const milestones = goal ? (goal.milestones || []) : [];
    const milestone = milestones.find(m => m.id === msId);
    if (!milestone) return;
    milestone.done = !milestone.done;
    saveData();
    render();

    if (!milestone.done) return;
    const next = milestones.find(m => !m.done);
    if (next) {
        if (confirm(`"${milestone.title}" complete! Add a first action for the next phase, "${next.title}"?`)) {
            openItemEditor(null, { goalId: goal.id, milestoneId: next.id });
        }
    } else if (goal.status !== 'completed') {
        if (confirm(`All phases of "${goal.title}" are done! Mark it complete?`)) {
            goal.status = 'completed';
            saveData();
            render();
        }
    }
}

// --- Item queries ---
function activeVisible(item) {
    return item.status !== 'archived' && !isGoalCompleted(item.goalId);
}

function getDailyItems() {
    const ts = todayStr();
    const todayDate = new Date();
    return appData.items.filter(item => {
        if (!activeVisible(item)) return false;
        if (item.type === 'ritual') return isRitualDue(item, todayDate);
        if (item.type === 'task') return item.scheduled_date === ts;
        return false;
    });
}

function getOverdueTasks() {
    const ts = todayStr();
    return appData.items.filter(item =>
        item.type === 'task' && activeVisible(item) &&
        item.scheduled_date && item.scheduled_date < ts &&
        !isItemCompleted(item.id, item.scheduled_date)
    ).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}

function getUpcomingTasks() {
    const ts = todayStr();
    return appData.items.filter(item =>
        item.type === 'task' && activeVisible(item) &&
        item.scheduled_date && item.scheduled_date > ts &&
        !isItemCompleted(item.id, item.scheduled_date)
    ).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}

function getNotDueRituals() {
    const today = new Date();
    return appData.items.filter(item =>
        item.type === 'ritual' && activeVisible(item) && !isRitualDue(item, today)
    );
}

function getSomedayTasks() {
    return appData.items.filter(item =>
        item.type === 'task' && activeVisible(item) && !item.scheduled_date
    );
}

// --- Navigation (history-integrated: Android back walks the zoom ladder) ---
// Zoom ladder, widest to closest: life/reflect/review (0) → stream (1) → today (2)
let currentView = { level: 'home', contextId: null, from: null };
let homeMode = null; // null = all of life; or 'labour' | 'work' | 'action'
const VIEW_DEPTHS = { life: 0, reflect: 0, review: 0, stream: 1, home: 2 };
let lastDepth = 2;
let ignoreNextPop = false;

function pushView() {
    history.pushState({ view: currentView, homeMode }, '');
}

function goHome() { currentView = { level: 'home', contextId: null }; pushView(); render(); }
function goLife() { currentView = { level: 'life', contextId: null }; pushView(); render(); }
let reflectDial = 0; // index into past evenings, 0 = most recent
function goReflect() { reflectDial = 0; currentView = { level: 'reflect', contextId: null }; pushView(); render(); }
function goReview(range) { currentView = { level: 'review', contextId: range || 'week' }; pushView(); render(); }
function goStream(goalId, from) {
    currentView = { level: 'stream', contextId: goalId, from: from || currentView.level };
    pushView();
    render();
}
function setHomeMode(type) {
    homeMode = type;
    currentView = { level: 'home', contextId: null };
    pushView();
    render();
}

// The in-app back arrows and the hardware/gesture Back both pop history
function goBack() { history.back(); }

// Close a sheet; its history entry becomes a plain view entry (synchronous —
// calling history.back() here races with any pushState that follows)
function closeModal(modal) {
    modal.remove();
    if (history.state && history.state.sheet) {
        history.replaceState({ view: currentView, homeMode }, '');
    }
}

window.addEventListener('popstate', (e) => {
    if (ignoreNextPop) { ignoreNextPop = false; return; }
    const open = document.querySelector('.modal-overlay');
    if (open) { open.remove(); return; }
    const s = e.state;
    if (s && s.view) {
        currentView = s.view;
        homeMode = s.homeMode !== undefined ? s.homeMode : null;
    } else {
        currentView = { level: 'home', contextId: null };
    }
    render();
});

function openItemEditorById(itemId) {
    const item = appData.items.find(i => i.id === itemId);
    if (item) openItemEditor(item);
}

function openGoalEditorById(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    if (goal) openGoalEditor({}, goal);
}

function render() {
    const appDiv = document.getElementById('app');
    const depth = VIEW_DEPTHS[currentView.level];
    const dir = depth < lastDepth ? 'zoom-out' : (depth > lastDepth ? 'zoom-in' : null);
    lastDepth = depth;
    appDiv.innerHTML = '';
    appDiv.classList.remove('zoom-in', 'zoom-out');
    if (dir) {
        void appDiv.offsetWidth;
        appDiv.classList.add(dir);
    }

    if (currentView.level === 'home') renderHome(appDiv);
    else if (currentView.level === 'stream') renderStream(appDiv, currentView.contextId);
    else if (currentView.level === 'life') renderLife(appDiv);
    else if (currentView.level === 'reflect') renderReflect(appDiv);
    else if (currentView.level === 'review') renderReview(appDiv);
    else renderHome(appDiv);
}

// --- Item row (shared by home sections) ---
function renderActRow(item, dateStr, opts = {}) {
    const ts = todayStr();
    const done = isItemCompleted(item.id, dateStr);
    const goal = appData.goals.find(g => g.id === item.goalId) || null;
    const facet = facetOfItem(item);
    const mtype = modeTypeOfItem(item);
    const color = mtype ? MODE_META[mtype].c : 'var(--ink-soft)';

    const metaParts = [];
    if (facet) metaParts.push(facet.title);
    if (goal) metaParts.push(goal.title);
    if (item.type === 'ritual') {
        const streak = computeStreak(item);
        if (streak > 0) metaParts.push(`streak ${streak}`);
        if (!isRitualDue(item, new Date())) metaParts.push(item.recurrence);
    }
    if (item.type === 'task' && item.scheduled_date && item.scheduled_date !== ts) {
        metaParts.unshift(item.scheduled_date);
    }
    if (item.type === 'task' && !item.scheduled_date) metaParts.push('someday');

    const row = document.createElement('div');
    row.className = 'act-row' + (done ? ' done' : '') + (opts.dimmed ? ' dimmed' : '');

    const check = document.createElement('span');
    check.className = 'act-check';
    check.style.borderColor = color;
    if (done) {
        check.style.background = color;
        check.innerHTML = CHECK_SVG_LIGHT;
    }
    check.onclick = (e) => {
        e.stopPropagation();
        if (!done) check.classList.add('popped');
        toggleItemCompletion(item.id, dateStr);
    };

    const main = document.createElement('div');
    main.style.cssText = 'flex:1;min-width:0';
    main.innerHTML = `<div class="act-title">${esc(item.title)}</div>
    <div class="act-meta">${esc(metaParts.join(' · '))} ↗</div>`;
    main.querySelector('.act-title').style.cursor = 'pointer';
    main.querySelector('.act-title').onclick = () => openItemEditor(item);
    main.querySelector('.act-meta').onclick = (e) => {
        e.stopPropagation();
        if (goal) goStream(goal.id, 'home');
        else if (mtype) setHomeMode(mtype);
        else goLife();
    };

    row.appendChild(check);
    row.appendChild(main);

    if (opts.overdue) {
        const chip = document.createElement('button');
        chip.className = 'chip-today';
        chip.textContent = '→ today';
        chip.title = 'Reschedule to today';
        chip.onclick = (e) => {
            e.stopPropagation();
            item.scheduled_date = ts;
            saveData();
            render();
        };
        row.appendChild(chip);
    }
    return row;
}

// --- View: Home (Today's Acts) ---
function renderHome(container) {
    const ts = todayStr();
    const M = homeMode ? MODE_META[homeMode] : null;
    const filt = (list) => homeMode ? list.filter(i => modeTypeOfItem(i) === homeMode) : list;

    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.innerHTML = ringsSVG(false, 120);
    const pad = document.createElement('div');
    pad.className = 'screen-pad';

    // Header
    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + now.getDate();
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:flex-end;justify-content:space-between';
    head.innerHTML = `
    <div><div class="kicker" style="color:${M ? M.ink : 'var(--ember-hover)'};margin-bottom:7px">${esc((M ? M.kicker : 'Today · all of life').toUpperCase())}</div>
    <h1 class="display">Today's Acts</h1></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
      <div style="font:12px var(--font-meta);color:var(--ink-muted)">${dateLabel}</div>
      <button id="btn-info" class="icon-round" style="width:30px;height:30px" title="The philosophy"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><circle cx="12" cy="8" r="0.5" fill="currentColor"></circle></svg></button>
    </div>`;
    pad.appendChild(head);
    head.querySelector('#btn-info').onclick = openPhilosophy;

    // View switcher: Today (the ground) | the three aspects of life
    const glyphRow = document.createElement('div');
    glyphRow.style.cssText = 'display:flex;gap:10px;align-items:center';

    const todayBtn = document.createElement('button');
    todayBtn.textContent = 'Today';
    todayBtn.style.cssText = `height:44px;padding:0 18px;border-radius:999px;cursor:pointer;font:600 13px var(--font-body);${homeMode === null
        ? 'background:var(--ink);color:var(--ground);border:1px solid transparent'
        : 'background:transparent;color:var(--ink-soft);border:1px solid rgba(32,30,29,.13)'}`;
    todayBtn.onclick = () => setHomeMode(null);
    glyphRow.appendChild(todayBtn);

    glyphRow.insertAdjacentHTML('beforeend',
        '<span style="width:1px;height:26px;background:var(--edge-strong);flex:none"></span>');

    ['labour', 'work', 'action'].forEach(type => {
        const b = document.createElement('button');
        b.className = 'glyph-btn';
        b.title = MODE_META[type].word;
        if (homeMode === type) {
            b.style.background = MODE_META[type].tint;
            b.style.border = `1.5px solid ${MODE_META[type].c}`;
        }
        b.innerHTML = glyph(type, 19, type === 'action' ? 'animation:starIgnite 5s ease-in-out infinite' : '');
        b.onclick = () => setHomeMode(type);
        glyphRow.appendChild(b);
    });
    glyphRow.insertAdjacentHTML('beforeend',
        `<span style="flex:1"></span><span style="font:11px/1.4 var(--font-body);color:var(--ink-faint);font-style:italic;text-align:right;max-width:130px">${esc(M ? M.tagline : 'the acts of the day')}</span>`);
    pad.appendChild(glyphRow);

    // Principle of the day (can be hidden in settings)
    const plist = getPrinciples();
    if (appData.meta.showPrinciple !== false && plist.length > 0) {
        const pd = principleOfDayIndex();
        const period = (appData.meta.principleFreq || 'daily') === 'weekly' ? 'week' : 'day';
        const pCard = document.createElement('div');
        pCard.style.cssText = 'background:var(--star-tint);border-radius:22px;padding:14px 18px;display:flex;gap:13px;align-items:flex-start;cursor:pointer;position:relative';
        pCard.innerHTML = `
    ${starSVG(17, 'oklch(48% 0.09 320)', null, 'margin-top:2px;animation:starIgnite 5s ease-in-out infinite')}
    <div style="flex:1"><div class="kicker" style="font-size:9.5px;letter-spacing:.13em;color:var(--star-ink);margin-bottom:3px">Principle of the ${period} · ${pd + 1} of ${plist.length}</div>
    <div style="font-family:var(--font-display);font-size:16px;line-height:1.2;color:var(--ink)">${esc(plist[pd][0])}</div>
    <div style="font:12px/1.45 var(--font-body);color:var(--ink-soft);margin-top:2px">${esc(plist[pd][1] || '')}</div></div>
    <span style="font:11px var(--font-meta);color:oklch(48% 0.09 320);margin-top:2px">↗</span>`;
        pCard.onclick = goReflect;
        pad.appendChild(pCard);
    }

    // Sections
    const overdue = filt(getOverdueTasks());
    const daily = filt(getDailyItems());
    const upcoming = filt(getUpcomingTasks());
    const notDue = filt(getNotDueRituals());
    const someday = filt(getSomedayTasks());

    const section = (kickerHtml, items, buildRow) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px';
        const kd = document.createElement('div');
        kd.style.cssText = 'display:flex;align-items:center;gap:9px';
        kd.innerHTML = kickerHtml;
        wrap.appendChild(kd);
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'padding:6px 0;display:flex;flex-direction:column;position:relative';
        items.forEach(it => card.appendChild(buildRow(it)));
        wrap.appendChild(card);
        return wrap;
    };

    if (overdue.length > 0) {
        pad.appendChild(section(
            `<span class="kicker" style="color:var(--ember-press)">Overdue · ${overdue.length}</span>`,
            overdue, (it) => renderActRow(it, it.scheduled_date, { overdue: true })));
    }

    // Today card (with loop ring + arc in labour view)
    {
        const dueRituals = daily.filter(i => i.type === 'ritual');
        const doneCount = dueRituals.filter(i => isItemCompleted(i.id, ts)).length;
        let ringHtml = '';
        if (dueRituals.length > 0) {
            const dash = (doneCount / dueRituals.length * 50.3).toFixed(1);
            ringHtml = `
        <svg width="15" height="15" viewBox="0 0 20 20" style="transform:rotate(-90deg)"><circle cx="10" cy="10" r="8" fill="none" stroke="rgba(32,30,29,.12)" stroke-width="2.5"></circle><circle cx="10" cy="10" r="8" fill="none" stroke="var(--loop)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${dash} 50.3"></circle></svg>
        <span style="font:9.5px var(--font-meta);color:var(--loop-ink)">${doneCount}/${dueRituals.length} loops closed</span>`;
        }
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px';
        wrap.innerHTML = `<div style="display:flex;align-items:center;gap:9px"><span class="kicker" style="color:rgba(32,30,29,.45)">Today</span>${ringHtml}</div>`;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'padding:6px 0;display:flex;flex-direction:column;position:relative';

        if (daily.length === 0) {
            card.innerHTML = '<div class="empty-italic">Nothing declared yet — tap + to begin something unpredictable.</div>';
        } else {
            // Labour view: the loop bends the list
            const bend = homeMode === 'labour' && daily.length > 1;
            if (bend) {
                const n = daily.length;
                const arcH = 12 + n * 60;
                card.insertAdjacentHTML('afterbegin',
                    `<svg width="70" height="${arcH}" viewBox="0 0 70 ${arcH}" style="position:absolute;left:0;top:0;pointer-events:none"><path d="M31 36 Q75 ${36 + (n - 1) * 30} 31 ${36 + (n - 1) * 60}" fill="none" stroke="var(--loop)" stroke-width="1.5" stroke-dasharray="3 5" opacity="0.45"></path></svg>`);
            }
            daily.forEach((it, i) => {
                const row = renderActRow(it, ts);
                if (bend) {
                    const t = i / (daily.length - 1);
                    const arc = Math.round(88 * t * (1 - t));
                    row.style.marginLeft = arc + 'px';
                    row.style.marginRight = (-arc) + 'px';
                }
                card.appendChild(row);
            });
        }
        wrap.appendChild(card);
        pad.appendChild(wrap);
    }

    if (upcoming.length > 0) {
        pad.appendChild(section(
            '<span class="kicker" style="color:rgba(32,30,29,.45)">Upcoming</span>',
            upcoming, (it) => renderActRow(it, it.scheduled_date)));
    }

    if (notDue.length > 0) {
        pad.appendChild(section(
            '<span class="kicker" style="color:rgba(32,30,29,.45)">Loops resting today</span>',
            notDue, (it) => renderActRow(it, ts, { dimmed: true })));
    }

    if (someday.length > 0) {
        const det = document.createElement('details');
        det.className = 'collapsed-group';
        det.open = true;
        det.innerHTML = `<summary>Someday · ${someday.length}</summary>`;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'padding:6px 0;display:flex;flex-direction:column';
        someday.forEach(it => card.appendChild(renderActRow(it, ts)));
        det.appendChild(card);
        pad.appendChild(det);
    }

    // Streams (Work view)
    if (homeMode === 'work' || homeMode === 'action') {
        const modeGoals = appData.goals.filter(g => modeTypeOfGoal(g) === homeMode);
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px';
        wrap.innerHTML = `<div class="kicker" style="color:rgba(32,30,29,.45)">${homeMode === 'work' ? 'Streams' : 'Initiatives'}</div>`;
        const list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-direction:column;gap:8px';
        if (modeGoals.length === 0) {
            list.innerHTML = '<div class="empty-italic">No paths declared yet — tap + and start a stream.</div>';
        }
        modeGoals.forEach(g => {
            const done = g.status === 'completed';
            const ms = g.milestones || [];
            const msDone = ms.filter(m => m.done).length;
            const cur = ms.find(m => !m.done);
            const subParts = [];
            if (ms.length) subParts.push(`⚑ ${msDone}/${ms.length}` + (cur ? ` · current: ${cur.title}` : ''));
            if (g.start_date && g.deadline) subParts.push(`${fmtMonth(g.start_date)} → ${fmtMonth(g.deadline)}`);
            else if (g.deadline) subParts.push(`aims for ${fmtMonth(g.deadline)}`);
            else subParts.push('needs dates — see the horizon');
            const row = document.createElement('div');
            row.style.cssText = `display:flex;align-items:center;gap:12px;background:var(--surface-card);border:1px solid var(--edge);border-radius:18px;padding:11px 16px;cursor:pointer;opacity:${done ? 0.5 : 1}`;
            row.innerHTML = `
        <span style="width:16px;height:2.5px;border-radius:2px;background:${MODE_META[homeMode].c};flex:none"></span>
        <div style="flex:1;min-width:0"><div style="font:600 14px var(--font-body);color:var(--ink);${done ? 'text-decoration:line-through' : ''}">${esc(g.title)}</div>
        <div style="font:10.5px var(--font-meta);color:var(--ink-muted);margin-top:1px">${esc(subParts.join(' · '))}</div></div>
        <button class="st-done" title="${done ? 'Reactivate' : 'Mark complete'}" style="width:26px;height:26px;flex:none;border-radius:50%;display:grid;place-items:center;cursor:pointer;${done ? `background:${MODE_META[homeMode].c};border:1px solid transparent` : 'background:transparent;border:1px solid rgba(32,30,29,.18)'}">${done ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f9f4ed" stroke-width="3.2"><path d="M5 13l4 4L19 7"></path></svg>' : ''}</button>`;
            row.onclick = () => goStream(g.id, 'home');
            row.querySelector('.st-done').onclick = (e) => {
                e.stopPropagation();
                g.status = done ? 'active' : 'completed';
                saveData();
                render();
            };
            list.appendChild(row);
        });
        const addStream = document.createElement('button');
        addStream.className = 'btn-text';
        addStream.textContent = homeMode === 'work' ? '＋ new stream' : '＋ new initiative';
        addStream.onclick = () => {
            const f = appData.facets.find(x => {
                const m = appData.modes.find(md => md.id === x.modeId);
                return m && m.type === homeMode;
            });
            openGoalEditor({ facetId: f ? f.id : undefined });
        };
        list.appendChild(addStream);
        wrap.appendChild(list);
        pad.appendChild(wrap);
    }

    // FAB
    const fabRow = document.createElement('div');
    fabRow.style.cssText = 'display:flex;justify-content:flex-end;margin:-4px 0';
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = '+';
    fab.title = 'Add an act';
    fab.onclick = () => openItemEditor(null, { homeModePref: homeMode });
    fabRow.appendChild(fab);
    pad.appendChild(fabRow);

    // Evening reflection pill
    const marks = appData.principles.marks[ts] || {};
    const markCount = Object.keys(marks).filter(k => marks[k]).length;
    const pill = document.createElement('div');
    pill.style.cssText = 'display:flex;align-items:center;gap:12px;background:var(--surface-sunken);border-radius:999px;padding:11px 18px;cursor:pointer';
    pill.innerHTML = `${starSVG(14, 'var(--star)')}
    <span style="font:600 13px var(--font-body);color:var(--ink-soft);flex:1">Evening — did you act on a principle today?</span>
    <span style="font:600 11px var(--font-meta);color:var(--ember-hover)">${markCount}/5 →</span>`;
    pill.onclick = goReflect;
    pad.appendChild(pill);

    // Tiny utility links
    const util = document.createElement('div');
    util.style.cssText = 'display:flex;justify-content:flex-end;gap:16px';
    util.innerHTML = `
    <span id="lnk-review" style="font:600 9px var(--font-meta);letter-spacing:.14em;text-transform:uppercase;color:rgba(32,30,29,.4);cursor:pointer">rhythm →</span>
    <span id="lnk-backup" style="font:600 9px var(--font-meta);letter-spacing:.14em;text-transform:uppercase;color:rgba(32,30,29,.4);cursor:pointer">settings →</span>`;
    util.querySelector('#lnk-review').onclick = () => goReview('week');
    util.querySelector('#lnk-backup').onclick = openDataModal;
    pad.appendChild(util);

    // Horizon footer (zoom out to Life)
    pad.appendChild(renderHorizonFooter());

    screen.appendChild(pad);
    container.appendChild(screen);
}

function fmtMonth(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' });
}

function principleOfDayIndex() {
    const n = Math.max(getPrinciples().length, 1);
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const doy = Math.floor((now - start) / 864e5);
    if ((appData.meta.principleFreq || 'daily') === 'weekly') return Math.floor(doy / 7) % n;
    return doy % n;
}

let lifeZoom = 'fit'; // 'fit' | '3m' | '6m' | 'year'

function lifeRange() {
    const DAY = 864e5;
    const today = +new Date(todayStr());
    if (lifeZoom === '3m') return { min: today - 30 * DAY, max: today + 61 * DAY, today };
    if (lifeZoom === '6m') return { min: today - 61 * DAY, max: today + 122 * DAY, today };
    if (lifeZoom === 'year') return { min: today - 122 * DAY, max: today + 244 * DAY, today };
    let min = today - 45 * DAY;
    let max = today + 90 * DAY;
    appData.goals.filter(g => g.status !== 'completed' && g.start_date && g.deadline).forEach(g => {
        min = Math.min(min, +new Date(g.start_date));
        max = Math.max(max, +new Date(g.deadline));
    });
    const histDates = Object.keys(appData.history).sort();
    if (histDates.length) min = Math.min(min, Math.max(+new Date(histDates[0]), today - 180 * DAY));
    const pad = (max - min) * 0.04;
    return { min: min - pad, max: max + pad, today };
}

function renderHorizonFooter() {
    const { min, max, today } = lifeRange();
    const pos = t => ((t - min) / (max - min) * 100);
    const dated = appData.goals.filter(g => g.status !== 'completed' && g.start_date && g.deadline).slice(0, 3);
    const foot = document.createElement('div');
    foot.style.cssText = 'margin:0 -22px -26px;padding:14px 22px 18px;background:rgba(32,30,29,.045);border-top:1px solid rgba(32,30,29,.07);cursor:pointer';
    let barsHtml = '';
    dated.forEach((g, i) => {
        const mt = modeTypeOfGoal(g) || 'work';
        const l = pos(+new Date(g.start_date));
        const w = Math.max(pos(+new Date(g.deadline)) - l, 2);
        barsHtml += `<span style="position:absolute;left:${l}%;top:${2 + i * 11}px;width:${w}%;height:6px;border-radius:3px;background:${MODE_META[mt].c};opacity:${0.7 - i * 0.1}"></span>`;
    });
    // recent act dots
    const acts = Object.keys(appData.history).sort().slice(-6);
    acts.forEach(d => {
        barsHtml += `<span style="position:absolute;left:${pos(+new Date(d))}%;top:34px;width:4px;height:4px;border-radius:50%;background:rgba(32,30,29,.25)"></span>`;
    });
    foot.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
      <span style="font:600 9px var(--font-meta);letter-spacing:.14em;color:rgba(32,30,29,.4);text-transform:uppercase">Life · the horizon</span>
      <span style="font:9px var(--font-meta);color:rgba(32,30,29,.35)">tap to zoom out ↗</span></div>
    <div style="position:relative;height:40px">
      <span style="position:absolute;left:0;top:-4px;bottom:-4px;width:${pos(today)}%;background:linear-gradient(90deg,rgba(32,30,29,.05),transparent)"></span>
      <span style="position:absolute;left:${pos(today)}%;top:-4px;bottom:-4px;width:1.5px;background:var(--ember)"></span>
      ${barsHtml}
    </div>`;
    foot.onclick = goLife;
    return foot;
}

// --- View: Stream (a goal up close) ---
function renderStream(container, goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    if (!goal) return goHome();
    const facet = appData.facets.find(f => f.id === goal.facetId);
    const mtype = modeTypeOfGoal(goal) || 'work';
    const M = MODE_META[mtype];
    const noun = mtype === 'work' ? 'Stream · the path you extend' : (mtype === 'labour' ? 'Goal · the loop you keep' : 'Initiative · a beginning');

    const ms = goal.milestones || [];
    const msDone = ms.filter(m => m.done).length;
    const cur = ms.find(m => !m.done);
    const subParts = [];
    if (facet) subParts.push(facet.title);
    if (ms.length) subParts.push(`⚑ ${msDone}/${ms.length}` + (cur ? ` · current: ${cur.title}` : ''));
    if (goal.deadline) subParts.push(`deadline ${goal.deadline}`);
    if (goal.status === 'completed') subParts.push('complete');

    const screen = document.createElement('div');
    screen.className = 'screen raised';
    screen.innerHTML = ringsSVG(false, 130);
    const pad = document.createElement('div');
    pad.className = 'screen-pad';
    pad.style.gap = '20px';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px';
    head.innerHTML = `
    <div style="min-width:0"><div class="kicker" style="color:${M.ink};margin-bottom:7px">${esc(noun.toUpperCase())}</div>
    <h1 class="display" style="font-size:29px">${esc(goal.title)}</h1>
    <div style="font:12px var(--font-meta);color:var(--ink-muted);margin-top:6px">${esc(subParts.join(' · '))}</div></div>
    <div style="display:flex;gap:6px;flex:none">
      <button id="st-back" class="icon-round" title="Back"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"></path></svg></button>
      <button id="st-edit" class="icon-round" title="Edit">✎</button>
      <button id="st-life" class="icon-round" title="Zoom out to life"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.5-4.5M8 11h6"></path></svg></button>
    </div>`;
    pad.appendChild(head);
    head.querySelector('#st-back').onclick = goBack;
    head.querySelector('#st-edit').onclick = () => openGoalEditor({}, goal);
    head.querySelector('#st-life').onclick = goLife;

    const items = appData.items.filter(i => i.goalId === goalId && i.status !== 'archived');
    const ts = todayStr();

    const itemLine = (it) => {
        const dateStr = (it.type === 'task' && it.scheduled_date) ? it.scheduled_date : ts;
        const done = isItemCompleted(it.id, dateStr);
        const when = it.type === 'ritual' ? it.recurrence
            : (it.scheduled_date ? (it.scheduled_date === ts ? 'today' : it.scheduled_date) : 'someday');
        const line = document.createElement('div');
        line.style.cssText = 'display:flex;align-items:center;gap:10px';
        line.innerHTML = `
      <span class="mini-check" style="width:20px;height:20px;flex:none;border-radius:50%;display:grid;place-items:center;cursor:pointer;${done ? `background:${M.c};border:2px solid ${M.c}` : `border:2px solid ${M.c}`}">${done ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f9f4ed" stroke-width="3.5"><path d="M5 13l4 4L19 7"></path></svg>' : ''}</span>
      <span style="font:600 13px var(--font-body);color:${done ? 'var(--ink-faint)' : 'var(--ink)'};cursor:pointer;flex:1;min-width:0;${done ? 'text-decoration:line-through' : ''}">${esc(it.title)}</span>
      <span style="font:10px var(--font-meta);color:var(--ink-muted);flex:none">${esc(when)}</span>`;
        line.querySelector('.mini-check').onclick = () => toggleItemCompletion(it.id, dateStr);
        line.children[1].onclick = () => openItemEditor(it);
        return line;
    };

    const body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:10px';

    if (ms.length > 0) {
        const currentId = (ms.find(m => !m.done) || {}).id;
        ms.forEach((m, idx) => {
            const phaseItems = items.filter(i => i.milestoneId === m.id);
            const isCurrent = m.id === currentId;
            const card = document.createElement('div');
            if (m.done) {
                card.style.cssText = 'display:flex;gap:14px;align-items:flex-start;padding:15px 18px;border-radius:22px;background:rgba(255,252,246,.9);border:1px solid var(--edge);opacity:.55';
            } else if (isCurrent) {
                card.style.cssText = `display:flex;gap:14px;align-items:flex-start;padding:15px 18px;border-radius:22px;background:${M.tint};border:1px solid ${M.c}40`;
            } else {
                card.style.cssText = 'display:flex;gap:14px;align-items:flex-start;padding:15px 18px;border-radius:22px;border:1px dashed rgba(32,30,29,.15)';
            }
            const check = document.createElement('span');
            check.style.cssText = `width:26px;height:26px;flex:none;border-radius:50%;display:grid;place-items:center;cursor:pointer;${m.done ? `background:${M.c}` : (isCurrent ? `border:2px solid ${M.c}` : 'border:2px dashed rgba(32,30,29,.2)')}`;
            if (m.done) check.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f9f4ed" stroke-width="3.2"><path d="M5 13l4 4L19 7"></path></svg>';
            check.title = m.done ? 'Reopen phase' : 'Mark phase done';
            check.onclick = () => toggleMilestone(goal.id, m.id);
            const info = document.createElement('div');
            info.style.cssText = 'flex:1;min-width:0';
            info.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font:600 14.5px var(--font-body);${m.done ? 'text-decoration:line-through' : ''};color:${m.done || (!isCurrent && !m.done && !phaseItems.length) ? 'var(--ink-soft)' : 'var(--ink)'}">${idx + 1} · ${esc(m.title)}</span>
        ${isCurrent ? `<span style="padding:2px 9px;border-radius:999px;background:${M.c};color:#f9f4ed;font:600 9.5px var(--font-meta);letter-spacing:.08em">CURRENT</span>` : ''}</div>
        <div style="font:11px var(--font-meta);color:var(--ink-muted);margin-top:2px">${m.done ? 'done' : (m.target_date ? 'target · ' + m.target_date : '')}</div>`;
            if (phaseItems.length > 0) {
                const list = document.createElement('div');
                list.style.cssText = 'margin-top:10px;display:flex;flex-direction:column;gap:8px';
                phaseItems.forEach(it => list.appendChild(itemLine(it)));
                info.appendChild(list);
            }
            card.appendChild(check);
            card.appendChild(info);
            body.appendChild(card);
        });
        const loose = items.filter(i => !i.milestoneId || !ms.some(m => m.id === i.milestoneId));
        if (loose.length > 0) {
            const card = document.createElement('div');
            card.style.cssText = 'padding:15px 18px;border-radius:22px;background:rgba(255,252,246,.9);border:1px solid var(--edge);display:flex;flex-direction:column;gap:8px';
            card.innerHTML = '<div class="kicker" style="color:rgba(32,30,29,.4);margin-bottom:2px">Other items</div>';
            loose.forEach(it => card.appendChild(itemLine(it)));
            body.appendChild(card);
        }
    } else {
        if (items.length > 0) {
            const card = document.createElement('div');
            card.style.cssText = 'padding:15px 18px;border-radius:22px;background:rgba(255,252,246,.9);border:1px solid var(--edge);display:flex;flex-direction:column;gap:8px';
            items.forEach(it => card.appendChild(itemLine(it)));
            body.appendChild(card);
        }
        // Inline phase adder
        const adder = document.createElement('div');
        adder.style.cssText = 'padding:18px;border-radius:22px;border:1px dashed rgba(32,30,29,.18);display:flex;flex-direction:column;gap:10px';
        adder.innerHTML = `
      <div style="font:12px/1.5 var(--font-body);color:var(--ink-faint)">A path reads best in stretches — Build → Test → Launch.</div>
      <div style="display:flex;gap:8px">
        <input id="phase-draft" type="text" placeholder="e.g. Build" style="flex:1;min-width:0;padding:9px 16px;font-size:13px">
        <button id="phase-add" style="border:none;border-radius:999px;background:var(--ink);color:var(--ground);font:600 12.5px var(--font-body);padding:9px 18px;cursor:pointer;flex:none">Add a first phase</button>
      </div>`;
        adder.querySelector('#phase-add').onclick = () => {
            const t = adder.querySelector('#phase-draft').value.trim();
            if (!t) return;
            goal.milestones = goal.milestones || [];
            goal.milestones.push({ id: 'ms_' + Date.now(), title: t, target_date: '', done: false });
            saveData();
            render();
        };
        body.appendChild(adder);
    }

    // Archived items
    const archived = appData.items.filter(i => i.goalId === goalId && i.status === 'archived');
    if (archived.length > 0) {
        const det = document.createElement('details');
        det.className = 'collapsed-group';
        det.innerHTML = `<summary>Archived · ${archived.length}</summary>`;
        archived.forEach(it => {
            const row = document.createElement('div');
            row.style.cssText = 'padding:8px 4px;font:600 13px var(--font-body);color:var(--ink-faint);cursor:pointer';
            row.textContent = it.title;
            row.onclick = () => openItemEditor(it);
            det.appendChild(row);
        });
        body.appendChild(det);
    }

    pad.appendChild(body);

    // FAB: add an item to this stream
    const fabRow = document.createElement('div');
    fabRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center';
    fabRow.innerHTML = `<span style="font:12px/1.5 var(--font-body);color:var(--ink-faint);font-style:italic">${esc(MODE_META[mtype].tagline)}</span>`;
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = '+';
    fab.onclick = () => openItemEditor(null, { goalId: goal.id, milestoneId: cur ? cur.id : null });
    fabRow.appendChild(fab);
    pad.appendChild(fabRow);

    screen.appendChild(pad);
    container.appendChild(screen);
}

// --- View: Life (the horizon, deep space) ---
function renderLife(container) {
    const { min, max, today } = lifeRange();
    const pos = t => ((t - min) / (max - min) * 100);
    const ts = todayStr();

    const screen = document.createElement('div');
    screen.className = 'screen night';
    screen.innerHTML = ringsSVG(true, 140);
    const pad = document.createElement('div');
    pad.className = 'screen-pad';
    pad.style.gap = '20px';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start';
    head.innerHTML = `
    <div><div class="kicker" style="color:var(--ember-bright);margin-bottom:8px">LIFE · THE HORIZON</div>
    <h1 class="display" style="font-size:29px;color:var(--space-ink)">Behind you, ahead of you</h1>
    <div style="font:13px/1.5 var(--font-body);color:var(--space-ink-55);margin-top:6px">The trail of acts laid down, and the arcs still opening.</div></div>
    <button id="life-close" class="icon-round" title="Zoom back in"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.5-4.5M11 8v6M8 11h6"></path></svg></button>`;
    head.querySelector('#life-close').onclick = goBack;
    pad.appendChild(head);

    // Zoom the horizon: how much of time to hold in view
    const zoomRow = document.createElement('div');
    zoomRow.style.cssText = 'display:flex;gap:8px';
    [['3m', '3 months'], ['6m', '6 months'], ['year', 'Year'], ['fit', 'Everything']].forEach(([key, label]) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = `padding:6px 14px;border-radius:999px;font:600 11.5px var(--font-body);cursor:pointer;${lifeZoom === key
            ? 'background:var(--space-ink);color:var(--space-ground);border:1px solid transparent'
            : 'background:transparent;color:var(--space-ink-55);border:1px solid rgba(245,234,216,.2)'}`;
        b.onclick = () => { lifeZoom = key; render(); };
        zoomRow.appendChild(b);
    });
    pad.appendChild(zoomRow);

    // Month axis + stream rows
    const monthMarks = [];
    {
        const d = new Date(min);
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
        while (+d < max) {
            monthMarks.push({ l: pos(+d), name: d.toLocaleDateString('en-US', { month: 'short' }) });
            d.setMonth(d.getMonth() + 1);
        }
    }
    const chart = document.createElement('div');
    let axisHtml = monthMarks.map(m =>
        `<span style="position:absolute;left:calc(86px + (100% - 86px) * ${(m.l / 100).toFixed(3)});font:9px var(--font-meta);color:var(--space-ink-40);transform:translateX(-50%)">${m.name}</span>`).join('');
    chart.innerHTML = `<div style="position:relative;height:14px;margin-bottom:8px">${axisHtml}</div>`;

    const rowsWrap = document.createElement('div');
    rowsWrap.style.cssText = 'position:relative;display:flex;flex-direction:column;gap:16px;padding:6px 0 14px';
    const tp = (pos(today) / 100).toFixed(3);
    rowsWrap.innerHTML = `
    <span style="position:absolute;left:86px;top:-16px;bottom:0;width:calc((100% - 86px) * ${tp});background:linear-gradient(90deg,transparent,rgba(245,234,216,.045))"></span>
    <span style="position:absolute;left:calc(86px + (100% - 86px) * ${tp});top:-16px;bottom:0;width:1.5px;background:var(--ember-bright);z-index:1"></span>
    <span style="position:absolute;left:calc(86px + (100% - 86px) * ${tp});bottom:-12px;transform:translateX(-50%);font:8.5px var(--font-meta);color:var(--ember-bright)">today</span>`;

    const activeGoals = appData.goals.filter(g => g.status !== 'completed');
    const dated = activeGoals.filter(g => g.start_date && g.deadline);
    dated.forEach(g => {
        const mt = modeTypeOfGoal(g) || 'work';
        const s = +new Date(g.start_date), e = +new Date(g.deadline);
        // Clamp the bar to the visible window; skip goals fully outside it
        const lRaw = pos(Math.min(s, e));
        const rRaw = Math.max(pos(Math.max(s, e)), lRaw + 1.5);
        const l = Math.max(lRaw, 0), rr = Math.min(rRaw, 100);
        if (rr <= 0 || l >= 100) return;
        const w = rr - l;
        const ticks = (g.milestones || []).filter(m => m.target_date).map(m => {
            const abs = pos(+new Date(m.target_date));
            if (abs < l || abs > rr) return '';
            const p = ((abs - l) / w * 100);
            return `<span title="${esc(m.title)}" style="position:absolute;left:${p.toFixed(1)}%;top:50%;transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;box-sizing:border-box;${m.done ? `background:${MODE_META[mt].bright};border:2px solid var(--space-ground)` : `background:var(--space-ground);border:2px solid ${MODE_META[mt].bright}`}"></span>`;
        }).join('');
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center';
        row.innerHTML = `
      <span class="lr-name" style="width:86px;flex:none;font:600 11px var(--font-body);color:var(--space-ink-75);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.title)} ↗</span>
      <span style="flex:1;position:relative;height:14px">
        <span style="position:absolute;left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;top:4px;height:6px;border-radius:3px;background:${MODE_META[mt].bright};opacity:.8">${ticks}</span>
      </span>`;
        row.querySelector('.lr-name').onclick = () => goStream(g.id, 'life');
        rowsWrap.appendChild(row);
    });

    // Acts row: history dots behind, scheduled hollow ahead
    const actDates = Object.keys(appData.history).filter(d => Object.values(appData.history[d]).some(Boolean)).sort();
    const upcoming = getUpcomingTasks();
    const actsRow = document.createElement('div');
    actsRow.style.cssText = 'display:flex;align-items:center;margin-top:2px';
    let dots = actDates.map(d => {
        const p = pos(+new Date(d));
        if (p < 0 || p > 100) return '';
        return `<span style="position:absolute;left:${p.toFixed(1)}%;top:5px;width:4px;height:4px;border-radius:50%;background:rgba(245,234,216,.4)"></span>`;
    }).join('');
    dots += upcoming.map(u => {
        const p = pos(+new Date(u.scheduled_date));
        if (p < 0 || p > 100) return '';
        return `<span title="${esc(u.title)}" style="position:absolute;left:${p.toFixed(1)}%;top:4px;width:5px;height:5px;border-radius:50%;border:1.5px solid rgba(245,234,216,.4)"></span>`;
    }).join('');
    actsRow.innerHTML = `
    <span style="width:86px;flex:none;font:600 11px var(--font-body);color:var(--space-ink-40)">Acts</span>
    <span style="flex:1;position:relative;height:14px">${dots}</span>`;
    rowsWrap.appendChild(actsRow);
    chart.appendChild(rowsWrap);

    const totalActs = Object.values(appData.history).reduce((n, day) => n + Object.values(day).filter(Boolean).length, 0);
    chart.insertAdjacentHTML('beforeend',
        `<div style="display:flex;justify-content:space-between;font:10px var(--font-meta);color:var(--space-ink-40);margin-top:14px;padding-left:86px"><span>← ${totalActs} act${totalActs === 1 ? '' : 's'} laid down</span><span>${upcoming.length} scheduled ahead →</span></div>`);
    pad.appendChild(chart);

    // The loop, turning daily
    const labourFacets = appData.facets.filter(f => {
        const m = appData.modes.find(x => x.id === f.modeId);
        return m && m.type === 'labour';
    });
    for (const lf of labourFacets) {
        const goalIds = appData.goals.filter(g => g.facetId === lf.id).map(g => g.id);
        const rituals = appData.items.filter(i => i.type === 'ritual' && i.status !== 'archived' &&
            (goalIds.includes(i.goalId) || i.facetId === lf.id));
        if (rituals.length === 0) continue;
        const best = Math.max(...rituals.map(computeStreak));
        const loopCard = document.createElement('div');
        loopCard.style.cssText = 'display:flex;gap:18px;align-items:center;padding:13px 16px;border-radius:20px;border:1px solid var(--space-edge)';
        loopCard.innerHTML = `
      <svg width="62" height="62" viewBox="0 0 64 64" style="flex:none;animation:spinSlow 40s linear infinite"><circle cx="32" cy="32" r="24" fill="none" stroke="var(--loop-bright)" stroke-width="2" opacity="0.5"></circle><circle cx="32" cy="8" r="3.5" fill="var(--loop-bright)"></circle><circle cx="56" cy="32" r="3.5" fill="var(--loop-bright)"></circle><circle cx="32" cy="56" r="3.5" fill="none" stroke="var(--loop-bright)" stroke-width="1.5"></circle><circle cx="8" cy="32" r="3.5" fill="none" stroke="var(--loop-bright)" stroke-width="1.5"></circle></svg>
      <div style="font:12px/1.6 var(--font-body);color:var(--space-ink-55)"><b style="color:rgba(245,234,216,.8)">${esc(lf.title)}</b> · the loop, turning daily<br><span style="font:10.5px var(--font-meta);color:rgba(245,234,216,.45)">${esc(rituals.slice(0, 4).map(r => r.title).join(' · '))}</span><br>${best > 0 ? best + '-day tending streak' : 'begin the turning'}</div>`;
        pad.appendChild(loopCard);
        break;
    }

    // The trail behind — one-off acts only; rituals live in the loop
    const trail = [];
    for (let i = actDates.length - 1; i >= 0 && trail.length < 3; i--) {
        const d = actDates[i];
        const ids = Object.keys(appData.history[d]).filter(k => appData.history[d][k]);
        for (const id of ids) {
            const it = appData.items.find(x => x.id === id);
            if (it && it.type === 'task') {
                const g = appData.goals.find(x => x.id === it.goalId);
                trail.push({ d, label: it.title + (g ? ' — ' + g.title : '') });
                if (trail.length >= 3) break;
            }
        }
    }
    if (trail.length > 0) {
        const div = document.createElement('div');
        div.innerHTML = `<div class="kicker" style="font-size:9px;color:var(--space-ink-40);margin-bottom:8px">The trail behind</div>
      <div style="display:flex;flex-direction:column;gap:5px;font:11.5px var(--font-meta);color:rgba(245,234,216,.5)">
      ${trail.map(t => { const td = new Date(t.d); return `<div style="display:flex;gap:12px"><span style="color:var(--space-ink-40);width:52px;flex:none">${td.toLocaleDateString('en-US', { weekday: 'short' })} ${td.getDate()}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.label)}</span></div>`; }).join('')}
      </div>`;
        pad.appendChild(div);
    }

    // The road ahead
    if (upcoming.length > 0) {
        const div = document.createElement('div');
        div.innerHTML = `<div class="kicker" style="font-size:9px;color:var(--space-ink-40);margin-bottom:8px">The road ahead</div>
      <div style="display:flex;flex-direction:column;gap:5px;font:11.5px var(--font-meta);color:rgba(245,234,216,.5)">
      ${upcoming.slice(0, 3).map(u => {
            const g = appData.goals.find(x => x.id === u.goalId);
            return `<div style="display:flex;gap:12px;align-items:center"><span style="width:5px;height:5px;flex:none;border-radius:50%;border:1.5px solid rgba(245,234,216,.4)"></span><span style="color:var(--space-ink-40);width:52px;flex:none">${new Date(u.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.title + (g ? ' — ' + g.title : ''))}</span></div>`;
        }).join('')}
      </div>`;
        pad.appendChild(div);
    }

    // Needs dates — loops (labour goals) don't get arcs, so don't ask them for dates
    const undated = activeGoals.filter(g =>
        (!g.start_date || !g.deadline) && modeTypeOfGoal(g) !== 'labour');
    if (undated.length > 0) {
        const div = document.createElement('div');
        div.innerHTML = `<div class="kicker" style="font-size:9px;color:var(--space-ink-40);margin-bottom:8px">Needs dates</div>`;
        const list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-direction:column;gap:6px';
        undated.forEach(g => {
            const mt = modeTypeOfGoal(g) || 'work';
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;font:12.5px var(--font-body);color:rgba(245,234,216,.6);padding:8px 14px;border-radius:14px;background:rgba(245,234,216,.05)';
            row.innerHTML = `<span style="width:14px;height:2.5px;border-radius:2px;background:${MODE_META[mt].bright};flex:none"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.title)}</span><span class="set-dates" style="font:10px var(--font-meta);color:var(--ember-bright);cursor:pointer;flex:none">set dates →</span>`;
            row.querySelector('.set-dates').onclick = () => openGoalEditor({}, g);
            list.appendChild(row);
        });
        div.appendChild(list);
        pad.appendChild(div);
    }

    // Rhythm link + epigraph
    const foot = document.createElement('div');
    foot.style.cssText = 'margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center';
    foot.innerHTML = `
    <span id="life-rhythm" style="font:600 9px var(--font-meta);letter-spacing:.14em;text-transform:uppercase;color:var(--space-ink-40);cursor:pointer">the rhythm of your loops →</span>
    <div style="font:12px/1.6 var(--font-body);color:var(--space-ink-40);font-style:italic;text-align:center">A life of action, tended daily.</div>`;
    foot.querySelector('#life-rhythm').onclick = () => goReview('week');
    pad.appendChild(foot);

    screen.appendChild(pad);
    container.appendChild(screen);
}

// --- View: Reflect (evening, principles) ---
function renderReflect(container) {
    const ts = todayStr();
    const marks = appData.principles.marks[ts] || {};

    const screen = document.createElement('div');
    screen.className = 'screen night';
    screen.innerHTML = ringsSVG(true, 90);
    const pad = document.createElement('div');
    pad.className = 'screen-pad';
    pad.style.gap = '20px';

    const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start';
    head.innerHTML = `
    <div><div class="kicker" style="color:var(--ember-bright);margin-bottom:8px">EVENING · ${dateLabel.toUpperCase()}</div>
    <h1 class="display" style="font-size:29px;color:var(--space-ink)">Did you act today?</h1>
    <div style="font:13px/1.5 var(--font-body);color:var(--space-ink-55);margin-top:6px">Mark each principle you lived, however small the act.</div></div>
    <button id="rf-close" class="icon-round" style="font-size:14px">×</button>`;
    head.querySelector('#rf-close').onclick = goBack;
    pad.appendChild(head);

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    getPrinciples().forEach((p, i) => {
        const on = !!marks[i];
        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:20px;cursor:pointer;${on ? 'background:rgba(246,160,107,.12);border:1px solid rgba(246,160,107,.25)' : 'background:transparent;border:1px solid var(--space-edge)'}`;
        row.innerHTML = `
      ${starSVG(20, on ? '#f6a06b' : 'none', on ? null : 'rgba(245,234,216,.35)')}
      <div style="flex:1"><div style="font:600 14px/1.25 var(--font-body);color:${on ? 'var(--space-ink)' : 'var(--space-ink-75)'}">${esc(p[0])}</div>
      <div style="font:11.5px/1.4 var(--font-body);color:rgba(245,234,216,.45)">${esc(p[1] || '')}</div></div>`;
        row.onclick = () => {
            if (!appData.principles.marks[ts]) appData.principles.marks[ts] = {};
            appData.principles.marks[ts][i] = !appData.principles.marks[ts][i];
            saveData();
            render();
        };
        list.appendChild(row);
    });
    pad.appendChild(list);

    const note = document.createElement('textarea');
    note.placeholder = "How did it show up? e.g. Sent the first draft even though it wasn't ready…";
    note.value = appData.principles.notes[ts] || '';
    note.style.cssText = 'border-radius:20px;border:1px solid rgba(245,234,216,.12);background:transparent;padding:12px 16px;font:13px/1.5 var(--font-body);color:var(--space-ink);min-height:64px';
    note.oninput = () => {
        appData.principles.notes[ts] = note.value;
        saveData();
    };
    pad.appendChild(note);

    // This week's constellation
    const week = document.createElement('div');
    let dotsHtml = '';
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toLocaleDateString('en-CA');
        const dm = appData.principles.marks[ds] || {};
        const lit = Object.values(dm).some(Boolean);
        const isToday = i === 0;
        const label = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
        dotsHtml += `<span style="display:flex;flex-direction:column;align-items:center;gap:4px">
      ${lit ? starSVG(13, '#f6a06b', null, isToday ? 'animation:starIgnite 5s ease-in-out infinite' : '')
                : (isToday ? starSVG(13, 'none', 'rgba(245,234,216,.35)', 'animation:starIgnite 5s ease-in-out infinite')
                    : '<span style="width:5px;height:5px;border-radius:50%;background:rgba(245,234,216,.2);margin:4px 0"></span>')}
      <span style="font:9px var(--font-meta);color:${isToday ? 'var(--ember-bright)' : 'rgba(245,234,216,.4)'}">${label}</span></span>`;
    }
    week.innerHTML = `<div class="kicker" style="font-size:9px;color:var(--space-ink-40);margin-bottom:8px">This week's constellation</div>
    <div style="display:flex;gap:14px;align-items:flex-end">${dotsHtml}</div>`;
    pad.appendChild(week);

    const editLink = document.createElement('button');
    editLink.className = 'btn-text';
    editLink.style.cssText = 'color:var(--ember-bright);font:600 11px var(--font-meta);letter-spacing:.1em;text-transform:uppercase;text-align:right;padding:0';
    editLink.textContent = 'edit your principles →';
    editLink.onclick = openPrinciplesEditor;
    pad.appendChild(editLink);

    // Past evenings — a dial through what you wrote before
    const pastDates = Array.from(new Set(
        Object.keys(appData.principles.marks).concat(Object.keys(appData.principles.notes))
    )).filter(d =>
        d < ts &&
        ((appData.principles.notes[d] || '').trim() ||
            Object.values(appData.principles.marks[d] || {}).some(Boolean))
    ).sort().reverse();

    if (pastDates.length > 0) {
        reflectDial = Math.min(reflectDial, pastDates.length - 1);
        const d = pastDates[reflectDial];
        const dm = appData.principles.marks[d] || {};
        const lived = getPrinciples().filter((p, i) => dm[i]).map(p => p[0]);
        const noteTxt = (appData.principles.notes[d] || '').trim();
        const dObj = new Date(d);
        const dLabel = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short' }) + ' ' + dObj.getDate();

        const dial = document.createElement('div');
        dial.style.cssText = 'border:1px solid var(--space-edge);border-radius:20px;padding:13px 16px';
        dial.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="kicker" style="font-size:9px;color:var(--space-ink-40)">Past evenings · ${pastDates.length}</span>
        <span style="display:flex;gap:6px;align-items:center">
          <button id="dial-prev" class="icon-round" style="width:24px;height:24px;font-size:12px" ${reflectDial >= pastDates.length - 1 ? 'disabled' : ''}>‹</button>
          <span style="font:10px var(--font-meta);color:var(--space-ink-55)">${dLabel}</span>
          <button id="dial-next" class="icon-round" style="width:24px;height:24px;font-size:12px" ${reflectDial <= 0 ? 'disabled' : ''}>›</button>
        </span>
      </div>
      ${lived.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:${noteTxt ? '8px' : '0'}">${lived.map(n =>
            `<span style="display:inline-flex;align-items:center;gap:5px;font:10px var(--font-meta);color:var(--ember-bright)">${starSVG(9, '#f6a06b')}${esc(n)}</span>`).join('')}</div>` : ''}
      ${noteTxt ? `<div style="font:12px/1.5 var(--font-body);color:var(--space-ink-55);font-style:italic">"${esc(noteTxt)}"</div>` : ''}`;
        dial.querySelector('#dial-prev').onclick = () => { reflectDial++; render(); };
        dial.querySelector('#dial-next').onclick = () => { reflectDial--; render(); };
        pad.appendChild(dial);
    }

    const close = document.createElement('button');
    close.className = 'btn-ember';
    close.textContent = 'Close the day';
    close.onclick = goBack;
    pad.appendChild(close);

    screen.appendChild(pad);
    container.appendChild(screen);
}

// --- View: Review (the rhythm of your loops) ---
function renderReview(container) {
    const range = currentView.contextId === 'month' ? 'month' : 'week';
    const numDays = range === 'month' ? 30 : 7;

    const screen = document.createElement('div');
    screen.className = 'screen night';
    screen.innerHTML = ringsSVG(true, 100);
    const pad = document.createElement('div');
    pad.className = 'screen-pad';
    pad.style.gap = '20px';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start';
    head.innerHTML = `
    <div><div class="kicker" style="color:var(--loop-bright);margin-bottom:8px">RHYTHM · THE LOOPS YOU KEEP</div>
    <h1 class="display" style="font-size:29px;color:var(--space-ink)">${range === 'month' ? 'The month turning' : 'The week turning'}</h1>
    <div style="font:13px/1.5 var(--font-body);color:var(--space-ink-55);margin-top:6px">Ritual consistency, last ${numDays} days.</div></div>
    <button id="rv-close" class="icon-round" style="font-size:14px">×</button>`;
    head.querySelector('#rv-close').onclick = goBack;
    pad.appendChild(head);

    const toggle = document.createElement('div');
    toggle.style.cssText = 'display:flex;gap:8px';
    ['week', 'month'].forEach(r => {
        const b = document.createElement('button');
        b.style.cssText = `padding:6px 16px;border-radius:999px;font:600 12px var(--font-body);cursor:pointer;${r === range ? 'background:var(--space-ink);color:var(--space-ground);border:1px solid transparent' : 'background:transparent;color:var(--space-ink-55);border:1px solid rgba(245,234,216,.2)'}`;
        b.textContent = r === 'week' ? 'Week' : 'Month';
        b.onclick = () => goReview(r);
        toggle.appendChild(b);
    });
    pad.appendChild(toggle);

    const days = [];
    for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }
    const rituals = appData.items.filter(i => i.type === 'ritual' && activeVisible(i));

    if (rituals.length === 0) {
        pad.insertAdjacentHTML('beforeend', '<div class="empty-italic" style="color:var(--space-ink-40)">No loops turning yet.<br>Add a recurring act and check back here.</div>');
    }

    // Group by facet
    const groups = new Map();
    rituals.forEach(item => {
        const facet = facetOfItem(item);
        const key = facet ? facet.id : '_other';
        if (!groups.has(key)) groups.set(key, { facet, items: [] });
        groups.get(key).items.push(item);
    });

    groups.forEach(({ facet, items }) => {
        const mtype = facet ? ((appData.modes.find(m => m.id === facet.modeId) || {}).type || 'labour') : 'labour';
        const bright = MODE_META[mtype].bright;
        const sec = document.createElement('div');
        sec.innerHTML = `<div class="kicker" style="font-size:9px;color:${bright};margin-bottom:8px">${esc(facet ? facet.title : 'Other')}</div>`;
        items.forEach(item => {
            let due = 0, done = 0;
            const dots = days.map(d => {
                const isDue = isRitualDue(item, d);
                const isDone = isDue && isItemCompleted(item.id, d.toLocaleDateString('en-CA'));
                if (isDue) due++;
                if (isDone) done++;
                const label = range === 'week' ? `<span style="font:9px var(--font-meta);color:var(--space-ink-40)">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>` : '';
                const dot = isDue
                    ? (isDone ? `<span style="width:${range === 'week' ? 12 : 9}px;height:${range === 'week' ? 12 : 9}px;border-radius:50%;background:${bright};display:block"></span>`
                        : `<span style="width:${range === 'week' ? 12 : 9}px;height:${range === 'week' ? 12 : 9}px;border-radius:50%;border:1.5px solid rgba(245,234,216,.3);display:block;box-sizing:border-box"></span>`)
                    : `<span style="width:4px;height:4px;border-radius:50%;background:rgba(245,234,216,.12);display:block;margin:${range === 'week' ? 4 : 2.5}px"></span>`;
                return `<span style="display:flex;flex-direction:column;align-items:center;gap:3px">${dot}${label}</span>`;
            }).join('');
            const pct = due > 0 ? Math.round(done / due * 100) : null;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--space-edge)';
            row.innerHTML = `
        <div style="flex:1;min-width:0"><div style="font:600 13px var(--font-body);color:var(--space-ink-75)">${esc(item.title)}</div>
        <div style="font:10px var(--font-meta);color:var(--space-ink-40);margin-top:1px">${pct === null ? 'not due this stretch' : `${done}/${due} · ${pct}%`}</div></div>
        <div style="display:flex;gap:${range === 'week' ? 6 : 3}px;flex-wrap:${range === 'month' ? 'wrap' : 'nowrap'};max-width:${range === 'month' ? '160px' : 'none'};justify-content:flex-end">${dots}</div>`;
            sec.appendChild(row);
        });
        pad.appendChild(sec);
    });

    screen.appendChild(pad);
    container.appendChild(screen);
}

// --- Modal system (bottom sheets) ---
function renderModal(title, contentHtml, onSave, saveLabel = 'Save') {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal-card">
      <span class="sheet-handle"></span>
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="modal-body">${contentHtml}</div>
      <div class="modal-footer">
        <button class="btn-save">${saveLabel}</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    history.pushState({ view: currentView, homeMode, sheet: true }, '');
    modal.querySelector('.close-btn').onclick = () => closeModal(modal);
    modal.onclick = (e) => { if (e.target === modal) closeModal(modal); };
    modal.querySelector('.btn-save').onclick = () => {
        if (onSave(modal)) {
            closeModal(modal);
            saveData();
            render();
        }
    };
    return modal;
}

// First work-mode area, created on demand — new streams land here by default
function defaultWorkFacet() {
    let facet = appData.facets.find(f => {
        const m = appData.modes.find(x => x.id === f.modeId);
        return m && m.type === 'work';
    });
    if (!facet) {
        facet = { id: 'facet_' + Date.now(), title: 'Craft', modeId: 'mode_line' };
        appData.facets.push(facet);
        saveData();
    }
    return facet;
}

// --- Item editor (full, one flow: what · kind · when · where · phase) ---
function openItemEditor(item = null, prefill = {}) {
    const isEditing = !!item && !!item.id;
    const titleVal = isEditing ? item.title : '';
    const typeVal = isEditing ? item.type : (prefill.type || 'task');
    const dateVal = isEditing ? (item.scheduled_date || '') : (prefill.scheduled_date || todayStr());
    const recurVal = isEditing ? (item.recurrence || 'daily') : 'daily';

    // "Where it lives": a stream (goal:id), an area directly (facet:id), or nowhere
    let whereVal = '';
    if (isEditing) {
        whereVal = item.goalId ? 'goal:' + item.goalId : (item.facetId ? 'facet:' + item.facetId : '');
    } else if (prefill.goalId) {
        whereVal = 'goal:' + prefill.goalId;
    } else if (prefill.homeModePref) {
        const f = appData.facets.find(x => {
            const m = appData.modes.find(md => md.id === x.modeId);
            return m && m.type === prefill.homeModePref;
        });
        if (f) whereVal = 'facet:' + f.id;
    }

    const buildWhereOpts = (selected) => {
        const areaOpts = appData.facets.map(f => {
            const m = appData.modes.find(x => x.id === f.modeId);
            const v = 'facet:' + f.id;
            return `<option value="${v}" ${v === selected ? 'selected' : ''}>${esc(f.title)}${m ? ' · ' + m.title : ''}</option>`;
        }).join('');
        const streamOpts = appData.goals.filter(g => g.status !== 'completed').map(g => {
            const f = appData.facets.find(x => x.id === g.facetId);
            const v = 'goal:' + g.id;
            return `<option value="${v}" ${v === selected ? 'selected' : ''}>${esc(g.title)}${f ? ' · ' + esc(f.title) : ''}</option>`;
        }).join('');
        return `<option value="" ${!selected ? 'selected' : ''}>— just an act —</option>
      ${areaOpts ? `<optgroup label="Areas">${areaOpts}</optgroup>` : ''}
      ${streamOpts ? `<optgroup label="Streams">${streamOpts}</optgroup>` : ''}
      <option value="__newstream">＋ new stream…</option>`;
    };

    const RECUR_OPTIONS = [
        ['daily', 'Daily'], ['weekdays', 'Weekdays (M-F)'], ['weekends', 'Weekends'],
        ['monday', 'Every Monday'], ['tuesday', 'Every Tuesday'], ['wednesday', 'Every Wednesday'],
        ['thursday', 'Every Thursday'], ['friday', 'Every Friday'], ['saturday', 'Every Saturday'], ['sunday', 'Every Sunday']
    ];
    if (recurVal === 'weekly') RECUR_OPTIONS.push(['weekly', 'Weekly (Mondays)']);
    const recurOpts = RECUR_OPTIONS.map(([val, label]) =>
        `<option value="${val}" ${recurVal === val ? 'selected' : ''}>${label}</option>`).join('');

    const html = `
    <label>Title <input id="inp-title" type="text" value="${esc(titleVal)}" autofocus></label>
    <label>Where it lives <select id="inp-where">${buildWhereOpts(whereVal)}</select></label>
    <div id="ms-group" style="display:none">
      <label>Phase <select id="inp-ms"></select></label>
    </div>
    <label>Kind</label>
    <div style="display:flex;gap:8px">
      <label style="flex:1;cursor:pointer;display:block">
        <input type="radio" name="inp-type" value="task" ${typeVal === 'task' ? 'checked' : ''} style="display:none">
        <div class="chip-select-ui seg-btn" style="text-align:center">One-off act</div>
      </label>
      <label style="flex:1;cursor:pointer;display:block">
        <input type="radio" name="inp-type" value="ritual" ${typeVal === 'ritual' ? 'checked' : ''} style="display:none">
        <div class="chip-select-ui seg-btn" style="text-align:center">Ritual — a loop</div>
      </label>
    </div>
    <div id="recur-group" style="display:${typeVal === 'ritual' ? 'block' : 'none'}">
      <label>Recurrence <select id="inp-recur">${recurOpts}</select></label>
    </div>
    <div id="date-group" style="display:${typeVal === 'task' ? 'block' : 'none'}">
      <label>Scheduled <input id="inp-date" type="date" value="${dateVal}"></label>
      <small style="font:11px var(--font-meta);color:var(--ink-faint);margin-top:4px;display:block">leave empty to keep for someday</small>
    </div>
    ${isEditing ? `
    <div style="display:flex;gap:8px">
      <button id="btn-archive" class="btn-secondary" style="flex:1">${item.status === 'archived' ? 'Unarchive' : 'Archive'}</button>
      <button id="btn-delete" class="btn-secondary" style="flex:1;color:var(--ember-press)">Delete</button>
    </div>` : ''}
  `;

    const modal = renderModal(isEditing ? 'Edit act' : 'New act', html, (m) => {
        const title = m.querySelector('#inp-title').value.trim();
        if (!title) return false;
        const where = m.querySelector('#inp-where').value;
        const goalId = where.startsWith('goal:') ? where.slice(5) : '';
        const facetId = where.startsWith('facet:') ? where.slice(6) : null;
        const type = m.querySelector('input[name="inp-type"]:checked').value;
        const newItem = {
            id: isEditing ? item.id : 'item_' + Date.now(),
            title, type, goalId, facetId,
            milestoneId: goalId ? (m.querySelector('#inp-ms').value || null) : null,
            status: isEditing ? item.status : 'active',
            recurrence: type === 'ritual' ? m.querySelector('#inp-recur').value : 'none',
            scheduled_date: type === 'task' ? (m.querySelector('#inp-date').value || null) : null,
            deadline: ''
        };
        if (isEditing) Object.assign(item, newItem);
        else appData.items.push(newItem);
        return true;
    });

    const syncTypeUI = () => {
        const val = modal.querySelector('input[name="inp-type"]:checked').value;
        modal.querySelector('#recur-group').style.display = val === 'ritual' ? 'block' : 'none';
        modal.querySelector('#date-group').style.display = val === 'task' ? 'block' : 'none';
        modal.querySelectorAll('input[name="inp-type"]').forEach(input => {
            input.nextElementSibling.className = 'chip-select-ui seg-btn' + (input.checked ? ' on' : '');
        });
    };
    modal.querySelectorAll('input[name="inp-type"]').forEach(input => input.addEventListener('change', syncTypeUI));
    syncTypeUI();

    const msGroup = modal.querySelector('#ms-group');
    const msSelect = modal.querySelector('#inp-ms');
    const whereSelect = modal.querySelector('#inp-where');
    const syncMilestoneUI = () => {
        const v = whereSelect.value;
        const g = v.startsWith('goal:') ? appData.goals.find(x => x.id === v.slice(5)) : null;
        const list = (g && g.milestones) || [];
        if (list.length === 0) {
            msGroup.style.display = 'none';
            msSelect.innerHTML = '<option value=""></option>';
            return;
        }
        const cur = (isEditing ? item.milestoneId : prefill.milestoneId) || '';
        msSelect.innerHTML = '<option value="">— none —</option>' +
            list.map(mst => `<option value="${mst.id}" ${mst.id === cur ? 'selected' : ''}>${esc(mst.title)}</option>`).join('');
        msGroup.style.display = 'block';
    };
    let lastWhere = whereSelect.value;
    whereSelect.addEventListener('change', () => {
        if (whereSelect.value === '__newstream') {
            const name = prompt('Name the new stream — a path you extend over months:');
            if (!name || !name.trim()) {
                whereSelect.value = lastWhere;
                return;
            }
            const facet = defaultWorkFacet();
            const g = {
                id: 'goal_' + Date.now(), title: name.trim(), icon: '', status: 'active',
                facetId: facet.id, start_date: '', deadline: '', milestones: []
            };
            appData.goals.push(g);
            saveData();
            whereSelect.innerHTML = buildWhereOpts('goal:' + g.id);
        }
        lastWhere = whereSelect.value;
        syncMilestoneUI();
    });
    syncMilestoneUI();

    if (isEditing) {
        modal.querySelector('#btn-archive').onclick = () => {
            item.status = item.status === 'archived' ? 'active' : 'archived';
            closeModal(modal);
            saveData();
            render();
        };
        modal.querySelector('#btn-delete').onclick = () => {
            if (confirm(`Delete "${item.title}"? This cannot be undone.`)) {
                appData.items = appData.items.filter(i => i.id !== item.id);
                closeModal(modal);
                saveData();
                render();
            }
        };
    }
}

// --- Goal (stream) editor ---
function openGoalEditor(defaults = {}, goal = null) {
    const isEditing = !!goal;
    const facetIdVal = isEditing ? goal.facetId : (defaults.facetId || (appData.facets[0] || {}).id || '');
    const noun = goalNoun(facetIdVal);
    const facetOpts = appData.facets.map(f => {
        const m = appData.modes.find(x => x.id === f.modeId);
        return `<option value="${f.id}" ${f.id === facetIdVal ? 'selected' : ''}>${esc(f.title)}${m ? ' · ' + m.title : ''}</option>`;
    }).join('');
    const isCompleted = isEditing && goal.status === 'completed';

    const ms = (isEditing ? (goal.milestones || []) : []).map(m => ({ ...m }));

    const html = `
    <label>${noun} title <input id="inp-g-title" type="text" value="${isEditing ? esc(goal.title) : ''}" autofocus></label>
    <label>Area <select id="inp-g-facet">${facetOpts}</select></label>
    <button type="button" id="btn-new-area" class="btn-text">+ new area</button>
    <div style="display:flex;gap:12px">
      <label style="flex:1">Begins <input id="inp-g-start" type="date" value="${isEditing ? (goal.start_date || '') : ''}"></label>
      <label style="flex:1">Aims for <input id="inp-g-deadline" type="date" value="${isEditing ? (goal.deadline || '') : ''}"></label>
    </div>
    <label>Phases</label>
    <div id="ms-list"></div>
    <button type="button" id="btn-ms-add" class="btn-text">+ add phase</button>
    ${isEditing ? `
    <div style="display:flex;gap:8px">
      <button id="btn-g-complete" class="btn-secondary" style="flex:1">${isCompleted ? 'Reactivate' : 'Mark complete'}</button>
      <button id="btn-g-delete" class="btn-secondary" style="flex:1;color:var(--ember-press)">Delete</button>
    </div>` : ''}
  `;

    const modal = renderModal(isEditing ? `Edit ${noun.toLowerCase()}` : `New ${noun.toLowerCase()}`, html, (m) => {
        const title = m.querySelector('#inp-g-title').value.trim();
        if (!title) return false;
        const data = {
            title,
            facetId: m.querySelector('#inp-g-facet').value,
            start_date: m.querySelector('#inp-g-start').value,
            deadline: m.querySelector('#inp-g-deadline').value,
            milestones: ms.filter(x => x.title.trim())
        };
        if (isEditing) Object.assign(goal, data);
        else appData.goals.push({ id: 'goal_' + Date.now(), icon: '', status: 'active', ...data });
        return true;
    }, 'Place it on the horizon');

    const msList = modal.querySelector('#ms-list');
    const renderMsRows = () => {
        msList.innerHTML = '';
        if (ms.length === 0) {
            msList.innerHTML = '<div style="font:11.5px var(--font-body);color:var(--ink-faint);font-style:italic;padding:2px 0 6px">Optional stretches, e.g. Build → Test → Launch.</div>';
            return;
        }
        ms.forEach((mst, idx) => {
            const row = document.createElement('div');
            row.className = 'ms-row';
            row.innerHTML = `
        <input type="checkbox" class="ms-done" ${mst.done ? 'checked' : ''} title="Done">
        <input type="text" class="ms-title" placeholder="e.g. Build" value="${esc(mst.title)}">
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

    modal.querySelector('#btn-new-area').onclick = () => {
        const name = prompt('Name the new area (e.g. Health, Craft, Community):');
        if (!name || !name.trim()) return;
        const kind = (prompt('Which mode? labour / work / action', 'work') || 'work').toLowerCase();
        const modeId = kind.startsWith('l') && !kind.startsWith('la') ? 'mode_line'
            : kind.startsWith('la') ? 'mode_circle'
                : kind.startsWith('a') ? 'mode_web' : 'mode_line';
        const facet = { id: 'facet_' + Date.now(), title: name.trim(), modeId };
        appData.facets.push(facet);
        saveData();
        const sel = modal.querySelector('#inp-g-facet');
        const m = appData.modes.find(x => x.id === modeId);
        sel.insertAdjacentHTML('beforeend', `<option value="${facet.id}" selected>${esc(facet.title)} · ${m.title}</option>`);
        sel.value = facet.id;
    };

    if (isEditing) {
        modal.querySelector('#btn-g-complete').onclick = () => {
            goal.status = isCompleted ? 'active' : 'completed';
            closeModal(modal);
            saveData();
            render();
        };
        modal.querySelector('#btn-g-delete').onclick = () => {
            const itemCount = appData.items.filter(i => i.goalId === goal.id).length;
            const msg = itemCount > 0
                ? `Delete "${goal.title}"? Its ${itemCount} item(s) will be kept, without a stream.`
                : `Delete "${goal.title}"?`;
            if (confirm(msg)) {
                appData.items.forEach(i => { if (i.goalId === goal.id) i.goalId = ''; });
                appData.goals = appData.goals.filter(g => g.id !== goal.id);
                closeModal(modal);
                saveData();
                currentView = { level: 'home', contextId: null };
                render();
            }
        };
    }
}

// --- How to use this app ---
function openGuide() {
    const term = (name, glyphHtml, def) => `
    <div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0">
      ${glyphHtml ? `<span style="flex:none;width:22px;display:grid;place-items:center;margin-top:1px">${glyphHtml}</span>` : '<span style="flex:none;width:22px"></span>'}
      <div style="font:12.5px/1.5 var(--font-body);color:var(--ink-soft)"><b style="color:var(--ink)">${name}</b> — ${def}</div>
    </div>`;
    const dot = (color) => `<span style="width:10px;height:10px;border-radius:50%;border:2px solid ${color};display:inline-block"></span>`;

    const html = `
    <div style="font:13px/1.6 var(--font-body);color:var(--ink-soft)">
      This app is a <b style="color:var(--ink)">telescope for a life</b>, after Hannah Arendt's
      <i>vita activa</i>. One world, seen at different zoom levels: the act in front of you,
      the paths it extends, and the arc of your life behind and ahead. Everything you write
      stays on this device.
    </div>

    <div>
      <div class="kicker" style="color:rgba(32,30,29,.45);margin-bottom:4px">The three aspects of life</div>
      ${term('Labour · the loop', glyph('labour', 15), 'anchors you tend so everything else can move — health, home, rest. Its acts repeat; kept loops grow streaks.')}
      ${term('Work · the line', glyph('work', 15), 'paths you extend that outlast the day — craft, learning, building. Its streams stretch across months.')}
      ${term('Action · the star', glyph('action', 15), 'acts that define your life; beginnings no one could predict. Initiatives, and the principles you live by.')}
    </div>

    <div>
      <div class="kicker" style="color:rgba(32,30,29,.45);margin-bottom:4px">The words the app uses</div>
      ${term('Act', dot('var(--ink-soft)'), 'one thing you do — a one-off task, or a ritual that recurs. Tap its circle to complete it; tap its small grey line to zoom out to where it lives.')}
      ${term('Ritual', dot('var(--loop)'), 'an act that repeats — daily, weekdays, or a chosen day. Completing it on its due days builds a tending streak.')}
      ${term('Area', null, 'a region of life you tend or build in — Health, Craft, Family. Every area belongs to one of the three aspects.')}
      ${term('Stream', dot('var(--line)'), 'a path inside an area that you extend over months — a book, a product, a practice. Give it a start, a deadline, and phases.')}
      ${term('Phase', null, 'a stretch of a stream — Build → Test → Launch. The first unfinished phase is <b>current</b>; acts can live inside a phase.')}
      ${term('Today', null, 'the ground level: everything due now — overdue, today, upcoming, resting loops, and someday. The Today button shows all of life; the three glyphs filter one aspect.')}
      ${term('Someday', null, 'acts you’ve declared but not yet scheduled. They wait, visible, until you give them a day.')}
      ${term('The Horizon', null, 'the widest zoom (🗓): your streams as arcs in time, the trail of acts behind you, the road ahead. Zoom with the 3-months → Everything chips.')}
      ${term('Principles', starSVG(13, 'var(--star)'), 'five (or your own) commitments that walk with you. One greets you each morning; each evening you mark the ones you lived and leave a line about how.')}
      ${term('Rhythm', null, 'the week or month of your loops — which rituals turned, which rested.')}
    </div>

    <div>
      <div class="kicker" style="color:rgba(32,30,29,.45);margin-bottom:4px">Good to know</div>
      ${term('Adding', null, 'the ＋ button does everything in one sheet: name the act, choose where it lives (an area, a stream, or a new stream), its kind, and its day.')}
      ${term('Zooming', null, 'tap an act’s meta line → its stream. Tap the horizon strip at the bottom of Today → your life. Back always steps one level in.')}
      ${term('Your data', null, 'lives only on this device. The app keeps 7 daily safety copies (restore in Settings), and you can export/import a backup file to move devices.')}
    </div>`;

    const modal = renderModal('How to use this app', html, () => true, 'Got it');
}

// --- Principles editor ---
function openPrinciplesEditor() {
    const list = getPrinciples().map(p => p.slice());

    const html = `
    <p style="font:12px/1.5 var(--font-body);color:var(--ink-soft)">These walk with you — one greets you each morning, and each evening you mark the ones you lived. Make them yours.</p>
    <div id="pr-list"></div>
    <button type="button" id="pr-add" class="btn-text">＋ add a principle</button>`;

    const modal = renderModal('Your principles', html, (m) => {
        const cleaned = list.filter(p => p[0].trim()).map(p => [p[0].trim(), (p[1] || '').trim()]);
        if (cleaned.length === 0) return false;
        appData.principlesList = cleaned;
        return true;
    });

    const listDiv = modal.querySelector('#pr-list');
    const renderRows = () => {
        listDiv.innerHTML = '';
        list.forEach((p, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;flex-direction:column;gap:5px;padding:10px 0;border-bottom:1px solid var(--edge)';
            row.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" class="pr-name" placeholder="Principle" value="${esc(p[0])}" style="flex:1;padding:9px 14px;font-size:13px;font-weight:600">
          <button type="button" class="pr-del" style="background:none;border:none;color:var(--ink-faint);font-size:1rem;cursor:pointer;padding:4px">×</button>
        </div>
        <input type="text" class="pr-desc" placeholder="What it means, in a line" value="${esc(p[1] || '')}" style="padding:8px 14px;font-size:12px">`;
            row.querySelector('.pr-name').oninput = (e) => { p[0] = e.target.value; };
            row.querySelector('.pr-desc').oninput = (e) => { p[1] = e.target.value; };
            row.querySelector('.pr-del').onclick = () => { list.splice(idx, 1); renderRows(); };
            listDiv.appendChild(row);
        });
    };
    renderRows();
    modal.querySelector('#pr-add').onclick = () => {
        list.push(['', '']);
        renderRows();
        const names = listDiv.querySelectorAll('.pr-name');
        names[names.length - 1].focus();
    };
}

// --- Settings, backup & restore ---
function openDataModal() {
    const snaps = snapshotKeys().reverse();
    const snapRows = snaps.map(k => {
        const date = k.slice(SNAPSHOT_PREFIX.length);
        let count = '';
        try {
            const d = JSON.parse(localStorage.getItem(k));
            count = ` · ${(d.items || []).length} acts`;
        } catch (e) { /* unreadable snapshot */ }
        const dObj = new Date(date);
        const label = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short' }) + ' ' + dObj.getDate();
        return `<div class="snap-row" data-key="${k}" style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:14px;background:rgba(32,30,29,.04);cursor:pointer">
      <span style="font:600 12px var(--font-body);color:var(--ink-soft);flex:1">${label}${count}</span>
      <span style="font:10px var(--font-meta);color:var(--ember-hover)">restore →</span></div>`;
    }).join('');

    const showP = appData.meta.showPrinciple !== false;
    const freq = appData.meta.principleFreq || 'daily';
    const html = `
    <button type="button" id="set-guide" class="btn-secondary" style="text-align:left;display:flex;align-items:center;gap:10px">
      <span style="font-size:15px">✦</span> How to use this app
    </button>
    <div><div class="kicker" style="color:rgba(32,30,29,.45);margin-bottom:8px">Principles</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <label style="flex-direction:row;align-items:center;gap:10px;text-transform:none;letter-spacing:0;font:600 13px var(--font-body);color:var(--ink-soft);cursor:pointer">
        <input id="set-showp" type="checkbox" ${showP ? 'checked' : ''} style="width:auto"> Show a principle on the Today masthead
      </label>
      <label style="flex-direction:row;align-items:center;gap:10px;text-transform:none;letter-spacing:0;font:600 13px var(--font-body);color:var(--ink-soft)">
        Rotate <select id="set-freq" style="width:auto;padding:8px 14px;font-size:13px">
          <option value="daily" ${freq === 'daily' ? 'selected' : ''}>daily</option>
          <option value="weekly" ${freq === 'weekly' ? 'selected' : ''}>weekly</option>
        </select>
      </label>
      <button type="button" id="set-editp" class="btn-text" style="padding:0">edit the principles →</button>
    </div></div>
    <p style="font:12.5px/1.55 var(--font-body);color:var(--ink-soft)">Your data lives only on this device — nothing is sent anywhere. The app quietly keeps a daily safety copy of the last 7 days; tap one below to restore it. Export a file to move devices.</p>
    ${snaps.length ? `<div><div class="kicker" style="color:rgba(32,30,29,.45);margin-bottom:8px">Daily safety copies</div>
    <div style="display:flex;flex-direction:column;gap:6px">${snapRows}</div></div>` : ''}
    <button id="btn-export" class="btn-secondary">Export backup (JSON)</button>
    <label class="btn-secondary" style="text-align:center;cursor:pointer;font:600 13px var(--font-body);letter-spacing:0;text-transform:none;color:var(--ink-soft)">Import backup…
      <input id="inp-import" type="file" accept=".json,application/json" style="display:none">
    </label>
  `;
    const modal = renderModal('Settings & backup', html, () => false);
    modal.querySelector('.modal-footer').style.display = 'none';

    modal.querySelector('#set-showp').onchange = (e) => {
        appData.meta.showPrinciple = e.target.checked;
        saveData();
        render();
    };
    modal.querySelector('#set-freq').onchange = (e) => {
        appData.meta.principleFreq = e.target.value;
        saveData();
        render();
    };
    modal.querySelector('#set-editp').onclick = () => {
        closeModal(modal);
        openPrinciplesEditor();
    };
    modal.querySelector('#set-guide').onclick = () => {
        closeModal(modal);
        openGuide();
    };

    modal.querySelectorAll('.snap-row').forEach(row => {
        row.onclick = () => {
            const key = row.dataset.key;
            const date = key.slice(SNAPSHOT_PREFIX.length);
            if (!confirm(`Restore the safety copy from ${date}? Changes made since then will be replaced.`)) return;
            try {
                appData = JSON.parse(localStorage.getItem(key));
            } catch (e) {
                alert('This safety copy could not be read.');
                return;
            }
            loadDataMigrateInPlace();
            saveData();
            closeModal(modal);
            currentView = { level: 'home', contextId: null };
            render();
        };
    });

    modal.querySelector('#btn-export').onclick = () => {
        const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `acts-of-life-backup-${todayStr()}.json`;
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
            loadDataMigrateInPlace();
            saveData();
            closeModal(modal);
            currentView = { level: 'home', contextId: null };
            render();
        };
        reader.readAsText(file);
    };
}

function loadDataMigrateInPlace() {
    appData.modes = [
        { id: 'mode_circle', title: 'Labour', type: 'labour' },
        { id: 'mode_line', title: 'Work', type: 'work' },
        { id: 'mode_web', title: 'Action', type: 'action' }
    ];
    if (!appData.history) appData.history = {};
    if (!appData.goals) appData.goals = [];
    if (!appData.principles) appData.principles = { marks: {}, notes: {} };
    if (!appData.principles.marks) appData.principles.marks = {};
    if (!appData.principles.notes) appData.principles.notes = {};
    if (!appData.meta) appData.meta = {};
    if (!Array.isArray(appData.principlesList) || appData.principlesList.length === 0) {
        appData.principlesList = PRINCIPLES.map(p => p.slice());
    }
}

// --- The philosophy card (replay from home) ---
function openPhilosophy() {
    const html = `
    <div style="display:flex;gap:12px;align-items:center">
      <span style="width:44px;height:44px;border-radius:999px;background:var(--loop-tint);display:grid;place-items:center">${glyph('labour', 19)}</span>
      <span style="width:44px;height:44px;border-radius:999px;background:var(--line-tint);display:grid;place-items:center">${glyph('work', 19)}</span>
      <span style="width:44px;height:44px;border-radius:999px;background:var(--star-tint);display:grid;place-items:center">${glyph('action', 19, 'animation:starIgnite 5s ease-in-out infinite')}</span>
    </div>
    <h1 style="font-family:var(--font-display);font-weight:400;font-size:28px;line-height:1.08;margin:0">A life of action,<br>tended daily.</h1>
    <div style="display:flex;flex-direction:column;gap:12px;font:13.5px/1.55 var(--font-body);color:var(--ink-soft)">
      <div><b style="color:var(--ink)">The loop</b> — anchors you tend so everything else can move.</div>
      <div><b style="color:var(--ink)">The line</b> — paths you extend, that outlast the day.</div>
      <div><b style="color:var(--ink)">The star</b> — acts that define your life; beginnings no one could predict.</div>
    </div>
    <div style="padding:16px 18px;border-radius:22px;background:var(--surface-sunken)">
      <div style="font:600 9.5px var(--font-meta);letter-spacing:.13em;color:var(--ember-press);text-transform:uppercase;margin-bottom:5px">After Hannah Arendt · 1906–1975</div>
      <div style="font:12.5px/1.55 var(--font-body);color:var(--ink-soft);font-style:italic">This app borrows its grammar from her thought — labour that sustains, work that endures, action that begins. To act, she taught, is to start something new in the world.</div>
    </div>`;
    const modal = renderModal('The philosophy', html, () => true, 'Back to today');
}

// --- Onboarding (4 steps) ---
function renderOnboarding() {
    const appDiv = document.getElementById('app');
    let step = 0;
    const state = {
        areas: { Health: true, Craft: true },
        stream: '',
        act: ''
    };
    const AREA_CHIPS = [
        { name: 'Health', g: 'labour' }, { name: 'Home', g: 'labour' },
        { name: 'Craft', g: 'work' }, { name: 'Learning', g: 'work' },
        { name: 'Family', g: 'work' }, { name: 'Friends', g: 'work' },
        { name: 'Initiatives', g: 'action' }
    ];

    const renderStep = () => {
        appDiv.innerHTML = '';
        const screen = document.createElement('div');
        screen.className = 'screen';
        screen.innerHTML = `<svg viewBox="0 0 390 780" preserveAspectRatio="xMidYMin slice" class="rings" style="transform:scale(${(1.7 - step * 0.25).toFixed(2)});transform-origin:50% 18%;transition:transform .6s ease" aria-hidden="true"><circle cx="195" cy="140" r="90" fill="none" stroke="rgba(32,30,29,0.06)" stroke-width="1.5"></circle><circle cx="195" cy="140" r="190" fill="none" stroke="rgba(32,30,29,0.05)" stroke-width="1.5"></circle><circle cx="195" cy="140" r="310" fill="none" stroke="rgba(32,30,29,0.045)" stroke-width="1.5"></circle><circle cx="195" cy="140" r="450" fill="none" stroke="rgba(32,30,29,0.04)" stroke-width="1.5"></circle></svg>`;
        const pad = document.createElement('div');
        pad.className = 'screen-pad';
        pad.style.gap = '22px';

        // dots + skip
        const top = document.createElement('div');
        top.style.cssText = 'display:flex;justify-content:space-between;align-items:center';
        top.innerHTML = `
      <div style="display:flex;gap:6px">${[0, 1, 2, 3].map(i =>
            `<span style="width:8px;height:8px;border-radius:50%;background:${i <= step ? 'var(--ember)' : 'rgba(32,30,29,.15)'}"></span>`).join('')}</div>
      <span id="ob-skip" style="font:600 11px var(--font-meta);color:var(--ink-faint);cursor:pointer">skip →</span>`;
        top.querySelector('#ob-skip').onclick = finish;
        pad.appendChild(top);

        const body = document.createElement('div');
        body.style.cssText = 'display:flex;flex-direction:column;gap:20px;flex:1';

        if (step === 0) {
            body.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;margin-top:12px">
          <span style="width:44px;height:44px;border-radius:999px;background:var(--loop-tint);display:grid;place-items:center">${glyph('labour', 19)}</span>
          <span style="width:44px;height:44px;border-radius:999px;background:var(--line-tint);display:grid;place-items:center">${glyph('work', 19)}</span>
          <span style="width:44px;height:44px;border-radius:999px;background:var(--star-tint);display:grid;place-items:center">${glyph('action', 19, 'animation:starIgnite 5s ease-in-out infinite')}</span>
        </div>
        <h1 style="font-family:var(--font-display);font-weight:400;font-size:34px;line-height:1.08;margin:0">A life of action,<br>tended daily.</h1>
        <div style="display:flex;flex-direction:column;gap:12px;font:13.5px/1.55 var(--font-body);color:var(--ink-soft)">
          <div><b style="color:var(--ink)">The loop</b> — anchors you tend so everything else can move.</div>
          <div><b style="color:var(--ink)">The line</b> — paths you extend, that outlast the day.</div>
          <div><b style="color:var(--ink)">The star</b> — acts that define your life; beginnings no one could predict.</div>
        </div>
        <div style="margin-top:auto;padding:16px 18px;border-radius:22px;background:var(--surface-sunken)">
          <div style="font:600 9.5px var(--font-meta);letter-spacing:.13em;color:var(--ember-press);text-transform:uppercase;margin-bottom:5px">After Hannah Arendt · 1906–1975</div>
          <div style="font:12.5px/1.55 var(--font-body);color:var(--ink-soft);font-style:italic">This app borrows its grammar from her thought — labour that sustains, work that endures, action that begins. To act, she taught, is to start something new in the world.</div>
        </div>`;
        } else if (step === 1) {
            body.innerHTML = `
        <div class="kicker" style="color:var(--ember-hover);margin-top:12px">Step 2 · Your areas</div>
        <h1 class="display" style="line-height:1.1">Where will you tend and build?</h1>
        <div style="font:13px/1.5 var(--font-body);color:var(--ink-muted)">Pick a few to begin. Loops repeat; lines advance.</div>
        <div id="ob-chips" style="display:flex;flex-wrap:wrap;gap:9px"></div>`;
            const chips = body.querySelector('#ob-chips');
            AREA_CHIPS.forEach(a => {
                const on = !!state.areas[a.name];
                const tint = MODE_META[a.g].tint;
                const chip = document.createElement('span');
                chip.style.cssText = `display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;cursor:pointer;font:600 13px var(--font-body);${on ? `background:${tint};border:1px solid transparent;color:var(--ink)` : 'background:transparent;border:1px solid rgba(32,30,29,.15);color:var(--ink-soft)'}`;
                chip.innerHTML = `${glyph(a.g, 13)}${a.name}`;
                chip.onclick = () => { state.areas[a.name] = !state.areas[a.name]; renderStep(); };
                chips.appendChild(chip);
            });
        } else if (step === 2) {
            body.innerHTML = `
        <div class="kicker" style="color:var(--ember-hover);margin-top:12px">Step 3 · A first stream</div>
        <h1 class="display" style="line-height:1.1">Name one path worth extending.</h1>
        <div style="font:13px/1.5 var(--font-body);color:var(--ink-muted)">A stream is something you build over months — you can give it dates and phases later, on the horizon.</div>
        <input id="ob-stream" type="text" placeholder="e.g. Write the first book" value="${esc(state.stream)}">`;
            body.querySelector('#ob-stream').oninput = (e) => { state.stream = e.target.value; };
        } else {
            body.innerHTML = `
        <div class="kicker" style="color:var(--ember-hover);margin-top:12px">Step 4 · A first act</div>
        <h1 class="display" style="line-height:1.1">What will you do today?</h1>
        <input id="ob-act" type="text" placeholder="e.g. Meditate for 15 min" value="${esc(state.act)}">
        <div style="padding:15px 18px;border-radius:22px;background:var(--star-tint)">
          <div style="font:600 9.5px var(--font-meta);letter-spacing:.13em;color:var(--star-ink);text-transform:uppercase;margin-bottom:7px">Five principles will walk with you</div>
          <div style="font:12.5px/1.7 var(--font-body);color:var(--ink-soft)">${getPrinciples().map(p => esc(p[0])).join(' · ')}</div>
          <div style="font:11.5px/1.5 var(--font-body);color:var(--ink-faint);margin-top:5px;font-style:italic">One greets you each morning; each evening you mark the ones you lived.</div>
        </div>`;
            body.querySelector('#ob-act').oninput = (e) => { state.act = e.target.value; };
        }
        pad.appendChild(body);

        const nav = document.createElement('div');
        nav.style.cssText = 'display:flex;gap:10px';
        if (step > 0) {
            const back = document.createElement('button');
            back.className = 'btn-ghost';
            back.textContent = 'Back';
            back.onclick = () => { step--; renderStep(); };
            nav.appendChild(back);
        }
        const next = document.createElement('button');
        next.className = 'btn-ember';
        next.style.flex = '1';
        next.textContent = step === 3 ? 'Begin' : 'Continue';
        next.onclick = () => {
            if (step < 3) { step++; renderStep(); return; }
            finish();
        };
        nav.appendChild(next);
        pad.appendChild(nav);

        screen.appendChild(pad);
        appDiv.appendChild(screen);
    };

    const finish = () => {
        const MODE_ID = { labour: 'mode_circle', work: 'mode_line', action: 'mode_web' };
        AREA_CHIPS.filter(a => state.areas[a.name]).forEach(a => {
            if (!appData.facets.some(f => f.title === a.name)) {
                appData.facets.push({
                    id: 'facet_' + Date.now() + Math.random().toString(36).substr(2, 4),
                    title: a.name, modeId: MODE_ID[a.g]
                });
            }
        });
        const stream = state.stream.trim();
        if (stream) {
            let facet = appData.facets.find(f => f.modeId === 'mode_line');
            if (!facet) {
                facet = { id: 'facet_' + Date.now(), title: 'Craft', modeId: 'mode_line' };
                appData.facets.push(facet);
            }
            appData.goals.push({
                id: 'goal_' + Date.now(), title: stream, icon: '', status: 'active',
                facetId: facet.id, start_date: '', deadline: '', milestones: []
            });
        }
        const act = state.act.trim();
        if (act) {
            const labourFacet = appData.facets.find(f => f.modeId === 'mode_circle');
            appData.items.push({
                id: 'item_' + Date.now(), title: act, type: 'task', goalId: '',
                facetId: labourFacet ? labourFacet.id : null, milestoneId: null,
                status: 'active', recurrence: 'none', scheduled_date: todayStr(), deadline: ''
            });
        }
        appData.meta.onboarded = true;
        saveData();
        goHome();
    };

    renderStep();
}

// --- Init ---
function init() {
    // Ask the browser to protect this origin's storage from eviction.
    // Granted automatically for installed PWAs in Chrome; harmless elsewhere.
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist();
    }
    // Service worker requires http(s); skip silently when opened as a file
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('sw.js');
    }
    loadData();
    takeDailySnapshot();
    history.replaceState({ view: currentView, homeMode }, '');
    if (!appData.meta.onboarded && appData.facets.length === 0) {
        renderOnboarding();
    } else {
        appData.meta.onboarded = true;
        render();
    }
}

init();

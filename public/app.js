/**
 * Ultimate Gamepad Tester - app.js
 * Handles Gamepad API, Socket.io (Backend SDL2), Slot Mapping, and SVG UI Updates
 */

const socket = io();
const gamepads = {}; 
const slotMapping = [null, null, null, null]; 
const buttonRemaps = JSON.parse(localStorage.getItem('gp_mappings') || '{}'); 
let mappingState = { active: false, controller: null, step: 0, lock: false };
const MAPPING_STEPS = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "D-Up", "D-Down", "D-Left", "D-Right"];

const slots = [
    { container: document.getElementById('slot-0'), visual: document.getElementById('visual-0'), data: document.getElementById('data-0') },
    { container: document.getElementById('slot-1'), visual: document.getElementById('visual-1'), data: document.getElementById('data-1') },
    { container: document.getElementById('slot-2'), visual: document.getElementById('visual-2'), data: document.getElementById('data-2') },
    { container: document.getElementById('slot-3'), visual: document.getElementById('visual-3'), data: document.getElementById('data-3') }
];

const connCountEl = document.getElementById('conn-count');
const mappingControlsEl = document.getElementById('mapping-controls');

// SVG Template
const CONTROLLER_SVG = `
<svg viewBox="0 0 400 250" class="gamepad-svg">
    <path d="M100 50 Q200 40 300 50 Q380 60 380 150 Q380 220 300 220 Q250 220 230 180 Q200 170 170 180 Q150 220 100 220 Q20 220 20 150 Q20 60 100 50" class="gp-body" />
    <rect x="70" y="110" width="20" height="20" rx="2" class="gp-button btn-14" /> 
    <rect x="110" y="110" width="20" height="20" rx="2" class="gp-button btn-15" /> 
    <rect x="90" y="90" width="20" height="20" rx="2" class="gp-button btn-12" /> 
    <rect x="90" y="130" width="20" height="20" rx="2" class="gp-button btn-13" /> 
    <circle cx="290" cy="120" r="12" class="gp-button btn-2" /> 
    <circle cx="330" cy="120" r="12" class="gp-button btn-1" /> 
    <circle cx="310" cy="100" r="12" class="gp-button btn-3" /> 
    <circle cx="310" cy="140" r="12" class="gp-button btn-0" /> 
    <circle cx="140" cy="160" r="25" class="gp-stick-base" />
    <circle cx="140" cy="160" r="18" class="gp-stick-head stick-l" />
    <circle cx="260" cy="160" r="25" class="gp-stick-base" />
    <circle cx="260" cy="160" r="18" class="gp-stick-head stick-r" />
    <rect x="60" y="45" width="60" height="15" rx="5" class="gp-button btn-4" />
    <rect x="280" y="45" width="60" height="15" rx="5" class="gp-button btn-5" />
    <rect x="70" y="20" width="40" height="20" rx="2" class="gp-button btn-6" />
    <rect x="290" y="20" width="40" height="20" rx="2" class="gp-button btn-7" />
    <rect x="170" y="90" width="15" height="8" rx="2" class="gp-button btn-8" />
    <rect x="215" y="90" width="15" height="8" rx="2" class="gp-button btn-9" />
    <circle cx="200" cy="120" r="10" class="gp-button btn-16" />
</svg>
`;

function updateUI() {
    const indices = Object.keys(gamepads);
    connCountEl.textContent = `${indices.length} Controller${indices.length === 1 ? '' : 's'} Detected`;

    if (indices.length === 0) {
        mappingControlsEl.innerHTML = '<p class="empty-msg">Connect a controller to start...</p>';
    } else {
        mappingControlsEl.innerHTML = '';
        indices.forEach(idx => {
            const gp = gamepads[idx];
            const card = document.createElement('div');
            card.className = 'detected-controller';
            card.innerHTML = `
                <div class="name" title="${gp.id}">${gp.id} <span style="font-size:0.6rem; opacity:0.5">(${gp.source})</span></div>
                <div class="assign-grid">
                    ${[0,1,2,3].map(slotIdx => `
                        <button class="assign-btn ${slotMapping[slotIdx] == idx ? 'active' : ''}" 
                                onclick="assignToSlot('${idx}', ${slotIdx})">
                            S${slotIdx + 1}
                        </button>
                    `).join('')}
                </div>
                <button class="assign-btn" style="margin-top:5px; width:100%; height:20px; font-size:0.6rem;" onclick="openRemap('${idx}')">
                    Remap Buttons
                </button>
            `;
            mappingControlsEl.appendChild(card);
        });
    }

    for(let i=0; i<4; i++) {
        const gpIdx = slotMapping[i];
        const slot = slots[i];
        if (gpIdx !== null && gamepads[gpIdx]) {
            slot.container.querySelector('.not-assigned').style.display = 'none';
            slot.visual.style.display = 'flex';
            if (!slot.visual.innerHTML) slot.visual.innerHTML = CONTROLLER_SVG;
        } else {
            slot.container.querySelector('.not-assigned').style.display = 'block';
            slot.visual.style.display = 'none';
            slot.visual.innerHTML = '';
            slot.data.innerHTML = '';
        }
    }
}

window.assignToSlot = function(gpIdx, slotIdx) {
    for(let i=0; i<4; i++) { if (slotMapping[i] == gpIdx) slotMapping[i] = null; }
    slotMapping[slotIdx] = gpIdx;
    updateUI();
};

window.openRemap = function(gpIdx) {
    mappingState = { active: true, controller: gpIdx, step: 0, lock: false };
    document.getElementById('mapping-modal').style.display = 'flex';
    updateMappingUI();
};

function updateMappingUI() {
    if (mappingState.step > 0) {
        mappingState.lock = true;
        setTimeout(() => { mappingState.lock = false; }, 800); 
    }
    
    if (mappingState.step >= MAPPING_STEPS.length) {
        closeRemap();
        return;
    }
    document.getElementById('mapping-title').textContent = `Mapping ${MAPPING_STEPS[mappingState.step]}`;
    
    // Add visual preview
    const visual = document.getElementById('mapping-visual');
    visual.innerHTML = CONTROLLER_SVG;
    const svg = visual.querySelector('svg');
    const bNames = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "D-Up", "D-Down", "D-Left", "D-Right"];
    const bIndices = [0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15];
    const targetIdx = bIndices[mappingState.step];

    const btnEl = svg.querySelector(`.btn-${targetIdx}`);
    if (btnEl) btnEl.classList.add('pressed');
}

window.skipMapping = function() {
    mappingState.step++;
    updateMappingUI();
};

window.closeRemap = function() {
    mappingState.active = false;
    document.getElementById('mapping-modal').style.display = 'none';
    
    // SAVE to local storage
    localStorage.setItem('gp_mappings', JSON.stringify(buttonRemaps));
};

// Handle Browser Native Gamepad API
function scanBrowserGamepads() {
    const raw = navigator.getGamepads ? navigator.getGamepads() : [];
    let changed = false;
    for (let i = 0; i < raw.length; i++) {
        const gp = raw[i];
        const key = `browser-${i}`;
        if (gp && !gamepads[key]) {
            gamepads[key] = { id: gp.id, buttons: gp.buttons, axes: gp.axes, source: 'browser', raw: gp };
            autoAssign(key);
            changed = true;
        } else if (!gp && gamepads[key]) {
            delete gamepads[key];
            unassign(key);
            changed = true;
        } else if (gp && gamepads[key]) {
            // Update reference for polling
            gamepads[key].raw = gp;
        }
    }
    if (changed) updateUI();
}

function autoAssign(key) {
    for(let i=0; i<4; i++) if (slotMapping[i] === null) { slotMapping[i] = key; break; }
}
function unassign(key) {
    for(let i=0; i<4; i++) if (slotMapping[i] === key) slotMapping[i] = null;
}

// Handle Socket.io (Backend SDL2)
socket.on('initial-state', (data) => {
    console.log("Initial state from backend:", data);
    data.forEach(gp => {
        if (gp) {
            const key = `socket-${gp.index}`;
            gamepads[key] = { ...gp, source: 'backend' };
            autoAssign(key);
        }
    });
    updateUI();
});

socket.on('gamepad-connected', (gp) => {
    console.log("Backend gamepad connected:", gp);
    const key = `socket-${gp.index}`;
    gamepads[key] = { ...gp, source: 'backend' };
    autoAssign(key);
    updateUI();
});

socket.on('gamepad-disconnected', (data) => {
    const key = `socket-${data.index}`;
    delete gamepads[key];
    unassign(key);
    updateUI();
});

socket.on('gamepad-update', (data) => {
    const statusEl = document.getElementById('backend-status');
    if (statusEl) statusEl.textContent = `(Backend: Data Streaming at ${new Date().toLocaleTimeString()})`;
    // console.log("Received update for:", data.map(d=>d.index));
    data.forEach(gp => {
        if (gp) {
            const key = `socket-${gp.index}`;
            if (gamepads[key]) {
                gamepads[key].buttons = gp.buttons;
                gamepads[key].axes = gp.axes;
            }
        }
    });
});

function draw() {
    scanBrowserGamepads();

    for (let i = 0; i < 4; i++) {
        const key = slotMapping[i];
        if (!key || !gamepads[key]) continue;
        
        const gp = gamepads[key];
        const slot = slots[i];
        const svg = slot.visual.querySelector('svg');
        if (!svg) continue;

        // Use different data sources based on type
        const buttons = gp.source === 'browser' ? gp.raw.buttons : gp.buttons;
        const axes = gp.source === 'browser' ? gp.raw.axes : gp.axes;

        buttons.forEach((btn, bIdx) => {
            if (mappingState.active && mappingState.controller === key) {
                if (btn.pressed && !mappingState.lock) {
                    if (!buttonRemaps[key]) buttonRemaps[key] = {};
                    const bIndices = [0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15];
                    buttonRemaps[key][bIdx] = bIndices[mappingState.step];
                    mappingState.step++;
                    mappingState.lock = true; 
                    setTimeout(() => updateMappingUI(), 300);
                } 
            }

            let targetIdx = bIdx;
            if (buttonRemaps[key] && buttonRemaps[key][bIdx] !== undefined) {
                targetIdx = buttonRemaps[key][bIdx];
            }
            const btnEl = svg.querySelector(`.btn-${targetIdx}`);
            if (btnEl) {
                if (btn.pressed) {
                    btnEl.classList.add('pressed');
                    if (targetIdx === 6 || targetIdx === 7) btnEl.style.fill = `rgba(0, 242, 255, ${0.3 + btn.value * 0.7})`;
                } else {
                    btnEl.classList.remove('pressed');
                    if (targetIdx === 6 || targetIdx === 7) btnEl.style.fill = '';
                }
            }
        });

        const stickL = svg.querySelector('.stick-l');
        const stickR = svg.querySelector('.stick-r');
        if (stickL) stickL.setAttribute('transform', `translate(${axes[0] * 15}, ${axes[1] * 15})`);
        if (stickR) stickR.setAttribute('transform', `translate(${axes[2] * 15}, ${axes[3] * 15})`);

        let dataHtml = '';
        axes.forEach((axis, aIdx) => {
            dataHtml += `<div class="input-val"><span class="input-label">AXIS ${aIdx}:</span> <span>${axis.toFixed(3)}</span></div>`;
        });
        slot.data.innerHTML = dataHtml;
    }
    requestAnimationFrame(draw);
}

draw();

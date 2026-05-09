// --- ESTADO GLOBAL ---
let state = {
    players: [],       // Lista de nombres
    rolesCount: {
        bestias: 1,
        oraculo: true,
        hechicera: true,
        guardian: false,
        eros: false,
        espia: false
    },
    gameStarted: false,
    assignedRoles: [], // { name, role, isDead, isLover, potions: {life: true, death: true} }
    revealIndex: 0,
    nightScriptState: {
        round: 1,
        step: 0 // 0: inicio, 1: eros, 2: oraculo, 3: bestias, 4: hechicera, 5: amanecer
    }
};

const ROLES = {
    CAMPESINO: 'Campesino',
    BESTIA: 'Bestia',
    ORACULO: 'Oráculo',
    HECHICERA: 'Hechicera',
    GUARDIAN: 'Guardián',
    EROS: 'Eros',
    ESPIA: 'Espía'
};

const ROLE_DESCRIPTIONS = {
    [ROLES.CAMPESINO]: "Tu objetivo es descubrir a las bestias y eliminarlos en las votaciones de día. Eres la fuerza principal del pueblo.",
    [ROLES.BESTIA]: "Por la noche, elige junto a tu manada a un campesino para devorar. Miente y fíngete campesino de día para sobrevivir.",
    [ROLES.ORACULO]: "Cada noche despiertas para señalar a alguien y descubrir su verdadera identidad secreta.",
    [ROLES.HECHICERA]: "Tienes dos pociones de un solo uso: una de vida para salvar a alguien del ataque de las bestias, y otra de muerte para eliminar a quien desees.",
    [ROLES.GUARDIAN]: "Si mueres de noche o de día, en tu último aliento podrás disparar y llevarte a otro jugador contigo a la tumba.",
    [ROLES.EROS]: "La primera noche eliges a dos jugadores para que se enamoren profundamente. Si uno muere, el otro morirá de tristeza.",
    [ROLES.ESPIA]: "Puedes espiar en la noche de las bestias. Cuidado, si ellos te descubren espiando, tú serás la próxima víctima."
};

// --- ELEMENTOS DOM ---
const screens = {
    setup: document.getElementById('setup-screen'),
    reveal: document.getElementById('reveal-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    script: document.getElementById('script-screen'),
    alert: document.getElementById('alert-screen')
};

const setupDom = {
    input: document.getElementById('new-player-input'),
    addBtn: document.getElementById('add-player-btn'),
    list: document.getElementById('setup-players-list'),
    count: document.getElementById('setup-player-count'),
    wolvesCount: document.getElementById('wolves-count'),
    btnDecWolves: document.getElementById('dec-wolves'),
    btnIncWolves: document.getElementById('inc-wolves'),
    distributeBtn: document.getElementById('distribute-roles-btn'),
    roles: {
        oraculo: document.getElementById('role-oraculo'),
        hechicera: document.getElementById('role-hechicera'),
        guardian: document.getElementById('role-guardian'),
        eros: document.getElementById('role-eros'),
        espia: document.getElementById('role-espia')
    }
};

const revealDom = {
    cardFront: document.getElementById('reveal-front'),
    cardBack: document.getElementById('reveal-back'),
    playerName: document.getElementById('reveal-player-name'),
    roleName: document.getElementById('reveal-role-name'),
    roleDesc: document.getElementById('reveal-role-desc'),
    progress: document.getElementById('reveal-progress'),
    nextBtn: document.getElementById('reveal-next'),
    finishBtn: document.getElementById('reveal-finish')
};

// ... (saltando inicializaciones hasta Event Listeners)
// Esto no reemplaza todo el archivo, solo este bloque. Wait, StartLine is 68. Let's do it carefully.

const dashDom = {
    bestiasCount: document.getElementById('dash-bestias-count'),
    campesinosCount: document.getElementById('dash-campesinos-count'),
    list: document.getElementById('dashboard-players-list'),
    startNightBtn: document.getElementById('start-night-btn'),
    resetBtn: document.getElementById('reset-game-btn')
};

const alertDom = {
    title: document.getElementById('alert-title'),
    msg: document.getElementById('alert-message'),
    area: document.getElementById('alert-interactive-area'),
    confirmBtn: document.getElementById('alert-confirm-btn'),
    cancelBtn: document.getElementById('alert-cancel-btn')
};

// --- PERSISTENCIA ---
function saveState() {
    localStorage.setItem('maiLoboState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('maiLoboState');
    if (saved) {
        state = JSON.parse(saved);
        
        // Migración de datos viejos a la nueva nomenclatura
        if (state.rolesCount) {
            if (state.rolesCount.wolves !== undefined) {
                state.rolesCount.bestias = state.rolesCount.wolves;
                delete state.rolesCount.wolves;
            }
            if (state.rolesCount.vidente !== undefined) {
                state.rolesCount.oraculo = state.rolesCount.vidente;
                delete state.rolesCount.vidente;
            }
            if (state.rolesCount.bruja !== undefined) {
                state.rolesCount.hechicera = state.rolesCount.bruja;
                delete state.rolesCount.bruja;
            }
            if (state.rolesCount.cazador !== undefined) {
                state.rolesCount.guardian = state.rolesCount.cazador;
                delete state.rolesCount.cazador;
            }
            if (state.rolesCount.cupido !== undefined) {
                state.rolesCount.eros = state.rolesCount.cupido;
                delete state.rolesCount.cupido;
            }
            if (state.rolesCount.nina !== undefined) {
                state.rolesCount.espia = state.rolesCount.nina;
                delete state.rolesCount.nina;
            }
        }
        
        // Migración de la lista de roles asignados
        if (state.assignedRoles) {
            state.assignedRoles.forEach(p => {
                if (p.role === 'Lobo') p.role = 'Bestia';
                if (p.role === 'Aldeano') p.role = 'Campesino';
                if (p.role === 'Vidente') p.role = 'Oráculo';
                if (p.role === 'Bruja') p.role = 'Hechicera';
                if (p.role === 'Cazador') p.role = 'Guardián';
                if (p.role === 'Cupido') p.role = 'Eros';
                if (p.role === 'Niña') p.role = 'Espía';
            });
        }
    }
}

// --- NAVEGACIÓN ---
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// --- CONFIGURACIÓN (SETUP) ---
function renderSetupPlayers() {
    setupDom.list.innerHTML = '';
    state.players.forEach((p, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p}</span> <button class="delete-btn" onclick="removePlayer(${index})">✖</button>`;
        setupDom.list.appendChild(li);
    });
    setupDom.count.textContent = state.players.length;
    validateSetup();
}

function addPlayer() {
    const name = setupDom.input.value.trim();
    if (name && !state.players.includes(name)) {
        state.players.push(name);
        setupDom.input.value = '';
        saveState();
        renderSetupPlayers();
    }
}

function removePlayer(index) {
    state.players.splice(index, 1);
    saveState();
    renderSetupPlayers();
}

function updateWolvesCount(change) {
    const newVal = state.rolesCount.bestias + change;
    if (newVal >= 1 && newVal <= 10) {
        state.rolesCount.bestias = newVal;
        setupDom.wolvesCount.textContent = newVal;
        saveState();
        validateSetup();
    }
}

function validateSetup() {
    let specialCount = 0;
    if (setupDom.roles.oraculo.checked) specialCount++;
    if (setupDom.roles.hechicera.checked) specialCount++;
    if (setupDom.roles.guardian.checked) specialCount++;
    if (setupDom.roles.eros.checked) specialCount++;
    if (setupDom.roles.espia.checked) specialCount++;

    const totalRolesNeeded = state.rolesCount.bestias + specialCount;
    const canStart = state.players.length >= Math.max(3, totalRolesNeeded);

    setupDom.distributeBtn.disabled = !canStart;
}

// --- ASIGNACIÓN DE ROLES ---
function distributeRoles() {
    state.rolesCount.oraculo = setupDom.roles.oraculo.checked;
    state.rolesCount.hechicera = setupDom.roles.hechicera.checked;
    state.rolesCount.guardian = setupDom.roles.guardian.checked;
    state.rolesCount.eros = setupDom.roles.eros.checked;
    state.rolesCount.espia = setupDom.roles.espia.checked;

    let pool = [];
    for (let i = 0; i < state.rolesCount.bestias; i++) pool.push(ROLES.BESTIA);
    if (state.rolesCount.oraculo) pool.push(ROLES.ORACULO);
    if (state.rolesCount.hechicera) pool.push(ROLES.HECHICERA);
    if (state.rolesCount.guardian) pool.push(ROLES.GUARDIAN);
    if (state.rolesCount.eros) pool.push(ROLES.EROS);
    if (state.rolesCount.espia) pool.push(ROLES.ESPIA);

    while (pool.length < state.players.length) {
        pool.push(ROLES.CAMPESINO);
    }

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Shuffle players
    let shuffledPlayers = [...state.players].sort(() => Math.random() - 0.5);

    state.assignedRoles = shuffledPlayers.map((name, idx) => ({
        name: name,
        role: pool[idx],
        isDead: false,
        isLover: false,
        potions: pool[idx] === ROLES.HECHICERA ? { life: true, death: true } : null
    }));

    state.gameStarted = true;
    state.revealIndex = 0;
    saveState();
    startRevealPhase();
}

// --- FASE DE REVELACIÓN ---
function startRevealPhase() {
    showScreen('reveal');
    renderRevealPlayer();
}

function renderRevealPlayer() {
    // Si ya pasamos todos los jugadores, no deberíamos estar aquí, pero por si acaso
    if (state.revealIndex >= state.assignedRoles.length) {
        startDashboard();
        return;
    }

    const player = state.assignedRoles[state.revealIndex];
    revealDom.playerName.textContent = player.name;
    revealDom.roleName.textContent = player.role;
    revealDom.roleDesc.textContent = ROLE_DESCRIPTIONS[player.role];

    // Mostrar progreso
    revealDom.progress.textContent = `${state.revealIndex + 1} de ${state.assignedRoles.length}`;
    if (state.revealIndex < state.assignedRoles.length - 1) {
        const nextPlayerName = state.assignedRoles[state.revealIndex + 1].name;
        revealDom.nextBtn.textContent = `Siguiente (${nextPlayerName})`;
        revealDom.nextBtn.classList.remove('hidden');
        revealDom.finishBtn.classList.add('hidden');
    } else {
        revealDom.nextBtn.classList.add('hidden');
        revealDom.finishBtn.classList.remove('hidden');
    }

    // Reset state
    revealDom.cardFront.classList.remove('hidden');
    revealDom.cardBack.classList.add('hidden');
    revealDom.cardFront.querySelector('.hint-hold').classList.remove('hidden');
}

function handleRevealNext() {
    if (state.revealIndex >= state.assignedRoles.length - 1) {
        startDashboard();
    } else {
        state.revealIndex++;
        saveState();
        renderRevealPlayer();
    }
}

// MOUSE / TOUCH EVENTS PARA EL HOLD
function startHold(e) {
    if (e.cancelable) {
        e.preventDefault();
    }
    if (state.revealIndex < state.assignedRoles.length) {
        revealDom.cardFront.classList.add('hidden');
        revealDom.cardBack.classList.remove('hidden');
    }
}

function endHold(e) {
    // IMPORTANTE: No usar e.preventDefault() aquí porque está atado a window
    if (state.revealIndex < state.assignedRoles.length) {
        revealDom.cardFront.classList.remove('hidden');
        revealDom.cardBack.classList.add('hidden');
    }
}

// --- DASHBOARD DEL NARRADOR ---
function startDashboard() {
    showScreen('dashboard');
    renderDashboard();
    checkWinCondition();
}

function renderDashboard() {
    dashDom.list.innerHTML = '';
    let wolvesCount = 0;
    let campesinosCount = 0;

    state.assignedRoles.forEach((p, index) => {
        if (!p.isDead) {
            if (p.role === ROLES.BESTIA) wolvesCount++;
            else campesinosCount++;
        }

        const li = document.createElement('li');
        li.className = 'player-card';
        if (p.isDead) li.classList.add('li-dead');

        // Al hacer click, mostrar opciones
        li.onclick = () => showPlayerAction(index);

        const heartBadge = p.isLover ? `<div class="lover-badge">&lt;3</div>` : '';
        const wolfBadge = p.role === ROLES.BESTIA ? `<div class="wolf-badge">🐺</div>` : '';

        li.innerHTML = `
            ${heartBadge}
            ${wolfBadge}
            <div class="player-info">
                <span class="player-name">${p.name}</span>
                <span class="player-role" data-role="${p.role}">${p.role}</span>
            </div>
        `;
        dashDom.list.appendChild(li);
    });

    dashDom.bestiasCount.textContent = wolvesCount;
    dashDom.campesinosCount.textContent = campesinosCount;
}

function showPlayerAction(index) {
    const p = state.assignedRoles[index];
    const roleDesc = ROLE_DESCRIPTIONS[p.role] || '';

    // Estilo del rol para el mensaje
    const roleHtml = `<span style="color:var(--accent-gold); font-family:var(--font-heading); font-size:1.3rem; display:block; margin-top:5px;">${p.role}</span><p style="font-size:0.9rem; font-style:italic; color:var(--text-muted); margin-top:5px;">${roleDesc}</p>`;

    // Si es un enamorado muerto, su destino está sellado (no se puede revivir individualmente)
    if (p.isDead && p.isLover) {
        showAlert(
            p.name,
            `${roleHtml}<p style="margin-top:15px; font-size:0.95rem;"><b>Destino Sellado</b>: Este jugador está profundamente atado a su pareja. Al estar muerto, su situación no puede ser modificada individualmente.</p>`,
            ``,
            () => { }, // No hace nada, solo cierra
            null
        );
        alertDom.confirmBtn.textContent = "Aceptar";
        alertDom.confirmBtn.style.backgroundColor = "var(--accent-blue)";
        return;
    }

    const action = !p.isDead ? "Eliminar" : "Revivir";
    showAlert(
        p.name,
        roleHtml,
        `<p style="margin-top:10px; color:var(--text-muted); font-size:0.9rem;">¿Qué acción deseas realizar con este jugador?</p>`,
        () => {
            if (!p.isDead) manualKill(index);
            else manualRevive(index);
        },
        () => { } // Cancelar
    );
    // Cambiar texto del botón confirmar al nombre de la acción
    alertDom.confirmBtn.textContent = action;
    alertDom.confirmBtn.style.backgroundColor = !p.isDead ? "var(--accent-crimson)" : "var(--accent-blue)";
}

// ALERTA INTERMEDIA GENÉRICA
function showAlert(title, message, areaHtml, onConfirm, onCancel = null) {
    alertDom.title.textContent = title;
    alertDom.msg.innerHTML = message;
    alertDom.area.innerHTML = areaHtml || '';

    // Reset defaults to prevent carrying over text/styles from previous alerts
    alertDom.confirmBtn.textContent = "Confirmar";
    alertDom.confirmBtn.style.backgroundColor = "var(--accent-crimson)";
    alertDom.cancelBtn.textContent = "Cancelar";

    alertDom.confirmBtn.onclick = () => {
        screens.alert.classList.add('hidden');
        if (onConfirm) onConfirm();
    };

    if (onCancel) {
        alertDom.cancelBtn.classList.remove('hidden');
        alertDom.cancelBtn.onclick = () => {
            screens.alert.classList.add('hidden');
            onCancel();
        };
    } else {
        alertDom.cancelBtn.classList.add('hidden');
    }

    screens.alert.classList.remove('hidden');
}

// LOGICA DE MUERTE MANUAL
function manualKill(index) {
    const player = state.assignedRoles[index];

    // Si es GuardiÃ¡n, abrir alerta intermedia con MATRIZ
    if (player.role === ROLES.GUARDIAN) {
        // Marcamos muerto de inmediato para consistencia
        player.isDead = true;
        saveState();
        renderDashboard();

        let gridItemsHtml = '';
        state.assignedRoles.forEach((p, i) => {
            const isDead = p.isDead;
            const isSelf = i === index;
            const isSelectable = !isDead && !isSelf;
            const deadClass = isDead ? 'li-dead' : '';
            const selectableClass = isSelectable ? 'selectable-hunter-target' : '';
            const extraStyle = !isSelectable ? 'pointer-events:none; opacity:0.6;' : '';

            gridItemsHtml += `
                <li class="player-card ${selectableClass} ${deadClass}" data-index="${i}" style="min-height:50px; padding:5px; ${extraStyle}">
                    <span style="font-size:0.85rem;">${p.name}</span>
                </li>
            `;
        });

        showAlert(
            "Tiro del GuardiÃ¡n",
            `El GuardiÃ¡n (<b>${player.name}</b>) ha muerto. Debe elegir a quién disparar su tiro de gracia.`,
            `<ul class="dashboard-grid" id="hunter-target-grid" style="grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top:10px;">
                ${gridItemsHtml}
            </ul>`,
            () => {
                const selected = document.querySelector('.selectable-hunter-target.selected');
                if (selected) {
                    const targetIdx = selected.getAttribute('data-index');
                    executeKill(parseInt(targetIdx));
                }
                checkWinCondition();
            },
            () => { checkWinCondition(); }
        );

        // Lógica de selección en la matriz del GuardiÃ¡n
        setTimeout(() => {
            const cards = document.querySelectorAll('.selectable-hunter-target');
            cards.forEach(card => {
                card.onclick = () => {
                    cards.forEach(c => {
                        c.classList.remove('selected');
                        c.style.backgroundColor = 'var(--bg-parchment)';
                        c.style.borderColor = 'var(--border-ink)';
                        c.style.color = 'var(--text-ink)';
                    });
                    card.classList.add('selected');
                    card.style.backgroundColor = 'var(--accent-crimson)';
                    card.style.borderColor = 'var(--accent-crimson)';
                    card.style.color = '#fff';
                };
            });
        }, 50);
        return;
    }

    executeKill(index);
}

function executeKill(index) {
    const player = state.assignedRoles[index];
    if (player.isDead) return;

    player.isDead = true;
    saveState();
    renderDashboard();

    // Regla: Enamorados (Eros)
    if (player.isLover) {
        const otherIdx = state.assignedRoles.findIndex((p, i) => p.isLover && i !== index && !p.isDead);
        if (otherIdx !== -1) {
            const otherLover = state.assignedRoles[otherIdx];
            otherLover.isDead = true; // Muerte instantánea para consistencia de estado
            saveState();
            renderDashboard();

            showAlert(
                "Despecho de Eros",
                `${player.name} era un enamorado. Su pareja, ${otherLover.name}, debe morir de tristeza.`,
                "",
                () => {
                    // Si el segundo enamorado era el GuardiÃ¡n, NO usar manualKill si estamos en el script
                    const inScript = screens.script.classList.contains('active');
                    if (otherLover.role === ROLES.GUARDIAN && !inScript) {
                        manualKill(otherIdx);
                    }
                    checkWinCondition();
                }
            );
        }
    }

    checkWinCondition();
}

function manualRevive(index) {
    state.assignedRoles[index].isDead = false;
    saveState();
    renderDashboard();
    checkWinCondition();
}

function checkWinCondition() {
    let wolves = 0;
    let nonWolves = 0;

    state.assignedRoles.forEach(p => {
        if (!p.isDead) {
            if (p.role === ROLES.BESTIA) wolves++;
            else nonWolves++;
        }
    });

    if (wolves === 0 && nonWolves > 0) {
        showAlert("¡Fin del Juego!", "Los campesinos han eliminado a todos las bestias. ¡La Aldea Gana!", "", () => { });
    } else if (nonWolves === 0 && wolves > 0) {
        showAlert("¡Fin del Juego!", "las bestias han eliminado a todos los campesinos. ¡las bestias Ganan!", "", () => { });
    } else if (wolves === 0 && nonWolves === 0) {
        showAlert("¡Fin del Juego!", "Nadie ha sobrevivido a la masacre. ¡Es un Empate!", "", () => { });
    }
}

// --- SCRIPT NOCTURNO (MÁQUINA DE ESTADOS) ---
const scriptDom = {
    title: document.getElementById('script-title'),
    content: document.getElementById('script-content'),
    nextBtn: document.getElementById('script-next-btn')
};

let nightVictims = []; // Acumula muertos de la noche
let nightLog = [];     // Registro textual de lo que pasó en la noche

dashDom.startNightBtn.addEventListener('click', () => {
    state.nightScriptState.step = 0;
    nightVictims = [];
    nightLog = [];
    showScreen('script');
    renderScriptStep();
});

function renderScriptStep() {
    const sState = state.nightScriptState;
    const isFirstNight = sState.round === 1;
    let contentHtml = '';

    // Aplicar color de fondo según el paso actual
    const screen = document.getElementById('script-screen');
    screen.classList.remove('bg-stage-eros', 'bg-stage-bestias', 'bg-stage-hechicera', 'bg-stage-oraculo', 'bg-stage-guardian', 'bg-stage-votacion', 'bg-stage-default');
    
    if (sState.step === 1 || sState.step === 1.5) screen.classList.add('bg-stage-eros');
    else if (sState.step === 2) screen.classList.add('bg-stage-oraculo');
    else if (sState.step === 3) screen.classList.add('bg-stage-bestias');
    else if (sState.step === 4) screen.classList.add('bg-stage-hechicera');
    else if (sState.step === 6) screen.classList.add('bg-stage-votacion');
    else if (sState.step === 'guardian') screen.classList.add('bg-stage-guardian');
    else screen.classList.add('bg-stage-default');

    // Utilidades
    const getAlivePlayer = (role) => state.assignedRoles.find(p => p.role === role && !p.isDead);
    const isAlive = (role) => !!getAlivePlayer(role);

    const advanceStep = () => {
        sState.step++;
        renderScriptStep();
    };

    if (sState.step === 0) {
        scriptDom.title.textContent = `Noche ${sState.round}: Inicio`;
        contentHtml = `<p class="script-instruction">"La aldea duerme. Todos cierran los ojos."</p>`;
        scriptDom.nextBtn.textContent = "Siguiente";
        scriptDom.nextBtn.onclick = advanceStep;
    }
    else if (sState.step === 1) { // CUPIDO
        const eros = getAlivePlayer(ROLES.EROS);
        if (isFirstNight && eros) {
            scriptDom.title.textContent = "Turno de Eros";

            let gridItemsHtml = '';
            state.assignedRoles.forEach((p, i) => {
                const isDead = p.isDead;
                const isSelf = p.role === ROLES.EROS;
                const isSelectable = !isDead && !isSelf;
                const deadClass = isDead ? 'li-dead' : '';
                const selectableClass = isSelectable ? 'selectable-cupid' : '';
                const extraStyle = !isSelectable ? 'style="pointer-events:none; opacity:0.6;"' : '';

                gridItemsHtml += `
                    <li class="player-card ${selectableClass} ${deadClass}" data-index="${i}" ${extraStyle}>
                        <div class="player-info">
                            <span class="player-name">${p.name}</span>
                        </div>
                    </li>
                `;
            });

            contentHtml = `
                <p class="script-instruction">"Eros (<b>${eros.name}</b>) despierta y elige a dos enamorados."</p>
                <ul class="dashboard-grid" id="cupid-target-grid" style="margin-top:15px;">
                    ${gridItemsHtml}
                </ul>
                <div style="text-align:center; font-size: 3rem; margin: 20px 0; opacity: 0.8;">💘</div>
            `;
            scriptDom.nextBtn.textContent = "Confirmar Enamorados";
            scriptDom.nextBtn.disabled = true;

            let selectedCupids = [];

            setTimeout(() => {
                const cards = document.querySelectorAll('#cupid-target-grid .selectable-cupid');
                cards.forEach(card => {
                    card.onclick = () => {
                        const idx = card.getAttribute('data-index');
                        const nameSpan = card.querySelector('.player-name');

                        if (selectedCupids.includes(idx)) {
                            // Deselect
                            selectedCupids = selectedCupids.filter(id => id !== idx);
                            card.style.backgroundColor = 'var(--bg-parchment)';
                            card.style.borderColor = 'var(--border-ink)';
                            card.style.color = 'var(--text-ink)';
                            nameSpan.textContent = state.assignedRoles[idx].name; // Restaurar nombre original
                        } else {
                            if (selectedCupids.length < 2) {
                                selectedCupids.push(idx);
                                card.style.backgroundColor = 'var(--accent-crimson)';
                                card.style.borderColor = 'var(--accent-crimson)';
                                card.style.color = '#fff';
                                nameSpan.textContent = `${state.assignedRoles[idx].name} ❤️`; // Añadir corazón
                            }
                        }
                        scriptDom.nextBtn.disabled = selectedCupids.length !== 2;
                    };
                });
            }, 50);

            scriptDom.nextBtn.onclick = () => {
                if (selectedCupids.length === 2) {
                    state.assignedRoles[selectedCupids[0]].isLover = true;
                    state.assignedRoles[selectedCupids[1]].isLover = true;
                    saveState();
                    nightLog.push(`🏹 Eros enamoró a ${state.assignedRoles[selectedCupids[0]].name} y ${state.assignedRoles[selectedCupids[1]].name}`);
                    sState.step = 1.5;
                    renderScriptStep();
                }
            };
        } else {
            sState.step++;
            renderScriptStep();
            return;
        }
    }
    else if (sState.step === 1.5) { // ENAMORAMIENTO
        scriptDom.title.textContent = "El Enamoramiento";

        const lovers = state.assignedRoles.filter(p => p.isLover);
        const loversText = lovers.map(l => l.name).join(' y ');

        contentHtml = `
            <p class="script-instruction">"Eros vuelve a dormir. Ahora (NARRADOR DISCRETAMENTE TOCA EL HOMBRO DE LOS ENAMORADOS), los enamorados abren los ojos y se reconocen en silencio..."</p>
            <div style="background:var(--bg-card); padding:15px; border-radius:8px; margin-top:15px; text-align:center; border: 2px dashed var(--accent-crimson);">
                <p style="margin:0; font-size:1.1rem; color:var(--text-muted);">Los enamorados son:</p>
                <p style="margin:10px 0 0 0; font-size:1.5rem; font-family:var(--font-heading); color:var(--accent-crimson);">${loversText}</p>
            </div>
        `;
        scriptDom.nextBtn.textContent = "Enamorados duermen (Siguiente)";
        scriptDom.nextBtn.disabled = false;
        scriptDom.nextBtn.onclick = () => {
            sState.step = 2;
            renderScriptStep();
        };
    }
    else if (sState.step === 2) { // VIDENTE
        const oraculo = getAlivePlayer(ROLES.ORACULO);
        if (oraculo) {
            scriptDom.title.textContent = "Turno de el OrÃ¡culo";

            let gridItemsHtml = '';
            state.assignedRoles.forEach((p, i) => {
                const isDead = p.isDead;
                const isSelf = p.role === ROLES.ORACULO;
                const isSelectable = !isDead && !isSelf;
                const deadClass = isDead ? 'li-dead' : '';
                const selectableClass = isSelectable ? 'selectable-seer' : '';
                const extraStyle = !isSelectable ? 'style="pointer-events:none; opacity:0.6;"' : '';

                gridItemsHtml += `
                    <li class="player-card ${selectableClass} ${deadClass}" data-index="${i}" ${extraStyle}>
                        <div class="player-info">
                            <span class="player-name">${p.name}</span>
                        </div>
                    </li>
                `;
            });

            contentHtml = `
                <p class="script-instruction" id="seer-instruction">"El OrÃ¡culo (<b>${oraculo.name}</b>) despierta y señala a alguien para ver su verdadera identidad."</p>
                <ul class="dashboard-grid" id="seer-target-grid" style="margin-top:15px;">
                    ${gridItemsHtml}
                </ul>
                <div id="seer-result-container" style="display:none; margin-top:20px; background: var(--bg-card); padding: 25px; border: 3px double var(--accent-gold); border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <p style="margin:0 0 15px 0; color:var(--text-muted); font-style:italic; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:10px;">La identidad revelada es:</p>
                    <div id="seer-result" style="margin:0;"></div>
                </div>
                <div style="text-align:center; font-size: 3rem; margin: 20px 0; opacity: 0.8;">🔮👁️</div>
            `;
            scriptDom.nextBtn.textContent = "OrÃ¡culo duerme (Siguiente)";
            scriptDom.nextBtn.disabled = true;

            let selectedSeerTarget = null;

            setTimeout(() => {
                const cards = document.querySelectorAll('#seer-target-grid .selectable-seer');
                const container = document.getElementById('seer-result-container');
                const result = document.getElementById('seer-result');
                const instruction = document.getElementById('seer-instruction');

                cards.forEach(card => {
                    card.onclick = () => {
                        const idx = card.getAttribute('data-index');
                        selectedSeerTarget = idx;
                        scriptDom.nextBtn.disabled = false;

                        const targetPlayer = state.assignedRoles[idx];

                        // Ocultar grid e instrucción
                        document.getElementById('seer-target-grid').style.display = 'none';
                        instruction.style.display = 'none';

                        // Mostrar el resultado enfocado
                        container.style.display = 'block';
                        result.innerHTML = `
                            <div style="font-size: 1.3rem; color: var(--text-ink); font-family: var(--font-body); margin-bottom: 5px;">${targetPlayer.name}</div>
                            <div style="color: var(--accent-crimson); font-family: var(--font-heading); font-size: 1.8rem;">${targetPlayer.role}</div>
                        `;
                    };
                });
            }, 50);

            scriptDom.nextBtn.onclick = () => {
                if (selectedSeerTarget !== null) {
                    const targetPlayer = state.assignedRoles[selectedSeerTarget];
                    nightLog.push(`👁️ El OrÃ¡culo vio a ${targetPlayer.name} (${targetPlayer.role})`);
                    advanceStep();
                }
            };
        } else {
            sState.step++;
            renderScriptStep();
            return;
        }
    }
    else if (sState.step === 3) { // LOBOS
        if (isAlive(ROLES.BESTIA)) {
            scriptDom.title.textContent = "Turno de las bestias";

            // Mostrar estado de la manada
            const bestias = state.assignedRoles.filter(p => p.role === ROLES.BESTIA);
            const bestiasList = bestias.map(l => l.isDead ? `<span style="text-decoration:line-through; color:#aaa;">${l.name}</span>` : `<b>${l.name}</b>`).join(', ');

            let gridItemsHtml = '';
            state.assignedRoles.forEach((p, i) => {
                const isDead = p.isDead;
                const isSelf = p.role === ROLES.BESTIA;
                const isSelectable = !isDead && !isSelf;
                const deadClass = isDead ? 'li-dead' : '';
                const selectableClass = isSelectable ? 'selectable-victim' : '';
                const extraStyle = !isSelectable ? 'style="pointer-events:none; opacity:0.6;"' : '';

                gridItemsHtml += `
                    <li class="player-card ${selectableClass} ${deadClass}" data-index="${i}" ${extraStyle}>
                        <div class="player-info">
                            <span class="player-name">${p.name}</span>
                        </div>
                    </li>
                `;
            });

            const nina = getAlivePlayer(ROLES.ESPIA);
            const ninaText = nina ? `<br><br><span style="color:var(--accent-blue); font-weight:bold;">(Atención: La Niña (${nina.name}) puede estar observando)</span>` : '';

            contentHtml = `
                <div style="background:var(--bg-card); padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.9rem;">
                    <b>Manada:</b> ${bestiasList}
                </div>
                <p class="script-instruction">"las bestias despiertan, se reconocen y deciden a quién devorar." ${ninaText}</p>
                <ul class="dashboard-grid" id="wolves-target-grid" style="margin-top:15px;">
                    ${gridItemsHtml}
                </ul>
                <div style="text-align:center; font-size: 3rem; margin: 20px 0; opacity: 0.8;">🐾🐺</div>
            `;
            scriptDom.nextBtn.textContent = "Bestias duermen (Siguiente)";
            scriptDom.nextBtn.disabled = true; // Deshabilitado hasta que elija

            let selectedWolfTarget = null;

            setTimeout(() => {
                const cards = document.querySelectorAll('#wolves-target-grid .selectable-victim');
                cards.forEach(card => {
                    card.onclick = () => {
                        // Limpiar estilos de selección
                        cards.forEach(c => {
                            c.style.backgroundColor = 'var(--bg-parchment)';
                            c.style.borderColor = 'var(--border-ink)';
                            c.style.color = 'var(--text-ink)';
                        });
                        // Aplicar estilo de seleccionado
                        card.style.backgroundColor = 'var(--accent-crimson)';
                        card.style.borderColor = 'var(--accent-crimson)';
                        card.style.color = '#fff';

                        selectedWolfTarget = card.getAttribute('data-index');
                        scriptDom.nextBtn.disabled = false;
                    };
                });
            }, 50);

            scriptDom.nextBtn.onclick = () => {
                if (selectedWolfTarget !== null) {
                    nightVictims.push(parseInt(selectedWolfTarget));
                    nightLog.push(`🐺 las bestias atacaron a ${state.assignedRoles[selectedWolfTarget].name}`);
                    advanceStep();
                }
            };
        } else {
            sState.step++;
            renderScriptStep();
            return;
        }
    }
    else if (sState.step === 4) { // BRUJA
        const hechicera = getAlivePlayer(ROLES.HECHICERA);
        if (hechicera && (hechicera.potions.life || hechicera.potions.death)) {
            scriptDom.title.textContent = "Turno de la Hechicera";

            let victimMsg = nightVictims.length > 0 ? `las bestias han atacado a: <br><b style="font-size:1.5rem; color:var(--accent-crimson);">${state.assignedRoles[nightVictims[0]].name}</b>` : `las bestias no mataron a nadie.`;

            let lifeUsedText = hechicera.potions.lifeTarget ? ` (Salvó a ${hechicera.potions.lifeTarget})` : ``;
            let btnLife = hechicera.potions.life ? `<button class="btn-primary" id="btn-potion-life" style="width:100%; margin-bottom:10px; background:#4CAF50; border-color:#2E7D32;">Usar Poción de Vida</button>` : `<p class="hint">Poción de Vida gastada${lifeUsedText}.</p>`;

            let gridItemsHtml = '';
            state.assignedRoles.forEach((p, i) => {
                const isDead = p.isDead;
                const isSelf = p.role === ROLES.HECHICERA;
                const isDying = nightVictims.includes(i);
                const isSelectable = !isDead && !isSelf && !isDying;
                const deadClass = isDead ? 'li-dead' : '';
                const selectableClass = isSelectable ? 'selectable-witch' : '';
                const extraStyle = !isSelectable ? 'style="pointer-events:none; opacity:0.6;"' : '';

                gridItemsHtml += `
                    <li class="player-card ${selectableClass} ${deadClass}" data-index="${i}" ${extraStyle}>
                        <div class="player-info">
                            <span class="player-name">${p.name}</span>
                        </div>
                    </li>
                `;
            });

            let deathUsedText = hechicera.potions.deathTarget ? ` (Envenenó a ${hechicera.potions.deathTarget})` : ``;
            let btnDeath = hechicera.potions.death ? `
                <div style="margin-top:15px; border-top:1px dashed var(--border-ink); padding-top:15px;">
                    <button id="toggle-death-potion" class="btn-secondary" style="width:100%; margin-bottom:10px;">
                        Mostrar Poción de Muerte ▼
                    </button>
                    <div id="witch-death-area" style="display:none;">
                        <p style="margin-bottom:10px;"><b>Usar Poción de Muerte:</b> (Selecciona una víctima de abajo)</p>
                        <ul class="dashboard-grid" id="witch-target-grid" style="margin-bottom:15px;">
                            ${gridItemsHtml}
                        </ul>
                        <button class="btn-danger" id="btn-potion-death" style="width:100%;" disabled>Usar Poción de Muerte</button>
                    </div>
                </div>
            ` : `<p class="hint">Poción de Muerte gastada${deathUsedText}.</p>`;

            contentHtml = `
                <p class="script-instruction">"La Hechicera (<b>${hechicera.name}</b>) despierta. Le muestro quién ha sido atacado."</p>
                <div style="margin-bottom:20px; background:var(--bg-card); padding:15px; border-radius:8px;">${victimMsg}</div>
                ${btnLife}
                ${btnDeath}
                <div style="text-align:center; font-size: 3rem; margin: 20px 0; opacity: 0.8;">🧪✨</div>
            `;

            scriptDom.nextBtn.textContent = "Hechicera duerme (Siguiente)";
            let selectedWitchTarget = null;

            scriptDom.nextBtn.onclick = () => {
                // Auto-aplicar la poción de muerte si dejaron una opción seleccionada pero no clickearon el botón de Usar
                if (selectedWitchTarget !== null && hechicera.potions.death) {
                    const poisonedName = state.assignedRoles[selectedWitchTarget].name;
                    nightLog.push(`🧪 La Hechicera envenenó a ${poisonedName}`);
                    nightVictims.push(parseInt(selectedWitchTarget));
                    hechicera.potions.death = false;
                    hechicera.potions.deathTarget = poisonedName;
                    saveState();
                }
                advanceStep();
            };

            setTimeout(() => {
                const bLife = document.getElementById('btn-potion-life');
                const bDeath = document.getElementById('btn-potion-death');
                const btnToggleDeath = document.getElementById('toggle-death-potion');
                const deathArea = document.getElementById('witch-death-area');

                if (btnToggleDeath && deathArea) {
                    btnToggleDeath.onclick = () => {
                        if (deathArea.style.display === 'none') {
                            deathArea.style.display = 'block';
                            btnToggleDeath.textContent = "Ocultar Poción de Muerte ▲";
                        } else {
                            deathArea.style.display = 'none';
                            btnToggleDeath.textContent = "Mostrar Poción de Muerte ▼";
                        }
                    };
                }

                if (bLife) {
                    bLife.onclick = () => {
                        if (nightVictims.length > 0) {
                            const savedName = state.assignedRoles[nightVictims[0]].name;
                            nightLog.push(`🧪 La Hechicera salvó a ${savedName}`);
                            nightVictims.shift(); // Removemos SOLO a la víctima de las bestias
                            hechicera.potions.life = false;
                            hechicera.potions.lifeTarget = savedName;
                            saveState();
                            bLife.disabled = true;
                            bLife.textContent = "¡Usada!";
                            bLife.style.background = "#888";
                            bLife.style.borderColor = "#666";
                        }
                    };
                }

                if (bDeath) {
                    const cards = document.querySelectorAll('#witch-target-grid .selectable-witch');
                    cards.forEach(card => {
                        card.onclick = () => {
                            cards.forEach(c => {
                                c.style.backgroundColor = 'var(--bg-parchment)';
                                c.style.borderColor = 'var(--border-ink)';
                                c.style.color = 'var(--text-ink)';
                            });
                            card.style.backgroundColor = 'var(--accent-crimson)';
                            card.style.borderColor = 'var(--accent-crimson)';
                            card.style.color = '#fff';

                            selectedWitchTarget = card.getAttribute('data-index');
                            bDeath.disabled = false;
                        };
                    });

                    bDeath.onclick = () => {
                        if (selectedWitchTarget !== null) {
                            const poisonedName = state.assignedRoles[selectedWitchTarget].name;
                            nightLog.push(`🧪 La Hechicera envenenó a ${poisonedName}`);
                            nightVictims.push(parseInt(selectedWitchTarget));
                            hechicera.potions.death = false;
                            hechicera.potions.deathTarget = poisonedName;
                            saveState();
                            bDeath.disabled = true;
                            bDeath.textContent = "¡Usada!";
                            bDeath.style.background = "#888";
                            bDeath.style.borderColor = "#666";
                            selectedWitchTarget = null; // Reset para que el Siguiente no lo aplique doble
                            if (btnToggleDeath) btnToggleDeath.style.display = 'none'; // Opcional, esconder el toggle
                            if (deathArea) deathArea.style.display = 'none';
                        }
                    };
                }
            }, 50);

        } else {
            sState.step++;
            renderScriptStep();
            return;
        }
    }
    else if (sState.step === 5) { // AMANECER
        scriptDom.title.textContent = "Amanecer";

        // Evitar duplicados
        const uniqueVictims = [...new Set(nightVictims)];
        let victimsNames = uniqueVictims.map(idx => state.assignedRoles[idx].name).join(' y ');

        let resultMsg = uniqueVictims.length > 0 ? `Esta noche, la aldea lamenta la pérdida de: <br><br><b style="font-size:2rem;">${victimsNames}</b>` : `Ha sido una noche tranquila. Nadie ha muerto.`;

        let logHtml = nightLog.length > 0 ? `<div style="text-align:left; font-size:1rem; margin-top:20px; padding:15px; background:var(--bg-card); border:1px solid var(--border-ink);">
            <h4 style="margin-top:0;">Registro de la Noche:</h4>
            <ul style="list-style:none; padding-left:0; margin-bottom:0;">
                ${nightLog.map(log => `<li style="margin-bottom:8px;">${log}</li>`).join('')}
            </ul>
        </div>` : '';

        contentHtml = `
            <p class="script-instruction">"La aldea despierta. El sol asoma por el horizonte."</p>
            <h3 style="color:var(--accent-crimson); margin-top:20px;">${resultMsg}</h3>
            ${logHtml}
        `;

        scriptDom.nextBtn.textContent = "Ir a Votación de la Aldea";
        scriptDom.nextBtn.onclick = () => {
            const hunter = state.assignedRoles.find(p => p.role === ROLES.GUARDIAN);
            const wasHunterAlive = hunter && !hunter.isDead;

            uniqueVictims.forEach(idx => {
                if (!state.assignedRoles[idx].isDead) {
                    executeKill(idx);
                }
            });

            if (wasHunterAlive && hunter.isDead) {
                sState.step = 'guardian';
                sState.nextStepAfterHunter = 6;
                renderScriptStep();
            } else {
                sState.step = 6;
                renderScriptStep();
            }
        };
    }
    else if (sState.step === 6) { // VOTACIÓN DE LA ALDEA
        scriptDom.title.textContent = "Votación de la Aldea";

        let gridItemsHtml = '';
        state.assignedRoles.forEach((p, i) => {
            const isDead = p.isDead;
            const isSelectable = !isDead;
            const deadClass = isDead ? 'li-dead' : '';
            const selectableClass = isSelectable ? 'selectable-vote' : '';
            const extraStyle = !isSelectable ? 'style="pointer-events:none; opacity:0.6;"' : '';

            gridItemsHtml += `
                <li class="player-card ${selectableClass} ${deadClass}" data-index="${i}" ${extraStyle}>
                    <div class="player-info">
                        <span class="player-name">${p.name}</span>
                    </div>
                </li>
            `;
        });

        contentHtml = `
            <p class="script-instruction">"La aldea debate quién es el lobo. Elige a alguien para ejecutar o termina la ronda si no hay linchamiento."</p>
            <ul class="dashboard-grid" id="vote-target-grid" style="margin-top:15px;">
                ${gridItemsHtml}
            </ul>
        `;

        scriptDom.nextBtn.textContent = "Terminar Ronda (Sin Linchamiento)";
        scriptDom.nextBtn.onclick = () => {
            sState.round++;
            sState.step = 0;
            saveState();
            startDashboard();
        };

        setTimeout(() => {
            const cards = document.querySelectorAll('#vote-target-grid .selectable-vote');
            cards.forEach(card => {
                card.onclick = () => {
                    const idx = card.getAttribute('data-index');
                    const target = state.assignedRoles[idx];

                    showAlert(
                        "Confirmar Linchamiento",
                        `¿La aldea ha decidido ejecutar a <b>${target.name}</b>?`,
                        "",
                        () => {
                            const hunter = state.assignedRoles.find(p => p.role === ROLES.GUARDIAN);
                            const wasHunterAlive = hunter && !hunter.isDead;

                            executeKill(idx);

                            if (wasHunterAlive && hunter.isDead) {
                                sState.step = 'guardian';
                                sState.nextStepAfterHunter = 'end_day';
                                renderScriptStep();
                            } else {
                                sState.round++;
                                sState.step = 0;
                                saveState();
                                startDashboard();
                            }
                        },
                        () => { }
                    );
                    alertDom.confirmBtn.textContent = "Aceptar";
                };
            });
        }, 50);
    }
    else if (sState.step === 'guardian') { // DISPARO DEL CAZADOR
        scriptDom.title.textContent = "La última bala del Guardián";
        
        let gridItemsHtml = '';
        const hunter = state.assignedRoles.find(p => p.role === ROLES.GUARDIAN);
        
        state.assignedRoles.forEach((p, i) => {
            const isDead = p.isDead;
            const isSelectable = !isDead;
            const deadClass = isDead ? 'li-dead' : '';
            const selectableClass = isSelectable ? 'selectable-hunter' : '';
            const extraStyle = !isSelectable ? 'style="pointer-events:none; opacity:0.6;"' : '';

            gridItemsHtml += `
                <li class="player-card ${selectableClass} ${deadClass}" data-index="${i}" ${extraStyle}>
                    <div class="player-info">
                        <span class="player-name">${p.name}</span>
                    </div>
                </li>
            `;
        });

        contentHtml = `
            <p class="script-instruction">"El Guardián (<b>${hunter.name}</b>) ha muerto. En su último aliento, dispara su arma contra alguien..."</p>
            <ul class="dashboard-grid" id="hunter-target-grid" style="margin-top:15px;">
                ${gridItemsHtml}
            </ul>
            <div style="text-align:center; font-size: 3rem; margin: 20px 0; opacity: 0.8;">🏹🛡️</div>
        `;

        scriptDom.nextBtn.textContent = "Disparar (Siguiente)";
        scriptDom.nextBtn.disabled = true;

        let selectedHunterTarget = null;

        setTimeout(() => {
            const cards = document.querySelectorAll('#hunter-target-grid .selectable-hunter');
            cards.forEach(card => {
                card.onclick = () => {
                    cards.forEach(c => {
                        c.style.backgroundColor = 'var(--bg-parchment)';
                        c.style.borderColor = 'var(--border-ink)';
                        c.style.color = 'var(--text-ink)';
                    });
                    card.style.backgroundColor = 'var(--accent-crimson)';
                    card.style.borderColor = 'var(--accent-crimson)';
                    card.style.color = '#fff';
                    
                    selectedHunterTarget = card.getAttribute('data-index');
                    scriptDom.nextBtn.disabled = false;
                };
            });
        }, 50);

        scriptDom.nextBtn.onclick = () => {
            if (selectedHunterTarget !== null) {
                executeKill(parseInt(selectedHunterTarget));
                
                if (sState.nextStepAfterHunter === 'end_day') {
                    sState.round++;
                    sState.step = 0;
                    saveState();
                    startDashboard();
                } else if (sState.nextStepAfterHunter !== undefined) {
                    sState.step = sState.nextStepAfterHunter;
                    sState.nextStepAfterHunter = undefined;
                    renderScriptStep();
                } else {
                    startDashboard();
                }
            }
        };
    }

    scriptDom.content.innerHTML = contentHtml;
}


// --- EVENT LISTENERS E INICIALIZACIÓN ---
setupDom.addBtn.addEventListener('click', addPlayer);
setupDom.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addPlayer(); });
setupDom.btnDecWolves.addEventListener('click', () => updateWolvesCount(-1));
setupDom.btnIncWolves.addEventListener('click', () => updateWolvesCount(1));
Object.values(setupDom.roles).forEach(chk => chk.addEventListener('change', validateSetup));
setupDom.distributeBtn.addEventListener('click', distributeRoles);

// Reveal Events (Mouse and Touch)
const cardContainer = document.querySelector('.reveal-card');
cardContainer.addEventListener('mousedown', startHold);
cardContainer.addEventListener('touchstart', startHold, { passive: false });
window.addEventListener('mouseup', endHold);
window.addEventListener('touchend', endHold);
revealDom.nextBtn.addEventListener('click', handleRevealNext);
revealDom.finishBtn.addEventListener('click', handleRevealNext);

dashDom.resetBtn.addEventListener('click', () => {
    showAlert("¿Reiniciar Juego?", "Se borrarán los roles y el progreso. Volverás a la configuración.", "", () => {
        state.gameStarted = false;
        state.assignedRoles = [];
        state.nightScriptState.round = 1;
        saveState();
        showScreen('setup');
        renderSetupPlayers();
    }, () => { });
});

function init() {
    loadState();
    if (state.gameStarted) {
        if (state.revealIndex < state.assignedRoles.length) {
            startRevealPhase();
        } else {
            startDashboard();
        }
    } else {
        showScreen('setup');
        setupDom.wolvesCount.textContent = state.rolesCount.bestias;
        setupDom.roles.oraculo.checked = state.rolesCount.oraculo;
        setupDom.roles.hechicera.checked = state.rolesCount.hechicera;
        setupDom.roles.guardian.checked = state.rolesCount.guardian;
        setupDom.roles.eros.checked = state.rolesCount.eros;
        setupDom.roles.espia.checked = state.rolesCount.espia;
        renderSetupPlayers();
    }
}

init();

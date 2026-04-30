// --- ESTADO GLOBAL ---
let state = {
    players: [],       // Lista de nombres
    rolesCount: {
        wolves: 1,
        vidente: true,
        bruja: true,
        cazador: false,
        cupido: false,
        nina: false
    },
    gameStarted: false,
    assignedRoles: [], // { name, role, isDead, isLover, potions: {life: true, death: true} }
    revealIndex: 0,
    nightScriptState: {
        round: 1,
        step: 0 // 0: inicio, 1: cupido, 2: vidente, 3: lobos, 4: bruja, 5: amanecer
    }
};

const ROLES = {
    ALDEANO: 'Aldeano',
    LOBO: 'Lobo',
    VIDENTE: 'Vidente',
    BRUJA: 'Bruja',
    CAZADOR: 'Cazador',
    CUPIDO: 'Cupido',
    NINA: 'Niña'
};

const ROLE_DESCRIPTIONS = {
    [ROLES.ALDEANO]: "Tu objetivo es descubrir a los lobos y eliminarlos en las votaciones de día. Eres la fuerza principal del pueblo.",
    [ROLES.LOBO]: "Por la noche, elige junto a tu manada a un aldeano para devorar. Miente y fíngete aldeano de día para sobrevivir.",
    [ROLES.VIDENTE]: "Cada noche despiertas para señalar a alguien y descubrir su verdadera identidad secreta.",
    [ROLES.BRUJA]: "Tienes dos pociones de un solo uso: una de vida para salvar a alguien del ataque de los lobos, y otra de muerte para eliminar a quien desees.",
    [ROLES.CAZADOR]: "Si mueres de noche o de día, en tu último aliento podrás disparar y llevarte a otro jugador contigo a la tumba.",
    [ROLES.CUPIDO]: "La primera noche eliges a dos jugadores para que se enamoren profundamente. Si uno muere, el otro morirá de tristeza.",
    [ROLES.NINA]: "Puedes espiar en la noche de los lobos. Cuidado, si ellos te descubren espiando, tú serás la próxima víctima."
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
        vidente: document.getElementById('role-vidente'),
        bruja: document.getElementById('role-bruja'),
        cazador: document.getElementById('role-cazador'),
        cupido: document.getElementById('role-cupido'),
        nina: document.getElementById('role-nina')
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
    lobosCount: document.getElementById('dash-lobos-count'),
    aldeanosCount: document.getElementById('dash-aldeanos-count'),
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
    const newVal = state.rolesCount.wolves + change;
    if (newVal >= 1 && newVal <= 10) {
        state.rolesCount.wolves = newVal;
        setupDom.wolvesCount.textContent = newVal;
        saveState();
        validateSetup();
    }
}

function validateSetup() {
    let specialCount = 0;
    if (setupDom.roles.vidente.checked) specialCount++;
    if (setupDom.roles.bruja.checked) specialCount++;
    if (setupDom.roles.cazador.checked) specialCount++;
    if (setupDom.roles.cupido.checked) specialCount++;
    if (setupDom.roles.nina.checked) specialCount++;

    const totalRolesNeeded = state.rolesCount.wolves + specialCount;
    const canStart = state.players.length >= Math.max(3, totalRolesNeeded);
    
    setupDom.distributeBtn.disabled = !canStart;
}

// --- ASIGNACIÓN DE ROLES ---
function distributeRoles() {
    state.rolesCount.vidente = setupDom.roles.vidente.checked;
    state.rolesCount.bruja = setupDom.roles.bruja.checked;
    state.rolesCount.cazador = setupDom.roles.cazador.checked;
    state.rolesCount.cupido = setupDom.roles.cupido.checked;
    state.rolesCount.nina = setupDom.roles.nina.checked;

    let pool = [];
    for (let i = 0; i < state.rolesCount.wolves; i++) pool.push(ROLES.LOBO);
    if (state.rolesCount.vidente) pool.push(ROLES.VIDENTE);
    if (state.rolesCount.bruja) pool.push(ROLES.BRUJA);
    if (state.rolesCount.cazador) pool.push(ROLES.CAZADOR);
    if (state.rolesCount.cupido) pool.push(ROLES.CUPIDO);
    if (state.rolesCount.nina) pool.push(ROLES.NINA);

    while (pool.length < state.players.length) {
        pool.push(ROLES.ALDEANO);
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
        potions: pool[idx] === ROLES.BRUJA ? { life: true, death: true } : null
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
    let aldeanosCount = 0;

    state.assignedRoles.forEach((p, index) => {
        if (!p.isDead) {
            if (p.role === ROLES.LOBO) wolvesCount++;
            else aldeanosCount++; 
        }

        const li = document.createElement('li');
        li.className = 'player-card';
        if (p.isDead) li.classList.add('li-dead');
        
        // Al hacer click, mostrar opciones
        li.onclick = () => showPlayerAction(index);

        const heartBadge = p.isLover ? `<div class="lover-badge">&lt;3</div>` : '';
        const wolfBadge = p.role === ROLES.LOBO ? `<div class="wolf-badge">🐺</div>` : '';

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

    dashDom.lobosCount.textContent = wolvesCount;
    dashDom.aldeanosCount.textContent = aldeanosCount;
}

function showPlayerAction(index) {
    const p = state.assignedRoles[index];
    
    // Estilo del rol para el mensaje
    const roleHtml = `<span style="color:var(--accent-gold); font-family:var(--font-heading); font-size:1.3rem; display:block; margin-top:5px;">${p.role}</span>`;

    // Si es un enamorado muerto, su destino está sellado (no se puede revivir individualmente)
    if (p.isDead && p.isLover) {
        showAlert(
            p.name,
            `${roleHtml}<p style="margin-top:15px; font-size:0.95rem;"><b>Destino Sellado</b>: Este jugador está profundamente atado a su pareja. Al estar muerto, su situación no puede ser modificada individualmente.</p>`,
            ``,
            () => {}, // No hace nada, solo cierra
            null
        );
        alertDom.confirmBtn.textContent = "Aceptar";
        alertDom.confirmBtn.style.backgroundColor = "var(--accent-blue)";
        return;
    }

    const action = !p.isDead ? "Matar" : "Revivir";
    showAlert(
        p.name,
        roleHtml,
        `<p style="margin-top:10px; color:var(--text-muted); font-size:0.9rem;">¿Qué acción deseas realizar con este jugador?</p>`,
        () => {
            if (!p.isDead) manualKill(index);
            else manualRevive(index);
        },
        () => {} // Cancelar
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
    
    // Si es Cazador, abrir alerta intermedia con MATRIZ
    if (player.role === ROLES.CAZADOR) {
        // Marcamos muerto de inmediato para consistencia
        player.isDead = true;
        saveState();
        renderDashboard();

        let gridItemsHtml = '';
        state.assignedRoles.forEach((p, i) => {
            // No puede dispararse a sí mismo ni a muertos
            if (!p.isDead && i !== index) {
                gridItemsHtml += `
                    <li class="player-card selectable-hunter-target" data-index="${i}" style="min-height:50px; padding:5px;">
                        <span style="font-size:0.85rem;">${p.name}</span>
                    </li>
                `;
            }
        });

        showAlert(
            "Tiro del Cazador",
            `El Cazador (<b>${player.name}</b>) ha muerto. Debe elegir a quién disparar su tiro de gracia.`,
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

        // Lógica de selección en la matriz del cazador
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

    // Regla: Enamorados (Cupido)
    if (player.isLover) {
        const otherIdx = state.assignedRoles.findIndex((p, i) => p.isLover && i !== index && !p.isDead);
        if (otherIdx !== -1) {
            const otherLover = state.assignedRoles[otherIdx];
            otherLover.isDead = true; // Muerte instantánea para consistencia de estado
            saveState();
            renderDashboard();

            showAlert(
                "Despecho de Cupido",
                `${player.name} era un enamorado. Su pareja, ${otherLover.name}, debe morir de tristeza.`,
                "",
                () => {
                    // Si el segundo enamorado era el Cazador, disparar su tiro de gracia
                    if (otherLover.role === ROLES.CAZADOR) {
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
    let aldeanos = 0;
    state.assignedRoles.forEach(p => {
        if (!p.isDead) {
            if (p.role === ROLES.LOBO) wolves++;
            else aldeanos++;
        }
    });

    if (wolves === 0 && aldeanos > 0) {
        showAlert("¡Fin del Juego!", "Los Aldeanos han eliminado a todos los lobos. ¡La Aldea Gana!", "", () => {});
    } else if (wolves >= aldeanos && wolves > 0) {
        showAlert("¡Fin del Juego!", "Los Lobos han igualado el número de aldeanos. ¡Los Lobos Ganan!", "", () => {});
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
        const cupido = getAlivePlayer(ROLES.CUPIDO);
        if (isFirstNight && cupido) {
            scriptDom.title.textContent = "Turno de Cupido";
            
            let gridItemsHtml = '';
            state.assignedRoles.forEach((p, i) => {
                if (!p.isDead && p.role !== ROLES.CUPIDO) {
                    gridItemsHtml += `
                        <li class="player-card selectable-cupid" data-index="${i}">
                            <div class="player-info">
                                <span class="player-name">${p.name}</span>
                            </div>
                        </li>
                    `;
                }
            });
            
            contentHtml = `
                <p class="script-instruction">"Cupido (<b>${cupido.name}</b>) despierta y elige a dos enamorados."</p>
                <ul class="dashboard-grid" id="cupid-target-grid" style="margin-top:15px;">
                    ${gridItemsHtml}
                </ul>
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
                    nightLog.push(`🏹 Cupido enamoró a ${state.assignedRoles[selectedCupids[0]].name} y ${state.assignedRoles[selectedCupids[1]].name}`);
                    advanceStep();
                }
            };
        } else {
            sState.step++; 
            renderScriptStep();
            return;
        }
    }
    else if (sState.step === 2) { // VIDENTE
        const vidente = getAlivePlayer(ROLES.VIDENTE);
        if (vidente) {
            scriptDom.title.textContent = "Turno de la Vidente";
            
            let gridItemsHtml = '';
            state.assignedRoles.forEach((p, i) => {
                if (!p.isDead && p.role !== ROLES.VIDENTE) {
                    gridItemsHtml += `
                        <li class="player-card selectable-seer" data-index="${i}">
                            <div class="player-info">
                                <span class="player-name">${p.name}</span>
                            </div>
                        </li>
                    `;
                }
            });
            
            contentHtml = `
                <p class="script-instruction" id="seer-instruction">"La Vidente (<b>${vidente.name}</b>) despierta y señala a alguien para ver su verdadera identidad."</p>
                <ul class="dashboard-grid" id="seer-target-grid" style="margin-top:15px;">
                    ${gridItemsHtml}
                </ul>
                <div id="seer-result-container" style="display:none; margin-top:20px; background: var(--bg-card); padding: 25px; border: 3px double var(--accent-gold); border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <p style="margin:0 0 15px 0; color:var(--text-muted); font-style:italic; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:10px;">La identidad revelada es:</p>
                    <div id="seer-result" style="margin:0;"></div>
                </div>
            `;
            scriptDom.nextBtn.textContent = "Vidente duerme (Siguiente)";
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
                    nightLog.push(`👁️ La Vidente vio a ${targetPlayer.name} (${targetPlayer.role})`);
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
        if (isAlive(ROLES.LOBO)) {
            scriptDom.title.textContent = "Turno de los Lobos";
            
            // Mostrar estado de la manada
            const lobos = state.assignedRoles.filter(p => p.role === ROLES.LOBO);
            const lobosList = lobos.map(l => l.isDead ? `<span style="text-decoration:line-through; color:#aaa;">${l.name}</span>` : `<b>${l.name}</b>`).join(', ');

            let gridItemsHtml = '';
            state.assignedRoles.forEach((p, i) => {
                if (!p.isDead && p.role !== ROLES.LOBO) {
                    gridItemsHtml += `
                        <li class="player-card selectable-victim" data-index="${i}">
                            <div class="player-info">
                                <span class="player-name">${p.name}</span>
                            </div>
                        </li>
                    `;
                }
            });
            
            const nina = getAlivePlayer(ROLES.NINA);
            const ninaText = nina ? `<br><br><span style="color:var(--accent-blue); font-weight:bold;">(Atención: La Niña (${nina.name}) puede estar observando)</span>` : '';

            contentHtml = `
                <div style="background:var(--bg-card); padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.9rem;">
                    <b>Manada:</b> ${lobosList}
                </div>
                <p class="script-instruction">"Los Lobos despiertan, se reconocen y deciden a quién devorar." ${ninaText}</p>
                <ul class="dashboard-grid" id="wolves-target-grid" style="margin-top:15px;">
                    ${gridItemsHtml}
                </ul>
            `;
            scriptDom.nextBtn.textContent = "Lobos duermen (Siguiente)";
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
                    nightLog.push(`🐺 Los Lobos atacaron a ${state.assignedRoles[selectedWolfTarget].name}`);
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
        const bruja = getAlivePlayer(ROLES.BRUJA);
        if (bruja && (bruja.potions.life || bruja.potions.death)) {
            scriptDom.title.textContent = "Turno de la Bruja";
            
            let victimMsg = nightVictims.length > 0 ? `Los lobos han atacado a: <br><b style="font-size:1.5rem; color:var(--accent-crimson);">${state.assignedRoles[nightVictims[0]].name}</b>` : `Los lobos no mataron a nadie.`;
            
            let lifeUsedText = bruja.potions.lifeTarget ? ` (Salvó a ${bruja.potions.lifeTarget})` : ``;
            let btnLife = bruja.potions.life ? `<button class="btn-primary" id="btn-potion-life" style="width:100%; margin-bottom:10px; background:#4CAF50; border-color:#2E7D32;">Usar Poción de Vida</button>` : `<p class="hint">Poción de Vida gastada${lifeUsedText}.</p>`;
            
            let gridItemsHtml = '';
            state.assignedRoles.forEach((p, i) => {
                if (!p.isDead && p.role !== ROLES.BRUJA) {
                    gridItemsHtml += `
                        <li class="player-card selectable-witch" data-index="${i}">
                            <div class="player-info">
                                <span class="player-name">${p.name}</span>
                            </div>
                        </li>
                    `;
                }
            });

            let deathUsedText = bruja.potions.deathTarget ? ` (Envenenó a ${bruja.potions.deathTarget})` : ``;
            let btnDeath = bruja.potions.death ? `
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
                <p class="script-instruction">"La Bruja (<b>${bruja.name}</b>) despierta. Le muestro quién ha sido atacado."</p>
                <div style="margin-bottom:20px; background:var(--bg-card); padding:15px; border-radius:8px;">${victimMsg}</div>
                ${btnLife}
                ${btnDeath}
                <div style="margin-top:20px;"></div>
            `;
            
            scriptDom.nextBtn.textContent = "Bruja duerme (Siguiente)";
            let selectedWitchTarget = null;

            scriptDom.nextBtn.onclick = () => {
                // Auto-aplicar la poción de muerte si dejaron una opción seleccionada pero no clickearon el botón de Usar
                if (selectedWitchTarget !== null && bruja.potions.death) {
                    const poisonedName = state.assignedRoles[selectedWitchTarget].name;
                    nightLog.push(`🧪 La Bruja envenenó a ${poisonedName}`);
                    nightVictims.push(parseInt(selectedWitchTarget));
                    bruja.potions.death = false;
                    bruja.potions.deathTarget = poisonedName;
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
                            nightLog.push(`🧪 La Bruja salvó a ${savedName}`);
                            nightVictims.shift(); // Removemos SOLO a la víctima de los lobos
                            bruja.potions.life = false;
                            bruja.potions.lifeTarget = savedName;
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
                            nightLog.push(`🧪 La Bruja envenenó a ${poisonedName}`);
                            nightVictims.push(parseInt(selectedWitchTarget));
                            bruja.potions.death = false;
                            bruja.potions.deathTarget = poisonedName;
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
            uniqueVictims.forEach(idx => {
                if (!state.assignedRoles[idx].isDead) {
                    executeKill(idx);
                }
            });
            advanceStep();
        };
    }
    else if (sState.step === 6) { // VOTACIÓN DE LA ALDEA
        scriptDom.title.textContent = "Votación de la Aldea";
        
        let gridItemsHtml = '';
        state.assignedRoles.forEach((p, i) => {
            if (!p.isDead) {
                gridItemsHtml += `
                    <li class="player-card selectable-vote" data-index="${i}">
                        <div class="player-info">
                            <span class="player-name">${p.name}</span>
                        </div>
                    </li>
                `;
            }
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
                            executeKill(idx);
                            sState.round++;
                            sState.step = 0;
                            saveState();
                            startDashboard();
                        },
                        () => {}
                    );
                    alertDom.confirmBtn.textContent = "Aceptar";
                };
            });
        }, 50);
    }

    scriptDom.content.innerHTML = contentHtml;
}


// --- EVENT LISTENERS E INICIALIZACIÓN ---
setupDom.addBtn.addEventListener('click', addPlayer);
setupDom.input.addEventListener('keypress', (e) => { if(e.key === 'Enter') addPlayer(); });
setupDom.btnDecWolves.addEventListener('click', () => updateWolvesCount(-1));
setupDom.btnIncWolves.addEventListener('click', () => updateWolvesCount(1));
Object.values(setupDom.roles).forEach(chk => chk.addEventListener('change', validateSetup));
setupDom.distributeBtn.addEventListener('click', distributeRoles);

// Reveal Events (Mouse and Touch)
const cardContainer = document.querySelector('.reveal-card');
cardContainer.addEventListener('mousedown', startHold);
cardContainer.addEventListener('touchstart', startHold, {passive: false});
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
    }, () => {});
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
        setupDom.wolvesCount.textContent = state.rolesCount.wolves;
        setupDom.roles.vidente.checked = state.rolesCount.vidente;
        setupDom.roles.bruja.checked = state.rolesCount.bruja;
        setupDom.roles.cazador.checked = state.rolesCount.cazador;
        setupDom.roles.cupido.checked = state.rolesCount.cupido;
        setupDom.roles.nina.checked = state.rolesCount.nina;
        renderSetupPlayers();
    }
}

init();

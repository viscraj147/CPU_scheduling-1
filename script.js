/**
 * Smart CPU Process Scheduler - Web Simulation
 * Enhanced with Data Structures Visualization, Step-by-Step Simulation State Layer,
 * View Management & Tab Routing, Starvation & Aging Demonstration, and Comparison Matrix.
 */

// Algorithm Information
const ALGO_INFO = {
    'fcfs': {
        name: 'FCFS (First Come First Serve)',
        type: 'Non-Preemptive',
        desc: 'Processes are executed in order of arrival.'
    },
    'sjf': {
        name: 'SJF Non-Preemptive',
        type: 'Non-Preemptive',
        desc: 'The process with the shortest burst time is selected first.'
    },
    'srtf': {
        name: 'SRTF (Shortest Remaining Time First)',
        type: 'Preemptive',
        desc: 'The process with the shortest remaining time is selected.'
    },
    'rr': {
        name: 'Round Robin',
        type: 'Preemptive',
        desc: 'Each process gets CPU time according to the time quantum.'
    },
    'priority-np': {
        name: 'Priority Non-Preemptive',
        type: 'Non-Preemptive',
        desc: 'The available process with the highest priority is selected.'
    },
    'priority-p': {
        name: 'Priority Preemptive',
        type: 'Preemptive',
        desc: 'The process with the highest priority can interrupt the current process.'
    }
};

let currentAlgorithm = 'fcfs';

// Standard sample dataset for quick viva demo
const SAMPLE_PROCESSES = [
    { id: 1, arrival: 0, burst: 5, priority: 2 },
    { id: 2, arrival: 1, burst: 3, priority: 1 },
    { id: 3, arrival: 2, burst: 4, priority: 3 },
    { id: 4, arrival: 4, burst: 2, priority: 4 }
];

// Starvation demo standard dataset
const STARVATION_SAMPLE_PROCESSES = [
    { id: 1, arrival: 0, burst: 4, priority: 1 },
    { id: 2, arrival: 2, burst: 4, priority: 2 },
    { id: 3, arrival: 4, burst: 4, priority: 2 },
    { id: 4, arrival: 0, burst: 5, priority: 8 }
];

// ==========================================================
// SIMULATION ENGINE STATE (Step-by-Step Layer)
// ==========================================================
let simData = {
    steps: [],           // Array of simulation snapshots at each unit/event
    currentStepIndex: 0, // Currently displayed step index
    timerId: null,       // SetTimeout / interval handle for playback
    isPlaying: false,    // Is live simulation running
    speedMs: 1000,       // Current step delay (1000 = 1x, 2000 = 0.5x, 500 = 2x, 250 = 4x)
    totalTimeline: 0,    // Max time
    processes: [],       // Process array copy
    gantt: []            // Full gantt array
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    setupProcessRows(4, SAMPLE_PROCESSES);
    setupEventListeners();

    // Check initial URL hash for direct tab linking
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && ['scheduler', 'visualization', 'comparison', 'starvation', 'reference'].includes(initialHash)) {
        switchView(initialHash, false);
    }
});

// ==========================================================
// 🎛️ VIEW MANAGEMENT & TAB ROUTING
// ==========================================================
function switchView(viewName, updateHash = true) {
    const validViews = ['scheduler', 'visualization', 'comparison', 'starvation', 'reference'];
    if (!validViews.includes(viewName)) {
        viewName = 'scheduler';
    }

    // Hide all view panels and show the requested one
    const panels = document.querySelectorAll('.view-panel');
    panels.forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });

    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) {
        activePanel.classList.add('active');
        activePanel.style.display = 'block';
    }

    // Update View Management Tab buttons
    const tabButtons = document.querySelectorAll('.tab-item');
    tabButtons.forEach(btn => {
        const isTarget = (btn.getAttribute('data-tab') === viewName);
        if (isTarget) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        }
    });

    // Update Header Navbar links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(a => {
        const targetView = a.getAttribute('href').replace('#', '');
        if (targetView === viewName) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });

    // Update URL hash without causing a page jump
    if (updateHash && window.location.hash !== `#${viewName}`) {
        window.history.pushState(null, '', `#${viewName}`);
    }

    // View-specific initialization & updates
    if (viewName === 'visualization') {
        updateWorkloadContextBanner();
        initializeDSSimulation(false);
    } else if (viewName === 'comparison') {
        compareAllAlgorithms(false);
    } else if (viewName === 'starvation') {
        const agingEnabled = document.getElementById('chk-aging-mode').checked;
        const rawProcesses = getProcessesFromTable() || SAMPLE_PROCESSES;
        const sim = generateSimulationSteps(rawProcesses, 'priority-np', 2, agingEnabled, 3);
        renderStarvationAgingTracker(sim.processes, agingEnabled);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateWorkloadContextBanner() {
    const processes = getProcessesFromTable();
    const count = processes ? processes.length : 0;
    const bannerCount = document.getElementById('ds-workload-count');
    const bannerAlgo = document.getElementById('ds-workload-algo');
    if (bannerCount) bannerCount.textContent = count;
    if (bannerAlgo) bannerAlgo.textContent = ALGO_INFO[currentAlgorithm].name.split(' ')[0];
}

function setupEventListeners() {
    // --- View Navigation & Tab Management ---
    const tabButtons = document.querySelectorAll('.tab-item');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-tab');
            switchView(view);
        });
    });

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(a => {
        a.addEventListener('click', (e) => {
            const hash = a.getAttribute('href');
            if (hash && hash.startsWith('#')) {
                e.preventDefault();
                const view = hash.replace('#', '');
                switchView(view);
            }
        });
    });

    // Browser back/forward navigation support
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            switchView(hash, false);
        } else {
            switchView('scheduler', false);
        }
    });

    // Cross-view quick transitions
    const btnResultsToDs = document.getElementById('btn-results-to-ds');
    if (btnResultsToDs) {
        btnResultsToDs.addEventListener('click', () => {
            switchView('visualization');
        });
    }

    const btnResultsToComp = document.getElementById('btn-results-to-comp');
    if (btnResultsToComp) {
        btnResultsToComp.addEventListener('click', () => {
            switchView('comparison');
        });
    }

    const btnEditWorkload = document.getElementById('btn-edit-workload-quick');
    if (btnEditWorkload) {
        btnEditWorkload.addEventListener('click', () => {
            switchView('scheduler');
        });
    }

    const btnRefreshComp = document.getElementById('btn-refresh-comparison');
    if (btnRefreshComp) {
        btnRefreshComp.addEventListener('click', () => {
            compareAllAlgorithms(false);
        });
    }

    // Add processes button
    document.getElementById('btn-add-processes').addEventListener('click', () => {
        const count = parseInt(document.getElementById('num-processes').value, 10);
        if (isNaN(count) || count < 1) {
            alert('Please enter a valid number of processes (at least 1).');
            return;
        }
        setupProcessRows(count);
    });

    // Load example data button
    document.getElementById('btn-load-example').addEventListener('click', () => {
        document.getElementById('num-processes').value = SAMPLE_PROCESSES.length;
        setupProcessRows(SAMPLE_PROCESSES.length, SAMPLE_PROCESSES);
    });

    // Algorithm selection buttons
    const algoButtons = document.querySelectorAll('.btn-algo');
    algoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            algoButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAlgorithm = btn.getAttribute('data-algo');

            // Show or hide Time Quantum box
            const quantumBox = document.getElementById('quantum-container');
            if (currentAlgorithm === 'rr') {
                quantumBox.style.display = 'inline-flex';
            } else {
                quantumBox.style.display = 'none';
            }

            // If DS visualization is currently active, re-generate simulation steps for new algorithm
            const activePanel = document.querySelector('.view-panel.active');
            if (activePanel && activePanel.id === 'view-visualization') {
                updateWorkloadContextBanner();
                initializeDSSimulation(false);
            }
        });
    });

    // Run Scheduler button (Instant execution on View 1)
    document.getElementById('btn-run').addEventListener('click', () => {
        runScheduler();
    });

    // Open Data Structures Visualization button (switches to View 2)
    document.getElementById('btn-visualize-ds').addEventListener('click', () => {
        switchView('visualization');
    });

    // Compare All Algorithms button (switches to View 3)
    document.getElementById('btn-compare-all').addEventListener('click', () => {
        switchView('comparison');
    });

    // Reset button
    document.getElementById('btn-reset').addEventListener('click', resetAll);

    // --- DS Simulation Controls ---
    document.getElementById('btn-sim-start').addEventListener('click', handleSimStart);
    document.getElementById('btn-sim-pause').addEventListener('click', handleSimPause);
    document.getElementById('btn-sim-next').addEventListener('click', handleSimNext);
    document.getElementById('btn-sim-prev').addEventListener('click', handleSimPrev);
    document.getElementById('btn-sim-reset').addEventListener('click', handleSimReset);

    // Speed buttons (0.5x, 1x, 2x, 4x)
    const speedButtons = document.querySelectorAll('.btn-speed');
    speedButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            speedButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            simData.speedMs = parseInt(btn.getAttribute('data-speed'), 10) || 1000;
        });
    });

    // Clear operation log
    const clearLogBtn = document.getElementById('btn-clear-log');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            document.getElementById('ds-log-stream').innerHTML = '';
        });
    }

    // Load starvation workload
    document.getElementById('btn-load-starvation-workload').addEventListener('click', () => {
        document.getElementById('num-processes').value = STARVATION_SAMPLE_PROCESSES.length;
        setupProcessRows(STARVATION_SAMPLE_PROCESSES.length, STARVATION_SAMPLE_PROCESSES);

        // Select Priority Non-Preemptive
        const pBtn = document.querySelector('.btn-algo[data-algo="priority-np"]');
        if (pBtn) pBtn.click();

        // Run scheduler and update starvation table
        runScheduler();
    });

    // Aging checkbox toggle
    document.getElementById('chk-aging-mode').addEventListener('change', (e) => {
        const agingEnabled = e.target.checked;
        const statusElem = document.getElementById('demo-aging-status');
        if (agingEnabled) {
            statusElem.textContent = 'Active: Boosting waiting process priority every 3 time units';
            statusElem.className = 'status-boosted';
        } else {
            statusElem.textContent = 'Disabled (Standard Priority Scheduling)';
            statusElem.className = 'status-neutral';
        }

        // Re-run scheduler with aging setting
        runScheduler();
    });
}

/**
 * Dynamically generate process input rows
 */
function setupProcessRows(count, defaultData = null) {
    const tbody = document.getElementById('process-table-body');
    tbody.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const tr = document.createElement('tr');
        const pid = i + 1;
        
        let arrival = i;
        let burst = Math.floor(Math.random() * 5) + 2;
        let priority = Math.floor(Math.random() * 4) + 1;

        if (defaultData && defaultData[i]) {
            arrival = defaultData[i].arrival;
            burst = defaultData[i].burst;
            priority = defaultData[i].priority;
        }

        tr.innerHTML = `
            <td><strong>P${pid}</strong></td>
            <td><input type="number" class="input-at" min="0" value="${arrival}" data-pid="${pid}"></td>
            <td><input type="number" class="input-bt" min="1" value="${burst}" data-pid="${pid}"></td>
            <td><input type="number" class="input-pr" min="1" value="${priority}" data-pid="${pid}"></td>
        `;
        tbody.appendChild(tr);
    }
}

/**
 * Read processes from HTML input table
 */
function getProcessesFromTable() {
    const rows = document.querySelectorAll('#process-table-body tr');
    const processes = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const atInput = row.querySelector('.input-at');
        const btInput = row.querySelector('.input-bt');
        const prInput = row.querySelector('.input-pr');

        const pid = parseInt(atInput.getAttribute('data-pid'), 10);
        const arrival = parseInt(atInput.value, 10);
        const burst = parseInt(btInput.value, 10);
        const priority = parseInt(prInput.value, 10);

        if (isNaN(arrival) || arrival < 0) {
            alert(`Please enter a valid Arrival Time for P${pid} (>= 0).`);
            return null;
        }
        if (isNaN(burst) || burst <= 0) {
            alert(`Please enter a valid Burst Time for P${pid} (> 0).`);
            return null;
        }
        if (isNaN(priority) || priority < 0) {
            alert(`Please enter a valid Priority for P${pid} (>= 0).`);
            return null;
        }

        processes.push({
            id: pid,
            arrival: arrival,
            burst: burst,
            priority: priority,
            currentPriority: priority,
            remaining: burst,
            completion: 0,
            turnaround: 0,
            waiting: 0,
            responseTime: -1,
            firstExecuted: -1,
            ageCounter: 0,
            agingEvents: []
        });
    }

    return processes;
}

// ==========================================================
// CORE SCHEDULING ALGORITHMS (With Event Snapshots Generator)
// ==========================================================

/**
 * Simulates CPU scheduling step-by-step and records exact state snapshots
 * for data structures visualization (Array, Queue, CPU, Gantt, Log).
 */
function generateSimulationSteps(rawProcesses, algoKey, quantum = 2, agingEnabled = false, agingInterval = 3) {
    const n = rawProcesses.length;
    // Deep clone processes
    const p = rawProcesses.map(proc => ({
        id: proc.id,
        arrival: proc.arrival,
        burst: proc.burst,
        priority: proc.priority,
        currentPriority: proc.priority,
        remaining: proc.burst,
        completion: 0,
        turnaround: 0,
        waiting: 0,
        responseTime: -1,
        firstExecuted: -1,
        ageCounter: 0,
        agingEvents: []
    }));

    let t = 0;
    let completed = 0;
    let running = null;
    let runSlice = 0;
    const gantt = [];
    const steps = [];

    // Dedicated Round Robin FIFO Queue
    let rrQueue = [];
    let rrAdded = new Array(n).fill(0);

    // Initial enqueue for Round Robin arrivals at t = 0
    if (algoKey === 'rr') {
        for (let i = 0; i < n; i++) {
            if (p[i].arrival === 0) {
                rrQueue.push(p[i]);
                rrAdded[i] = 1;
            }
        }
    }

    const MAX_CYCLES = 5000;
    let cycle = 0;

    while (completed < n && cycle < MAX_CYCLES) {
        cycle++;

        // Track events occurring in this tick for the operation log
        const logEvents = [];

        // 1. Check newly arrived processes at time t
        for (let i = 0; i < n; i++) {
            if (p[i].arrival === t) {
                logEvents.push({
                    type: 'arrive',
                    time: t,
                    pid: p[i].id,
                    msg: `Process P${p[i].id} arrives at T=${t} (BT=${p[i].burst}, Priority=${p[i].priority}).`
                });
            }
        }

        // Round Robin: Enqueue newly arrived processes (excluding the currently executing process)
        if (algoKey === 'rr') {
            for (let i = 0; i < n; i++) {
                if (rrAdded[i] === 0 && p[i].arrival <= t && p[i].remaining > 0 && p[i] !== running) {
                    rrQueue.push(p[i]);
                    rrAdded[i] = 1;
                    logEvents.push({
                        type: 'arrive',
                        time: t,
                        pid: p[i].id,
                        msg: `ENQUEUE: P${p[i].id} pushed to REAR of FIFO ready queue (rear=${rrQueue.length}).`
                    });
                }
            }
        }

        // 2. Optional Aging Mechanism for Priority algorithms
        if (agingEnabled && agingInterval > 0 && (algoKey === 'priority-np' || algoKey === 'priority-p')) {
            for (let i = 0; i < n; i++) {
                if (p[i].arrival <= t && p[i].remaining > 0 && p[i] !== running) {
                    p[i].ageCounter++;
                    if (p[i].ageCounter >= agingInterval) {
                        if (p[i].currentPriority > 1) {
                            const oldPr = p[i].currentPriority;
                            p[i].currentPriority--;
                            p[i].agingEvents.push({ time: t, oldPr: oldPr, newPr: p[i].currentPriority });
                            logEvents.push({
                                type: 'preempt',
                                time: t,
                                pid: p[i].id,
                                msg: `AGING: P${p[i].id} waited ${agingInterval} units. Priority boosted from ${oldPr} to ${p[i].currentPriority}.`
                            });
                        }
                        p[i].ageCounter = 0;
                    }
                }
            }
        }

        // 3. Scheduler Decision / Selection
        let prevRunning = running;
        let accessedIndex = -1;
        let decisionExplanation = '';

        if (algoKey === 'fcfs') {
            if (!running || running.remaining === 0) {
                const available = p.filter(proc => proc.arrival <= t && proc.remaining > 0);
                available.sort((a, b) => a.arrival - b.arrival || a.id - b.id);
                running = available.length > 0 ? available[0] : null;
                if (running) {
                    accessedIndex = running.id - 1;
                    decisionExplanation = `FCFS Dispatch: p[${accessedIndex}] (P${running.id}) has earliest arrival (${running.arrival}). Selected for execution.`;
                    logEvents.push({
                        type: 'select',
                        time: t,
                        pid: running.id,
                        msg: `SCHEDULER: Selected P${running.id} (earliest arrival: ${running.arrival}). Dispatched to CPU.`
                    });
                } else {
                    decisionExplanation = `No arrived processes ready at T=${t}. CPU is IDLE.`;
                }
            } else {
                decisionExplanation = `FCFS Non-Preemptive: P${running.id} continues running on CPU.`;
            }
        } else if (algoKey === 'sjf') {
            if (!running || running.remaining === 0) {
                const available = p.filter(proc => proc.arrival <= t && proc.remaining > 0);
                available.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.id - b.id);
                running = available.length > 0 ? available[0] : null;
                if (running) {
                    accessedIndex = running.id - 1;
                    decisionExplanation = `SJF Dispatch: p[${accessedIndex}] (P${running.id}) has shortest initial burst (${running.burst}). Selected.`;
                    logEvents.push({
                        type: 'select',
                        time: t,
                        pid: running.id,
                        msg: `SCHEDULER: Selected P${running.id} with smallest burst (${running.burst}). Dispatched to CPU.`
                    });
                } else {
                    decisionExplanation = `No arrived processes ready at T=${t}. CPU is IDLE.`;
                }
            } else {
                decisionExplanation = `SJF Non-Preemptive: P${running.id} continues executing until burst completion.`;
            }
        } else if (algoKey === 'srtf') {
            const available = p.filter(proc => proc.arrival <= t && proc.remaining > 0);
            available.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.id - b.id);
            const candidate = available.length > 0 ? available[0] : null;

            if (running && candidate && running.id !== candidate.id) {
                logEvents.push({
                    type: 'preempt',
                    time: t,
                    pid: running.id,
                    msg: `PREEMPTION: P${running.id} (rem: ${running.remaining}) preempted by P${candidate.id} (shorter rem: ${candidate.remaining}).`
                });
            }

            running = candidate;
            if (running) {
                accessedIndex = running.id - 1;
                decisionExplanation = `SRTF Evaluation: p[${accessedIndex}] (P${running.id}) currently has shortest remaining time (${running.remaining}). Dispatched to CPU.`;
                if (!prevRunning || prevRunning.id !== running.id) {
                    logEvents.push({
                        type: 'select',
                        time: t,
                        pid: running.id,
                        msg: `SCHEDULER: P${running.id} selected with shortest remaining time (${running.remaining}).`
                    });
                }
            } else {
                decisionExplanation = `No arrived processes ready at T=${t}. CPU is IDLE.`;
            }
        } else if (algoKey === 'rr') {
            if (!running || runSlice >= quantum || running.remaining === 0) {
                // If previous process ran out of time quantum but not finished, re-enqueue to back
                if (running && running.remaining > 0) {
                    rrQueue.push(running);
                    logEvents.push({
                        type: 'preempt',
                        time: t,
                        pid: running.id,
                        msg: `QUANTUM EXPIRED: P${running.id} time slice (${quantum} units) reached. Re-enqueued to REAR of FIFO queue.`
                    });
                }

                // Dequeue next from front
                if (rrQueue.length > 0) {
                    running = rrQueue.shift();
                    runSlice = 0;
                    accessedIndex = running.id - 1;
                    decisionExplanation = `Round Robin Dequeue: P${running.id} popped from FRONT of queue. Assigned time quantum slice 1/${quantum}.`;
                    logEvents.push({
                        type: 'select',
                        time: t,
                        pid: running.id,
                        msg: `DEQUEUE: P${running.id} dequeued from FRONT to CPU register (remaining: ${running.remaining}).`
                    });
                } else {
                    running = null;
                    runSlice = 0;
                    decisionExplanation = `FIFO Ready Queue is empty at T=${t}. CPU is IDLE awaiting arrivals.`;
                }
            } else {
                decisionExplanation = `Round Robin: P${running.id} continuing time slice (${runSlice + 1}/${quantum}).`;
            }
        } else if (algoKey === 'priority-np') {
            if (!running || running.remaining === 0) {
                const available = p.filter(proc => proc.arrival <= t && proc.remaining > 0);
                available.sort((a, b) => a.currentPriority - b.currentPriority || a.arrival - b.arrival || a.id - b.id);
                running = available.length > 0 ? available[0] : null;
                if (running) {
                    accessedIndex = running.id - 1;
                    decisionExplanation = `Priority Non-Preemptive: p[${accessedIndex}] (P${running.id}) has highest priority (value ${running.currentPriority}). Dispatched.`;
                    logEvents.push({
                        type: 'select',
                        time: t,
                        pid: running.id,
                        msg: `SCHEDULER: Selected P${running.id} with highest priority (${running.currentPriority}). Dispatched to CPU.`
                    });
                } else {
                    decisionExplanation = `No arrived processes ready at T=${t}. CPU is IDLE.`;
                }
            } else {
                decisionExplanation = `Priority Non-Preemptive: P${running.id} executing non-preemptively until completion.`;
            }
        } else if (algoKey === 'priority-p') {
            const available = p.filter(proc => proc.arrival <= t && proc.remaining > 0);
            available.sort((a, b) => a.currentPriority - b.currentPriority || a.arrival - b.arrival || a.id - b.id);
            const candidate = available.length > 0 ? available[0] : null;

            if (running && candidate && running.id !== candidate.id) {
                logEvents.push({
                    type: 'preempt',
                    time: t,
                    pid: running.id,
                    msg: `PREEMPTION: P${running.id} (priority: ${running.currentPriority}) preempted by higher priority P${candidate.id} (priority: ${candidate.currentPriority}).`
                });
            }

            running = candidate;
            if (running) {
                accessedIndex = running.id - 1;
                decisionExplanation = `Priority Preemptive: p[${accessedIndex}] (P${running.id}) selected with highest priority (${running.currentPriority}).`;
                if (!prevRunning || prevRunning.id !== running.id) {
                    logEvents.push({
                        type: 'select',
                        time: t,
                        pid: running.id,
                        msg: `SCHEDULER: Dispatched P${running.id} (priority: ${running.currentPriority}) to CPU.`
                    });
                }
            } else {
                decisionExplanation = `No arrived processes ready at T=${t}. CPU is IDLE.`;
            }
        }

        const activePid = running ? running.id : 'IDLE';

        // 4. Update Gantt Segment
        if (gantt.length === 0 || gantt[gantt.length - 1].id !== activePid) {
            gantt.push({ id: activePid, start: t, end: t + 1 });
        } else {
            gantt[gantt.length - 1].end = t + 1;
        }

        // 5. Build Ready Queue snapshot at time t
        let readyQueueSnap = [];
        let queueConceptNote = '';
        if (algoKey === 'rr') {
            queueConceptNote = 'Underlying structure: Circular FIFO array (int queue[500], front, rear). Order is strictly FIFO.';
            readyQueueSnap = rrQueue.map(proc => ({
                id: proc.id,
                remaining: proc.remaining,
                priority: proc.currentPriority,
                arrival: proc.arrival
            }));
        } else {
            queueConceptNote = 'Conceptual Ready Queue: Ready processes ordered by algorithm priority rule.';
            const waitingList = p.filter(proc => proc.arrival <= t && proc.remaining > 0 && proc !== running);
            if (algoKey === 'sjf' || algoKey === 'srtf') {
                waitingList.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.id - b.id);
            } else if (algoKey === 'priority-np' || algoKey === 'priority-p') {
                waitingList.sort((a, b) => a.currentPriority - b.currentPriority || a.arrival - b.arrival || a.id - b.id);
            } else {
                waitingList.sort((a, b) => a.arrival - b.arrival || a.id - b.id);
            }
            readyQueueSnap = waitingList.map(proc => ({
                id: proc.id,
                remaining: proc.remaining,
                priority: proc.currentPriority,
                arrival: proc.arrival
            }));
        }

        // 6. Build Process Array Snapshot
        const arraySnap = p.map((proc, idx) => {
            let status = 'NOT_ARRIVED';
            if (proc.arrival <= t) {
                if (proc.remaining === 0) {
                    status = 'COMPLETED';
                } else if (running && proc.id === running.id) {
                    status = 'RUNNING';
                } else {
                    status = 'READY';
                }
            }
            return {
                index: idx,
                id: proc.id,
                arrival: proc.arrival,
                burst: proc.burst,
                remaining: proc.remaining,
                priority: proc.currentPriority,
                status: status,
                isAccessed: (idx === accessedIndex)
            };
        });

        // 7. Build Completed List Snapshot
        const completedSnap = p.filter(proc => proc.arrival <= t && proc.remaining === 0).map(proc => ({
            id: proc.id,
            completion: proc.completion,
            turnaround: proc.turnaround,
            waiting: proc.waiting
        }));

        // 8. Record step snapshot
        steps.push({
            t: t,
            runningPid: activePid,
            runningRemaining: running ? running.remaining : 0,
            runSlice: runSlice + 1,
            quantum: quantum,
            accessedIndex: accessedIndex,
            decisionExplanation: decisionExplanation,
            logEvents: logEvents,
            readyQueue: readyQueueSnap,
            queueConceptNote: queueConceptNote,
            arraySnap: arraySnap,
            completedSnap: completedSnap,
            activeGanttIndex: gantt.length - 1,
            ganttTimelineSoFar: JSON.parse(JSON.stringify(gantt))
        });

        // 9. Execute 1 time unit on CPU
        if (running) {
            if (running.firstExecuted === -1) {
                running.firstExecuted = t;
            }
            running.remaining--;
            runSlice++;

            if (running.remaining === 0) {
                running.completion = t + 1;
                running.turnaround = running.completion - running.arrival;
                running.waiting = running.turnaround - running.burst;
                running.responseTime = running.firstExecuted - running.arrival;
                completed++;

                logEvents.push({
                    type: 'complete',
                    time: t + 1,
                    pid: running.id,
                    msg: `PROCESS COMPLETED: P${running.id} finished at T=${t + 1} (TAT=${running.turnaround}, WT=${running.waiting}).`
                });

                running = null;
                runSlice = 0;
            }
        }

        t++;
    }

    // Final completed snapshot at finish time t
    const finalArraySnap = p.map((proc, idx) => ({
        index: idx,
        id: proc.id,
        arrival: proc.arrival,
        burst: proc.burst,
        remaining: 0,
        priority: proc.currentPriority,
        status: 'COMPLETED',
        isAccessed: false
    }));

    steps.push({
        t: t,
        runningPid: 'IDLE',
        runningRemaining: 0,
        runSlice: 0,
        quantum: quantum,
        accessedIndex: -1,
        decisionExplanation: `All ${n} processes completed successfully at T=${t}. Simulation finished.`,
        logEvents: [{
            type: 'complete',
            time: t,
            pid: 0,
            msg: `SIMULATION TERMINATION: All processes completed execution. Total timeline = ${t} units.`
        }],
        readyQueue: [],
        queueConceptNote: 'Ready queue empty.',
        arraySnap: finalArraySnap,
        completedSnap: p.map(proc => ({
            id: proc.id,
            completion: proc.completion,
            turnaround: proc.turnaround,
            waiting: proc.waiting
        })),
        activeGanttIndex: gantt.length - 1,
        ganttTimelineSoFar: JSON.parse(JSON.stringify(gantt))
    });

    p.sort((a, b) => a.id - b.id);

    return {
        processes: p,
        gantt: gantt,
        steps: steps,
        totalTime: t
    };
}

/**
 * Metric computation
 */
function computeMetrics(processes, gantt) {
    let contextSwitches = 0;
    let prevId = null;
    const sequence = [];

    for (let i = 0; i < gantt.length; i++) {
        const currId = gantt[i].id;
        if (currId !== 'IDLE') {
            sequence.push(`P${currId}`);
            if (prevId !== null && prevId !== currId) {
                contextSwitches++;
            }
            prevId = currId;
        }
    }

    const totalBusyTime = processes.reduce((sum, p) => sum + p.burst, 0);
    const totalTimeline = gantt.length > 0 ? (gantt[gantt.length - 1].end - gantt[0].start) : 0;
    const totalIdleTime = Math.max(0, totalTimeline - totalBusyTime);
    const cpuUtilization = totalTimeline > 0 ? ((totalBusyTime / totalTimeline) * 100) : 100;

    const n = processes.length;
    const avgWT = processes.reduce((s, p) => s + p.waiting, 0) / n;
    const avgTAT = processes.reduce((s, p) => s + p.turnaround, 0) / n;
    const avgRT = processes.reduce((s, p) => s + p.responseTime, 0) / n;

    return {
        contextSwitches: contextSwitches,
        sequence: sequence,
        totalBusyTime: totalBusyTime,
        totalIdleTime: totalIdleTime,
        totalTimeline: totalTimeline,
        cpuUtilization: cpuUtilization,
        avgWT: avgWT,
        avgTAT: avgTAT,
        avgRT: avgRT
    };
}

/**
 * Main Run Scheduler Handler (View 1)
 */
function runScheduler() {
    const rawProcesses = getProcessesFromTable();
    if (!rawProcesses || rawProcesses.length === 0) return null;

    const quantumInput = document.getElementById('time-quantum');
    const quantum = parseInt(quantumInput.value, 10) || 2;
    const agingEnabled = document.getElementById('chk-aging-mode').checked;

    const sim = generateSimulationSteps(rawProcesses, currentAlgorithm, quantum, agingEnabled, 3);
    const metrics = computeMetrics(sim.processes, sim.gantt);

    displayResults(sim.processes, sim.gantt, metrics);
    updateAlgorithmInfo(currentAlgorithm);

    // Update Starvation & Aging Tracker Table
    renderStarvationAgingTracker(sim.processes, agingEnabled);

    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    // Synchronize DS simulation engine with these steps
    simData.steps = sim.steps;
    simData.totalTimeline = sim.totalTime;
    simData.processes = sim.processes;
    simData.gantt = sim.gantt;
    simData.currentStepIndex = 0;

    return sim;
}

/**
 * Renders Results Table, Gantt Chart, and Summary Metrics
 */
function displayResults(processes, gantt, metrics) {
    const tbody = document.getElementById('results-table-body');
    tbody.innerHTML = '';

    processes.forEach(p => {
        const isStarved = p.waiting >= 10 || (p.waiting > p.burst * 2.5 && p.waiting >= 6);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>P${p.id}</strong></td>
            <td>${p.arrival}</td>
            <td>${p.burst}</td>
            <td>${p.priority}</td>
            <td>${p.completion}</td>
            <td>${p.turnaround}</td>
            <td>${p.waiting}</td>
            <td><strong>${p.responseTime}</strong></td>
            <td>${isStarved ? '<span class="status-starved">⚠️ High Wait</span>' : '<span class="status-ok">Completed</span>'}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('avg-wt-value').textContent = metrics.avgWT.toFixed(2);
    document.getElementById('avg-tat-value').textContent = metrics.avgTAT.toFixed(2);
    document.getElementById('avg-rt-value').textContent = metrics.avgRT.toFixed(2);
    document.getElementById('cpu-util-value').textContent = `${metrics.cpuUtilization.toFixed(1)}%`;
    document.getElementById('context-switch-value').textContent = metrics.contextSwitches;

    renderGanttChart(gantt, 'gantt-chart-wrapper');
}

/**
 * Render standard Gantt Chart
 */
function renderGanttChart(gantt, targetWrapperId = 'gantt-chart-wrapper', activeIndex = -1) {
    const wrapper = document.getElementById(targetWrapperId);
    if (!wrapper) return;
    wrapper.innerHTML = '';

    if (!gantt || gantt.length === 0) return;

    const chart = document.createElement('div');
    chart.className = 'gantt-chart';

    gantt.forEach((block, idx) => {
        const duration = block.end - block.start;
        const blockElem = document.createElement('div');
        blockElem.className = 'gantt-block';

        if (idx === activeIndex) {
            blockElem.classList.add('active-executing-block');
        }

        if (block.id === 'IDLE') {
            blockElem.classList.add('pid-idle');
            blockElem.textContent = 'Idle';
        } else {
            const colorIndex = ((block.id - 1) % 8) + 1;
            blockElem.classList.add(`pid-${colorIndex}`);
            blockElem.textContent = `P${block.id}`;
        }

        blockElem.style.flex = `${duration} 0 ${Math.max(duration * 24, 38)}px`;

        if (idx === 0) {
            const startMarker = document.createElement('span');
            startMarker.className = 'gantt-time-start';
            startMarker.textContent = block.start;
            blockElem.appendChild(startMarker);
        }

        const endMarker = document.createElement('span');
        endMarker.className = 'gantt-time-end';
        endMarker.textContent = block.end;
        blockElem.appendChild(endMarker);

        chart.appendChild(blockElem);
    });

    wrapper.appendChild(chart);
}

// ==========================================================
// DATA STRUCTURES VISUALIZATION INTERACTIVE ENGINE
// ==========================================================

/**
 * Initializes or resets the DS simulation view
 */
function initializeDSSimulation(autoStart = false) {
    stopSimulationTimer();

    const rawProcesses = getProcessesFromTable();
    if (!rawProcesses || rawProcesses.length === 0) return;

    const quantumInput = document.getElementById('time-quantum');
    const quantum = parseInt(quantumInput.value, 10) || 2;
    const agingEnabled = document.getElementById('chk-aging-mode').checked;

    const sim = generateSimulationSteps(rawProcesses, currentAlgorithm, quantum, agingEnabled, 3);
    simData.steps = sim.steps;
    simData.totalTimeline = sim.totalTime;
    simData.processes = sim.processes;
    simData.gantt = sim.gantt;
    simData.currentStepIndex = 0;
    simData.isPlaying = false;

    // Badges update
    document.getElementById('ds-algo-badge').textContent = `Algorithm: ${currentAlgorithm.toUpperCase()}`;
    const quantumBadge = document.getElementById('ds-quantum-badge');
    if (currentAlgorithm === 'rr') {
        quantumBadge.style.display = 'inline-block';
        quantumBadge.textContent = `Quantum: ${quantum}`;
    } else {
        quantumBadge.style.display = 'none';
    }

    // Reset log stream
    const logStream = document.getElementById('ds-log-stream');
    logStream.innerHTML = '';
    appendLogEntry({
        type: 'init',
        time: 0,
        pid: 0,
        msg: `Simulation initialized for ${currentAlgorithm.toUpperCase()}. Process records allocated in memory array p[0..${rawProcesses.length - 1}].`
    });

    // Render initial step 0
    renderStep(0);
    updateControlsState();

    if (autoStart) {
        handleSimStart();
    }
}

/**
 * Renders the state at steps[stepIndex]
 */
function renderStep(stepIndex) {
    if (!simData.steps || simData.steps.length === 0) return;
    if (stepIndex < 0) stepIndex = 0;
    if (stepIndex >= simData.steps.length) stepIndex = simData.steps.length - 1;

    simData.currentStepIndex = stepIndex;
    const step = simData.steps[stepIndex];

    // Status Banner
    document.getElementById('ds-current-time').textContent = `T = ${step.t}`;
    document.getElementById('ds-step-index').textContent = stepIndex + 1;
    document.getElementById('ds-total-steps').textContent = simData.steps.length;

    // Step Explanation Box
    document.getElementById('ds-step-explanation').innerHTML = step.decisionExplanation;

    // 1. CPU EXECUTION VISUALIZATION (C)
    const cpuStateTitle = document.getElementById('cpu-state-title');
    const cpuStateDetail = document.getElementById('cpu-state-detail');
    const cpuTimeVal = document.getElementById('cpu-time-val');
    const cpuRemainingVal = document.getElementById('cpu-remaining-val');
    const cpuStatusPill = document.getElementById('cpu-status-pill');
    const cpuSliceMeta = document.getElementById('cpu-slice-meta');
    const cpuSliceVal = document.getElementById('cpu-slice-val');

    cpuTimeVal.textContent = step.t;

    if (step.runningPid !== 'IDLE') {
        cpuStateTitle.textContent = `P${step.runningPid}`;
        cpuStateTitle.className = 'cpu-state-title running-pid';
        cpuStateDetail.textContent = `Process P${step.runningPid} in active execution register`;
        cpuRemainingVal.textContent = `${step.runningRemaining} units`;
        cpuStatusPill.textContent = 'RUNNING';
        cpuStatusPill.className = 'pill-running';

        if (currentAlgorithm === 'rr') {
            cpuSliceMeta.style.display = 'block';
            cpuSliceVal.textContent = `${step.runSlice} / ${step.quantum}`;
        } else {
            cpuSliceMeta.style.display = 'none';
        }
    } else {
        cpuStateTitle.textContent = 'IDLE';
        cpuStateTitle.className = 'cpu-state-title idle-pid';
        cpuStateDetail.textContent = 'No process dispatched at this time tick';
        cpuRemainingVal.textContent = '-';
        cpuStatusPill.textContent = 'IDLE';
        cpuStatusPill.className = 'pill-idle';
        cpuSliceMeta.style.display = 'none';
    }

    // 2. COMPLETED PROCESSES (D)
    const completedList = document.getElementById('ds-completed-list');
    const completedCount = document.getElementById('ds-completed-count');
    const totalCountElem = document.getElementById('ds-total-procs-count');
    const liveBusyElem = document.getElementById('ds-live-busy-time');

    totalCountElem.textContent = simData.processes.length;
    completedCount.textContent = step.completedSnap.length;

    // Calculate busy time so far
    let busyUnitsSoFar = 0;
    step.ganttTimelineSoFar.forEach(b => {
        if (b.id !== 'IDLE') busyUnitsSoFar += (b.end - b.start);
    });
    liveBusyElem.textContent = busyUnitsSoFar;

    if (step.completedSnap.length === 0) {
        completedList.innerHTML = '<span class="empty-state-text">No processes completed yet.</span>';
    } else {
        completedList.innerHTML = step.completedSnap.map(cp => {
            const colorIndex = ((cp.id - 1) % 8) + 1;
            return `
                <div class="completed-chip">
                    <span class="chip-pid pid-${colorIndex}">P${cp.id}</span>
                    <span class="chip-ct">CT: ${cp.completion}</span>
                    <span class="chip-tag">&#10003; Done</span>
                </div>
            `;
        }).join('');
    }

    // 3. READY QUEUE VISUALIZATION (B)
    const qTrack = document.getElementById('ds-queue-items-track');
    const frontIdxElem = document.getElementById('queue-front-idx');
    const rearIdxElem = document.getElementById('queue-rear-idx');
    const lenValElem = document.getElementById('queue-len-val');
    const qOpText = document.getElementById('ds-queue-op-text');
    const qConceptLabel = document.getElementById('queue-ds-concept-label');

    if (qConceptLabel) qConceptLabel.textContent = step.queueConceptNote;

    const qLen = step.readyQueue.length;
    frontIdxElem.textContent = '0';
    rearIdxElem.textContent = qLen;
    lenValElem.textContent = qLen;

    if (qLen === 0) {
        qTrack.innerHTML = '<span class="empty-queue-msg">[ Ready Queue is Empty: CPU Idle or running process ]</span>';
        qOpText.innerHTML = `<em>Queue operation:</em> No waiting processes in queue (front == rear = 0).`;
    } else {
        qTrack.innerHTML = step.readyQueue.map((item, idx) => {
            const isFront = (idx === 0);
            const colorIndex = ((item.id - 1) % 8) + 1;
            return `
                <div class="queue-node ${isFront ? 'node-front' : ''}">
                    <span class="queue-node-pos">[${idx}]</span>
                    <span class="queue-node-header pid-${colorIndex}">P${item.id}</span>
                    <span class="queue-node-sub">rem: ${item.remaining}</span>
                    ${currentAlgorithm.includes('priority') ? `<span class="queue-node-sub">pr: ${item.priority}</span>` : ''}
                </div>
            `;
        }).join('');

        const nextPid = step.readyQueue[0].id;
        qOpText.innerHTML = `<em>Queue Status:</em> FRONT = P${nextPid} (next eligible). REAR has ${qLen} total waiting process${qLen > 1 ? 'es' : ''}.`;
    }

    // 4. PROCESS ARRAY VISUALIZATION (A)
    const arrayContainer = document.getElementById('ds-array-container');
    const arrayConceptLabel = document.getElementById('array-ds-label');
    if (arrayConceptLabel) {
        arrayConceptLabel.textContent = 'Underlying Structure: Contiguous Struct Array Process p[N] (Actual C++ Memory Layout)';
    }

    arrayContainer.innerHTML = step.arraySnap.map(elem => {
        let cardClass = 'array-element-card';
        let statusTagClass = 'card-status-tag tag-ready';
        let statusTagText = 'Ready';

        if (elem.status === 'RUNNING') {
            cardClass += ' running';
            statusTagClass = 'card-status-tag tag-running';
            statusTagText = 'Executing';
        } else if (elem.status === 'COMPLETED') {
            cardClass += ' completed';
            statusTagClass = 'card-status-tag tag-completed';
            statusTagText = 'Finished';
        } else if (elem.status === 'NOT_ARRIVED') {
            statusTagClass = 'card-status-tag tag-not-arrived';
            statusTagText = 'Unarrived';
        }

        if (elem.isAccessed) {
            cardClass += ' accessed';
        }

        const colorIndex = ((elem.id - 1) % 8) + 1;

        return `
            <div class="${cardClass}">
                <div class="array-index-badge">
                    <span>Index: <strong>[${elem.index}]</strong></span>
                    <span>Offset: <code>p[${elem.index}]</code></span>
                </div>
                <div class="array-card-title">
                    <span class="pid-${colorIndex}" style="padding: 2px 6px; border-radius: 3px;">P${elem.id}</span>
                    <span class="${statusTagClass}">${statusTagText}</span>
                </div>
                <div class="array-fields-table">
                    <div><span>Arrival:</span> <strong>${elem.arrival}</strong></div>
                    <div><span>Burst:</span> <strong>${elem.burst}</strong></div>
                    <div><span>Remaining:</span> <strong class="field-rem-highlight">${elem.remaining}</strong></div>
                    <div><span>Priority:</span> <strong>${elem.priority}</strong></div>
                </div>
            </div>
        `;
    }).join('');

    // 5. SYNCHRONIZED GANTT MINI TIMELINE
    renderGanttChart(step.ganttTimelineSoFar, 'ds-sync-gantt-wrapper', step.activeGanttIndex);

    // 6. LOG EVENTS: Append events for this step to live log
    if (step.logEvents && step.logEvents.length > 0) {
        step.logEvents.forEach(evt => appendLogEntry(evt));
    }

    updateControlsState();
}

/**
 * Appends a log entry to the operation log
 */
function appendLogEntry(evt) {
    const stream = document.getElementById('ds-log-stream');
    if (!stream) return;

    let badgeClass = 'badge-init';
    let badgeLabel = 'INFO';

    if (evt.type === 'arrive') { badgeClass = 'badge-arrive'; badgeLabel = 'ARRIVAL'; }
    else if (evt.type === 'select') { badgeClass = 'badge-select'; badgeLabel = 'SELECT'; }
    else if (evt.type === 'execute') { badgeClass = 'badge-execute'; badgeLabel = 'EXEC'; }
    else if (evt.type === 'preempt') { badgeClass = 'badge-preempt'; badgeLabel = 'PREEMPT'; }
    else if (evt.type === 'complete') { badgeClass = 'badge-complete'; badgeLabel = 'DONE'; }
    else if (evt.type === 'idle') { badgeClass = 'badge-idle'; badgeLabel = 'IDLE'; }

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">[T=${evt.time}]</span>
        <span class="log-badge ${badgeClass}">${badgeLabel}</span>
        <span class="log-msg">${evt.msg}</span>
    `;

    stream.appendChild(entry);
    stream.scrollTop = stream.scrollHeight;
}

/**
 * Updates button enabled/disabled states based on current simulation progress
 */
function updateControlsState() {
    const isPlaying = simData.isPlaying;
    const idx = simData.currentStepIndex;
    const total = simData.steps ? simData.steps.length : 0;

    const startBtn = document.getElementById('btn-sim-start');
    const pauseBtn = document.getElementById('btn-sim-pause');
    const prevBtn = document.getElementById('btn-sim-prev');
    const nextBtn = document.getElementById('btn-sim-next');
    const dot = document.getElementById('ds-status-dot');
    const statusText = document.getElementById('ds-status-text');

    if (isPlaying) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        dot.className = 'status-dot running';
        statusText.textContent = 'Simulation playing...';
    } else {
        startBtn.disabled = (idx >= total - 1);
        pauseBtn.disabled = true;
        prevBtn.disabled = (idx <= 0);
        nextBtn.disabled = (idx >= total - 1);

        if (idx >= total - 1 && total > 0) {
            dot.className = 'status-dot completed';
            statusText.textContent = 'Simulation complete';
        } else if (idx > 0) {
            dot.className = 'status-dot paused';
            statusText.textContent = 'Paused / Stepping';
        } else {
            dot.className = 'status-dot';
            statusText.textContent = 'Ready to simulate';
        }
    }
}

// --- Simulation Controls Actions ---

function handleSimStart() {
    if (simData.isPlaying) return;
    if (!simData.steps || simData.steps.length === 0) {
        initializeDSSimulation(false);
    }

    // If at the end, reset to 0 before starting
    if (simData.currentStepIndex >= simData.steps.length - 1) {
        simData.currentStepIndex = 0;
        document.getElementById('ds-log-stream').innerHTML = '';
        renderStep(0);
    }

    simData.isPlaying = true;
    updateControlsState();
    scheduleSimTick();
}

function handleSimPause() {
    stopSimulationTimer();
    simData.isPlaying = false;
    updateControlsState();
}

function handleSimNext() {
    handleSimPause();
    if (simData.currentStepIndex < simData.steps.length - 1) {
        renderStep(simData.currentStepIndex + 1);
    }
}

function handleSimPrev() {
    handleSimPause();
    if (simData.currentStepIndex > 0) {
        const targetIndex = simData.currentStepIndex - 1;
        document.getElementById('ds-log-stream').innerHTML = '';
        for (let i = 0; i <= targetIndex; i++) {
            const step = simData.steps[i];
            if (step.logEvents) {
                step.logEvents.forEach(evt => appendLogEntry(evt));
            }
        }
        renderStep(targetIndex);
    }
}

function handleSimReset() {
    handleSimPause();
    initializeDSSimulation(false);
}

function scheduleSimTick() {
    if (!simData.isPlaying) return;

    simData.timerId = setTimeout(() => {
        if (!simData.isPlaying) return;

        if (simData.currentStepIndex < simData.steps.length - 1) {
            renderStep(simData.currentStepIndex + 1);
            scheduleSimTick();
        } else {
            // End of simulation
            simData.isPlaying = false;
            updateControlsState();
        }
    }, simData.speedMs);
}

function stopSimulationTimer() {
    if (simData.timerId) {
        clearTimeout(simData.timerId);
        simData.timerId = null;
    }
}

// ==========================================================
// STARVATION & AGING DEMONSTRATION TABLE
// ==========================================================
function renderStarvationAgingTracker(processes, agingEnabled) {
    const liveTracker = document.getElementById('starvation-live-tracker');
    const tbody = document.getElementById('starvation-table-body');
    if (!liveTracker || !tbody) return;

    liveTracker.style.display = 'block';
    tbody.innerHTML = '';

    processes.forEach(p => {
        const isStarved = p.waiting >= 10 || (p.waiting > p.burst * 2.5 && p.waiting >= 6);
        const tr = document.createElement('tr');

        let agingSummary = 'No aging events';
        if (p.agingEvents && p.agingEvents.length > 0) {
            agingSummary = p.agingEvents.map(e => `[T=${e.time}: ${e.oldPr}➔${e.newPr}]`).join(', ');
        }

        tr.innerHTML = `
            <td><strong>P${p.id}</strong></td>
            <td>${p.arrival}</td>
            <td>${p.burst}</td>
            <td>${p.priority}</td>
            <td>${p.waiting} units</td>
            <td><strong>${p.currentPriority}</strong></td>
            <td>${isStarved ? '<span class="status-starved">⚠️ Starved (Delayed)</span>' : '<span class="status-ok">Normal Wait</span>'}</td>
            <td><small>${agingSummary}</small></td>
        `;
        tbody.appendChild(tr);
    });

    // Update demo stat box
    const victimProc = processes.reduce((max, proc) => proc.waiting > max.waiting ? proc : max, processes[0]);
    if (victimProc) {
        document.getElementById('demo-orig-priority').textContent = `P${victimProc.id}: Initial Priority ${victimProc.priority}`;
    }
}

// ==========================================================
// ALGORITHM COMPARISON MATRIX EVALUATOR
// ==========================================================
function compareAllAlgorithms(scrollToView = false) {
    const rawProcesses = getProcessesFromTable();
    if (!rawProcesses || rawProcesses.length === 0) return;

    const quantumInput = document.getElementById('time-quantum');
    const quantum = parseInt(quantumInput.value, 10) || 2;
    const agingEnabled = document.getElementById('chk-aging-mode').checked;

    const algos = [
        { key: 'fcfs', name: 'FCFS (First Come First Serve)', type: 'Non-Preemptive' },
        { key: 'sjf', name: 'SJF Non-Preemptive', type: 'Non-Preemptive' },
        { key: 'srtf', name: 'SRTF (Preemptive SJF)', type: 'Preemptive' },
        { key: 'rr', name: `Round Robin (q=${quantum})`, type: 'Preemptive' },
        { key: 'priority-np', name: 'Priority Non-Preemptive', type: 'Non-Preemptive' },
        { key: 'priority-p', name: 'Priority Preemptive', type: 'Preemptive' }
    ];

    const results = [];

    algos.forEach(item => {
        const sim = generateSimulationSteps(rawProcesses, item.key, quantum, agingEnabled, 3);
        const met = computeMetrics(sim.processes, sim.gantt);
        results.push({
            key: item.key,
            name: item.name,
            type: item.type,
            avgWT: met.avgWT,
            avgTAT: met.avgTAT,
            avgRT: met.avgRT,
            cpuUtil: met.cpuUtilization,
            contextSwitches: met.contextSwitches,
            sequence: met.sequence.join(' ➔ ')
        });
    });

    // Find winners for each category
    const minWT = Math.min(...results.map(r => r.avgWT));
    const minTAT = Math.min(...results.map(r => r.avgTAT));
    const minRT = Math.min(...results.map(r => r.avgRT));
    const minCS = Math.min(...results.map(r => r.contextSwitches));

    const bestWT = results.find(r => r.avgWT === minWT);
    const bestTAT = results.find(r => r.avgTAT === minTAT);
    const bestRT = results.find(r => r.avgRT === minRT);
    const bestCS = results.find(r => r.contextSwitches === minCS);

    // Update Winner Cards
    document.getElementById('winner-wt-algo').textContent = bestWT.name.split(' ')[0];
    document.getElementById('winner-wt-val').textContent = `${bestWT.avgWT.toFixed(2)} units`;

    document.getElementById('winner-tat-algo').textContent = bestTAT.name.split(' ')[0];
    document.getElementById('winner-tat-val').textContent = `${bestTAT.avgTAT.toFixed(2)} units`;

    document.getElementById('winner-rt-algo').textContent = bestRT.name.split(' ')[0];
    document.getElementById('winner-rt-val').textContent = `${bestRT.avgRT.toFixed(2)} units`;

    document.getElementById('winner-cs-algo').textContent = bestCS.name.split(' ')[0];
    document.getElementById('winner-cs-val').textContent = `${bestCS.contextSwitches} switches`;

    document.getElementById('comparison-winners-grid').style.display = 'grid';

    // Populate comparison table
    const tbody = document.getElementById('comparison-table-body');
    tbody.innerHTML = '';

    results.forEach(r => {
        const isWinner = (r.key === bestWT.key);
        const tr = document.createElement('tr');
        if (isWinner) tr.className = 'row-winner';

        tr.innerHTML = `
            <td><strong>${r.name}</strong></td>
            <td><small>${r.type}</small></td>
            <td>${r.avgWT.toFixed(2)} ${r.avgWT === minWT ? '<span class="best-metric-badge">Lowest</span>' : ''}</td>
            <td>${r.avgTAT.toFixed(2)} ${r.avgTAT === minTAT ? '<span class="best-metric-badge">Lowest</span>' : ''}</td>
            <td>${r.avgRT.toFixed(2)} ${r.avgRT === minRT ? '<span class="best-metric-badge">Fastest</span>' : ''}</td>
            <td>${r.cpuUtil.toFixed(1)}%</td>
            <td>${r.contextSwitches} ${r.contextSwitches === minCS ? '<span class="best-metric-badge">Min</span>' : ''}</td>
            <td><small><code>${r.sequence}</code></small></td>
        `;
        tbody.appendChild(tr);
    });

    if (scrollToView) {
        document.getElementById('comparison-section').scrollIntoView({ behavior: 'smooth' });
    }
}

// ==========================================================
// HELPERS & RESET
// ==========================================================
function updateAlgorithmInfo(algoKey) {
    const info = ALGO_INFO[algoKey] || ALGO_INFO['fcfs'];
    document.getElementById('info-algo-name').textContent = info.name;
    document.getElementById('info-algo-type').textContent = info.type;
    document.getElementById('info-algo-desc').textContent = info.desc;
}

/**
 * Reset all fields back to initial state
 */
function resetAll() {
    stopSimulationTimer();

    document.getElementById('num-processes').value = 4;
    setupProcessRows(4, SAMPLE_PROCESSES);

    const algoButtons = document.querySelectorAll('.btn-algo');
    algoButtons.forEach(b => b.classList.remove('active'));
    algoButtons[0].classList.add('active');
    currentAlgorithm = 'fcfs';

    const quantumBox = document.getElementById('quantum-container');
    quantumBox.style.display = 'none';
    document.getElementById('time-quantum').value = 2;

    document.getElementById('results-section').style.display = 'none';
    document.getElementById('starvation-live-tracker').style.display = 'none';
    document.getElementById('comparison-winners-grid').style.display = 'none';

    document.getElementById('results-table-body').innerHTML = '';
    document.getElementById('gantt-chart-wrapper').innerHTML = '';
    document.getElementById('avg-wt-value').textContent = '0.00';
    document.getElementById('avg-tat-value').textContent = '0.00';
    document.getElementById('avg-rt-value').textContent = '0.00';
    document.getElementById('cpu-util-value').textContent = '100.0%';
    document.getElementById('context-switch-value').textContent = '0';

    switchView('scheduler');
}

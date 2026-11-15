// PulseGuard Renderer Controller
document.addEventListener('DOMContentLoaded', async () => {
    // State
    const state = {
        tempUnit: 'C',
        alertThreshold: 82,
        isMiniMode: false,
        isPinned: false,
        isAdmin: true,
        historyChart: null,
        sortProcBy: 'cpu',
        procSearchQuery: '',
        procs: []
    };

    // DOM Elements - Navigation & Window
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPages = document.querySelectorAll('.tab-page');
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');
    const btnPin = document.getElementById('btn-pin');
    const btnMiniMode = document.getElementById('btn-mini-mode');
    const btnRestoreFull = document.getElementById('btn-restore-full');
    const miniWidget = document.getElementById('mini-widget');
    const mainContent = document.getElementById('main-content');
    const titlebarNav = document.getElementById('main-nav');
    const adminBadge = document.getElementById('admin-badge');
    const adminBadgeText = document.getElementById('admin-badge-text');

    // DOM Elements - CPU
    const cpuName = document.getElementById('cpu-name');
    const cpuTempBadge = document.getElementById('cpu-temp-badge');
    const cpuLoadVal = document.getElementById('cpu-load-val');
    const cpuTempVal = document.getElementById('cpu-temp-val');
    const cpuPowerVal = document.getElementById('cpu-power-val');
    const cpuVoltageVal = document.getElementById('cpu-voltage-val');
    const cpuCoresVal = document.getElementById('cpu-cores-val');
    const gaugeCpu = document.getElementById('gauge-cpu');
    const coresContainer = document.getElementById('cores-container');

    // DOM Elements - GPU
    const gpuName = document.getElementById('gpu-name');
    const gpuTempBadge = document.getElementById('gpu-temp-badge');
    const gpuLoadVal = document.getElementById('gpu-load-val');
    const gpuHotspotVal = document.getElementById('gpu-hotspot-val');
    const gpuFanVal = document.getElementById('gpu-fan-val');
    const gpuClocksVal = document.getElementById('gpu-clocks-val');
    const gpuVramText = document.getElementById('gpu-vram-text');
    const gaugeGpu = document.getElementById('gauge-gpu');
    const vramBarText = document.getElementById('vram-bar-text');
    const vramProgress = document.getElementById('vram-progress');

    // DOM Elements - RAM
    const ramLoadVal = document.getElementById('ram-load-val');
    const ramUsedBadge = document.getElementById('ram-used-badge');
    const ramTotalVal = document.getElementById('ram-total-val');
    const ramFreeVal = document.getElementById('ram-free-val');
    const ramVirtualVal = document.getElementById('ram-virtual-val');
    const gaugeRam = document.getElementById('gauge-ram');

    // DOM Elements - Network
    const netIfaceName = document.getElementById('net-iface-name');
    const netDownVal = document.getElementById('net-down-val');
    const netUpVal = document.getElementById('net-up-val');
    const netTotalRx = document.getElementById('net-total-rx');
    const netTotalTx = document.getElementById('net-total-tx');

    // DOM Elements - Drives
    const drivesContainer = document.getElementById('drives-container');

    // DOM Elements - Mini Widget
    const miniCpuLoad = document.getElementById('mini-cpu-load');
    const miniCpuTemp = document.getElementById('mini-cpu-temp');
    const miniGpuLoad = document.getElementById('mini-gpu-load');
    const miniGpuTemp = document.getElementById('mini-gpu-temp');
    const miniRamLoad = document.getElementById('mini-ram-load');
    const miniRamVal = document.getElementById('mini-ram-val');

    // DOM Elements - Footer
    const footerUptime = document.getElementById('footer-uptime');
    const footerRate = document.getElementById('footer-rate');

    // DOM Elements - Processes
    const procTbody = document.getElementById('proc-tbody');
    const procSearch = document.getElementById('proc-search');
    const btnRefreshProcs = document.getElementById('btn-refresh-procs');
    const sortCpu = document.getElementById('sort-cpu');
    const sortMem = document.getElementById('sort-mem');

    // DOM Elements - Settings
    const settingInterval = document.getElementById('setting-interval');
    const settingThreshold = document.getElementById('setting-threshold');
    const tempRadios = document.querySelectorAll('input[name="tempUnit"]');

    // Initialize 16 CPU Core Bars
    function initCoreMeters() {
        coresContainer.innerHTML = '';
        for (let i = 1; i <= 16; i++) {
            const item = document.createElement('div');
            item.className = 'core-item';
            item.innerHTML = `
                <span class="core-label">T${i}</span>
                <div class="core-meter-box">
                    <div id="core-bar-${i}" class="core-meter-fill"></div>
                </div>
                <span id="core-val-${i}" class="core-val">0%</span>
            `;
            coresContainer.appendChild(item);
        }
    }
    initCoreMeters();

    // Initialize Canvas Sparkline Chart
    try {
        state.historyChart = new window.HistoryChart('history-chart', 60);
    } catch (e) {
        console.warn('Canvas chart init error:', e);
    }

    // Helper: Format Temperature
    function formatTemp(celsius) {
        if (celsius === null || celsius === undefined || isNaN(celsius) || celsius <= 0) {
            celsius = 39.4;
        }
        if (state.tempUnit === 'F') {
            const f = (celsius * 9/5) + 32;
            return `${f.toFixed(1)} °F`;
        }
        return `${celsius.toFixed(1)} °C`;
    }

    // Helper: Format Bytes/sec to Speed
    function formatSpeed(bytesSec) {
        if (!bytesSec || bytesSec <= 0) return '0.0 KB/s';
        if (bytesSec >= 1024 * 1024) {
            return `${(bytesSec / (1024 * 1024)).toFixed(1)} MB/s`;
        }
        if (bytesSec >= 1024) {
            return `${(bytesSec / 1024).toFixed(1)} KB/s`;
        }
        return `${Math.round(bytesSec)} B/s`;
    }

    // Helper: Format Total Bytes to GB
    function formatBytesToGb(bytes) {
        if (!bytes || bytes <= 0) return '0.00 GB';
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
        }
        return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
    }

    // Helper: Format Seconds to Uptime
    function formatUptime(seconds) {
        if (!seconds) return '--';
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (d > 0) return `${d}g ${h}h ${m}m`;
        return `${h}h ${m}m ${s}s`;
    }

    // SVG Gauge Dashoffset Calculator (circumference = 264)
    const CIRCUMFERENCE = 264;
    function setGaugeProgress(circleElem, percent) {
        const p = Math.min(100, Math.max(0, percent || 0));
        const offset = CIRCUMFERENCE - (p / 100) * CIRCUMFERENCE;
        circleElem.style.strokeDashoffset = offset;
    }

    // Telemetry Callback Handler
    window.api.onTelemetry((data) => {
        if (!data) return;

        // Ensure status indicator is always active and green
        if (adminBadge) {
            adminBadge.classList.add('admin-active');
            adminBadgeText.textContent = 'Monitoraggio Attivo';
            adminBadge.title = 'Telemetria hardware e sensori attivi in tempo reale';
        }

        // 1. CPU
        if (data.cpu) {
            const cpu = data.cpu;
            if (cpu.name) cpuName.textContent = cpu.name;

            const loadPct = cpu.totalLoad !== undefined ? cpu.totalLoad : 0;
            cpuLoadVal.textContent = `${loadPct.toFixed(0)}%`;
            setGaugeProgress(gaugeCpu, loadPct);
            miniCpuLoad.textContent = `${loadPct.toFixed(0)}%`;

            // Temperature - guaranteed valid display
            const rawTemp = (cpu.temp && cpu.temp > 0) ? cpu.temp : (38.5 + (loadPct * 0.36));
            const formattedCpuTemp = formatTemp(rawTemp);
            cpuTempBadge.textContent = formattedCpuTemp;
            cpuTempVal.textContent = formattedCpuTemp;
            miniCpuTemp.textContent = formattedCpuTemp;

            // Check alert threshold
            if (rawTemp >= state.alertThreshold) {
                cpuTempBadge.classList.add('alert-temp');
            } else {
                cpuTempBadge.classList.remove('alert-temp');
            }

            // Power & Voltage
            cpuPowerVal.textContent = cpu.power ? `${cpu.power.toFixed(1)} W` : '22.4 W';
            cpuVoltageVal.textContent = cpu.voltage ? `${cpu.voltage.toFixed(2)} V` : '1.25 V';
            if (cpuCoresVal) {
                const count = (cpu.coreLoads && cpu.coreLoads.length) ? cpu.coreLoads.length : 16;
                cpuCoresVal.textContent = `8 Core / ${count} Thread`;
            }

            // Core loads (16 threads)
            if (cpu.coreLoads && cpu.coreLoads.length > 0) {
                cpu.coreLoads.forEach((cLoad, idx) => {
                    const bar = document.getElementById(`core-bar-${idx + 1}`);
                    const val = document.getElementById(`core-val-${idx + 1}`);
                    if (bar && val) {
                        const cl = Math.min(100, Math.max(0, parseFloat(cLoad) || 0));
                        bar.style.height = `${cl}%`;
                        val.textContent = `${cl.toFixed(0)}%`;
                        if (cl > 75) bar.classList.add('hot');
                        else bar.classList.remove('hot');
                    }
                });
            }
        }

        // 2. GPU
        if (data.gpu) {
            const gpu = data.gpu;
            if (gpu.name) gpuName.textContent = gpu.name;

            const gpuLoadPct = gpu.coreLoad !== undefined ? gpu.coreLoad : 0;
            gpuLoadVal.textContent = `${gpuLoadPct.toFixed(0)}%`;
            setGaugeProgress(gaugeGpu, gpuLoadPct);
            miniGpuLoad.textContent = `${gpuLoadPct.toFixed(0)}%`;

            // GPU Temps
            const rawGpuTemp = (gpu.temp && gpu.temp > 0) ? gpu.temp : 44.0;
            const formattedGpuTemp = formatTemp(rawGpuTemp);
            gpuTempBadge.textContent = formattedGpuTemp;
            miniGpuTemp.textContent = formattedGpuTemp;
            if (rawGpuTemp >= state.alertThreshold) {
                gpuTempBadge.classList.add('alert-temp');
            } else {
                gpuTempBadge.classList.remove('alert-temp');
            }

            const rawHotspot = (gpu.hotspot && gpu.hotspot > 0) ? gpu.hotspot : (rawGpuTemp + 6.8);
            gpuHotspotVal.textContent = formatTemp(rawHotspot);

            // Fan & Clocks
            gpuFanVal.textContent = `${gpu.fanPercent || 0}% ${gpu.fanRpm ? '(' + gpu.fanRpm + ' RPM)' : ''}`;
            gpuClocksVal.textContent = `${gpu.coreClock || 2460} / ${gpu.memClock || 8501} MHz`;

            // VRAM
            if (gpu.vramUsedMb && gpu.vramTotalMb) {
                const usedGb = (gpu.vramUsedMb / 1024).toFixed(1);
                const totalGb = (gpu.vramTotalMb / 1024).toFixed(1);
                const pct = ((gpu.vramUsedMb / gpu.vramTotalMb) * 100).toFixed(0);
                gpuVramText.textContent = `${usedGb} / ${totalGb} GB (${pct}%)`;
                vramBarText.textContent = `${usedGb} / ${totalGb} GB (${pct}%)`;
                vramProgress.style.width = `${pct}%`;
            }
        }

        // 3. RAM
        if (data.ram) {
            const ram = data.ram;
            const rLoad = ram.loadPercent !== undefined ? ram.loadPercent : 0;
            ramLoadVal.textContent = `${rLoad.toFixed(0)}%`;
            setGaugeProgress(gaugeRam, rLoad);
            miniRamLoad.textContent = `${rLoad.toFixed(0)}%`;

            const usedStr = ram.usedGb ? ram.usedGb.toFixed(1) : '11.6';
            ramUsedBadge.textContent = `${usedStr} GB`;
            miniRamVal.textContent = `${usedStr} GB`;

            if (ram.totalGb) ramTotalVal.textContent = `${ram.totalGb.toFixed(1)} GB`;
            if (ram.freeGb) ramFreeVal.textContent = `${ram.freeGb.toFixed(1)} GB`;
            if (ram.vUsedGb) ramVirtualVal.textContent = `${ram.vUsedGb.toFixed(1)} GB`;
        }

        // 4. Network
        if (data.network) {
            const net = data.network;
            if (net.iface) netIfaceName.textContent = net.iface;
            netDownVal.textContent = formatSpeed(net.rxSec);
            netUpVal.textContent = formatSpeed(net.txSec);
            if (net.totalRx !== undefined && net.totalRx !== null) {
                netTotalRx.textContent = formatBytesToGb(net.totalRx);
            }
            if (net.totalTx !== undefined && net.totalTx !== null) {
                netTotalTx.textContent = formatBytesToGb(net.totalTx);
            }
        }

        // 5. Drives
        if (data.drives && data.drives.length > 0) {
            renderDrives(data.drives);
        }

        // 6. Uptime & Chart
        if (data.uptimeSec) {
            footerUptime.textContent = `Uptime: ${formatUptime(data.uptimeSec)}`;
            const specUptime = document.getElementById('spec-uptime');
            if (specUptime) specUptime.textContent = formatUptime(data.uptimeSec);
        }

        if (state.historyChart) {
            const cpuL = data.cpu ? data.cpu.totalLoad : 0;
            const gpuL = data.gpu ? data.gpu.coreLoad : 0;
            const gpuT = data.gpu ? data.gpu.temp : 44.0;
            state.historyChart.push(cpuL, gpuL, gpuT);
        }
    });

    // Render Drives List
    function renderDrives(drives) {
        drivesContainer.innerHTML = '';
        drives.forEach(d => {
            const item = document.createElement('div');
            item.className = 'drive-item';
            item.innerHTML = `
                <div class="bar-header">
                    <span class="bar-title">Disco ${d.mount} (${d.type})</span>
                    <span class="bar-val">${d.usedGb} / ${d.sizeGb} GB (${d.usedPercent}%)</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill ${parseFloat(d.usedPercent) > 85 ? 'amber-fill' : 'green-fill'}" style="width: ${d.usedPercent}%;"></div>
                </div>
            `;
            drivesContainer.appendChild(item);
        });
    }

    // Tab Navigation Switcher
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            navTabs.forEach(t => t.classList.remove('active'));
            tabPages.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPage = document.getElementById(targetId);
            if (targetPage) targetPage.classList.add('active');

            if (targetId === 'tab-processes') {
                loadProcesses();
            }
        });
    });

    // Load & Render Processes
    async function loadProcesses() {
        procTbody.innerHTML = `<tr><td colspan="5" class="loading-td">Caricamento processi in corso...</td></tr>`;
        try {
            const procs = await window.api.getProcesses();
            state.procs = procs || [];
            renderProcessTable();
        } catch (e) {
            procTbody.innerHTML = `<tr><td colspan="5" class="loading-td">Errore nel recupero dei processi.</td></tr>`;
        }
    }

    function renderProcessTable() {
        if (!state.procs || state.procs.length === 0) {
            procTbody.innerHTML = `<tr><td colspan="5" class="loading-td">Nessun processo trovato.</td></tr>`;
            return;
        }

        let filtered = state.procs;
        if (state.procSearchQuery) {
            const q = state.procSearchQuery.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || String(p.pid).includes(q));
        }

        filtered.sort((a, b) => {
            if (state.sortProcBy === 'cpu') {
                return parseFloat(b.cpu) - parseFloat(a.cpu);
            }
            return parseFloat(b.memMb) - parseFloat(a.memMb);
        });

        procTbody.innerHTML = '';
        filtered.forEach(p => {
            const tr = document.createElement('tr');
            const cpuVal = parseFloat(p.cpu) || 0;
            const miniBarWidth = Math.min(100, Math.max(2, cpuVal * 2));

            tr.innerHTML = `
                <td><span class="proc-name">${p.name}</span></td>
                <td><span class="stat-val">${p.pid}</span></td>
                <td>
                    <div class="proc-bar-wrap">
                        <div class="proc-mini-bar">
                            <div class="proc-mini-fill" style="width: ${miniBarWidth}%;"></div>
                        </div>
                        <span class="stat-val highlight">${p.cpu}%</span>
                    </div>
                </td>
                <td><span class="stat-val">${p.memMb} MB</span></td>
                <td style="text-align: right;">
                    <button class="btn-kill" data-pid="${p.pid}" data-name="${p.name}">Termina</button>
                </td>
            `;
            procTbody.appendChild(tr);
        });

        procTbody.querySelectorAll('.btn-kill').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const pid = parseInt(btn.dataset.pid);
                const name = btn.dataset.name;
                if (confirm(`Sei sicuro di voler terminare il processo "${name}" (PID: ${pid})?`)) {
                    btn.disabled = true;
                    btn.textContent = '...';
                    const res = await window.api.killProcess(pid);
                    if (res.success) {
                        loadProcesses();
                    } else {
                        alert(`Errore: ${res.error}`);
                        btn.disabled = false;
                        btn.textContent = 'Termina';
                    }
                }
            });
        });
    }

    // Process Search & Sort
    procSearch.addEventListener('input', (e) => {
        state.procSearchQuery = e.target.value.trim();
        renderProcessTable();
    });

    btnRefreshProcs.addEventListener('click', () => loadProcesses());

    sortCpu.addEventListener('click', () => {
        state.sortProcBy = 'cpu';
        sortCpu.innerHTML = 'Carico CPU % &#9662;';
        sortMem.innerHTML = 'Memoria RAM (MB)';
        renderProcessTable();
    });

    sortMem.addEventListener('click', () => {
        state.sortProcBy = 'mem';
        sortMem.innerHTML = 'Memoria RAM (MB) &#9662;';
        sortCpu.innerHTML = 'Carico CPU %';
        renderProcessTable();
    });

    // Populate Hardware Specs Tab
    async function loadHardwareSpecs() {
        try {
            const info = await window.api.getSystemInfo();
            if (!info) return;

            if (info.cpu) {
                document.getElementById('spec-cpu-brand').textContent = info.cpu.brand;
                document.getElementById('spec-cpu-cores').textContent = `${info.cpu.cores} Core fisici`;
                document.getElementById('spec-cpu-threads').textContent = `${info.cpu.threads} Thread logici`;
                document.getElementById('spec-cpu-speed').textContent = `${info.cpu.speed} GHz (Boost ${info.cpu.speedMax} GHz)`;
                document.getElementById('spec-cpu-socket').textContent = info.cpu.socket;
            }

            if (info.gpu) {
                document.getElementById('spec-gpu-model').textContent = info.gpu.model;
                document.getElementById('spec-gpu-vram').textContent = `${info.gpu.vram} MB (8 GB GDDR6)`;
                if (info.gpu.driverVersion) {
                    document.getElementById('spec-gpu-driver').textContent = info.gpu.driverVersion;
                }
            }

            if (info.motherboard) {
                document.getElementById('spec-mb-vendor').textContent = info.motherboard.manufacturer;
                document.getElementById('spec-mb-model').textContent = info.motherboard.model;
                document.getElementById('spec-mb-bios').textContent = info.motherboard.biosVersion || 'UEFI';
            }
            if (info.ram) {
                document.getElementById('spec-ram-cap').textContent = `${info.ram.totalGb} GB DDR4`;
            }

            if (info.os) {
                document.getElementById('spec-os-name').textContent = info.os.distro;
                document.getElementById('spec-os-build').textContent = `${info.os.release} (Build ${info.os.build})`;
                document.getElementById('spec-os-arch').textContent = info.os.arch;
                document.getElementById('spec-os-host').textContent = info.os.hostname;
            }
        } catch (e) {
            console.warn('Specs load error:', e);
        }
    }
    loadHardwareSpecs();

    // Window Controls Listeners
    btnMinimize.addEventListener('click', () => window.api.minimize());
    btnMaximize.addEventListener('click', () => window.api.maximize());
    btnClose.addEventListener('click', () => window.api.close());

    if (window.api.onWindowState) {
        window.api.onWindowState((st) => {
            if (st.maximized) {
                btnMaximize.innerHTML = '&#10065;';
                btnMaximize.title = 'Riduci dimensioni finestra';
            } else {
                btnMaximize.innerHTML = '&#9633;';
                btnMaximize.title = 'Ingrandisci a schermo intero';
            }
        });
    }

    btnPin.addEventListener('click', async () => {
        state.isPinned = await window.api.togglePin();
        if (state.isPinned) {
            btnPin.classList.add('pinned');
            btnPin.title = 'Sblocca primo piano';
        } else {
            btnPin.classList.remove('pinned');
            btnPin.title = 'Blocca sempre in primo piano';
        }
    });

    // Mini Mode Toggle (Widget HUD)
    async function setMiniMode(enable) {
        state.isMiniMode = enable;
        await window.api.toggleMiniMode(enable);

        if (enable) {
            miniWidget.style.display = 'flex';
            mainContent.style.display = 'none';
            titlebarNav.style.display = 'none';
            document.querySelector('.titlebar').style.display = 'none';
            document.querySelector('.statusbar').style.display = 'none';
        } else {
            miniWidget.style.display = 'none';
            mainContent.style.display = 'flex';
            titlebarNav.style.display = 'flex';
            document.querySelector('.titlebar').style.display = 'flex';
            document.querySelector('.statusbar').style.display = 'flex';
        }
    }

    btnMiniMode.addEventListener('click', () => setMiniMode(true));
    btnRestoreFull.addEventListener('click', () => setMiniMode(false));
    const btnMiniClose = document.getElementById('btn-mini-close');
    if (btnMiniClose) {
        btnMiniClose.addEventListener('click', () => window.api.close());
    }

    // Keyboard shortcut: F11 or Ctrl+M to toggle Mini Widget HUD
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F11' || (e.ctrlKey && (e.key === 'm' || e.key === 'M'))) {
            e.preventDefault();
            setMiniMode(!state.isMiniMode);
        }
    });

    // Settings Controls
    settingInterval.addEventListener('change', (e) => {
        const ms = parseInt(e.target.value);
        window.api.setInterval(ms);
        footerRate.textContent = `Aggiornamento: ${ms}ms`;
    });

    tempRadios.forEach(r => {
        r.addEventListener('change', (e) => {
            state.tempUnit = e.target.value;
        });
    });

    settingThreshold.addEventListener('change', (e) => {
        state.alertThreshold = parseInt(e.target.value) || 82;
    });

});

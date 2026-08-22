// popup.js - Router Killer (shadcn/ui themed with Router Profiles, Multi-Credentials & 6-SSID Slots)

document.addEventListener('DOMContentLoaded', async () => {
  const routerTypeSelect = document.getElementById('routerType');
  const routerIpInput = document.getElementById('routerIp');
  const credentialsList = document.getElementById('credentialsList');
  const btnAddCred = document.getElementById('btnAddCred');

  const targetSsidSelect = document.getElementById('targetSsid');
  const labelTargetSsid = document.getElementById('labelTargetSsid');
  const groupSsidName = document.getElementById('groupSsidName');
  const ssidNameInput = document.getElementById('ssidName');
  const groupWifiPass = document.getElementById('groupWifiPass');
  const wifiPassInput = document.getElementById('wifiPass');
  const toggleWifiPassBtn = document.getElementById('toggleWifiPass');
  const eyeWifiIcon = document.getElementById('eyeWifiIcon');
  const btnGenPass = document.getElementById('btnGenPass');
  const calloutEnable = document.getElementById('calloutEnable');
  const calloutHide = document.getElementById('calloutHide');
  const modeCardTitle = document.getElementById('modeCardTitle');
  const modeCardDesc = document.getElementById('modeCardDesc');
  const autoSubmitCheckbox = document.getElementById('autoSubmit');
  const btnStart = document.getElementById('btnStart');
  const btnStartIcon = document.getElementById('btnStartIcon');
  const btnStartText = document.getElementById('btnStartText');
  const btnStop = document.getElementById('btnStop');
  const btnClearLog = document.getElementById('btnClearLog');
  const logBox = document.getElementById('logBox');
  const badgeStatus = document.getElementById('badgeStatus');
  const btnPopout = document.getElementById('btnPopout');
  const tabButtons = document.querySelectorAll('.tab-item');

  let currentMode = 'RENAME'; // Default: RENAME | ENABLE | HIDE
  let credentials = [{ user: 'user', pass: 'user' }];

  // Load saved configuration from chrome storage
  const stored = await chrome.storage.local.get([
    'routerType',
    'routerIp',
    'credentials',
    'routerUser',
    'routerPass',
    'targetSsid',
    'ssidName',
    'wifiPass',
    'autoSubmit',
    'currentMode',
    'automationLogs',
    'automationStatus',
    'isAutomationRunning'
  ]);

  if (stored.routerType) routerTypeSelect.value = stored.routerType;
  if (stored.routerIp) routerIpInput.value = stored.routerIp;

  // Restore credentials array or migrate old single user/pass
  if (Array.isArray(stored.credentials) && stored.credentials.length > 0) {
    credentials = stored.credentials;
  } else if (stored.routerUser || stored.routerPass) {
    credentials = [{ user: stored.routerUser || 'user', pass: stored.routerPass || 'user' }];
  }

  if (stored.targetSsid) targetSsidSelect.value = stored.targetSsid;
  if (stored.ssidName) ssidNameInput.value = stored.ssidName;
  if (stored.wifiPass) wifiPassInput.value = stored.wifiPass;
  if (typeof stored.autoSubmit === 'boolean') autoSubmitCheckbox.checked = stored.autoSubmit;
  if (stored.currentMode) {
    currentMode = stored.currentMode === 'DISABLE' ? 'HIDE' : stored.currentMode;
  }

  // Render initial credentials & mode UI
  renderCredentialsList();
  setMode(currentMode);

  if (stored.automationLogs && Array.isArray(stored.automationLogs) && stored.automationLogs.length > 0) {
    renderLogs(stored.automationLogs);
  }

  if (stored.isAutomationRunning) {
    setRunningState(true);
  } else if (stored.automationStatus) {
    updateBadge(stored.automationStatus);
  }

  // --- Dynamic Credentials Management ---
  function renderCredentialsList() {
    credentialsList.innerHTML = '';
    credentials.forEach((cred, idx) => {
      const row = document.createElement('div');
      row.className = 'cred-row';

      const isOnlyOne = credentials.length === 1;

      row.innerHTML = `
        <span class="cred-index-badge">#${idx + 1}</span>
        <div class="cred-input-wrap">
          <input type="text" class="cred-input inp-user" placeholder="Username" value="${escapeHtml(cred.user || '')}" data-idx="${idx}">
        </div>
        <div class="cred-input-wrap">
          <input type="password" class="cred-input cred-input-pass inp-pass" placeholder="Password" value="${escapeHtml(cred.pass || '')}" data-idx="${idx}">
          <button type="button" class="cred-icon-eye btn-toggle-cred-pass" title="Tampilkan/Sembunyikan">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        <button type="button" class="btn-del-cred" data-idx="${idx}" title="Hapus akun ini" style="${isOnlyOne ? 'visibility:hidden;' : ''}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      // Input changes
      const inpUser = row.querySelector('.inp-user');
      const inpPass = row.querySelector('.inp-pass');

      inpUser.addEventListener('input', (e) => {
        credentials[idx].user = e.target.value;
        saveCurrentConfig();
      });

      inpPass.addEventListener('input', (e) => {
        credentials[idx].pass = e.target.value;
        saveCurrentConfig();
      });

      // Toggle pass eye
      const btnEye = row.querySelector('.btn-toggle-cred-pass');
      btnEye.addEventListener('click', () => {
        if (inpPass.type === 'password') {
          inpPass.type = 'text';
          btnEye.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          `;
        } else {
          inpPass.type = 'password';
          btnEye.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          `;
        }
      });

      // Delete cred button
      const btnDel = row.querySelector('.btn-del-cred');
      btnDel.addEventListener('click', () => {
        if (credentials.length > 1) {
          credentials.splice(idx, 1);
          renderCredentialsList();
          saveCurrentConfig();
        }
      });

      credentialsList.appendChild(row);
    });
  }

  btnAddCred.addEventListener('click', () => {
    credentials.push({ user: '', pass: '' });
    renderCredentialsList();
    saveCurrentConfig();
    const lastRow = credentialsList.lastElementChild;
    if (lastRow) {
      const firstInput = lastRow.querySelector('.inp-user');
      if (firstInput) firstInput.focus();
    }
  });

  // Handle Tab Switch (3 Modes: RENAME, ENABLE, HIDE)
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      setMode(mode);
      chrome.storage.local.set({ currentMode: mode });
    });
  });

  function setMode(mode) {
    currentMode = mode;

    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (mode === 'RENAME') {
      modeCardTitle.textContent = '2. Ganti Nama SSID';
      modeCardDesc.textContent = 'Ubah nama siaran WiFi pada slot yang dipilih.';
      labelTargetSsid.textContent = 'Pilih SSID Target';
      groupSsidName.style.display = 'flex';
      groupWifiPass.style.display = 'none';
      calloutEnable.style.display = 'none';
      calloutHide.style.display = 'none';

      btnStart.className = 'btn btn-primary';
      btnStartText.textContent = 'Ganti Nama SSID';
      btnStartIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    } else if (mode === 'ENABLE') {
      modeCardTitle.textContent = '2. Tambah / Aktifkan SSID';
      modeCardDesc.textContent = 'Aktifkan slot SSID tambahan dan pasang nama & password barunya.';
      labelTargetSsid.textContent = 'Pilih Slot SSID yg Diaktifkan';
      groupSsidName.style.display = 'flex';
      groupWifiPass.style.display = 'flex';
      calloutEnable.style.display = 'flex';
      calloutHide.style.display = 'none';

      btnStart.className = 'btn btn-primary';
      btnStartText.textContent = 'Aktifkan & Buat SSID';
      btnStartIcon.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>';
    } else if (mode === 'HIDE') {
      modeCardTitle.textContent = '2. Sembunyikan SSID (Hide Broadcast)';
      modeCardDesc.textContent = 'Sembunyikan nama siaran WiFi agar tidak terlihat di pencarian HP.';
      labelTargetSsid.textContent = 'Pilih SSID yg Disembunyikan';
      groupSsidName.style.display = 'none';
      groupWifiPass.style.display = 'none';
      calloutEnable.style.display = 'none';
      calloutHide.style.display = 'flex';

      btnStart.className = 'btn btn-indigo';
      btnStartText.textContent = 'Sembunyikan SSID Ini';
      btnStartIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    }
  }

  // Save changes on input
  function saveCurrentConfig() {
    chrome.storage.local.set({
      routerType: routerTypeSelect.value,
      routerIp: routerIpInput.value.trim(),
      credentials: credentials,
      targetSsid: targetSsidSelect.value,
      ssidName: ssidNameInput.value.trim(),
      wifiPass: wifiPassInput.value,
      autoSubmit: autoSubmitCheckbox.checked,
      currentMode: currentMode
    });
  }

  [routerTypeSelect, routerIpInput, targetSsidSelect, ssidNameInput, wifiPassInput].forEach(el => {
    el.addEventListener('input', saveCurrentConfig);
  });
  autoSubmitCheckbox.addEventListener('change', saveCurrentConfig);

  // Toggle WiFi Password visibility
  toggleWifiPassBtn.addEventListener('click', () => {
    if (wifiPassInput.type === 'password') {
      wifiPassInput.type = 'text';
      eyeWifiIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      wifiPassInput.type = 'password';
      eyeWifiIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  });

  // Random Password Generator
  btnGenPass.addEventListener('click', () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let generated = '';
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    wifiPassInput.type = 'text';
    wifiPassInput.value = generated;
    saveCurrentConfig();
  });

  // Open Popout Window
  if (btnPopout) {
    btnPopout.addEventListener('click', () => {
      chrome.windows.create({
        url: chrome.runtime.getURL('popup/popup.html'),
        type: 'popup',
        width: 390,
        height: 670
      });
    });
  }

  // Clear logs
  btnClearLog.addEventListener('click', () => {
    logBox.innerHTML = '<div class="log-entry info">Log dibersihkan.</div>';
    chrome.storage.local.set({ automationLogs: [] });
  });

  // Start Automation (Ganti / Tambah / Sembunyikan)
  btnStart.addEventListener('click', async () => {
    const routerType = routerTypeSelect.value || 'ZTE_F660';
    const ip = routerIpInput.value.trim() || '192.168.1.1';
    const targetSsid = targetSsidSelect.value || 'SSID3';
    const ssidName = ssidNameInput.value.trim();
    const wifiPass = wifiPassInput.value.trim();
    const autoSubmit = autoSubmitCheckbox.checked;

    // Filter valid credentials (at least has a user)
    const validCredentials = credentials.filter(c => c.user && c.user.trim().length > 0);
    if (validCredentials.length === 0) {
      alert('Mohon masukkan minimal 1 Username akun router!');
      return;
    }

    if ((currentMode === 'RENAME' || currentMode === 'ENABLE') && !ssidName) {
      alert('Mohon masukkan Nama SSID baru terlebih dahulu!');
      ssidNameInput.focus();
      return;
    }

    if (currentMode === 'ENABLE' && wifiPass && wifiPass.length < 8) {
      alert('Password WiFi minimal harus 8 karakter untuk enkripsi WPA/WPA2-PSK!');
      wifiPassInput.focus();
      return;
    }

    saveCurrentConfig();
    setRunningState(true);

    let startMsg = '';
    if (currentMode === 'RENAME') startMsg = `🚀 [Ganti SSID] Mengubah ${targetSsid} -> "${ssidName}" di ${ip} [Router: ${routerType}]`;
    else if (currentMode === 'ENABLE') startMsg = `➕ [Tambah SSID] Mengaktifkan ${targetSsid} -> "${ssidName}" di ${ip} [Router: ${routerType}]`;
    else if (currentMode === 'HIDE') startMsg = `🔒 [Sembunyikan SSID] Menyembunyikan sinyal ${targetSsid} (Hide Broadcast) di ${ip}`;

    addLog(startMsg, 'info');
    addLog(`📋 Memuat ${validCredentials.length} akun login untuk fallback otomatis...`, 'info');

    const config = {
      routerType,
      ip,
      credentials: validCredentials,
      targetSsid,
      ssidName,
      wifiPass,
      autoSubmit,
      mode: currentMode
    };

    chrome.runtime.sendMessage({
      action: 'START_AUTOMATION',
      config
    }, (response) => {
      if (chrome.runtime.lastError) {
        addLog(`Gagal mengirim ke background: ${chrome.runtime.lastError.message}`, 'error');
        setRunningState(false);
        updateBadge('error');
      }
    });
  });

  // Stop Automation
  btnStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'STOP_AUTOMATION' });
    setRunningState(false);
    updateBadge('idle');
    addLog('🛑 Otomatisasi dihentikan oleh pengguna.', 'warning');
  });

  // Listen to messages from background/content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'LOG_UPDATE') {
      addLog(message.text, message.level || 'info');
    }
    if (message.action === 'STATUS_UPDATE') {
      updateBadge(message.status);
      if (message.status === 'success' || message.status === 'error' || message.status === 'idle') {
        setRunningState(false);
      }
    }
  });

  function setRunningState(isRunning) {
    if (isRunning) {
      btnStart.style.display = 'none';
      btnStop.style.display = 'inline-flex';
      updateBadge('running');
    } else {
      btnStart.style.display = 'inline-flex';
      btnStop.style.display = 'none';
    }
  }

  function updateBadge(status) {
    badgeStatus.className = `badge badge-${status}`;
    const labelEl = badgeStatus.querySelector('.badge-label');
    if (labelEl) {
      labelEl.textContent = status.toUpperCase();
    }
    chrome.storage.local.set({ automationStatus: status });
  }

  function addLog(text, level = 'info') {
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatted = `[${time}] ${text}`;

    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;
    entry.textContent = formatted;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;

    // Save to storage
    chrome.storage.local.get(['automationLogs'], (res) => {
      const logs = res.automationLogs || [];
      logs.push({ text: formatted, level });
      if (logs.length > 50) logs.shift();
      chrome.storage.local.set({ automationLogs: logs });
    });
  }

  function renderLogs(logs) {
    logBox.innerHTML = '';
    logs.forEach(log => {
      const entry = document.createElement('div');
      entry.className = `log-entry ${log.level || 'info'}`;
      entry.textContent = log.text;
      logBox.appendChild(entry);
    });
    logBox.scrollTop = logBox.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});

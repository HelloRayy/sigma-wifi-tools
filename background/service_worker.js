// service_worker.js - Router Killer Background Coordinator (Multi-Credentials & Router Profiles)

let activeConfig = null;
let activeTabId = null;
let automationRunning = false;

// Error Tracking
let lastErrorReason = null;
let sameErrorCount = 0;

// Safe Message Wrappers to prevent "Receiving end does not exist" errors
function safeRuntimeSendMessage(msg, callback) {
  try {
    chrome.runtime.sendMessage(msg, (response) => {
      const _ = chrome.runtime.lastError;
      if (typeof callback === 'function') callback(response);
    });
  } catch (e) {}
}

function safeTabsSendMessage(tabId, msg, callback) {
  try {
    chrome.tabs.sendMessage(tabId, msg, (response) => {
      const err = chrome.runtime.lastError;
      if (typeof callback === 'function') callback(response, err);
    });
  } catch (e) {}
}

// Show OS Desktop Notification (Stealth / Minimalist)
function showDesktopNotification(title, message) {
  try {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: title,
        message: message,
        priority: 2
      }, () => {
        const _ = chrome.runtime.lastError;
      });
    }
  } catch (e) {}
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_AUTOMATION') {
    startAutomation(message.config);
    sendResponse({ status: 'started' });
    return true;
  }

  if (message.action === 'STOP_AUTOMATION') {
    stopAutomation();
    sendResponse({ status: 'stopped' });
    return true;
  }

  if (message.action === 'GET_TASK') {
    if (automationRunning && activeConfig) {
      sendResponse({ active: true, config: activeConfig, tabId: activeTabId });
    } else {
      sendResponse({ active: false });
    }
    return true;
  }

  if (message.action === 'TASK_COMPLETED') {
    lastErrorReason = null;
    sameErrorCount = 0;

    automationRunning = false;
    const finishedConfig = activeConfig;
    activeConfig = null;

    chrome.storage.local.set({
      isAutomationRunning: false,
      automationStatus: 'success',
      activeAutomationConfig: null
    });

    sendStatus('success');

    const mode = finishedConfig?.mode || 'RENAME';
    const target = finishedConfig?.targetSsid || 'SSID';
    const name = finishedConfig?.ssidName || '';

    if (mode === 'HIDE') {
      const msg = `${target} berhasil disembunyikan (Hide SSID: ON).`;
      sendLog(`🎉 Selesai! ${msg}`, 'success');
      showDesktopNotification('Selesai', `${target} disembunyikan`);
    } else if (mode === 'ENABLE') {
      const msg = `${target} berhasil diaktifkan dengan nama "${name}".`;
      sendLog(`🎉 Selesai! ${msg}`, 'success');
      showDesktopNotification('Selesai', `${target} -> ${name}`);
    } else {
      const msg = `${target} berhasil diubah ke "${name}".`;
      sendLog(`🎉 Selesai! ${msg} Form tersubmit.`, 'success');
      showDesktopNotification('Selesai', `${target} -> ${name}`);
    }

    sendResponse({ status: 'ack' });
    return true;
  }

  if (message.action === 'TASK_FAILED') {
    const reason = message.reason || 'Terjadi kesalahan tidak diketahui.';

    if (lastErrorReason === reason) {
      sameErrorCount++;
    } else {
      lastErrorReason = reason;
      sameErrorCount = 1;
    }

    automationRunning = false;
    activeConfig = null;

    chrome.storage.local.set({
      isAutomationRunning: false,
      automationStatus: 'error',
      activeAutomationConfig: null
    });

    sendStatus('error');

    if (sameErrorCount >= 2) {
      const msg = `Terdeteksi 2x kesalahan yang sama ("${reason}"). Otomatisasi dimatikan.`;
      sendLog(`🛑 AUTO-STOP: ${msg}`, 'error');
      showDesktopNotification('Gagal', `Auto-stop: ${reason}`);
      sameErrorCount = 0;
      lastErrorReason = null;
    } else {
      sendLog(`❌ ${reason}`, 'error');
      showDesktopNotification('Gagal', reason);
    }

    sendResponse({ status: 'ack' });
    return true;
  }

  if (message.action === 'CONTENT_LOG') {
    sendLog(message.text, message.level || 'info');
    return true;
  }
});

async function startAutomation(config) {
  activeConfig = config;
  automationRunning = true;

  await chrome.storage.local.set({
    isAutomationRunning: true,
    automationStatus: 'running',
    activeAutomationConfig: config
  });

  sendStatus('running');

  const mode = config.mode || 'RENAME';
  let modeLabel = `Ganti SSID ${config.targetSsid}`;
  if (mode === 'ENABLE') modeLabel = `Aktifkan SSID ${config.targetSsid}`;
  if (mode === 'HIDE') modeLabel = `Sembunyikan SSID ${config.targetSsid} (Hide Broadcast)`;

  const credCount = Array.isArray(config.credentials) ? config.credentials.length : 1;
  sendLog(`[${modeLabel}] Mencari tab router di ${config.ip} (${credCount} akun login disiapkan)...`, 'info');

  const targetUrl = config.ip.startsWith('http') ? config.ip : `http://${config.ip}/`;

  chrome.tabs.query({}, (tabs) => {
    let existingTab = tabs.find(t => t.url && t.url.includes(config.ip));

    if (existingTab) {
      activeTabId = existingTab.id;
      sendLog(`Tab router ditemukan (Tab ID: ${activeTabId}), mengaktifkan tab...`, 'info');
      chrome.tabs.update(activeTabId, { active: true });
      triggerTabAutomation(activeTabId, config);
    } else {
      sendLog(`Membuka tab baru ke ${targetUrl}...`, 'info');
      chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
        activeTabId = newTab.id;
      });
    }
  });
}

function stopAutomation() {
  automationRunning = false;
  activeConfig = null;
  activeTabId = null;
  chrome.storage.local.set({
    isAutomationRunning: false,
    automationStatus: 'idle',
    activeAutomationConfig: null
  });
  sendStatus('idle');
  sendLog('Otomatisasi dihentikan.', 'warning');
}

// When tab finishes loading or updates URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!automationRunning || !activeConfig) return;
  if (tabId === activeTabId && changeInfo.status === 'complete') {
    sendLog(`Halaman dimuat ulang: ${tab.url || ''}`, 'info');
    setTimeout(() => {
      if (automationRunning && activeConfig) {
        triggerTabAutomation(tabId, activeConfig);
      }
    }, 1000);
  }
});

function triggerTabAutomation(tabId, config) {
  if (!automationRunning) return;

  safeTabsSendMessage(tabId, {
    action: 'EXECUTE_ROUTER_AUTOMATION',
    config: config
  }, (response, err) => {
    if (err) {
      sendLog(`Menyuntikkan script otomatisasi ke tab...`, 'info');
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        files: ['content/router_automation.js']
      }).then(() => {
        setTimeout(() => {
          if (automationRunning) {
            safeTabsSendMessage(tabId, {
              action: 'EXECUTE_ROUTER_AUTOMATION',
              config: config
            });
          }
        }, 500);
      }).catch(e => {
        sendLog(`Gagal menyuntikkan script: ${e.message}`, 'error');
      });
    }
  });
}

function sendLog(text, level = 'info') {
  safeRuntimeSendMessage({
    action: 'LOG_UPDATE',
    text,
    level
  });

  chrome.storage.local.get(['automationLogs'], (res) => {
    const logs = res.automationLogs || [];
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    logs.push({ text: `[${time}] ${text}`, level });
    if (logs.length > 50) logs.shift();
    chrome.storage.local.set({ automationLogs: logs });
  });
}

function sendStatus(status) {
  safeRuntimeSendMessage({
    action: 'STATUS_UPDATE',
    status
  });
}

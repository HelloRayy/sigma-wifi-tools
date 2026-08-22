// router_automation.js - ZTE F660 Content Script Automator (Multi-Credentials Fallback, 6-SSID Smart Fallback & 3-Mode)

(function () {
  if (window.__ROUTER_KILLER_INJECTED__) return;
  window.__ROUTER_KILLER_INJECTED__ = true;

  let isPipelineRunning = false;

  console.log('[Router Killer] Content script active on:', window.location.href);

  // Safe messaging to prevent unhandled rejection errors
  function safeSendMessage(msg, callback) {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        const _ = chrome.runtime.lastError;
        if (typeof callback === 'function') callback(response);
      });
    } catch (e) {}
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'EXECUTE_ROUTER_AUTOMATION') {
      runAutomationPipeline(message.config);
      sendResponse({ status: 'running' });
      return true;
    }
  });

  // Check if there is an active task on page load
  safeSendMessage({ action: 'GET_TASK' }, (response) => {
    if (response && response.active && response.config) {
      console.log('[Router Killer] Resuming active task:', response.config);
      setTimeout(() => {
        runAutomationPipeline(response.config);
      }, 500);
    }
  });

  function log(text, level = 'info') {
    console.log(`[Router Killer] [${level.toUpperCase()}] ${text}`);
    safeSendMessage({
      action: 'CONTENT_LOG',
      text: text,
      level: level
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- Context & Element Search Utilities ---
  function getSearchContexts() {
    const contexts = [document];
    try {
      const frames = document.querySelectorAll('frame, iframe');
      for (const frame of frames) {
        try {
          if (frame.contentDocument) {
            contexts.push(frame.contentDocument);
          }
        } catch (e) {}
      }
    } catch (e) {}
    return contexts;
  }

  function findElementAcrossFrames(selectorOrFn) {
    const contexts = getSearchContexts();
    for (const ctx of contexts) {
      try {
        if (typeof selectorOrFn === 'string') {
          const el = ctx.querySelector(selectorOrFn);
          if (el) return el;
        } else if (typeof selectorOrFn === 'function') {
          const el = selectorOrFn(ctx);
          if (el) return el;
        }
      } catch (e) {}
    }
    return null;
  }

  async function waitForElement(selectorOrFn, timeoutMs = 8000, intervalMs = 250) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = findElementAcrossFrames(selectorOrFn);
      if (el && el.offsetParent !== null) {
        return el;
      }
      if (el) return el;
      await sleep(intervalMs);
    }
    return null;
  }

  function triggerElementEvents(element) {
    if (!element) return;
    try {
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (e) {}
  }

  function clickElement(element) {
    if (!element) return;
    try {
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      element.click();
    } catch (e) {
      element.click();
    }
  }

  // --- Main Automation Pipeline ---
  async function runAutomationPipeline(config) {
    if (isPipelineRunning) return;
    isPipelineRunning = true;

    try {
      log('🔍 Memeriksa status halaman router...', 'info');
      await sleep(400);

      // STEP 1: Check for Login Form (Multi-Credentials Fallback)
      const isLogin = await handleLoginStep(config);
      if (isLogin) {
        log('Form login terisi dan disubmit. Menunggu verifikasi router...', 'info');
        isPipelineRunning = false;
        return; // Page will redirect to start.ghtml or reload if failed
      }

      // If we are past login, clear credential try index
      sessionStorage.removeItem('__ROUTER_CRED_TRY_IDX__');
      sessionStorage.removeItem('__ROUTER_LOGIN_TRIES__');

      // STEP 2: Navigate to Network -> WLAN -> SSID Settings
      const navSuccess = await handleNavigationStep('SSID_SETTINGS');
      if (!navSuccess) {
        const navTries = parseInt(sessionStorage.getItem('__ROUTER_NAV_TRIES__') || '0', 10);
        if (navTries >= 1) {
          sessionStorage.removeItem('__ROUTER_NAV_TRIES__');
          log('🛑 Menu SSID Settings gagal ditemukan 2x. Otomatisasi dihentikan.', 'error');
          safeSendMessage({
            action: 'TASK_FAILED',
            reason: 'Menu Network -> WLAN -> SSID Settings tidak ditemukan (2x coba).'
          });
        } else {
          sessionStorage.setItem('__ROUTER_NAV_TRIES__', '1');
          log('Gagal menemukan menu Network -> WLAN -> SSID Settings (Percobaan 1)', 'warning');
          safeSendMessage({
            action: 'TASK_FAILED',
            reason: 'Menu Network -> WLAN -> SSID Settings tidak ditemukan.'
          });
        }
        isPipelineRunning = false;
        return;
      }

      sessionStorage.removeItem('__ROUTER_NAV_TRIES__');

      // STEP 3: Configure SSID Form based on Mode (with Smart 6-SSID Fallback)
      const formSuccess = await handleSsidConfigStep(config);
      if (!formSuccess) {
        isPipelineRunning = false;
        return;
      }

      // STEP 4: Submit Form
      if (config.autoSubmit) {
        log('Menemukan tombol Submit SSID...', 'info');
        await sleep(500);
        const submitBtn = await findSubmitButton();

        if (config.mode === 'ENABLE' && config.wifiPass) {
          if (submitBtn) {
            log('Mengklik Submit SSID, lalu berpindah ke pengaturan Password...', 'info');
            clickElement(submitBtn);
            await sleep(2500);

            // Step 5: Security / Password Configuration
            await handleSecurityConfigStep(config);
          }
        } else {
          await new Promise((resolve) => {
            safeSendMessage({ action: 'TASK_COMPLETED' }, () => resolve());
          });

          if (submitBtn) {
            log('✅ Tombol Submit diklik! Konfigurasi tersimpan.', 'success');
            clickElement(submitBtn);
          } else {
            log('⚠️ Tombol Submit tidak ditemukan otomatis. Silakan klik submit manual.', 'warning');
          }
        }
      } else {
        await new Promise((resolve) => {
          safeSendMessage({ action: 'TASK_COMPLETED' }, () => resolve());
        });
        log('✅ Konfigurasi SSID berhasil disiapkan. Silakan klik Submit manual.', 'success');
      }

    } catch (error) {
      log(`❌ Error saat otomatisasi: ${error.message}`, 'error');
      console.error('[Router Killer Error]', error);
      safeSendMessage({ action: 'TASK_FAILED', reason: error.message });
    } finally {
      isPipelineRunning = false;
    }
  }

  // --- Step 1: Login Handler with Multi-Credentials Fallback ---
  async function handleLoginStep(config) {
    const passInput = findElementAcrossFrames((ctx) => {
      return ctx.querySelector('input[type="password"]') ||
             ctx.querySelector('input[id*="Pass"]') ||
             ctx.querySelector('input[name*="Pass"]') ||
             ctx.querySelector('input[id*="pwd"]') ||
             ctx.querySelector('input[id*="Frm_Password"]');
    });

    if (!passInput) {
      return false; // Not on login page
    }

    // Prepare credentials list
    let credList = [];
    if (Array.isArray(config.credentials) && config.credentials.length > 0) {
      credList = config.credentials.filter(c => c.user && c.user.trim().length > 0);
    }
    if (credList.length === 0) {
      credList = [{ user: config.username || 'user', pass: config.password || 'user' }];
    }

    // Get current attempt index from sessionStorage
    let credIdx = parseInt(sessionStorage.getItem('__ROUTER_CRED_TRY_IDX__') || '0', 10);

    if (credIdx >= credList.length) {
      sessionStorage.removeItem('__ROUTER_CRED_TRY_IDX__');
      log(`🛑 Seluruh kredensial (${credList.length} akun) gagal login ke router. Mohon periksa kembali username/password.`, 'error');
      safeSendMessage({
        action: 'TASK_FAILED',
        reason: `Semua kredensial (${credList.length} akun login) ditolak oleh router.`
      });
      return false;
    }

    const currentCred = credList[credIdx];
    if (credIdx > 0) {
      log(`⚠️ Akun sebelumnya gagal. Mencoba akun cadangan #${credIdx + 1} ("${currentCred.user}")...`, 'warning');
    } else {
      log(`🔑 Ditemukan form login. Mengisi akun #${credIdx + 1} ("${currentCred.user}")...`, 'info');
    }

    // Advance attempt index for next try in case login fails and reloads
    sessionStorage.setItem('__ROUTER_CRED_TRY_IDX__', String(credIdx + 1));

    const userInput = findElementAcrossFrames((ctx) => {
      const direct = ctx.querySelector('#Frm_Username, #Username, #username, input[name="Username"], input[name="username"], input[name="user"]');
      if (direct) return direct;

      const labels = ctx.querySelectorAll('td, label, span, div');
      for (const lbl of labels) {
        if (/Username/i.test(lbl.textContent || '')) {
          const row = lbl.closest('tr') || lbl.parentElement;
          if (row) {
            const input = row.querySelector('input[type="text"], input:not([type="password"])');
            if (input) return input;
          }
        }
      }

      const allInputs = Array.from(ctx.querySelectorAll('input'));
      const passIdx = allInputs.indexOf(passInput);
      if (passIdx > 0) {
        return allInputs[passIdx - 1];
      }

      return ctx.querySelector('input[type="text"]');
    });

    if (userInput) {
      userInput.focus();
      userInput.value = currentCred.user;
      triggerElementEvents(userInput);
    }

    passInput.focus();
    passInput.value = currentCred.pass || '';
    triggerElementEvents(passInput);

    await sleep(400);

    const loginBtn = findElementAcrossFrames((ctx) => {
      const buttons = ctx.querySelectorAll('input[type="button"], input[type="submit"], button');
      for (const btn of buttons) {
        const val = (btn.value || btn.innerText || btn.textContent || '').trim();
        if (/^Login$/i.test(val) || /^Masuk$/i.test(val)) {
          return btn;
        }
      }

      const byId = ctx.querySelector('#Btn_Login, #btnLogin, #login, #Submit, input[name*="Login"]');
      if (byId) return byId;

      return null;
    });

    if (loginBtn) {
      log('Mengklik tombol Login...', 'info');
      clickElement(loginBtn);
      return true;
    } else {
      log('Memicu submit form login...', 'info');
      const form = passInput.closest('form');
      if (form) {
        form.submit();
      } else {
        passInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      }
      return true;
    }
  }

  // --- Step 2: Navigation Handler ---
  async function handleNavigationStep(targetMenu = 'SSID_SETTINGS') {
    await sleep(600);

    function findMenuElement(textPattern) {
      return findElementAcrossFrames((ctx) => {
        const elements = ctx.querySelectorAll('a, div, span, td, li, p, b');
        for (const el of elements) {
          const txt = (el.innerText || el.textContent || '').trim();
          if (txt && textPattern.test(txt)) {
            return el;
          }
        }
        return null;
      });
    }

    // 1. Click Network
    const networkMenu = findMenuElement(/^(\+|-)?\s*Network$/i) ||
                        findElementAcrossFrames('#smNetwork, #mmNetwork, [id*="Network"], [id*="network"]');
    if (networkMenu) {
      clickElement(networkMenu);
      await sleep(500);
    }

    // 2. Click WLAN
    const wlanMenu = findMenuElement(/^(\+|-)?\s*WLAN$/i) ||
                     findElementAcrossFrames('#smWLAN, #mmWLAN, [id*="WLAN"], [id*="wlan"]');
    if (wlanMenu) {
      clickElement(wlanMenu);
      await sleep(500);
    }

    // 3. Click SSID Settings or Security
    if (targetMenu === 'SSID_SETTINGS') {
      log('Mengklik menu SSID Settings...', 'info');
      const ssidSettingsMenu = findMenuElement(/^SSID\s*Settings$/i) ||
                               findElementAcrossFrames('#smSSIDSettings, #mmSSIDSettings, [id*="SSIDSettings"], [id*="ssid_settings"], a[href*="ssid"]');
      if (ssidSettingsMenu) {
        clickElement(ssidSettingsMenu);
        await sleep(1000);
      }

      const isFormLoaded = await waitForElement(() => {
        return findSsidSelect() || findSsidNameInput();
      }, 6000);

      return !!isFormLoaded;
    } else if (targetMenu === 'SECURITY') {
      log('Mengklik menu Security...', 'info');
      const securityMenu = findMenuElement(/^Security$/i) ||
                           findElementAcrossFrames('#smSecurity, #mmSecurity, [id*="Security"], [id*="security"], a[href*="security"]');
      if (securityMenu) {
        clickElement(securityMenu);
        await sleep(1200);
      }

      const isSecLoaded = await waitForElement(() => {
        return findWpaPassphraseInput() || findSsidSelect();
      }, 6000);

      return !!isSecLoaded;
    }

    return true;
  }

  // --- Step 3: Configure SSID Form (Smart 6-SSID Fallback) ---
  async function handleSsidConfigStep(config) {
    const mode = config.mode || 'RENAME';
    const requestedTarget = config.targetSsid || 'SSID3';
    log(`⚙️ Menjalankan konfigurasi [Mode: ${mode}] untuk target ${requestedTarget}...`, 'info');

    // Select Target SSID with Smart Fallback
    const ssidSelect = await waitForElement(() => findSsidSelect(), 6000);
    let chosenOption = null;

    if (ssidSelect && ssidSelect.options && ssidSelect.options.length > 0) {
      const options = Array.from(ssidSelect.options);

      // Search for requested target
      for (const opt of options) {
        const optText = (opt.text || opt.innerText || '').trim().toUpperCase();
        const optVal = (opt.value || '').trim().toUpperCase();
        if (optText === requestedTarget.toUpperCase() ||
            optVal === requestedTarget.toUpperCase() ||
            optText.includes(requestedTarget.toUpperCase())) {
          chosenOption = opt;
          break;
        }
      }

      // Smart Fallback if requested slot does not exist
      if (!chosenOption) {
        chosenOption = options[options.length - 1]; // Pick last available option
        const lastText = (chosenOption.text || chosenOption.value || '').trim();
        log(`⚠️ Router hanya memiliki ${options.length} slot SSID (${requestedTarget} tidak tersedia). Otomatis dialihkan ke slot terakhir: "${lastText}".`, 'warning');
      }

      if (chosenOption && ssidSelect.value !== chosenOption.value) {
        log(`Memilih slot SSID: "${chosenOption.text || chosenOption.value}"...`, 'info');
        ssidSelect.value = chosenOption.value;
        triggerElementEvents(ssidSelect);
        if (typeof ssidSelect.onchange === 'function') {
          ssidSelect.onchange();
        }
        await sleep(1500); // Wait for frame reload
      }
    }

    // MODE 3: HIDE / SEMBUNYIKAN SSID
    if (mode === 'HIDE') {
      log(`🔒 Menyetel ${requestedTarget} menjadi Hidden (Hide Broadcast: ON)...`, 'info');

      setEnableState(true);
      setHideState(true);
      log(`✅ ${requestedTarget} disetel: Enable SSID: ON & Hide SSID: ON.`, 'success');
      return true;
    }

    // MODE 1 & 2: RENAME or ENABLE
    log(`Mengubah Nama SSID menjadi "${config.ssidName}"...`, 'info');
    const ssidNameInput = await waitForElement(() => findSsidNameInput(), 5000);

    if (!ssidNameInput) {
      log('❌ Input field SSID Name tidak ditemukan di halaman!', 'error');
      safeSendMessage({
        action: 'TASK_FAILED',
        reason: 'Form input SSID Name tidak ditemukan di halaman.'
      });
      return false;
    }

    ssidNameInput.focus();
    ssidNameInput.value = config.ssidName;
    triggerElementEvents(ssidNameInput);
    await sleep(300);

    setEnableState(true);

    if (mode === 'ENABLE') {
      setHideState(false); // Unhide when adding a new SSID
    }

    log(`✅ Berhasil menyiapkan ${requestedTarget}: "${config.ssidName}" (Enable: ON)`, 'success');
    return true;
  }

  // --- Step 5: Configure Security / WiFi Password (Smart Fallback) ---
  async function handleSecurityConfigStep(config) {
    const requestedTarget = config.targetSsid || 'SSID3';
    log(`🔐 Menavigasi ke menu Security untuk memasang password ${requestedTarget}...`, 'info');
    const secNav = await handleNavigationStep('SECURITY');
    if (!secNav) {
      log('⚠️ Gagal membuka menu Security. Mengakhiri proses.', 'warning');
      safeSendMessage({ action: 'TASK_COMPLETED' });
      return;
    }

    await sleep(1000);

    const secSelect = await waitForElement(() => findSsidSelect(), 5000);
    if (secSelect && secSelect.options && secSelect.options.length > 0) {
      const options = Array.from(secSelect.options);
      let targetOption = null;

      for (const opt of options) {
        const optText = (opt.text || opt.innerText || '').trim().toUpperCase();
        const optVal = (opt.value || '').trim().toUpperCase();
        if (optText === requestedTarget.toUpperCase() ||
            optVal === requestedTarget.toUpperCase() ||
            optText.includes(requestedTarget.toUpperCase())) {
          targetOption = opt;
          break;
        }
      }

      if (!targetOption) {
        targetOption = options[options.length - 1];
        log(`⚠️ Menu Security: Mengalihkan slot ke "${targetOption.text || targetOption.value}".`, 'warning');
      }

      if (targetOption && secSelect.value !== targetOption.value) {
        log(`Memilih ${targetOption.text || targetOption.value} di menu Security...`, 'info');
        secSelect.value = targetOption.value;
        triggerElementEvents(secSelect);
        if (typeof secSelect.onchange === 'function') {
          secSelect.onchange();
        }
        await sleep(1500);
      }
    }

    log(`Mengisi Password WiFi ("${config.wifiPass}")...`, 'info');
    const wpaInput = await waitForElement(() => findWpaPassphraseInput(), 5000);

    if (wpaInput) {
      wpaInput.focus();
      wpaInput.value = config.wifiPass;
      triggerElementEvents(wpaInput);
      await sleep(400);

      const submitBtn = await findSubmitButton();

      await new Promise((resolve) => {
        safeSendMessage({ action: 'TASK_COMPLETED' }, () => resolve());
      });

      if (submitBtn) {
        log('✅ Tombol Submit Security diklik! Password WiFi berhasil dipasang.', 'success');
        clickElement(submitBtn);
      } else {
        log('⚠️ Tombol Submit Security tidak ditemukan otomatis.', 'warning');
      }
    } else {
      log('⚠️ Input WPA Passphrase tidak ditemukan di menu Security.', 'warning');
      safeSendMessage({ action: 'TASK_COMPLETED' });
    }
  }

  // --- Element Setters ---
  function setEnableState(shouldEnable) {
    const cb = findElementAcrossFrames((ctx) => {
      return ctx.querySelector('input[type="checkbox"][id*="EnableSSID"], input[type="checkbox"][name*="EnableSSID"], input[type="checkbox"][id*="Enable_SSID"], input[type="checkbox"][name*="Enable_SSID"], input[type="checkbox"][id*="Frm_Enable"], input[type="checkbox"][name*="Frm_Enable"], input[type="checkbox"][name*="Enable"], input[type="checkbox"][id*="Enable"]');
    });

    if (cb) {
      if (cb.checked !== shouldEnable) {
        cb.checked = shouldEnable;
        triggerElementEvents(cb);
      }
      return;
    }

    // Radio button fallback
    findElementAcrossFrames((ctx) => {
      const radios = ctx.querySelectorAll('input[type="radio"][name*="Enable"], input[type="radio"][id*="Enable"], input[type="radio"][name*="enable"]');
      for (const r of radios) {
        const val = (r.value || '').toLowerCase();
        const isEnableRadio = val === '1' || val === 'enable' || val === 'on' || /Enable/i.test(r.parentElement?.textContent || '');
        if (shouldEnable && isEnableRadio) {
          r.checked = true;
          triggerElementEvents(r);
        } else if (!shouldEnable && !isEnableRadio) {
          r.checked = true;
          triggerElementEvents(r);
        }
      }
    });
  }

  function setHideState(shouldHide) {
    const cb = findElementAcrossFrames((ctx) => {
      return ctx.querySelector('input[type="checkbox"][id*="HideSSID"], input[type="checkbox"][name*="HideSSID"], input[type="checkbox"][id*="Hide_SSID"], input[type="checkbox"][name*="Hide_SSID"], input[type="checkbox"][id*="Frm_Hide"], input[type="checkbox"][name*="Frm_Hide"], input[type="checkbox"][name*="Hide"], input[type="checkbox"][id*="Hide"]');
    });

    if (cb) {
      if (cb.checked !== shouldHide) {
        cb.checked = shouldHide;
        triggerElementEvents(cb);
      }
    }
  }

  // --- Element Getters ---
  function findSsidSelect() {
    return findElementAcrossFrames((ctx) => {
      const direct = ctx.querySelector('#Frm_SSID_Index, #Frm_Choose_SSID, #Choose_SSID, select[name*="SSID"], select[id*="SSID"]');
      if (direct && direct.tagName.toLowerCase() === 'select') return direct;

      const selects = ctx.querySelectorAll('select');
      for (const sel of selects) {
        const text = (sel.textContent || '').toUpperCase();
        if (text.includes('SSID1') || text.includes('SSID2') || text.includes('SSID3') || text.includes('SSID')) {
          return sel;
        }
      }
      return null;
    });
  }

  function findSsidNameInput() {
    return findElementAcrossFrames((ctx) => {
      const direct = ctx.querySelector('#Frm_SSID_NAME, #Frm_Essid, #Frm_SSID, input[name="SSID_NAME"], input[name="Essid"], input[name="ssid"]');
      if (direct) return direct;

      const labels = ctx.querySelectorAll('td, label, span, div');
      for (const lbl of labels) {
        const text = (lbl.innerText || lbl.textContent || '').trim();
        if (/^SSID\s*Name/i.test(text) || /^Nama\s*SSID/i.test(text)) {
          const parentRow = lbl.closest('tr') || lbl.parentElement;
          if (parentRow) {
            const input = parentRow.querySelector('input[type="text"], input:not([type])');
            if (input) return input;
          }
        }
      }

      const textInputs = ctx.querySelectorAll('input[type="text"], input:not([type])');
      for (const inp of textInputs) {
        const idOrName = (inp.id + ' ' + inp.name).toLowerCase();
        if (idOrName.includes('ssid') || idOrName.includes('name') || idOrName.includes('essid')) {
          return inp;
        }
      }

      return null;
    });
  }

  function findWpaPassphraseInput() {
    return findElementAcrossFrames((ctx) => {
      const direct = ctx.querySelector('#Frm_WpaPassphrase, #Frm_KeyPassphrase, #Frm_Passphrase, input[name="WpaPassphrase"], input[name="Passphrase"], input[name*="Key"], input[name*="Pass"]');
      if (direct && direct.tagName.toLowerCase() === 'input') return direct;

      const labels = ctx.querySelectorAll('td, label, span, div');
      for (const lbl of labels) {
        const text = (lbl.innerText || lbl.textContent || '').trim();
        if (/Passphrase/i.test(text) || /Pre-Shared Key/i.test(text) || /WPA Key/i.test(text) || /Password/i.test(text) || /Sandi/i.test(text)) {
          const parentRow = lbl.closest('tr') || lbl.parentElement;
          if (parentRow) {
            const input = parentRow.querySelector('input[type="password"], input[type="text"]');
            if (input) return input;
          }
        }
      }

      const inputs = ctx.querySelectorAll('input[type="password"], input[type="text"]');
      for (const inp of inputs) {
        const idOrName = (inp.id + ' ' + inp.name).toLowerCase();
        if (idOrName.includes('passphrase') || idOrName.includes('wpakey') || idOrName.includes('key') || idOrName.includes('pass')) {
          return inp;
        }
      }

      return null;
    });
  }

  async function findSubmitButton() {
    return findElementAcrossFrames((ctx) => {
      const submitInputs = ctx.querySelectorAll('input[type="button"], input[type="submit"], button');
      for (const btn of submitInputs) {
        const val = (btn.value || btn.innerText || btn.textContent || '').trim();
        if (/^Submit$/i.test(val) || /^Simpan$/i.test(val) || /^Apply$/i.test(val)) {
          return btn;
        }
      }

      const byId = ctx.querySelector('#Btn_Submit, #btnSubmit, #Button1, #Submit, #btn_apply, input[name*="Submit"]');
      if (byId) return byId;

      return null;
    });
  }

})();

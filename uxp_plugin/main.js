/**
 * UI Controller & Event Handlers
 */
document.addEventListener("DOMContentLoaded", () => {
  const logTerminal = document.getElementById("logTerminal");
  const aiStatusDot = document.querySelector(".status-dot");
  const aiStatusText = document.getElementById("aiStatusText");
  const fillRatioSlider = document.getElementById("amazonFillRatio");
  const fillRatioVal = document.getElementById("fillRatioVal");

  // Logger helper
  function log(msg, type = "info") {
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    entry.textContent = `[${time}] ${msg}`;
    logTerminal.appendChild(entry);
    logTerminal.scrollTop = logTerminal.scrollHeight;
  }

  // Clear Log
  document.getElementById("btnClearLog").addEventListener("click", () => {
    logTerminal.innerHTML = "";
    log("Log cleared.", "info");
  });

  // Fill Ratio Slider Sync
  fillRatioSlider.addEventListener("input", (e) => {
    fillRatioVal.textContent = `${e.target.value}%`;
  });

  // Python AI Backend Heartbeat
  async function checkBackend() {
    const res = await window.AIBridge.checkHealth();
    if (res.online) {
      aiStatusDot.className = "status-dot online";
      aiStatusText.textContent = "AI: Online";
    } else {
      aiStatusDot.className = "status-dot offline";
      aiStatusText.textContent = "AI: Offline";
    }
  }
  checkBackend();
  setInterval(checkBackend, 5000);

  // 1-Click Amazon Auto-Fit
  document.getElementById("btnRunAmazonFull").addEventListener("click", async () => {
    const canvasSize = parseInt(document.getElementById("amazonCanvasSize").value, 10);
    const fillRatio = parseInt(fillRatioSlider.value, 10) / 100;
    const shadowType = document.getElementById("amazonShadowType").value;
    const autoSRGB = document.getElementById("chkAutoSRGB").checked;

    try {
      await window.AmazonModule.runFullAmazonAutoFit({
        canvasSize,
        fillRatio,
        shadowType,
        autoSRGB,
        log
      });
    } catch (err) {
      // Error already logged
    }
  });

  // Step 1: Select Subject
  document.getElementById("btnSelectSubject").addEventListener("click", async () => {
    log("Running Photoshop AI Select Subject...", "info");
    try {
      await window.PSAutomation.selectSubject();
      await window.PSAutomation.createMaskFromSelection();
      log("Subject selected and masked.", "success");
    } catch (err) {
      log(`Failed: ${err.message}`, "error");
    }
  });

  // Step 2: Pure White BG
  document.getElementById("btnApplyWhiteBG").addEventListener("click", async () => {
    log("Adding pure white #FFFFFF background...", "info");
    try {
      await window.PSAutomation.createPureWhiteBackground();
      log("White background layer added.", "success");
    } catch (err) {
      log(`Failed: ${err.message}`, "error");
    }
  });

  // Step 3: Fit 85% & Center
  document.getElementById("btnFitAndCenter").addEventListener("click", async () => {
    const canvasSize = parseInt(document.getElementById("amazonCanvasSize").value, 10);
    const fillRatio = parseInt(fillRatioSlider.value, 10) / 100;
    log(`Fitting to ${Math.round(fillRatio * 100)}% & centering on ${canvasSize}x${canvasSize}...`, "info");
    try {
      await window.PSAutomation.fitAndCenterSubject(fillRatio, canvasSize);
      log("Subject fitted & centered.", "success");
    } catch (err) {
      log(`Failed: ${err.message}`, "error");
    }
  });

  // Step 4: Shadow
  document.getElementById("btnAddShadow").addEventListener("click", async () => {
    log("Applying contact shadow...", "info");
    try {
      await window.PSAutomation.addNaturalContactShadow();
      log("Contact shadow added.", "success");
    } catch (err) {
      log(`Failed: ${err.message}`, "error");
    }
  });

  // Step 5: Export
  document.getElementById("btnExportAmazon").addEventListener("click", () => {
    log("To export: Use Photoshop File > Export As... (JPG, Quality: 90+, sRGB)", "info");
  });
});

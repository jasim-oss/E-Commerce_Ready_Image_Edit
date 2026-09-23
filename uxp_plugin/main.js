/**
 * Panel Controller: Accordion & Event Dispatcher
 */
document.addEventListener("DOMContentLoaded", () => {
  const statusMsg = document.getElementById("statusMsg");
  const statusDot = document.querySelector(".status-dot");
  const scsmRatioSlider = document.getElementById("scsmRatioSlider");
  const scsmRatioLabel = document.getElementById("scsmRatioLabel");

  function setStatus(msg, state = "online") {
    statusMsg.textContent = msg;
    statusDot.className = `status-dot ${state}`;
  }

  // Accordion Toggle Behavior
  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      const targetId = header.getAttribute("data-target");
      const body = document.getElementById(targetId);
      const chevron = header.querySelector(".chevron");

      if (body) {
        body.classList.toggle("collapsed");
        chevron.classList.toggle("down");
      }
    });
  });

  // Slider Ratio Sync
  if (scsmRatioSlider) {
    scsmRatioSlider.addEventListener("input", (e) => {
      scsmRatioLabel.textContent = `${e.target.value}%`;
    });
  }

  // 1. RESIZE Handlers
  const marketplaceSelect = document.getElementById("selectMarketplaceResize");
  // toggleResizeAll removed

  if (marketplaceSelect) {
    marketplaceSelect.addEventListener("change", async () => {
      const selectedOption = marketplaceSelect.options[marketplaceSelect.selectedIndex];
      if (!selectedOption || !selectedOption.value) return;

      const name = selectedOption.getAttribute("data-name");
      const w = parseInt(selectedOption.getAttribute("data-w"), 10);
      const h = parseInt(selectedOption.getAttribute("data-h"), 10);
      const dpi = parseInt(selectedOption.getAttribute("data-dpi"), 10);
      const applyAll = false;

      try {
        setStatus(`Resizing for ${name} (${w}×${h} @ ${dpi}DPI)${applyAll ? " on ALL docs" : ""}...`, "working");
        await window.PSAutomation.resizeForMarketplace(w, h, dpi, applyAll);
        setStatus(`Resized for ${name} (${w}×${h} px, ${dpi} DPI)`, "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      } finally {
        // Reset to placeholder so user can select the same marketplace again for next image
        setTimeout(() => {
          marketplaceSelect.selectedIndex = 0;
        }, 1200);
      }
    });
  }

  // 2. BG REMOVE Handlers
  document.getElementById("btnBgRemove").addEventListener("click", async () => {
    const applyAll = document.getElementById("toggleBgRemoveAll").checked;
    try {
      setStatus(`Removing background ${applyAll ? "(ALL docs)" : ""}...`, "working");
      await window.PSAutomation.bgRemove(applyAll);
      setStatus("Background removed cleanly", "online");
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  });

  
  document.getElementById("btnWhiteBg").addEventListener("click", async () => {
    try {
      setStatus("Adding pure white #FFF BG...", "working");
      await window.PSAutomation.addPureWhiteBg();
      setStatus("Pure white BG added", "online");
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  });

  // 3. SCSM Handlers
  document.getElementById("btnScsmAmazon").addEventListener("click", async () => {
    const ratio = parseInt(scsmRatioSlider.value, 10) / 100;
    try {
      setStatus(`Applying SCSM (${Math.round(ratio * 100)}% fit)...`, "working");
      await window.PSAutomation.scsmFitAndCenter(ratio, 2000);
      setStatus("SCSM 85% completed", "online");
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  });

  
  // 4. EDITING ADJUSTMENT Handlers
  document.getElementById("btnWrinkleClothing").addEventListener("click", async () => {
    try {
      setStatus("Smoothing fabric wrinkles...", "working");
      await window.AdjustmentModule.smoothClothingWrinkles();
      setStatus("Wrinkle smoothing layer added", "online");
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  });

  document.getElementById("btnShadow").addEventListener("click", async () => {
    try {
      setStatus("Adding contact shadow...", "working");
      await window.AdjustmentModule.applyContactShadow();
      setStatus("Contact shadow applied", "online");
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  });

  document.getElementById("btnColorCorrection").addEventListener("click", async () => {
    try {
      setStatus("Correcting colors & sRGB...", "working");
      await window.AdjustmentModule.applyColorCorrection();
      setStatus("Color corrected & sRGB profile set", "online");
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  });

  // 5. EXPORT Handlers
  
  document.getElementById("btnReadyDelivery").addEventListener("click", async () => {
    try {
      setStatus("Preparing for Delivery...", "working");
      await window.PSAutomation.exportPreset("Delivery");
      setStatus("Document ready for Delivery", "online");
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  });

  document.getElementById("btnWorkingFile").addEventListener("click", async () => {
    setStatus("Use Photoshop File > Save As to save .PSD working file", "online");
  });
});

/**
 * Panel Controller: Accordion & Event Dispatcher
 */
document.addEventListener("DOMContentLoaded", () => {
  const statusMsg = document.getElementById("statusMsg");
  const statusDot = document.querySelector(".status-dot");
  function setStatus(msg, state = "online") {
    statusMsg.textContent = msg;
    statusDot.className = `status-dot ${state}`;
  }

  // Accordion Toggle Behavior
  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", (e) => {
      if (e.target.closest(".toggle-group") || e.target.closest(".switch") || e.target.closest("input")) {
        return;
      }
      const targetId = header.getAttribute("data-target");
      const body = document.getElementById(targetId);
      const chevron = header.querySelector(".chevron");

      if (body) {
        body.classList.toggle("collapsed");
        chevron.classList.toggle("down");
      }
    });
  });

  // Keyboard accessibility for div role="button" action buttons
  document.querySelectorAll('.action-btn[role="button"]').forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  });

  // 1. RESIZE Handlers (Marketplace, Custom & Edit Box)
  const marketplaceSelect = document.getElementById("selectMarketplaceResize");
  const resizeControlsGroup = document.getElementById("resizeControlsGroup");
  const toggleResizeAll = document.getElementById("toggleResizeAll");
  const toggleSmartAnchor = document.getElementById("toggleSmartAnchor");
  const lblSmartAnchor = document.getElementById("lblSmartAnchor");
  const inputW = document.getElementById("inputResizeW");
  const inputH = document.getElementById("inputResizeH");
  const inputDpi = document.getElementById("inputResizeDpi");
  const btnToggleEdit = document.getElementById("btnToggleEdit");
  const btnApplyResize = document.getElementById("btnApplyResize");
  const lblApplyResize = document.getElementById("lblApplyResize");
  const btnLinkDimensions = document.getElementById("btnLinkDimensions");

  const linkedSVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="stroke: #ffffff !important;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" style="stroke: #ffffff !important;"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" style="stroke: #ffffff !important;"></path></svg>`;
  const unlinkedSVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke: #71717a !important;"><path d="M15 7h2a5 5 0 0 1 0 10h-2" style="stroke: #71717a !important;"></path><path d="M9 17H7A5 5 0 0 1 7 7h2" style="stroke: #71717a !important;"></path><line x1="4" y1="20" x2="20" y2="4" stroke="#ff3b30" stroke-width="3" style="stroke: #ff3b30 !important;"></line></svg>`;

  let isEditMode = false;
  let isDimensionsLinked = true;
  let currentAspectRatio = 1.0;

  function updateAspectRatioFromInputs() {
    const w = parseFloat(inputW ? inputW.value : 0);
    const h = parseFloat(inputH ? inputH.value : 0);
    if (w > 0 && h > 0) {
      currentAspectRatio = w / h;
    }
  }

  function updateDimensionLinkState(linked) {
    isDimensionsLinked = linked;
    updateAspectRatioFromInputs();
    if (btnLinkDimensions) {
      if (isDimensionsLinked) {
        btnLinkDimensions.classList.add("active");
        btnLinkDimensions.title = "Constrain Proportions (Linked)";
        btnLinkDimensions.innerHTML = linkedSVG;
      } else {
        btnLinkDimensions.classList.remove("active");
        btnLinkDimensions.title = "Do Not Constrain Proportions (Unlinked)";
        btnLinkDimensions.innerHTML = unlinkedSVG;
      }
    }
  }

  function setEditMode(editable) {
    isEditMode = editable;
    [inputW, inputH, inputDpi].forEach(input => {
      if (input) {
        input.readOnly = !editable;
        if (editable) {
          input.classList.add("editable");
        } else {
          input.classList.remove("editable");
        }
      }
    });

    if (btnToggleEdit) {
      if (editable) {
        btnToggleEdit.classList.add("active");
        btnToggleEdit.textContent = "Done";
      } else {
        btnToggleEdit.classList.remove("active");
        btnToggleEdit.textContent = "Edit";
      }
    }
  }

  function updateDimensionDisplay() {
    if (!marketplaceSelect) return;
    const val = marketplaceSelect.value;
    
    // Hide controls if on placeholder or empty
    if (!val) {
      if (resizeControlsGroup) resizeControlsGroup.style.display = "none";
      return;
    }

    let selectedOption = null;
    if (marketplaceSelect.selectedIndex >= 0 && marketplaceSelect.options) {
      selectedOption = marketplaceSelect.options[marketplaceSelect.selectedIndex];
    }
    if (!selectedOption || selectedOption.value !== val) {
      selectedOption = Array.from(marketplaceSelect.options || []).find(opt => opt.value === val);
    }

    if (!selectedOption || !selectedOption.value) {
      if (resizeControlsGroup) resizeControlsGroup.style.display = "none";
      return;
    }

    // Show controls when a valid marketplace or custom is selected
    if (resizeControlsGroup) {
      resizeControlsGroup.style.display = "flex";
    }

    const name = selectedOption.getAttribute("data-name") || "Custom";
    let w = selectedOption.getAttribute("data-w") || "2000";
    let h = selectedOption.getAttribute("data-h") || "2000";
    let dpi = selectedOption.getAttribute("data-dpi") || "72";

    if (val === "custom") {
      try {
        const photoshop = require('photoshop');
        const activeDoc = photoshop && photoshop.app ? photoshop.app.activeDocument : null;
        if (activeDoc) {
          const docW = Math.round(activeDoc.width);
          const docH = Math.round(activeDoc.height);
          const docDpi = Math.round(activeDoc.resolution);
          if (docW && !isNaN(docW)) w = String(docW);
          if (docH && !isNaN(docH)) h = String(docH);
          if (docDpi && !isNaN(docDpi)) dpi = String(docDpi);
        }
      } catch (e) {
        console.log("Could not read active document original dimensions:", e);
      }
    }

    if (inputW) inputW.value = w;
    if (inputH) inputH.value = h;
    if (inputDpi) inputDpi.value = dpi;
    if (lblApplyResize) lblApplyResize.textContent = `Apply Resize (${w}×${h})`;

    // Default to LINKED state so aspect ratio is preserved automatically (e.g. 1553x2048)
    updateDimensionLinkState(true);

    if (val === "custom") {
      setEditMode(true);
      if (inputW) inputW.focus();
    } else {
      setEditMode(false);
    }
  }

  if (marketplaceSelect) {
    marketplaceSelect.addEventListener("change", updateDimensionDisplay);
    marketplaceSelect.addEventListener("input", updateDimensionDisplay);
  }

  if (btnToggleEdit) {
    btnToggleEdit.addEventListener("click", () => {
      setEditMode(!isEditMode);
      if (isEditMode && inputW) inputW.focus();
    });
  }

  function updateApplyResizeLabel() {
    if (!lblApplyResize) return;
    const w = (inputW && inputW.value) || "2000";
    const h = (inputH && inputH.value) || "2000";
    const isSmart = toggleSmartAnchor && toggleSmartAnchor.checked;
    lblApplyResize.textContent = isSmart ? `Apply Smart Resize (${w}x${h})` : `Apply Resize (${w}x${h})`;
  }

  if (btnLinkDimensions) {
    const toggleLink = () => {
      const nextState = !isDimensionsLinked;
      updateDimensionLinkState(nextState);
    };
    btnLinkDimensions.addEventListener("click", toggleLink);
    btnLinkDimensions.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleLink();
      }
    });
  }

  if (inputW) {
    inputW.addEventListener("input", () => {
      if (isDimensionsLinked && inputH && currentAspectRatio > 0) {
        const wVal = parseFloat(inputW.value);
        if (wVal > 0) {
          inputH.value = String(Math.round(wVal / currentAspectRatio));
        }
      }
      updateApplyResizeLabel();
    });
  }

  if (inputH) {
    inputH.addEventListener("input", () => {
      if (isDimensionsLinked && inputW && currentAspectRatio > 0) {
        const hVal = parseFloat(inputH.value);
        if (hVal > 0) {
          inputW.value = String(Math.round(hVal * currentAspectRatio));
        }
      }
      updateApplyResizeLabel();
    });
  }

  if (toggleSmartAnchor) {
    toggleSmartAnchor.addEventListener("change", () => {
      if (lblSmartAnchor) {
        lblSmartAnchor.textContent = toggleSmartAnchor.checked ? "ON" : "OFF";
        lblSmartAnchor.style.color = toggleSmartAnchor.checked ? "#38bdf8" : "";
      }
      updateApplyResizeLabel();
    });
  }

  if (btnApplyResize) {
    btnApplyResize.addEventListener("click", async () => {
      const w = parseInt((inputW && inputW.value) || "2000", 10);
      const h = parseInt((inputH && inputH.value) || "2000", 10);
      const dpi = parseInt((inputDpi && inputDpi.value) || "72", 10);
      const applyAll = toggleResizeAll ? toggleResizeAll.checked : false;

      if (!w || !h || w <= 0 || h <= 0) {
        setStatus("Please enter valid width and height.", "error");
        return;
      }

      const smartAnchor = toggleSmartAnchor ? toggleSmartAnchor.checked : false;
      const modeStr = smartAnchor ? " [Smart Edge]" : "";
      try {
        setStatus(`Resizing to ${w}x${h} px @ ${dpi} DPI${modeStr} ${applyAll ? "(ALL docs)" : ""}...`, "working");
        await window.PSAutomation.resizeForMarketplace(w, h, dpi, applyAll, smartAnchor);
        setStatus(`Resized to ${w}x${h} px (${dpi} DPI)${modeStr} ${applyAll ? "(ALL docs)" : ""}`, "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    });
  }

  // 2. BACKGROUNDS Handlers (BG Remove, White, Custom, Upload)
  const btnBgRemove = document.getElementById("btnBgRemove");
  const toggleBgRemoveAll = document.getElementById("toggleBgRemoveAll");
  const btnBgWhite = document.getElementById("btnBgWhite");
  const btnBgCustom = document.getElementById("btnBgCustom");
  const btnBgUpload = document.getElementById("btnBgUpload");
  const customColorBox = document.getElementById("customColorBox");
  const hexBgCustom = document.getElementById("hexBgCustom");
  const pickerBgCustom = document.getElementById("pickerBgCustom");
  const btnApplyCustomColor = document.getElementById("btnApplyCustomColor");

  // BG Remove
  if (btnBgRemove) {
    btnBgRemove.addEventListener("click", async () => {
      const applyAll = toggleBgRemoveAll ? toggleBgRemoveAll.checked : false;
      try {
        setStatus(`Removing background ${applyAll ? "(ALL docs)" : ""}...`, "working");
        await window.PSAutomation.bgRemove(applyAll);
        setStatus("Background removed cleanly", "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    });
  }

  // Background Option Drawer Toggle
  const btnBgOptions = document.getElementById("btnBgOptions");
  const bgOptionsBox = document.getElementById("bgOptionsBox");
  const bgOptionsChevron = document.getElementById("bgOptionsChevron");

  if (btnBgOptions) {
    btnBgOptions.addEventListener("click", () => {
      if (!bgOptionsBox) return;
      const isOpen = bgOptionsBox.classList.contains("open") || (bgOptionsBox.style.display && bgOptionsBox.style.display !== "none");
      if (isOpen) {
        bgOptionsBox.classList.remove("open");
        bgOptionsBox.style.display = "none";
        btnBgOptions.classList.remove("active");
        if (bgOptionsChevron) bgOptionsChevron.classList.remove("up");
      } else {
        bgOptionsBox.classList.add("open");
        bgOptionsBox.style.display = "flex";
        btnBgOptions.classList.add("active");
        if (bgOptionsChevron) bgOptionsChevron.classList.add("up");
      }
    });
  }

  // 1) White BG
  const customColorChevron = document.getElementById("customColorChevron");
    if (btnBgWhite) {
      btnBgWhite.addEventListener("click", async () => {
        if (customColorBox) {
          customColorBox.classList.remove("open");
          customColorBox.style.display = "none";
        }
        if (btnBgCustom) btnBgCustom.classList.remove("active");
        if (customColorChevron) customColorChevron.classList.remove("up");
        const applyAll = toggleBgRemoveAll ? toggleBgRemoveAll.checked : false;
        try {
          setStatus(`Adding pure white #FFF BG ${applyAll ? "(ALL docs)" : ""}...`, "working");
          await window.PSAutomation.addSolidColorBg(255, 255, 255, applyAll);
          setStatus(`Pure white BG added ${applyAll ? "(ALL docs)" : ""}`, "online");
        } catch (err) {
          setStatus(`Error: ${err.message}`, "error");
        }
      });
    }

    // 2) Custom Color Toggle Drawer
    if (btnBgCustom) {
      btnBgCustom.addEventListener("click", () => {
        if (!customColorBox) return;
        const isOpen = customColorBox.classList.contains("open") || (customColorBox.style.display && customColorBox.style.display !== "none");
        if (isOpen) {
          customColorBox.classList.remove("open");
          customColorBox.style.display = "none";
          btnBgCustom.classList.remove("active");
          if (customColorChevron) customColorChevron.classList.remove("up");
        } else {
          customColorBox.classList.add("open");
          customColorBox.style.display = "block";
          btnBgCustom.classList.add("active");
          if (customColorChevron) customColorChevron.classList.add("up");
          if (hexBgCustom) hexBgCustom.focus();
        }
      });
    }

    // 3) Upload Background Image
    if (btnBgUpload) {
      btnBgUpload.addEventListener("click", async () => {
        if (customColorBox) {
          customColorBox.classList.remove("open");
          customColorBox.style.display = "none";
        }
        if (btnBgCustom) btnBgCustom.classList.remove("active");
        if (customColorChevron) customColorChevron.classList.remove("up");
        const applyAll = toggleBgRemoveAll ? toggleBgRemoveAll.checked : false;
        try {
          setStatus(`Opening file browser for background image ${applyAll ? "(ALL docs)" : ""}...`, "working");
          const res = await window.PSAutomation.placeBackgroundImage(applyAll);
          if (res !== false) {
            setStatus(`Background image placed successfully ${applyAll ? "(ALL docs)" : ""}`, "online");
          } else {
            setStatus("Background upload canceled", "online");
          }
        } catch (err) {
          setStatus(`Error: ${err.message}`, "error");
        }
      });
    }

    // Auto uppercase hex input, sync swatch & enter key support
    if (pickerBgCustom) {
      pickerBgCustom.addEventListener('input', (e) => {
        if (hexBgCustom) {
          hexBgCustom.value = e.target.value.toUpperCase();
        }
      });
    }
    if (hexBgCustom) {
      hexBgCustom.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val && !val.startsWith('#')) val = '#' + val;
        hexBgCustom.value = val.toUpperCase();
        if (/^#[0-9A-F]{6}$/i.test(val) && pickerBgCustom) {
          pickerBgCustom.value = val.toUpperCase();
        }
      });
      hexBgCustom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && btnApplyCustomColor) {
          btnApplyCustomColor.click();
        }
      });
    }

    // Convert Hex to RGB helper
    function hexToRgb(hex) {
      hex = hex.replace(/^#/, "");
      if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
      }
      const num = parseInt(hex, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    // Apply Custom Color BG
    if (btnApplyCustomColor) {
      btnApplyCustomColor.addEventListener("click", async () => {
        let hex = hexBgCustom ? hexBgCustom.value : "#FFFFFF";
        if (!hex.startsWith("#")) hex = "#" + hex;
        if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
          hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          setStatus("Please enter a valid 6-char hex color (e.g. #F4F4F4)", "error");
          return;
        }
        hex = hex.toUpperCase();
        if (hexBgCustom) hexBgCustom.value = hex;
        if (pickerBgCustom) pickerBgCustom.value = hex;
        const { r, g, b } = hexToRgb(hex);
        const applyAll = toggleBgRemoveAll ? toggleBgRemoveAll.checked : false;
        try {
          setStatus(`Adding Custom BG (${hex}) ${applyAll ? "(ALL docs)" : ""}...`, "working");
          await window.PSAutomation.addSolidColorBg(r, g, b, applyAll);
          setStatus(`Custom BG ${hex} added ${applyAll ? "(ALL docs)" : ""}`, "online");
        } catch (err) {
          setStatus(`Error: ${err.message}`, "error");
        }
      });
    }

    // 3. SCSM Handlers (Product, Model, Custom)
    const toggleScsmAll = document.getElementById('toggleScsmAll');
    const btnScsmProduct = document.getElementById('btnScsmProduct');
    const btnScsmModel = document.getElementById('btnScsmModel');
    const btnScsmCustom = document.getElementById('btnScsmCustom');
    const customScsmBox = document.getElementById('customScsmBox');
    const inputScsmCustomPercent = document.getElementById('inputScsmCustomPercent');
    const btnApplyCustomScsm = document.getElementById('btnApplyCustomScsm');

    function setActiveScsmBtn(activeBtn) {
      if (btnScsmProduct) btnScsmProduct.classList.remove('active');
      if (btnScsmModel) btnScsmModel.classList.remove('active');
      if (btnScsmCustom) btnScsmCustom.classList.remove('active');
      if (activeBtn) activeBtn.classList.add('active');
    }

    // Helper to get and sanitize custom SCSM margin percent
    function getCustomScsmMargin() {
      const raw = (inputScsmCustomPercent && inputScsmCustomPercent.value) || '10';
      let val = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
      if (isNaN(val) || val < 1) val = 10;
      if (val > 45) val = 45;
      if (inputScsmCustomPercent) inputScsmCustomPercent.value = val;
      return val;
    }

    async function applyCustomMargin() {
      const val = getCustomScsmMargin();
      const applyAll = toggleScsmAll ? toggleScsmAll.checked : false;
      try {
        setStatus(`Applying Custom SCSM (${val}% Margin) ${applyAll ? "(ALL docs)" : ""}...`, 'working');
        await window.PSAutomation.scsmByMargin(val, applyAll);
        setStatus(`Custom SCSM (${val}% Margin) applied ${applyAll ? "(ALL docs)" : ""}`, 'online');
      } catch (err) {
        setStatus(`Error: ${err.message}`, 'error');
      }
    }

    // 1) Product (10% Margin)
    const customScsmChevron = document.getElementById("customScsmChevron");
    if (btnScsmProduct) {
      btnScsmProduct.addEventListener('click', async () => {
        if (customScsmBox) customScsmBox.style.display = 'none';
        if (customScsmChevron) customScsmChevron.classList.remove('up');
        setActiveScsmBtn(btnScsmProduct);
        const applyAll = toggleScsmAll ? toggleScsmAll.checked : false;
        try {
          setStatus(`Applying Product SCSM (10% Margin) ${applyAll ? "(ALL docs)" : ""}...`, 'working');
          await window.PSAutomation.scsmByMargin(10, applyAll);
          setStatus(`Product SCSM (10% Margin) applied ${applyAll ? "(ALL docs)" : ""}`, 'online');
        } catch (err) {
          setStatus(`Error: ${err.message}`, 'error');
        }
      });
    }

    // 2) Model (5% Margin)
    if (btnScsmModel) {
      btnScsmModel.addEventListener('click', async () => {
        if (customScsmBox) customScsmBox.style.display = 'none';
        if (customScsmChevron) customScsmChevron.classList.remove('up');
        setActiveScsmBtn(btnScsmModel);
        const applyAll = toggleScsmAll ? toggleScsmAll.checked : false;
        try {
          setStatus(`Applying Model SCSM (5% Margin) ${applyAll ? "(ALL docs)" : ""}...`, 'working');
          await window.PSAutomation.scsmByMargin(5, applyAll);
          setStatus(`Model SCSM (5% Margin) applied ${applyAll ? "(ALL docs)" : ""}`, 'online');
        } catch (err) {
          setStatus(`Error: ${err.message}`, 'error');
        }
      });
    }

    // 3) Custom Button: Expands drawer
    if (btnScsmCustom) {
      btnScsmCustom.addEventListener('click', () => {
        if (!customScsmBox) return;
        const isOpen = customScsmBox.classList.contains('open') || (customScsmBox.style.display && customScsmBox.style.display !== 'none');
        if (isOpen) {
          customScsmBox.classList.remove('open');
          customScsmBox.style.display = 'none';
          btnScsmCustom.classList.remove('active');
          if (customScsmChevron) customScsmChevron.classList.remove('up');
        } else {
          setActiveScsmBtn(btnScsmCustom);
          customScsmBox.classList.add('open');
          customScsmBox.style.display = 'block';
          btnScsmCustom.classList.add('active');
          if (customScsmChevron) customScsmChevron.classList.add('up');
          if (inputScsmCustomPercent) {
            inputScsmCustomPercent.focus();
            if (typeof inputScsmCustomPercent.select === 'function') {
              inputScsmCustomPercent.select();
            }
          }
        }
      });
    }

    // Apply Custom SCSM Margin Button
    if (btnApplyCustomScsm) {
      btnApplyCustomScsm.addEventListener('click', async () => {
        setActiveScsmBtn(btnScsmCustom);
        await applyCustomMargin();
      });
    }

    if (inputScsmCustomPercent) {
      inputScsmCustomPercent.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (btnApplyCustomScsm) btnApplyCustomScsm.click();
        }
      });
    }

  // 4. EDITING ADJUSTMENT Handlers (Wrinkle Drawer with Dropdown, Shadow, Color)
  const btnWrinkleClothing = document.getElementById("btnWrinkleClothing");
  const wrinkleOptionsBox = document.getElementById("wrinkleOptionsBox");
  const wrinkleChevron = document.getElementById("wrinkleChevron");
  const selectWrinkleMethod = document.getElementById("selectWrinkleMethod");
  const btnApplyWrinkle = document.getElementById("btnApplyWrinkle");

  if (btnWrinkleClothing) {
    btnWrinkleClothing.addEventListener("click", () => {
      if (!wrinkleOptionsBox) return;
      const isOpen = wrinkleOptionsBox.classList.contains("open") || (wrinkleOptionsBox.style.display && wrinkleOptionsBox.style.display !== "none");
      if (isOpen) {
        wrinkleOptionsBox.classList.remove("open");
        wrinkleOptionsBox.style.display = "none";
        btnWrinkleClothing.classList.remove("active");
        if (wrinkleChevron) wrinkleChevron.classList.remove("up");
      } else {
        wrinkleOptionsBox.classList.add("open");
        wrinkleOptionsBox.style.display = "block";
        btnWrinkleClothing.classList.add("active");
        if (wrinkleChevron) wrinkleChevron.classList.add("up");
      }
    });
  }

  const toggleWrinkleAll = document.getElementById("toggleWrinkleAll");

  async function executeWrinkleMethod() {
    const method = selectWrinkleMethod ? selectWrinkleMethod.value : "";
    if (!method) {
      setStatus("Please select a retouch option from dropdown", "error");
      return;
    }

    const applyAll = toggleWrinkleAll ? toggleWrinkleAll.checked : false;
    const allStr = applyAll ? " (ALL docs)" : "";

    const mod = window.PSAutomation || window.AdjustmentModule;
    if (!mod) {
      setStatus("Error: Automation module not ready", "error");
      return;
    }

    if (method === "fs") {
      try {
        setStatus(`Creating Frequency Separation group${allStr}...`, "working");
        await mod.applyFrequencySeparation(applyAll);
        setStatus(`Frequency Separation ready (Low/High layers)${allStr}`, "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    } else if (method === "dnb") {
      try {
        setStatus(`Creating Dodge & Burn Soft Light layer${allStr}...`, "working");
        await mod.applyDodgeAndBurn(applyAll);
        setStatus(`Dodge & Burn ready (Soft Light layer, Brush Flow 5%)${allStr}`, "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    } else if (method === "evoto") {
      try {
        setStatus(`Preparing JPG for Evoto AI${allStr}...`, "working");
        const savedName = await mod.saveForEvoto(applyAll);
        if (savedName) {
          setStatus(`Saved for Evoto: ${savedName}`, "online");
        } else {
          setStatus("Save for Evoto canceled", "online");
        }
      } catch (err) {
        console.error("Save for Evoto error:", err);
        const msg = (err && (err.message || err.description || err.error)) || (typeof err === "string" ? err : JSON.stringify(err)) || "Unknown error";
        setStatus(`Error: ${msg}`, "error");
      }
    }
  }
    if (btnApplyWrinkle) {
    btnApplyWrinkle.addEventListener("click", executeWrinkleMethod);
  }
  // Wrinkle method now only executes on btnApplyWrinkle click


  // Shadow Drawer and Handlers (Drop, Natural, Existing, Cast)
  const btnShadow = document.getElementById("btnShadow");
  const shadowOptionsBox = document.getElementById("shadowOptionsBox");
  const shadowChevron = document.getElementById("shadowChevron");
  const selectShadowMethod = document.getElementById("selectShadowMethod");
  const btnApplyShadow = document.getElementById("btnApplyShadow");
  const toggleShadowAll = document.getElementById("toggleShadowAll");
  const btnCleanupShadow = document.getElementById("btnCleanupShadow");
  const cleanupShadowRow = document.getElementById("cleanupShadowRow");

  function updateCleanupShadowVisibility() {
    const sel = document.getElementById("selectShadowMethod");
    const row = document.getElementById("cleanupShadowRow");
    const btn = document.getElementById("btnCleanupShadow");

    const method = sel ? sel.value : "";
    const hideCleanup = (!method || method === "drop");

    if (row) {
      row.style.setProperty("display", hideCleanup ? "none" : "flex", "important");
    }
    if (btn) {
      btn.style.setProperty("display", hideCleanup ? "none" : "block", "important");
    }
  }

  if (btnShadow) {
    btnShadow.addEventListener("click", () => {
      if (!shadowOptionsBox) return;
      const isOpen = shadowOptionsBox.classList.contains("open") || (shadowOptionsBox.style.display && shadowOptionsBox.style.display !== "none");
      if (isOpen) {
        shadowOptionsBox.classList.remove("open");
        shadowOptionsBox.style.display = "none";
        btnShadow.classList.remove("active");
        if (shadowChevron) shadowChevron.classList.remove("up");
      } else {
        shadowOptionsBox.classList.add("open");
        shadowOptionsBox.style.display = "block";
        btnShadow.classList.add("active");
        if (shadowChevron) shadowChevron.classList.add("up");
        if (selectShadowMethod && !selectShadowMethod.value) {
          selectShadowMethod.value = "drop";
        }
        updateCleanupShadowVisibility();
      }
    });
  }

  if (selectShadowMethod) {
    selectShadowMethod.addEventListener("change", updateCleanupShadowVisibility);
    selectShadowMethod.addEventListener("input", updateCleanupShadowVisibility);
    updateCleanupShadowVisibility();
  }

  async function executeShadowMethod() {
    const method = selectShadowMethod ? selectShadowMethod.value : "";
    if (!method) {
      setStatus("Please select a shadow option from the dropdown", "error");
      return;
    }
    const applyAll = toggleShadowAll ? toggleShadowAll.checked : false;
    const mod = window.PSAutomation || window.AdjustmentModule;
    if (!mod) {
      setStatus("Error: Automation module not ready", "error");
      return;
    }
    const allStr = applyAll ? " (ALL docs)" : "";

    try {
      if (method === "drop") {
        setStatus(`Applying Drop Shadow${allStr}...`, "working");
        await mod.applyDropShadow(applyAll);
        setStatus(`Drop shadow applied${allStr}`, "online");
      } else if (method === "natural") {
        setStatus(`Applying Natural Shadow${allStr}...`, "working");
        await mod.applyNaturalShadow(applyAll);
        setStatus(`Natural shadow applied${allStr}`, "online");
      } else if (method === "existing") {
        setStatus(`Applying Existing Shadow${allStr}...`, "working");
        await mod.applyExistingShadow(applyAll);
        setStatus(`Existing shadow applied${allStr}`, "online");
      } else if (method === "cast") {
        setStatus(`Applying Cast Shadow${allStr}...`, "working");
        await mod.applyCastShadow(applyAll);
        setStatus(`Cast shadow applied${allStr}`, "online");
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  }

  if (btnApplyShadow) {
    btnApplyShadow.addEventListener("click", executeShadowMethod);
  }

  if (btnCleanupShadow) {
    btnCleanupShadow.addEventListener("click", async () => {
      const mod = window.PSAutomation || window.AdjustmentModule;
      if (!mod) {
        setStatus("Error: Automation module not ready", "error");
        return;
      }
      const applyAll = toggleShadowAll ? toggleShadowAll.checked : false;
      const allStr = applyAll ? " (All Docs)" : "";
      try {
        setStatus(`Cleaning up Shadow mask${allStr}...`, "working");
        await mod.cleanUpShadow(applyAll);
        setStatus(`Shadow mask cleaned & Brush activated${allStr}`, "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    });
  }


  // Color Correction Drawer and Handlers (White Balance, Auto Color)
  const btnColorCorrection = document.getElementById("btnColorCorrection");
  const colorOptionsBox = document.getElementById("colorOptionsBox");
  const colorChevron = document.getElementById("colorChevron");
  const selectColorMethod = document.getElementById("selectColorMethod");
  const btnApplyColor = document.getElementById("btnApplyColor");
  const toggleColorAll = document.getElementById("toggleColorAll");

  if (btnColorCorrection) {
    btnColorCorrection.addEventListener("click", () => {
      if (!colorOptionsBox) return;
      const isOpen = colorOptionsBox.style.display !== "none";
      if (isOpen) {
        colorOptionsBox.style.display = "none";
        btnColorCorrection.classList.remove("active");
        if (colorChevron) colorChevron.classList.remove("up");
      } else {
        colorOptionsBox.style.display = "block";
        btnColorCorrection.classList.add("active");
        if (colorChevron) colorChevron.classList.add("up");
      }
    });
  }

  async function executeColorMethod() {
    const method = selectColorMethod ? selectColorMethod.value : "white_balance";
    const applyAll = toggleColorAll ? toggleColorAll.checked : false;
    const mod = window.PSAutomation || window.AdjustmentModule;
    if (!mod) {
      setStatus("Error: Automation module not ready", "error");
      return;
    }
    const allStr = applyAll ? " (ALL docs)" : "";

    try {
      if (method === "white_balance") {
        setStatus("Balancing White / Color Cast" + allStr + "...", "working");
        await mod.applyWhiteBalance(applyAll);
        setStatus("White Balance applied" + allStr, "online");
      } else if (method === "auto_color") {
        setStatus("Applying Color Correction" + allStr + "...", "working");
        await mod.applyColorCorrection(applyAll);
        setStatus("Color corrected" + allStr, "online");
      }
    } catch (err) {
      setStatus("Error: " + err.message, "error");
    }
  }

  if (btnApplyColor) {
    btnApplyColor.addEventListener("click", executeColorMethod);
  }

  // Dust & Scratches Drawer and Handlers
  const btnDustScratches = document.getElementById("btnDustScratches");
  const dustOptionsBox = document.getElementById("dustOptionsBox");
  const dustChevron = document.getElementById("dustChevron");
  const btnApplyDust = document.getElementById("btnApplyDust");
  const toggleDustAll = document.getElementById("toggleDustAll");

  if (btnDustScratches) {
    btnDustScratches.addEventListener("click", () => {
      if (!dustOptionsBox) return;
      const isOpen = dustOptionsBox.classList.contains("open") || (dustOptionsBox.style.display && dustOptionsBox.style.display !== "none");
      if (isOpen) {
        dustOptionsBox.classList.remove("open");
        dustOptionsBox.style.display = "none";
        btnDustScratches.classList.remove("active");
        if (dustChevron) dustChevron.classList.remove("up");
      } else {
        dustOptionsBox.classList.add("open");
        dustOptionsBox.style.display = "block";
        btnDustScratches.classList.add("active");
        if (dustChevron) dustChevron.classList.add("up");
      }
    });
  }

  async function executeDustMethod() {
    const applyAll = toggleDustAll ? toggleDustAll.checked : false;
    const mod = window.PSAutomation || window.AdjustmentModule;
    if (!mod) {
      setStatus("Error: Automation module not ready", "error");
      return;
    }
    const allStr = applyAll ? " (ALL docs)" : "";

    try {
      setStatus(`Opening Dust & Scratches window${allStr}...`, "working");
      await mod.applyDustAndScratches(applyAll);
      setStatus(`Dust & Scratches ready (Retouch Layer & Mask created)${allStr}`, "online");
    } catch (err) {
      setStatus("Error: " + err.message, "error");
    }
  }

  if (btnApplyDust) {
    btnApplyDust.addEventListener("click", executeDustMethod);
  }

  // 5. EXPORT Handlers (Ready for Delivery with Marketplace presets)
  const MARKETPLACE_DELIVERY_DATA = {
    amazon: {
      name: "Amazon",
      formats: ["JPG", "PNG"],
      maxSize: "10 MB",
      maxBytes: 10 * 1024 * 1024,
      colorProfile: "sRGB",
      defaultFormat: "JPG"
    },
    ebay: {
      name: "eBay",
      formats: ["JPG", "PNG", "WebP"],
      maxSize: "12 MB",
      maxBytes: 12 * 1024 * 1024,
      colorProfile: "sRGB",
      defaultFormat: "JPG"
    },
    etsy: {
      name: "Etsy",
      formats: ["JPG", "PNG"],
      maxSize: "1 MB",
      maxBytes: 1 * 1024 * 1024,
      colorProfile: "sRGB",
      defaultFormat: "JPG"
    },
    shopify: {
      name: "Shopify",
      formats: ["JPG", "PNG", "WebP"],
      maxSize: "20 MB",
      maxBytes: 20 * 1024 * 1024,
      colorProfile: "sRGB",
      defaultFormat: "JPG"
    },
    walmart: {
      name: "Walmart",
      formats: ["JPG", "PNG"],
      maxSize: "5 MB",
      maxBytes: 5 * 1024 * 1024,
      colorProfile: "sRGB",
      defaultFormat: "JPG"
    },
    woocommerce: {
      name: "WooCommerce",
      formats: ["JPG", "PNG"],
      maxSize: "5 MB",
      maxBytes: 5 * 1024 * 1024,
      colorProfile: "RGB, sRGB",
      defaultFormat: "JPG"
    },
    zalando: {
      name: "Zalando",
      formats: ["JPG", "PNG"],
      maxSize: "20 MB",
      maxBytes: 20 * 1024 * 1024,
      colorProfile: "sRGB",
      defaultFormat: "JPG"
    },
    custom: {
      name: "Custom",
      formats: ["JPG", "PNG", "WebP", "TIF", "PSD"],
      maxSize: "10 MB",
      maxBytes: 10 * 1024 * 1024,
      colorProfile: "sRGB",
      defaultFormat: "JPG",
      isCustom: true
    }
  };

  const btnReadyDelivery = document.getElementById("btnReadyDelivery");
  const deliveryOptionsBox = document.getElementById("deliveryOptionsBox");
  const deliveryChevron = document.getElementById("deliveryChevron");
  const selectDeliveryMarketplace = document.getElementById("selectDeliveryMarketplace");
  const selectDeliveryFormat = document.getElementById("selectDeliveryFormat");
  const lblDeliveryMaxSize = document.getElementById("lblDeliveryMaxSize");
  const lblDeliveryColorProfile = document.getElementById("lblDeliveryColorProfile");
  const toggleDeliveryAll = document.getElementById("toggleDeliveryAll");
  const btnExportDelivery = document.getElementById("btnExportDelivery");

  // Toggle delivery drawer
  const deliveryCustomRow = document.getElementById("deliveryCustomRow");
  const inputDeliveryCustomMaxMb = document.getElementById("inputDeliveryCustomMaxMb");
  const selectDeliveryCustomProfile = document.getElementById("selectDeliveryCustomProfile");

  if (btnReadyDelivery) {
    btnReadyDelivery.addEventListener("click", () => {
      if (!deliveryOptionsBox) return;
      const isOpen = deliveryOptionsBox.classList.contains("open") || (deliveryOptionsBox.style.display && deliveryOptionsBox.style.display !== "none");
      if (isOpen) {
        deliveryOptionsBox.classList.remove("open");
        deliveryOptionsBox.style.display = "none";
        btnReadyDelivery.classList.remove("active");
        if (deliveryChevron) deliveryChevron.classList.remove("up");
      } else {
        deliveryOptionsBox.classList.add("open");
        deliveryOptionsBox.style.display = "block";
        btnReadyDelivery.classList.add("active");
        if (deliveryChevron) deliveryChevron.classList.add("up");
        if (selectDeliveryMarketplace && !selectDeliveryMarketplace.value) {
          selectDeliveryMarketplace.value = "amazon";
        }
        updateDeliveryMarketplaceUI();
      }
    });
  }

  // Update format dropdown & metadata badges on marketplace change
  function updateDeliveryMarketplaceUI() {
    const rawKey = selectDeliveryMarketplace ? selectDeliveryMarketplace.value : "";
    const key = rawKey.toLowerCase();
    const data = MARKETPLACE_DELIVERY_DATA[key];

    if (!data) {
      if (deliveryCustomRow) deliveryCustomRow.style.display = "none";
      if (lblDeliveryMaxSize) lblDeliveryMaxSize.textContent = "Max: -";
      if (lblDeliveryColorProfile) lblDeliveryColorProfile.textContent = "-";
      if (selectDeliveryFormat) {
        while (selectDeliveryFormat.firstChild) {
          selectDeliveryFormat.removeChild(selectDeliveryFormat.firstChild);
        }
        const ph = document.createElement("option");
        ph.value = "";
        ph.textContent = "Select Format...";
        ph.disabled = true;
        ph.selected = true;
        selectDeliveryFormat.appendChild(ph);
      }
      return;
    }

    // Toggle Custom inputs row
    if (data.isCustom) {
      if (deliveryCustomRow) deliveryCustomRow.style.display = "flex";
      const customMb = parseFloat(inputDeliveryCustomMaxMb ? inputDeliveryCustomMaxMb.value : "10") || 10;
      data.maxSize = customMb + " MB";
      data.maxBytes = Math.round(customMb * 1024 * 1024);
      data.colorProfile = selectDeliveryCustomProfile ? selectDeliveryCustomProfile.value : "sRGB";
    } else {
      if (deliveryCustomRow) deliveryCustomRow.style.display = "none";
    }

    if (lblDeliveryMaxSize) {
      lblDeliveryMaxSize.textContent = "Max: " + data.maxSize;
    }
    if (lblDeliveryColorProfile) {
      lblDeliveryColorProfile.textContent = data.colorProfile;
    }

    if (selectDeliveryFormat) {
      const currentVal = selectDeliveryFormat.value;
      while (selectDeliveryFormat.firstChild) {
        selectDeliveryFormat.removeChild(selectDeliveryFormat.firstChild);
      }
      data.formats.forEach((fmt) => {
        const opt = document.createElement("option");
        opt.value = fmt;
        opt.textContent = fmt;
        if (fmt === currentVal || fmt === data.defaultFormat) {
          opt.selected = true;
        }
        selectDeliveryFormat.appendChild(opt);
      });
      if (!data.formats.includes(selectDeliveryFormat.value)) {
        selectDeliveryFormat.value = data.formats[0];
      }
    }
  }

  if (selectDeliveryMarketplace) {
    selectDeliveryMarketplace.addEventListener("change", updateDeliveryMarketplaceUI);
    updateDeliveryMarketplaceUI();
  }

  // Real-time update for Custom inputs
  if (inputDeliveryCustomMaxMb) {
    inputDeliveryCustomMaxMb.addEventListener("input", () => {
      if (selectDeliveryMarketplace && selectDeliveryMarketplace.value === "custom") {
        updateDeliveryMarketplaceUI();
      }
    });
  }

  if (selectDeliveryCustomProfile) {
    selectDeliveryCustomProfile.addEventListener("change", () => {
      if (selectDeliveryMarketplace && selectDeliveryMarketplace.value === "custom") {
        updateDeliveryMarketplaceUI();
      }
    });
  }

  // Export delivery execute button handler
  async function executeExportDelivery() {
    const rawKey = selectDeliveryMarketplace ? selectDeliveryMarketplace.value : "";
    const key = rawKey.toLowerCase();
    const data = MARKETPLACE_DELIVERY_DATA[key];

    if (!data) {
      setStatus("Please select a marketplace first.", "error");
      return;
    }

    let targetBytes = data.maxBytes;
    let targetProfile = data.colorProfile;

    if (data.isCustom) {
      const mb = parseFloat(inputDeliveryCustomMaxMb ? inputDeliveryCustomMaxMb.value : "10") || 10;
      targetBytes = Math.round(mb * 1024 * 1024);
      targetProfile = selectDeliveryCustomProfile ? selectDeliveryCustomProfile.value : "sRGB";
    }

    const format = (selectDeliveryFormat && selectDeliveryFormat.value) ? selectDeliveryFormat.value : data.defaultFormat;
    const applyAll = toggleDeliveryAll ? toggleDeliveryAll.checked : false;
    const mod = window.PSAutomation || window.AdjustmentModule;

    if (!mod) {
      setStatus("Error: Automation module not ready", "error");
      return;
    }

    const allStr = applyAll ? " (ALL docs)" : "";
    try {
      setStatus("Exporting for " + data.name + " (" + format + ")" + allStr + "...", "working");
      const result = await mod.exportForDelivery(key, format, applyAll, targetBytes, targetProfile);
      setStatus(typeof result === "string" ? result : "Export for " + data.name + " completed!", "online");
    } catch (err) {
      setStatus("Error: " + err.message, "error");
    }
  }

  if (btnExportDelivery) {
    btnExportDelivery.addEventListener("click", executeExportDelivery);
  }


  const btnWorkingFile = document.getElementById("btnWorkingFile");
  const toggleWorkingFileAll = document.getElementById("toggleWorkingFileAll");
  if (btnWorkingFile) {
    btnWorkingFile.addEventListener("click", async () => {
      const mod = window.PSAutomation || window.AdjustmentModule;
      if (!mod) {
        setStatus("Error: Automation module not ready", "error");
        return;
      }
      const applyAll = toggleWorkingFileAll ? toggleWorkingFileAll.checked : false;
      const allStr = applyAll ? " (ALL docs)" : "";
      try {
        setStatus("Saving Working File (PSD)" + allStr + "...", "working");
        const result = await mod.saveWorkingFile(applyAll);
        setStatus("Working File saved: " + result, "online");
      } catch (err) {
        setStatus("Error: " + err.message, "error");
      }
    });
  }

  // 6. HISTORY Handlers (Undo / Redo)
  const btnUndo = document.getElementById("btnUndo");
  const btnRedo = document.getElementById("btnRedo");

  if (btnUndo) {
    btnUndo.addEventListener("click", async () => {
      try {
        setStatus("Undoing last action...", "working");
        await window.PSAutomation.undo();
        setStatus("Undo completed", "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    });
  }

  if (btnRedo) {
    btnRedo.addEventListener("click", async () => {
      try {
        setStatus("Redoing last action...", "working");
        await window.PSAutomation.redo();
        setStatus("Redo completed", "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    });
  }

  // 7. AUTO-UPDATE CHECKER
  const CURRENT_VERSION = "26.0.0.3";
  const GITHUB_VERSION_URL = "https://raw.githubusercontent.com/jasim-oss/E-Commerce_Ready_Image_Edit/main/version.json";
  const DEFAULT_DOWNLOAD_URL = "https://github.com/jasim-oss/E-Commerce_Ready_Image_Edit/releases/latest";

  const panelVersion = document.getElementById("panelVersion");
  const btnCheckUpdate = document.getElementById("btnCheckUpdate");
  const updateSpinIcon = document.getElementById("updateSpinIcon");
  const lblUpdateText = document.getElementById("lblUpdateText");
  const updateBanner = document.getElementById("updateBanner");
  const updateBannerText = document.getElementById("updateBannerText");
  const btnUpdateNow = document.getElementById("btnUpdateNow");

  if (panelVersion) {
    panelVersion.textContent = `Version- ${CURRENT_VERSION}`;
  }

  function compareVersions(v1, v2) {
    const p1 = (v1 || "").replace(/^v/, "").split(".").map(Number);
    const p2 = (v2 || "").replace(/^v/, "").split(".").map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  let latestDownloadUrl = DEFAULT_DOWNLOAD_URL;
  let latestRemoteVersion = null;

  async function checkRemoteUpdate(isManual = false) {
    if (updateSpinIcon) updateSpinIcon.classList.add("spinning");
    if (lblUpdateText && isManual) lblUpdateText.textContent = "Checking...";

    try {
      const response = await fetch(`${GITHUB_VERSION_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const remoteVer = data.version || "1.0.0";
      latestRemoteVersion = remoteVer;
      latestDownloadUrl = data.downloadUrl || DEFAULT_DOWNLOAD_URL;

      if (compareVersions(remoteVer, CURRENT_VERSION) > 0) {
        if (updateBanner) {
          if (updateBannerText) updateBannerText.textContent = `Update v${remoteVer} available!`;
          updateBanner.style.display = "flex";
        }
        if (lblUpdateText) lblUpdateText.textContent = `v${remoteVer} available!`;
        if (btnCheckUpdate) btnCheckUpdate.style.color = "#34c759";
      } else {
        if (isManual) {
          if (lblUpdateText) lblUpdateText.textContent = "Up to date \u2713";
          setTimeout(() => {
            if (lblUpdateText) lblUpdateText.textContent = "Update";
          }, 3000);
        }
      }
    } catch (err) {
      console.warn("Auto-update check failed:", err.message);
      if (isManual) {
        if (lblUpdateText) lblUpdateText.textContent = "Offline";
        setTimeout(() => {
          if (lblUpdateText) lblUpdateText.textContent = "Update";
        }, 3000);
      }
    } finally {
      if (updateSpinIcon) updateSpinIcon.classList.remove("spinning");
    }
  }

  // Seamless In-Place Auto-Update Function
  async function performAutoUpdate() {
    const targetVer = latestRemoteVersion || "latest";
    if (btnUpdateNow) {
      btnUpdateNow.textContent = "Updating...";
      btnUpdateNow.style.pointerEvents = "none";
      btnUpdateNow.style.opacity = "0.7";
    }
    if (updateBannerText) {
      updateBannerText.textContent = `Downloading v${targetVer}...`;
    }
    setStatus(`Downloading update v${targetVer} from GitHub...`, "working");

    const BASE_RAW_URL = "https://raw.githubusercontent.com/jasim-oss/E-Commerce_Ready_Image_Edit/main/uxp_plugin/";
    const fileList = [
      "index.html",
      "styles.css",
      "main.js",
      "manifest.json",
      "modules/ps_automation.js",
      "modules/adjustment.js",
      "modules/ai_bridge.js",
      "modules/amazon.js"
    ];

    try {
      const uxp = window.require ? window.require("uxp") : null;
      let nodeFs = null;
      let nodePath = null;
      try {
        nodeFs = window.require("fs");
        nodePath = window.require("path");
      } catch (e) {}

      const lfs = uxp && uxp.storage ? uxp.storage.localFileSystem : null;
      const pluginFolder = lfs ? await lfs.getPluginFolder() : null;
      const nativeDir = pluginFolder ? pluginFolder.nativePath : null;

      // Mode 1: Node.js fs if available
      if (nodeFs && nativeDir && nodePath) {
        setStatus(`Installing update v${targetVer}...`, "working");
        for (const rel of fileList) {
          const res = await fetch(`${BASE_RAW_URL}${rel}?t=${Date.now()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${rel}`);
          const content = await res.text();
          const targetPath = nodePath.join(nativeDir, rel);
          const dir = nodePath.dirname(targetPath);
          if (!nodeFs.existsSync(dir)) {
            nodeFs.mkdirSync(dir, { recursive: true });
          }
          nodeFs.writeFileSync(targetPath, content, "utf8");
        }
      } else if (lfs && pluginFolder) {
        // Mode 2: UXP storage localFileSystem
        let targetRoot = pluginFolder;
        if (nativeDir) {
          try {
            const url = "file:///" + nativeDir.replace(/\\/g, "/");
            const resolved = await lfs.getEntryWithUrl(url);
            if (resolved) targetRoot = resolved;
          } catch (e) {}
        }

        async function ensureFolder(parent, name) {
          try {
            const existing = await parent.getEntry(name);
            if (existing && existing.isFolder) return existing;
          } catch (e) {}
          return await parent.createFolder(name);
        }

        for (const rel of fileList) {
          const res = await fetch(`${BASE_RAW_URL}${rel}?t=${Date.now()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${rel}`);
          const content = await res.text();

          const parts = rel.split("/");
          let cur = targetRoot;
          for (let i = 0; i < parts.length - 1; i++) {
            cur = await ensureFolder(cur, parts[i]);
          }
          const fname = parts[parts.length - 1];
          const fileEntry = await cur.createFile(fname, { overwrite: true });
          await fileEntry.write(content, { format: uxp.storage.formats.utf8 });
        }
      } else {
        throw new Error("Local file system is unavailable.");
      }

      setStatus(`Updated to v${targetVer}! Refreshing...`, "online");
      if (updateBannerText) {
        updateBannerText.textContent = `Updated! Reloading...`;
      }
      setTimeout(() => {
        window.location.reload();
      }, 700);

    } catch (err) {
      console.error("Direct auto-update failed:", err);
      setStatus(`Direct update error: ${err.message}. Opening download...`, "error");
      if (btnUpdateNow) {
        btnUpdateNow.textContent = "Download ZIP";
        btnUpdateNow.style.pointerEvents = "auto";
        btnUpdateNow.style.opacity = "1";
      }
      try {
        const uxp = window.require ? window.require("uxp") : null;
        if (uxp && uxp.shell && typeof uxp.shell.openExternal === "function") {
          await uxp.shell.openExternal(latestDownloadUrl);
        } else {
          window.open(latestDownloadUrl, "_blank");
        }
      } catch (e2) {}
    }
  }

  if (btnCheckUpdate) {
    btnCheckUpdate.addEventListener("click", () => {
      if (latestRemoteVersion && compareVersions(latestRemoteVersion, CURRENT_VERSION) > 0) {
        performAutoUpdate();
      } else {
        checkRemoteUpdate(true);
      }
    });
  }

  if (btnUpdateNow) {
    btnUpdateNow.addEventListener("click", performAutoUpdate);
  }

  // Auto-check once silently 3 seconds after loading
  setTimeout(() => checkRemoteUpdate(false), 3000);
});


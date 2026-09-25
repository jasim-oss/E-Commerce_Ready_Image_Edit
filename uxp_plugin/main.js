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

  // 1. RESIZE Handlers (Marketplace, Custom & Edit Box)
  const marketplaceSelect = document.getElementById("selectMarketplaceResize");
  const resizeControlsGroup = document.getElementById("resizeControlsGroup");
  const toggleResizeAll = document.getElementById("toggleResizeAll");
  const inputW = document.getElementById("inputResizeW");
  const inputH = document.getElementById("inputResizeH");
  const inputDpi = document.getElementById("inputResizeDpi");
  const btnToggleEdit = document.getElementById("btnToggleEdit");
  const btnApplyResize = document.getElementById("btnApplyResize");
  const lblApplyResize = document.getElementById("lblApplyResize");

  let isEditMode = false;

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
    const w = selectedOption.getAttribute("data-w") || "2000";
    const h = selectedOption.getAttribute("data-h") || "2000";
    const dpi = selectedOption.getAttribute("data-dpi") || "72";

    if (inputW) inputW.value = w;
    if (inputH) inputH.value = h;
    if (inputDpi) inputDpi.value = dpi;
    if (lblApplyResize) lblApplyResize.textContent = `Apply Resize (${w}×${h})`;

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

  [inputW, inputH].forEach(input => {
    if (input) {
      input.addEventListener("input", () => {
        const w = (inputW && inputW.value) || 0;
        const h = (inputH && inputH.value) || 0;
        if (lblApplyResize) lblApplyResize.textContent = `Apply Resize (${w}x${h})`;
      });
    }
  });

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

      try {
        setStatus(`Resizing to ${w}×${h} px @ ${dpi} DPI ${applyAll ? "(ALL docs)" : ""}...`, "working");
        await window.PSAutomation.resizeForMarketplace(w, h, dpi, applyAll);
        setStatus(`Resized to ${w}×${h} px (${dpi} DPI) ${applyAll ? "(ALL docs)" : ""}`, "online");
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

  // 1) White BG
    if (btnBgWhite) {
      btnBgWhite.addEventListener("click", async () => {
        if (customColorBox) customColorBox.style.display = "none";
        if (btnBgCustom) btnBgCustom.classList.remove("active");
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
        const isOpen = customColorBox.style.display !== "none";
        if (isOpen) {
          customColorBox.style.display = "none";
          btnBgCustom.classList.remove("active");
        } else {
          customColorBox.style.display = "block";
          btnBgCustom.classList.add("active");
          if (hexBgCustom) hexBgCustom.focus();
        }
      });
    }

    // 3) Upload Background Image
    if (btnBgUpload) {
      btnBgUpload.addEventListener("click", async () => {
        if (customColorBox) customColorBox.style.display = "none";
        if (btnBgCustom) btnBgCustom.classList.remove("active");
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

    // Auto uppercase hex input & enter key support
    if (hexBgCustom) {
      hexBgCustom.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val && !val.startsWith('#')) val = '#' + val;
        hexBgCustom.value = val.toUpperCase();
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
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          setStatus("Please enter a valid 6-char hex color (e.g. #F4F4F4)", "error");
          return;
        }
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
      try {
        setStatus(`Applying Custom SCSM (${val}% Margin)...`, 'working');
        await window.PSAutomation.scsmByMargin(val);
        setStatus(`Custom SCSM (${val}% Margin) applied`, 'online');
      } catch (err) {
        setStatus(`Error: ${err.message}`, 'error');
      }
    }

    // 1) Product (10% Margin)
    if (btnScsmProduct) {
      btnScsmProduct.addEventListener('click', async () => {
        if (customScsmBox) customScsmBox.style.display = 'none';
        setActiveScsmBtn(btnScsmProduct);
        try {
          setStatus('Applying Product SCSM (10% Margin)...', 'working');
          await window.PSAutomation.scsmByMargin(10);
          setStatus('Product SCSM (10% Margin) applied', 'online');
        } catch (err) {
          setStatus(`Error: ${err.message}`, 'error');
        }
      });
    }

    // 2) Model (5% Margin)
    if (btnScsmModel) {
      btnScsmModel.addEventListener('click', async () => {
        if (customScsmBox) customScsmBox.style.display = 'none';
        setActiveScsmBtn(btnScsmModel);
        try {
          setStatus('Applying Model SCSM (5% Margin)...', 'working');
          await window.PSAutomation.scsmByMargin(5);
          setStatus('Model SCSM (5% Margin) applied', 'online');
        } catch (err) {
          setStatus(`Error: ${err.message}`, 'error');
        }
      });
    }

    // 3) Custom Button: Expands drawer AND immediately executes custom margin
    if (btnScsmCustom) {
      btnScsmCustom.addEventListener('click', async () => {
        setActiveScsmBtn(btnScsmCustom);
        if (customScsmBox) {
          customScsmBox.style.display = 'block';
        }
        if (inputScsmCustomPercent) {
          inputScsmCustomPercent.focus();
          if (typeof inputScsmCustomPercent.select === 'function') {
            inputScsmCustomPercent.select();
          }
        }
        await applyCustomMargin();
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
      const isOpen = wrinkleOptionsBox.style.display !== "none";
      if (isOpen) {
        wrinkleOptionsBox.style.display = "none";
        btnWrinkleClothing.classList.remove("active");
        if (wrinkleChevron) wrinkleChevron.classList.remove("up");
      } else {
        wrinkleOptionsBox.style.display = "block";
        btnWrinkleClothing.classList.add("active");
        if (wrinkleChevron) wrinkleChevron.classList.add("up");
      }
    });
  }

  async function executeWrinkleMethod() {
    const method = selectWrinkleMethod ? selectWrinkleMethod.value : "";
    if (!method) {
      setStatus("Please select a retouch option from dropdown", "error");
      return;
    }

    const mod = window.PSAutomation || window.AdjustmentModule;
    if (!mod) {
      setStatus("Error: Automation module not ready", "error");
      return;
    }

    if (method === "fs") {
      try {
        setStatus("Creating Frequency Separation group...", "working");
        await mod.applyFrequencySeparation();
        setStatus("Frequency Separation ready (Low/High layers)", "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    } else if (method === "dnb") {
      try {
        setStatus("Creating Dodge and Burn Curves layers...", "working");
        await mod.applyDodgeAndBurn();
        setStatus("Dodge & Burn ready (Curves with black masks)", "online");
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    } else if (method === "evoto") {
      try {
        setStatus("Preparing JPG for Evoto AI...", "working");
        const savedName = await mod.saveForEvoto();
        if (savedName) {
          setStatus(`Saved for Evoto: ${savedName}`, "online");
        } else {
          setStatus("Save for Evoto canceled", "online");
        }
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      }
    }
  }

  if (btnApplyWrinkle) {
    btnApplyWrinkle.addEventListener("click", executeWrinkleMethod);
  }

  if (selectWrinkleMethod) {
    selectWrinkleMethod.addEventListener("change", executeWrinkleMethod);
  }

  document.getElementById("btnShadow").addEventListener("click", async () => {
    try {
      setStatus("Adding contact shadow...", "working");
      const mod = window.PSAutomation || window.AdjustmentModule;
      await mod.applyContactShadow();
      setStatus("Contact shadow applied", "online");
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
    }
  });

  document.getElementById("btnColorCorrection").addEventListener("click", async () => {
    try {
      setStatus("Correcting colors & sRGB...", "working");
      const mod = window.PSAutomation || window.AdjustmentModule;
      await mod.applyColorCorrection();
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
});

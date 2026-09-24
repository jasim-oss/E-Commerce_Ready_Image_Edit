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
    const selectedOption = marketplaceSelect.options[marketplaceSelect.selectedIndex];
    
    // Hide controls if on placeholder
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
    if (lblApplyResize) lblApplyResize.textContent = `Apply Resize (${w}x${h})`;

    if (selectedOption.value === "custom") {
      setEditMode(true);
      if (inputW) inputW.focus();
    } else {
      setEditMode(false);
    }
  }

  if (marketplaceSelect) {
    marketplaceSelect.addEventListener("change", updateDimensionDisplay);
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
      const w = parseInt(inputW.value, 10);
      const h = parseInt(inputH.value, 10);
      const dpi = parseInt(inputDpi.value, 10) || 72;

      if (!w || !h || w <= 0 || h <= 0) {
        setStatus("Please enter valid width and height.", "error");
        return;
      }

      try {
        setStatus(`Resizing to ${w}x${h} px @ ${dpi} DPI...`, "working");
        await window.PSAutomation.resizeForMarketplace(w, h, dpi, false);
        setStatus(`Resized to ${w}x${h} px (${dpi} DPI)`, "online");
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
      try {
        setStatus("Adding pure white #FFF BG...", "working");
        await window.PSAutomation.addSolidColorBg(255, 255, 255);
        setStatus("Pure white BG added", "online");
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
      try {
        setStatus("Opening file browser for background image...", "working");
        const res = await window.PSAutomation.placeBackgroundImage();
        if (res !== false) {
          setStatus("Background image placed successfully", "online");
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
      try {
        setStatus(`Adding Custom BG (${hex})...`, "working");
        await window.PSAutomation.addSolidColorBg(r, g, b);
        setStatus(`Custom BG ${hex} added`, "online");
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

    // 1) Product (10% Margin)
    if (btnScsmProduct) {
      btnScsmProduct.addEventListener('click', async () => {
        if (customScsmBox) customScsmBox.style.display = 'none';
        if (btnScsmCustom) btnScsmCustom.classList.remove('active');
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
        if (btnScsmCustom) btnScsmCustom.classList.remove('active');
        try {
          setStatus('Applying Model SCSM (5% Margin)...', 'working');
          await window.PSAutomation.scsmByMargin(5);
          setStatus('Model SCSM (5% Margin) applied', 'online');
        } catch (err) {
          setStatus(`Error: ${err.message}`, 'error');
        }
      });
    }

    // 3) Custom Drawer Toggle
    if (btnScsmCustom) {
      btnScsmCustom.addEventListener('click', () => {
        if (!customScsmBox) return;
        const isOpen = customScsmBox.style.display !== 'none';
        if (isOpen) {
          customScsmBox.style.display = 'none';
          btnScsmCustom.classList.remove('active');
        } else {
          customScsmBox.style.display = 'block';
          btnScsmCustom.classList.add('active');
          if (inputScsmCustomPercent) inputScsmCustomPercent.focus();
        }
      });
    }

    // Apply Custom SCSM Margin
    if (btnApplyCustomScsm) {
      btnApplyCustomScsm.addEventListener('click', async () => {
        const val = parseInt((inputScsmCustomPercent && inputScsmCustomPercent.value) || '10', 10);
        if (isNaN(val) || val < 1 || val > 45) {
          setStatus('Please enter a margin between 1% and 45%', 'error');
          return;
        }
        try {
          setStatus(`Applying Custom SCSM (${val}% Margin)...`, 'working');
          await window.PSAutomation.scsmByMargin(val);
          setStatus(`Custom SCSM (${val}% Margin) applied`, 'online');
        } catch (err) {
          setStatus(`Error: ${err.message}`, 'error');
        }
      });
    }

    if (inputScsmCustomPercent) {
      inputScsmCustomPercent.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && btnApplyCustomScsm) {
          btnApplyCustomScsm.click();
        }
      });
    }

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

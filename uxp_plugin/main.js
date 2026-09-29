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

  function updateApplyResizeLabel() {
    if (!lblApplyResize) return;
    const w = (inputW && inputW.value) || "2000";
    const h = (inputH && inputH.value) || "2000";
    const isSmart = toggleSmartAnchor && toggleSmartAnchor.checked;
    lblApplyResize.textContent = isSmart ? `Apply Smart Resize (${w}x${h})` : `Apply Resize (${w}x${h})`;
  }

  [inputW, inputH].forEach(input => {
    if (input) {
      input.addEventListener("input", updateApplyResizeLabel);
    }
  });

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
    if (btnScsmProduct) {
      btnScsmProduct.addEventListener('click', async () => {
        if (customScsmBox) customScsmBox.style.display = 'none';
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
        setStatus(`Creating Dodge and Burn Curves layers${allStr}...`, "working");
        await mod.applyDodgeAndBurn(applyAll);
        setStatus(`Dodge & Burn ready (Curves with black masks)${allStr}`, "online");
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

  if (btnShadow) {
    btnShadow.addEventListener("click", () => {
      if (!shadowOptionsBox) return;
      const isOpen = shadowOptionsBox.style.display !== "none";
      if (isOpen) {
        shadowOptionsBox.style.display = "none";
        btnShadow.classList.remove("active");
        if (shadowChevron) shadowChevron.classList.remove("up");
      } else {
        shadowOptionsBox.style.display = "block";
        btnShadow.classList.add("active");
        if (shadowChevron) shadowChevron.classList.add("up");
      }
    });
  }

  async function executeShadowMethod() {
    const method = selectShadowMethod ? selectShadowMethod.value : "drop";
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
  // Shadow method now only executes on btnApplyShadow click


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
      const isOpen = deliveryOptionsBox.style.display !== "none";
      if (isOpen) {
        deliveryOptionsBox.style.display = "none";
        btnReadyDelivery.classList.remove("active");
        if (deliveryChevron) deliveryChevron.classList.remove("up");
      } else {
        deliveryOptionsBox.style.display = "block";
        btnReadyDelivery.classList.add("active");
        if (deliveryChevron) deliveryChevron.classList.add("up");
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
  if (btnWorkingFile) {
    btnWorkingFile.addEventListener("click", async () => {
      const mod = window.PSAutomation || window.AdjustmentModule;
      if (!mod) {
        setStatus("Error: Automation module not ready", "error");
        return;
      }
      try {
        setStatus("Saving Working File (PSD)...", "working");
        const result = await mod.saveWorkingFile();
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
});

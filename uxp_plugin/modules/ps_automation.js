/**
 * Core Photoshop Automation Engine via UXP batchPlay & DOM
 */
const { app, core, action } = require("photoshop");
const batchPlay = action.batchPlay;

const PSAutomation = {
  /**
   * Helper to iterate across either active document or ALL open documents
   */
  async executeOnTargetDocs(applyToAll, taskFn, commandName = "Batch Task") {
    const docs = applyToAll ? app.documents : (app.activeDocument ? [app.activeDocument] : []);
    if (docs.length === 0) {
      throw new Error("No open document found in Photoshop.");
    }

    return await core.executeAsModal(async () => {
      for (let i = 0; i < docs.length; i++) {
        app.activeDocument = docs[i];
        await taskFn(docs[i], i + 1, docs.length);
      }
    }, { commandName });
  },

  /**
   * 1. RESIZE: Resize for specific E-Commerce Marketplace
   * @param {number} width - Target width in pixels
   * @param {number} height - Target height in pixels
   * @param {number} dpi - Target resolution in DPI
   * @param {boolean} applyToAll - Apply to all open documents
   */
  async resizeForMarketplace(width, height, dpi = 72, applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      const docW = doc.width;
      const docH = doc.height;
      const scale = Math.min(width / docW, height / docH);
      const fitW = Math.max(1, Math.round(docW * scale));
      const fitH = Math.max(1, Math.round(docH * scale));

      try {
        await batchPlay([
          {
            _obj: "imageSize",
            width: { _unit: "pixelsUnit", _value: fitW },
            height: { _unit: "pixelsUnit", _value: fitH },
            resolution: { _unit: "densityUnit", _value: dpi },
            scaleStyles: true,
            constrainProportions: true,
            interfaceIconFrameDimmed: {
              _enum: "interpolationType",
              _value: "bicubicAutomatic"
            },
            _options: { dialogOptions: "dontDisplay" }
          },
          {
            _obj: "canvasSize",
            width: { _unit: "pixelsUnit", _value: width },
            height: { _unit: "pixelsUnit", _value: height },
            horizontal: { _enum: "horizontalLocation", _value: "center" },
            vertical: { _enum: "verticalLocation", _value: "center" },
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });
      } catch (bpErr) {
        if (doc.resizeImage) {
          try {
            await doc.resizeImage(fitW, fitH, dpi);
          } catch (e1) {}
        }
        if (doc.resizeCanvas) {
          await doc.resizeCanvas(width, height, app.Constants.AnchorPosition.MIDDLECENTER);
        }
      }
    }, `Resize to ${width}x${height} @ ${dpi}DPI`);
  },

  /**
   * 1. RESIZE: Fixed Size 2000x2000 px standard
   */
  async fixedSize(targetDim = 2000) {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      await doc.resizeCanvas(targetDim, targetDim, app.Constants.AnchorPosition.MIDDLECENTER);
    }, { commandName: "Resize: Fixed Size 2000px" });
  },

  /**
   * 1. RESIZE: Upscale / Super Resolution (Bicubic Automatic / Preserve Details)
   */
  async upscaleImage(scaleMultiplier = 1.5) {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      const newW = Math.round(doc.width * scaleMultiplier);
      const newH = Math.round(doc.height * scaleMultiplier);
      await doc.resizeImage(newW, newH, doc.resolution, app.Constants.InterpolationMethod.PRESERVEDETAILS);
    }, { commandName: "Resize: Upscale Image" });
  },

  /**
   * 1. RESIZE: Set Aspect Ratio (1:1 Square)
   */
  async setSquareAspectRatio() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      const maxDim = Math.max(doc.width, doc.height);
      await doc.resizeCanvas(maxDim, maxDim, app.Constants.AnchorPosition.MIDDLECENTER);
    }, { commandName: "Resize: 1:1 Aspect Ratio" });
  },

  /**
     * 2. BG REMOVE: AI Select Subject + Mask on Layer 1 from main layer
     * If document has a single layer (e.g. Background), duplicate to Layer 1,
     * lock and hide original main layer below, and mask Layer 1.
     */
    async bgRemove(applyToAll = false) {
      return await this.executeOnTargetDocs(applyToAll, async (doc) => {
        const layers = doc.layers || [];
        const layerCount = layers.length;
        const activeLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : (layers[0] || null);

        // When document has only 1 layer (like default Background), or active layer is Background
        if (layerCount === 1 || (activeLayer && activeLayer.isBackgroundLayer)) {
          // 1. If single layer is locked Background, convert to normal layer so it can be unhidden/hidden cleanly
          try {
            await batchPlay([
              {
                _obj: "set",
                _target: [{ _ref: "layer", _property: "background" }],
                to: {
                  _obj: "layer",
                  name: "Background"
                },
                _options: { dialogOptions: "dontDisplay" }
              }
            ], { synchronousExecution: true });
          } catch (e) {
            // Already unlocked or regular layer, continue
          }

          // 2. Duplicate main layer to create "Layer 1"
          await batchPlay([
            {
              _obj: "duplicate",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              name: "Layer 1",
              _options: { dialogOptions: "dontDisplay" }
            }
          ], { synchronousExecution: true });

          // 3. Explicitly select bottom layer, hide it, and LOCK it
          try {
            await batchPlay([
              // Select the bottom layer
              {
                _obj: "select",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "back" }],
                makeVisible: false,
                _options: { dialogOptions: "dontDisplay" }
              },
              // Hide bottom layer
              {
                _obj: "hide",
                null: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                _options: { dialogOptions: "dontDisplay" }
              },
              // Apply Lock to bottom layer so it shows the padlock [🔒]
              {
                _obj: "applyLocking",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                allLocked: true,
                _options: { dialogOptions: "dontDisplay" }
              }
            ], { synchronousExecution: true });
          } catch (e) {
            // Fallback via DOM if available
            try {
              if (doc.layers && doc.layers.length > 1) {
                const bLayer = doc.layers[doc.layers.length - 1];
                bLayer.visible = false;
                bLayer.allLocked = true;
              }
            } catch (err) {}
          }

          // 4. Explicitly select "Layer 1" and ensure it is UNLOCKED
          try {
            await batchPlay([
              {
                _obj: "select",
                _target: [{ _ref: "layer", _name: "Layer 1" }],
                makeVisible: true,
                _options: { dialogOptions: "dontDisplay" }
              },
              {
                _obj: "applyLocking",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                allLocked: false,
                _options: { dialogOptions: "dontDisplay" }
              }
            ], { synchronousExecution: true });
          } catch (e) {
            try {
              const l1 = doc.layers ? doc.layers.find(l => l.name === "Layer 1") : null;
              if (l1) {
                doc.activeLayers = [l1];
                l1.allLocked = false;
              }
            } catch (err) {}
          }
        }

        // 5. Run autoCutout (Photoshop AI Select Subject) on Layer 1
        await batchPlay([
          {
            _obj: "autoCutout",
            sampleAllLayers: false,
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });

        // 6. Create Layer Mask from current selection onto Layer 1
        try {
          await batchPlay([
            {
              _obj: "make",
              new: { _class: "channel" },
              at: { _ref: "channel", _enum: "channel", _value: "mask" },
              using: { _enum: "userMaskOptions", _value: "revealSelection" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ], { synchronousExecution: true });
        } catch (maskErr) {
          // Fallback: If no selection was detected, create revealAll mask
          await batchPlay([
            {
              _obj: "make",
              new: { _class: "channel" },
              at: { _ref: "channel", _enum: "channel", _value: "mask" },
              using: { _enum: "userMaskOptions", _value: "revealAll" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ], { synchronousExecution: true });
        }
      }, "BG Remove: AI Cutout (Layer 1 Mask)");
    },

  /**
   * 2. BG REMOVE: Toggle / Restore Original BG
   */
  async toggleOriginalBg(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      // Toggle or disable mask on active layer
      await batchPlay([
        {
          _obj: "set",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: {
            _obj: "layer",
            userMaskEnabled: false
          },
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });
    }, "Toggle Original BG");
  },

  /**
   * 2. BG: Add Solid Color Layer (Pure White or Custom HEX)
   */
  async addSolidColorBg(r = 255, g = 255, b = 255) {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      await batchPlay([
        {
          _obj: "make",
          _target: [{ _ref: "contentLayer" }],
          using: {
            _obj: "contentLayer",
            type: {
              _obj: "solidColorLayer",
              color: { _obj: "RGBColor", red: r, grain: g, blue: b }
            }
          },
          _options: { dialogOptions: "dontDisplay" }
        },
        {
          _obj: "move",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _ref: "layer", _enum: "ordinal", _value: "back" },
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });
    }, { commandName: "Add Solid BG Color" });
  },

  /**
   * 2. BG: Import/Place Background Image from Disk behind subject
   */
  async placeBackgroundImage() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    const uxp = require("uxp");
    const fs = uxp.storage.localFileSystem;

    const file = await fs.getFileForOpening({
      types: ["jpg", "jpeg", "png", "tif", "tiff", "psd"],
      allowMultiple: false
    });

    if (!file) return false;

    return await core.executeAsModal(async () => {
      const token = fs.createSessionToken(file);
      await batchPlay([
        {
          _obj: "placeEvent",
          target: { _path: token, _kind: "local" },
          _options: { dialogOptions: "dontDisplay" }
        },
        {
          _obj: "move",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _ref: "layer", _enum: "ordinal", _value: "back" },
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });
    }, { commandName: "Place Background Image" });
  },
  /**
   * 2. BG REMOVE: Add Pure White (#FFFFFF) Layer
   */
  async addPureWhiteBg() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      await batchPlay([
        {
          _obj: "make",
          _target: [{ _ref: "contentLayer" }],
          using: {
            _obj: "contentLayer",
            type: {
              _obj: "solidColorLayer",
              color: { _obj: "RGBColor", red: 255, grain: 255, blue: 255 }
            }
          },
          _options: { dialogOptions: "dontDisplay" }
        },
        {
          _obj: "move",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _ref: "layer", _enum: "ordinal", _value: "back" },
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });
    }, { commandName: "Add Pure White BG" });
  },

  /**
   * 3. SCSM: Smart Centering & Sizing by Margin %
   * @param {number} marginPercent - Margin from canvas edge (e.g. 10 for 10% edge margin, 5 for 5%)
   */
  async scsmByMargin(marginPercent = 10) {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document in Photoshop.");

    return await core.executeAsModal(async () => {
      let layer = doc.activeLayers[0];
      if (!layer) {
        const nonBg = doc.layers.filter(l => !l.isBackgroundLayer);
        layer = nonBg.length > 0 ? nonBg[0] : doc.layers[0];
      }
      if (!layer) throw new Error("No subject layer found.");

      if (layer.isBackgroundLayer) {
        layer.name = "Subject";
      }

      const b = layer.bounds;
      const w = b.right - b.left;
      const h = b.bottom - b.top;

      if (w <= 0 || h <= 0) throw new Error("Selected layer has no visible content.");

      const canvasW = doc.width;
      const canvasH = doc.height;

      const m = Math.max(1, Math.min(marginPercent, 45));
      const targetW = canvasW * (1 - 2 * (m / 100));
      const targetH = canvasH * (1 - 2 * (m / 100));

      const scalePct = Math.min(targetW / w, targetH / h) * 100;
      await layer.scale(scalePct, scalePct, app.Constants.AnchorPosition.MIDDLECENTER);

      // Re-fetch bounds after scale and center precisely
      const nb = layer.bounds;
      const curCenterX = (nb.left + nb.right) / 2;
      const curCenterY = (nb.top + nb.bottom) / 2;
      const dx = (canvasW / 2) - curCenterX;
      const dy = (canvasH / 2) - curCenterY;

      await layer.translate(dx, dy);
    }, { commandName: `SCSM: ${marginPercent}% Margin Fit` });
  },

  async scsmFitAndCenter(fillRatio = 0.85) {
    const margin = Math.round(((1 - fillRatio) / 2) * 100);
    return await this.scsmByMargin(margin > 0 ? margin : 10);
  },

  /**
   * 3. SCSM: Auto Center Only
   */
  async autoCenter() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      const layer = doc.activeLayers[0];
      if (!layer) throw new Error("No layer selected.");

      const b = layer.bounds;
      const curCenterX = (b.left + b.right) / 2;
      const curCenterY = (b.top + b.bottom) / 2;
      await layer.translate((doc.width / 2) - curCenterX, (doc.height / 2) - curCenterY);
    }, { commandName: "SCSM: Auto Center" });
  },

  /**
   * 5. EXPORT: Ready for Amazon / Delivery / PSD
   */
  async exportPreset(type = "amazon") {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      // Convert to sRGB first
      await batchPlay([
        {
          _obj: "convertToProfile",
          destination: "sRGB IEC61966-2.1",
          intent: { _enum: "intent", _value: "colorimetric" },
          blackPointCompensation: true,
          dither: true,
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });
    }, { commandName: `Export: ${type}` });
  }
,

  /**
   * History: Undo (Step Backward)
   */
  async undo() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document in Photoshop.");

    return await core.executeAsModal(async () => {
      try {
        await batchPlay([
          {
            _obj: "select",
            _target: [{ _ref: "historyState", _offset: -1 }],
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });
      } catch (e) {
        const states = doc.historyStates;
        const current = doc.activeHistoryState;
        const idx = states.indexOf(current);
        if (idx > 0) {
          doc.activeHistoryState = states[idx - 1];
        } else {
          throw new Error("No further history to undo.");
        }
      }
    }, { commandName: "Undo" });
  },

  /**
   * History: Redo (Step Forward)
   */
  async redo() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document in Photoshop.");

    return await core.executeAsModal(async () => {
      try {
        await batchPlay([
          {
            _obj: "select",
            _target: [{ _ref: "historyState", _offset: 1 }],
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });
      } catch (e) {
        const states = doc.historyStates;
        const current = doc.activeHistoryState;
        const idx = states.indexOf(current);
        if (idx >= 0 && idx < states.length - 1) {
          doc.activeHistoryState = states[idx + 1];
        } else {
          throw new Error("No further history to redo.");
        }
      }
    }, { commandName: "Redo" });
  }
};

window.PSAutomation = PSAutomation;

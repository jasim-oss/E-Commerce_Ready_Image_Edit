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
      // 1. Adjust resolution / DPI if needed
      if (doc.resolution !== dpi) {
        await batchPlay([
          {
            _obj: "imageSize",
            resolution: { _unit: "densityUnit", _value: dpi },
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });
      }

      // 2. Resize Canvas to exact target dimensions
      await doc.resizeCanvas(width, height, app.Constants.AnchorPosition.MIDDLECENTER);
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
   * 2. BG REMOVE: AI Select Subject + Mask
   */
  async bgRemove(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      // Run autoCutout (Photoshop Select Subject AI)
      await batchPlay([
        {
          _obj: "autoCutout",
          sampleAllLayers: false,
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });

      // Create Layer Mask from current selection
      await batchPlay([
        {
          _obj: "make",
          new: { _class: "channel" },
          at: { _ref: "channel", _enum: "channel", _value: "mask" },
          using: { _enum: "userMaskOptions", _value: "revealSelection" },
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });
    }, "BG Remove: AI Cutout");
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
   * 3. SCSM: Smart Centering & Sizing Mode (e.g. 85% Amazon rule)
   */
  async scsmFitAndCenter(fillRatio = 0.85, canvasSize = 2000) {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      // Ensure canvas is square 2000px
      await doc.resizeCanvas(canvasSize, canvasSize, app.Constants.AnchorPosition.MIDDLECENTER);

      const layer = doc.activeLayers[0];
      if (!layer) throw new Error("No subject layer selected.");

      const b = layer.bounds;
      const w = b.right - b.left;
      const h = b.bottom - b.top;

      if (w > 0 && h > 0) {
        const targetDim = canvasSize * fillRatio;
        const scalePct = Math.min(targetDim / w, targetDim / h) * 100;
        await layer.scale(scalePct, scalePct, app.Constants.AnchorPosition.MIDDLECENTER);

        // Center precisely
        const nb = layer.bounds;
        const curCenterX = (nb.left + nb.right) / 2;
        const curCenterY = (nb.top + nb.bottom) / 2;
        await layer.translate((canvasSize / 2) - curCenterX, (canvasSize / 2) - curCenterY);
      }
    }, { commandName: "SCSM: 85% Auto Fit" });
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
};

window.PSAutomation = PSAutomation;

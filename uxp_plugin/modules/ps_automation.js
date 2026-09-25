/**
 * Core Photoshop Automation Engine via UXP batchPlay & DOM
 */
const { app, core, action, constants } = require("photoshop");
const batchPlay = action.batchPlay;
const AnchorPosition = (constants && constants.AnchorPosition) || (app.Constants && app.Constants.AnchorPosition) || {};
const InterpolationMethod = (constants && constants.InterpolationMethod) || (app.Constants && app.Constants.InterpolationMethod) || {};

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
          await doc.resizeCanvas(width, height, AnchorPosition.MIDDLECENTER);
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
      await doc.resizeCanvas(targetDim, targetDim, AnchorPosition.MIDDLECENTER);
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
      await doc.resizeImage(newW, newH, doc.resolution, InterpolationMethod.PRESERVEDETAILS);
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
      await doc.resizeCanvas(maxDim, maxDim, AnchorPosition.MIDDLECENTER);
    }, { commandName: "Resize: 1:1 Aspect Ratio" });
  },

  /**
     * 2. BG REMOVE: AI Select Subject + Mask on Layer 1 from main layer
     * User workflow: First copy layer from background -> Remove background -> Mask Layer 1.
     * Leaves Background layer natively locked with [🔒].
     */
    async bgRemove(applyToAll = false) {
      return await this.executeOnTargetDocs(applyToAll, async (doc) => {
        const layers = doc.layers || [];
        const layerCount = layers.length;
        const activeLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : (layers[0] || null);

        // When document has only 1 layer (like default Background), or active layer is Background
        if (layerCount === 1 || (activeLayer && activeLayer.isBackgroundLayer)) {
          // 1. শুরুতে ব্যাকগ্রাউন্ড থেকে নতুন লেয়ার কপি করা (Duplicate main layer to Layer 1)
          // We do NOT convert or touch Background, so it remains 100% natively locked with [🔒]
          await batchPlay([
            {
              _obj: "duplicate",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              name: "Layer 1",
              _options: { dialogOptions: "dontDisplay" }
            }
          ], { synchronousExecution: true });

          // Ensure Layer 1 is selected and active
          try {
            const l1 = doc.layers ? doc.layers.find(l => l.name === "Layer 1") : null;
            if (l1) {
              doc.activeLayers = [l1];
            }
          } catch (e) {}

          // 2. তারপর ব্যাকগ্রাউন্ড রিমুভ (AI Select Subject on Layer 1)
          await batchPlay([
            {
              _obj: "autoCutout",
              sampleAllLayers: false,
              _options: { dialogOptions: "dontDisplay" }
            }
          ], { synchronousExecution: true });

          // 3. লেয়ার ১ মাস্ক করা (Apply Layer Mask onto Layer 1)
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

          return;
        }

        // Multiple layers case: Run Select Subject AI + mask on active layer
        await batchPlay([
          {
            _obj: "autoCutout",
            sampleAllLayers: false,
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });

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
     * Automatically placed/replaced directly above the bottom-most layer.
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {boolean} applyToAll - Apply to all open documents
     */
    async addSolidColorBg(r = 255, g = 255, b = 255, applyToAll = false) {
      return await this.executeOnTargetDocs(applyToAll, async (doc) => {
        // 1. Remove previous BG fill layer if any, so it cleanly replaces
        try {
          const existing = (doc.layers || []).find(l => l.name === "BG Color" || l.name === "BG Image" || l.name.startsWith("Color Fill"));
          if (existing && doc.layers.length > 1) {
            await existing.delete();
          }
        } catch (e) {}

        // 2. Select bottom-most layer so Photoshop naturally inserts the new layer directly above it
        await batchPlay([
          {
            _obj: "select",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "back" }],
            makeVisible: false,
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });

        // 3. Create Solid Color Layer directly above the bottom-most layer
        await batchPlay([
          {
            _obj: "make",
            _target: [{ _ref: "contentLayer" }],
            using: {
              _obj: "contentLayer",
              name: "BG Color",
              type: {
                _obj: "solidColorLayer",
                color: { _obj: "RGBColor", red: r, grain: g, blue: b }
              }
            },
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });

        // 4. Ensure Layer 1 / top subject layer remains selected
        try {
          const l1 = doc.layers ? (doc.layers.find(l => l.name === "Layer 1") || doc.layers[0]) : null;
          if (l1) {
            doc.activeLayers = [l1];
          }
        } catch (e) {}
      }, "Add Solid BG Color");
    },

    /**
     * 2. BG: Import/Place Background Image from Disk behind subject
     * Automatically placed/replaced directly above the bottom-most layer.
     * @param {boolean} applyToAll - Apply to all open documents
     */
    async placeBackgroundImage(applyToAll = false) {
      const uxp = require("uxp");
      const fs = uxp.storage.localFileSystem;

      const file = await fs.getFileForOpening({
        types: ["jpg", "jpeg", "png", "tif", "tiff", "psd"],
        allowMultiple: false
      });

      if (!file) return false;

      const token = fs.createSessionToken(file);

      return await this.executeOnTargetDocs(applyToAll, async (doc) => {
        // 1. Remove previous placed BG layer if any, so it cleanly replaces
        try {
          const existing = (doc.layers || []).find(l => l.name === "BG Image" || l.name === "BG Color" || l.name.startsWith("Color Fill"));
          if (existing && doc.layers.length > 1) {
            await existing.delete();
          }
        } catch (e) {}

        // 2. Select bottom-most layer so Photoshop places the new image directly above it
        await batchPlay([
          {
            _obj: "select",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "back" }],
            makeVisible: false,
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });

        // 3. Place background image directly above bottom-most layer
        await batchPlay([
          {
            _obj: "placeEvent",
            target: { _path: token, _kind: "local" },
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });

        // 4. Name the placed layer "BG Image" and Auto-Fit/Cover canvas
        try {
          const activeL = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
          if (activeL) {
            activeL.name = "BG Image";

            const b = activeL.bounds;
            const w = b.right - b.left;
            const h = b.bottom - b.top;
            const canvasW = doc.width;
            const canvasH = doc.height;

            if (w > 0 && h > 0 && canvasW > 0 && canvasH > 0) {
              // Proportional Cover scale so the background covers the canvas from edge to edge
              const scalePct = Math.max(canvasW / w, canvasH / h) * 100;
              const anchor = (app.Constants && app.Constants.AnchorPosition) ? AnchorPosition.MIDDLECENTER : undefined;
              if (anchor) {
                await activeL.scale(scalePct, scalePct, anchor);
              } else {
                await activeL.scale(scalePct, scalePct);
              }

              // Re-center on canvas
              const nb = activeL.bounds;
              const curCenterX = (nb.left + nb.right) / 2;
              const curCenterY = (nb.top + nb.bottom) / 2;
              const dx = (canvasW / 2) - curCenterX;
              const dy = (canvasH / 2) - curCenterY;
              await activeL.translate(dx, dy);
            }
          }
        } catch (e) {}

        // 5. Ensure Layer 1 / top subject layer remains selected
        try {
          const l1 = doc.layers ? (doc.layers.find(l => l.name === "Layer 1") || doc.layers[0]) : null;
          if (l1) {
            doc.activeLayers = [l1];
          }
        } catch (e) {}
      }, "Place Background Image");
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
   * 3. SCSM: Smart Centering & Sizing by Margin % + Display 4 Margin Guides
   * @param {number} marginPercent - Margin from canvas edge (e.g. 10 for 10% edge margin, 5 for 5%)
   * @param {boolean} applyToAll - Apply to all open documents
   */
  async scsmByMargin(marginPercent = 10, applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      // 1. Identify Subject Layer
      let layer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      if (!layer || layer.isBackgroundLayer || layer.name === "BG Color" || layer.name === "BG Image") {
        const nonBg = (doc.layers || []).filter(l => !l.isBackgroundLayer && l.name !== "BG Color" && l.name !== "BG Image");
        layer = nonBg.length > 0 ? nonBg[0] : (doc.layers ? doc.layers[0] : null);
      }
      if (!layer) throw new Error("No subject layer found to size.");

      // Ensure layer is selected
      doc.activeLayers = [layer];

      // Convert Background layer to regular layer if needed so it can be transformed
      if (layer.isBackgroundLayer) {
        try {
          layer.isBackgroundLayer = false;
        } catch (e) {
          try {
            await batchPlay([
              {
                _obj: "set",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                to: { _obj: "layer", name: "Layer 0" },
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          } catch (e2) {}
        }
      }
      if (layer.locked) {
        try { layer.locked = false; } catch (e) {}
      }

      // Check if layer has a user mask before attempting to select it
      let hasMask = false;
      try {
        const res = await batchPlay([
          {
            _obj: "get",
            _target: [
              { _ref: "property", _property: "hasUserMask" },
              { _ref: "layer", _id: layer.id }
            ],
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
        hasMask = Boolean(res && res[0] && res[0].hasUserMask);
      } catch (e) {
        hasMask = false;
      }

      // 2. Measure Exact Subject Bounds
      let b = null;
      if (hasMask) {
        try {
          await batchPlay([
            {
              _obj: "set",
              _target: [{ _ref: "channel", _property: "selection" }],
              to: { _ref: "channel", _enum: "channel", _value: "mask" },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });

          if (doc.selection && doc.selection.bounds) {
            const sb = doc.selection.bounds;
            if (sb.right > sb.left && sb.bottom > sb.top) {
              b = sb;
            }
          }
          await batchPlay([
            {
              _obj: "set",
              _target: [{ _ref: "channel", _property: "selection" }],
              to: { _enum: "ordinal", _value: "none" },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (e) {}
      }

      if (!b) {
        b = layer.bounds;
      }

      const w = b.right - b.left;
      const h = b.bottom - b.top;
      if (w <= 0 || h <= 0) throw new Error("Selected layer has no visible content.");

      const canvasW = doc.width;
      const canvasH = doc.height;

      // Detect Edge Contact (Threshold: within 4px or 0.5% of canvas dimension)
      const edgeThreshold = Math.max(4, Math.round(Math.min(canvasW, canvasH) * 0.005));
      const touchLeft = b.left <= edgeThreshold;
      const touchRight = b.right >= canvasW - edgeThreshold;
      const touchTop = b.top <= edgeThreshold;
      const touchBottom = b.bottom >= canvasH - edgeThreshold;

      const numMargin = typeof marginPercent === "number" ? marginPercent : parseInt(String(marginPercent).replace(/[^0-9]/g, "") || "10", 10);
      const m = Math.max(1, Math.min(isNaN(numMargin) ? 10 : numMargin, 45));

      // Calculate Target Dimensions based on which edges touch the canvas
      let targetW;
      if (touchLeft && touchRight) {
        targetW = canvasW; // both sides touch
      } else if (touchLeft || touchRight) {
        targetW = canvasW * (1 - (m / 100)); // only 1 side has gap
      } else {
        targetW = canvasW * (1 - 2 * (m / 100)); // both sides have gap
      }

      let targetH;
      if (touchTop && touchBottom) {
        targetH = canvasH; // top and bottom touch
      } else if (touchTop || touchBottom) {
        targetH = canvasH * (1 - (m / 100)); // only 1 end has gap (e.g. Model bottom cropped)
      } else {
        targetH = canvasH * (1 - 2 * (m / 100)); // both ends have gap
      }

      const scalePct = Math.min(targetW / w, targetH / h) * 100;

      // 3. Proportional Scale
      try {
        if (AnchorPosition && AnchorPosition.MIDDLECENTER) {
          await layer.scale(scalePct, scalePct, AnchorPosition.MIDDLECENTER);
        } else {
          await layer.scale(scalePct, scalePct);
        }
      } catch (scaleErr) {
        try {
          await batchPlay([
            {
              _obj: "transform",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              width: { _unit: "percentUnit", _value: scalePct },
              height: { _unit: "percentUnit", _value: scalePct },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (e) {}
      }

      // 4. Position Subject (Anchored to touching edges, centered along free axes)
      let newBounds = null;
      if (hasMask) {
        try {
          await batchPlay([
            {
              _obj: "set",
              _target: [{ _ref: "channel", _property: "selection" }],
              to: { _ref: "channel", _enum: "channel", _value: "mask" },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });

          if (doc.selection && doc.selection.bounds) {
            const sb = doc.selection.bounds;
            if (sb.right > sb.left && sb.bottom > sb.top) {
              newBounds = sb;
            }
          }
          await batchPlay([
            {
              _obj: "set",
              _target: [{ _ref: "channel", _property: "selection" }],
              to: { _enum: "ordinal", _value: "none" },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (e) {}
      }

      if (!newBounds) {
        newBounds = layer.bounds;
      }

      // Calculate horizontal delta (dx)
      let dx = 0;
      if (touchLeft && !touchRight) {
        // Pin to left edge (margin gap is on the right)
        dx = 0 - newBounds.left;
      } else if (touchRight && !touchLeft) {
        // Pin to right edge (margin gap is on the left)
        dx = canvasW - newBounds.right;
      } else {
        // Centered horizontally
        const curCenterX = (newBounds.left + newBounds.right) / 2;
        dx = (canvasW / 2) - curCenterX;
      }

      // Calculate vertical delta (dy)
      let dy = 0;
      if (touchTop && !touchBottom) {
        // Pin to top edge (margin gap is on the bottom)
        dy = 0 - newBounds.top;
      } else if (touchBottom && !touchTop) {
        // Pin to bottom edge (e.g. Model half-body cropped at bottom, margin gap is on top)
        dy = canvasH - newBounds.bottom;
      } else {
        // Centered vertically
        const curCenterY = (newBounds.top + newBounds.bottom) / 2;
        dy = (canvasH / 2) - curCenterY;
      }

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        try {
          await layer.translate(dx, dy);
        } catch (transErr) {
          try {
            await batchPlay([
              {
                _obj: "move",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                to: {
                  _obj: "offset",
                  horizontal: { _unit: "pixelsUnit", _value: dx },
                  vertical: { _unit: "pixelsUnit", _value: dy }
                },
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          } catch (e) {}
        }
      }

      // 5. Draw Margin Guides ONLY on sides that have gaps
      // Clear previous guides safely (only if document has guides)
      if (doc.guides && doc.guides.length > 0) {
        try {
          for (let i = doc.guides.length - 1; i >= 0; i--) {
            doc.guides[i].delete();
          }
        } catch (cgErr) {
          try {
            await batchPlay([
              {
                _obj: "clearGuides",
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          } catch (e) {}
        }
      }

      const hDir = (constants && constants.Direction && constants.Direction.HORIZONTAL) || "horizontal";
      const vDir = (constants && constants.Direction && constants.Direction.VERTICAL) || "vertical";

      const topGuide = Math.round(canvasH * (m / 100));
      const bottomGuide = Math.round(canvasH * (1 - m / 100));
      const leftGuide = Math.round(canvasW * (m / 100));
      const rightGuide = Math.round(canvasW * (1 - m / 100));

      const guidesToMake = [];
      // Top guide only if top has gap
      if (!touchTop) {
        guidesToMake.push({ dir: hDir, orientation: "horizontal", pos: topGuide });
      }
      // Bottom guide only if bottom has gap
      if (!touchBottom) {
        guidesToMake.push({ dir: hDir, orientation: "horizontal", pos: bottomGuide });
      }
      // Left guide only if left has gap
      if (!touchLeft) {
        guidesToMake.push({ dir: vDir, orientation: "vertical", pos: leftGuide });
      }
      // Right guide only if right has gap
      if (!touchRight) {
        guidesToMake.push({ dir: vDir, orientation: "vertical", pos: rightGuide });
      }

      // Add the guides via DOM or batchPlay
      let guidesCreated = false;
      try {
        if (doc.guides && typeof doc.guides.add === "function") {
          for (const g of guidesToMake) {
            await doc.guides.add(g.dir, g.pos);
          }
          guidesCreated = true;
        }
      } catch (domErr) {
        guidesCreated = false;
      }

      if (!guidesCreated && guidesToMake.length > 0) {
        try {
          const bpDescriptors = guidesToMake.map(g => ({
            _obj: "make",
            _target: [{ _ref: "guide" }],
            new: {
              _obj: "guide",
              orientation: { _enum: "orientation", _value: g.orientation },
              position: { _unit: "pixelsUnit", _value: g.pos }
            },
            dialogOptions: "dontDisplay"
          }));
          await batchPlay(bpDescriptors, { synchronousExecution: true });
        } catch (bpErr) {}
      }

      }, `SCSM: ${marginPercent}% Margin Fit`);
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
  },

  // ==========================================
  // EDITING ADJUSTMENTS (Frequency Separation, D&B, Evoto, Shadow, Color)
  // ==========================================

  /**
   * Frequency Separation (Wrinkle Retouch Action):
   * Built exactly from user's "Wrinkle On CLothing / Frequency Separation.atn":
   * 1. High layer (Linear Light, fabric texture)
   * 2. Blur with mask (Gaussian Blur 37.5px with Black Hide-All Mask)
   * 3. Blur layer (Gaussian Blur 8.0px)
   * 4. Enclosed in group: "Wrinkle Retouch"
   */
  async applyFrequencySeparation() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document in Photoshop.");

    // Check if the user already loaded the action set in Photoshop Actions Panel
    try {
      if (app.actionTree && app.actionTree.length > 0) {
        for (const set of app.actionTree) {
          const setName = (set.name || "").toLowerCase();
          if (setName.includes("wrinkle") || setName.includes("frequency")) {
            const act = set.actions && set.actions.find(a => (a.name || "").toLowerCase().includes("frequency"));
            if (act) {
              return await core.executeAsModal(async () => {
                await act.play();
              }, { commandName: "Frequency Separation (Action)" });
            }
          }
        }
      }
    } catch (atErr) {}

    // Otherwise, create the exact layer hierarchy natively
    return await core.executeAsModal(async () => {
      let currentLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      if (!currentLayer) throw new Error("No layer selected to retouch.");

      if (currentLayer.isBackgroundLayer) {
        currentLayer.isBackgroundLayer = false;
      }
      if (currentLayer.locked) {
        currentLayer.locked = false;
      }

      // Step 1: Duplicate base layer as "Blur"
      const blurLayer = await currentLayer.duplicate();
      blurLayer.name = "Blur";

      // Step 2: Duplicate as "High"
      const highLayer = await blurLayer.duplicate();
      highLayer.name = "High";

      // Step 3: Duplicate as "Blur with mask"
      const blurWithMask = await blurLayer.duplicate();
      blurWithMask.name = "Blur with mask";

      // 1. On "Blur" layer: apply Gaussian Blur with Radius 8.0 px
      doc.activeLayers = [blurLayer];
      try {
        await batchPlay([
          {
            _obj: "gaussianBlur",
            radius: { _unit: "pixelsUnit", _value: 8.0 },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (gb1) {}

      // 2. On "High" layer: apply High Pass at 8.0 px & set Linear Light
      doc.activeLayers = [highLayer];
      try {
        await batchPlay([
          {
            _obj: "highPass",
            radius: { _unit: "pixelsUnit", _value: 8.0 },
            dialogOptions: "dontDisplay"
          },
          {
            _obj: "set",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            to: {
              _obj: "layer",
              mode: { _enum: "blendMode", _value: "linearLight" }
            },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (hpErr) {}

      // 3. On "Blur with mask" layer: apply Gaussian Blur 37.5 px & Hide-All Mask
      doc.activeLayers = [blurWithMask];
      try {
        await batchPlay([
          {
            _obj: "gaussianBlur",
            radius: { _unit: "pixelsUnit", _value: 37.5 },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (gb2) {}

      try {
        await batchPlay([
          {
            _obj: "make",
            new: { _class: "channel" },
            at: { _ref: "channel", _enum: "channel", _value: "mask" },
            using: { _enum: "userMaskOptions", _value: "hideAll" },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (mskErr) {
        try {
          await batchPlay([
            {
              _obj: "invert",
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (invErr) {}
      }

      // 4. Create Layer Group "Wrinkle Retouch"
      try {
        if (typeof doc.createLayerGroup === "function") {
          await doc.createLayerGroup({
            name: "Wrinkle Retouch",
            fromLayers: [highLayer, blurWithMask, blurLayer]
          });
        }
      } catch (grpErr) {
        try {
          doc.activeLayers = [highLayer, blurWithMask, blurLayer];
          await batchPlay([
            {
              _obj: "make",
              _target: [{ _ref: "layerSection" }],
              from: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
              name: "Wrinkle Retouch",
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (e2) {}
      }

      // 5. Select "Blur with mask" layer ready to paint on wrinkles
      try {
        doc.activeLayers = [blurWithMask];
      } catch (selErr) {}
    }, { commandName: "Frequency Separation (Wrinkle Retouch)" });
  },

  /**
   * Dodge and Burn (D&B):
   * Creates professional Curves adjustment layers with inverted black masks:
   * - Dodge Layer (Curves brightened midtones, inverted mask)
   * - Burn Layer (Curves darkened midtones, inverted mask)
   * - Grouped inside "Dodge & Burn (Clothing)"
   */
  async applyDodgeAndBurn() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document in Photoshop.");

    return await core.executeAsModal(async () => {
      let currentLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      if (!currentLayer) throw new Error("No layer selected.");

      let dodgeLayer = null;
      let burnLayer = null;

      // 1. Create Dodge Curves Layer
      try {
        await batchPlay([
          {
            _obj: "make",
            _target: [{ _ref: "adjustmentLayer" }],
            using: {
              _obj: "adjustmentLayer",
              name: "Dodge",
              type: { _class: "curves" }
            },
            dialogOptions: "dontDisplay"
          },
          {
            _obj: "invert",
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
        dodgeLayer = doc.activeLayers[0];
      } catch (e1) {
        try {
          await batchPlay([
            {
              _obj: "make",
              _target: [{ _ref: "layer" }],
              using: {
                _obj: "layer",
                name: "Dodge",
                mode: { _enum: "blendMode", _value: "softLight" },
                fillNeutral: true
              },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
          dodgeLayer = doc.activeLayers[0];
        } catch (e1b) {}
      }

      // 2. Create Burn Curves Layer
      try {
        await batchPlay([
          {
            _obj: "make",
            _target: [{ _ref: "adjustmentLayer" }],
            using: {
              _obj: "adjustmentLayer",
              name: "Burn",
              type: { _class: "curves" }
            },
            dialogOptions: "dontDisplay"
          },
          {
            _obj: "invert",
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
        burnLayer = doc.activeLayers[0];
      } catch (e2) {
        try {
          await batchPlay([
            {
              _obj: "make",
              _target: [{ _ref: "layer" }],
              using: {
                _obj: "layer",
                name: "Burn",
                mode: { _enum: "blendMode", _value: "softLight" },
                fillNeutral: true
              },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
          burnLayer = doc.activeLayers[0];
        } catch (e2b) {}
      }

      // 3. Put in Group "Dodge & Burn (Clothing)"
      try {
        if (typeof doc.createLayerGroup === "function" && dodgeLayer && burnLayer) {
          await doc.createLayerGroup({
            name: "Dodge & Burn (Clothing)",
            fromLayers: [dodgeLayer, burnLayer]
          });
        }
      } catch (grpErr) {
        try {
          if (dodgeLayer && burnLayer) {
            doc.activeLayers = [dodgeLayer, burnLayer];
            await batchPlay([
              {
                _obj: "make",
                _target: [{ _ref: "layerSection" }],
                from: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
                name: "Dodge & Burn (Clothing)",
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          }
        } catch (e3) {}
      }

      // 4. Select Dodge layer
      if (dodgeLayer) {
        try {
          doc.activeLayers = [dodgeLayer];
        } catch (selErr) {}
      }
    }, { commandName: "Dodge and Burn (Clothing)" });
  },

  /**
   * Save for Evoto:
   * Prompts to save a high-quality JPG copy ready for Evoto AI clothing wrinkle removal
   */
  async saveForEvoto() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document in Photoshop.");

    const uxp = require("uxp");
    const title = doc.title || "image";
    const rawName = title.replace(/\.[^/.]+$/, "");
    const defaultName = rawName + "_evoto.jpg";

    const entry = await uxp.storage.localFileSystem.getFileForSaving(defaultName, {
      types: ["jpg", "jpeg"]
    });
    if (!entry) return false; // Canceled by user

    await core.executeAsModal(async () => {
      await doc.saveAs.jpg(entry, { quality: 12 }, true);
    }, { commandName: "Save for Evoto" });

    return entry.name;
  },

  /**
   * Legacy smoothing method (kept for fallback compatibility)
   */
  async smoothClothingWrinkles() {
    return await this.applyFrequencySeparation();
  },

  /**
   * Shadow:
   * Adds clean photorealistic contact / ground shadow under product
   */
  async applyContactShadow() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      await batchPlay([
        {
          _obj: "set",
          _target: [{ _ref: "property", _property: "layerEffects" }, { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: {
            _obj: "layerEffects",
            scale: { _unit: "percentUnit", _value: 100 },
            dropShadow: {
              _obj: "dropShadow",
              enabled: true,
              mode: { _enum: "blendMode", _value: "multiply" },
              color: { _obj: "RGBColor", red: 15, grain: 15, blue: 25 },
              opacity: { _unit: "percentUnit", _value: 28 },
              useGlobalAngle: false,
              localLightingAngle: { _unit: "angleUnit", _value: 90 },
              distance: { _unit: "pixelsUnit", _value: 16 },
              chokeMatte: { _unit: "pixelsUnit", _value: 0 },
              blur: { _unit: "pixelsUnit", _value: 30 }
            }
          },
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });
    }, { commandName: "Adjustment: Contact Shadow" });
  },

  /**
   * Color Correction & sRGB:
   * Balanced auto-contrast, white-point correction, and sRGB profile
   */
  async applyColorCorrection() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      // 1. Auto Color / Levels
      await batchPlay([
        {
          _obj: "autoLevels",
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });

      // 2. Convert to sRGB IEC61966-2.1
      await batchPlay([
        {
          _obj: "convertToProfile",
          destination: "sRGB IEC61966-2.1",
          intent: { _enum: "intent", _value: "colorimetric" },
          blackPointCompensation: true,
          dither: true,
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });
    }, { commandName: "Adjustment: Color Correction" });
  }

};

window.PSAutomation = PSAutomation;
window.AdjustmentModule = PSAutomation;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PSAutomation;
}

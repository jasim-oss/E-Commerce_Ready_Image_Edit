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
  async executeOnTargetDocs(applyToAll, taskFn, commandName = "Batch Task", options = {}) {
    const docs = applyToAll ? app.documents : (app.activeDocument ? [app.activeDocument] : []);
    if (docs.length === 0) {
      throw new Error("No open document found in Photoshop.");
    }

    return await core.executeAsModal(async () => {
      for (let i = 0; i < docs.length; i++) {
        app.activeDocument = docs[i];
        await taskFn(docs[i], i + 1, docs.length);
      }
    }, { commandName, ...options });
  },

  /**
   * 1. RESIZE: Resize for specific E-Commerce Marketplace
   * Edge-Aware Smart Anchoring:
   * Keeps subject/model anchored to canvas edges (e.g. bottom-touching waist/pants)
   * while expanding canvas into free space.
   * @param {number} width - Target width in pixels
   * @param {number} height - Target height in pixels
   * @param {number} dpi - Target resolution in DPI
   * @param {boolean} applyToAll - Apply to all open documents
   */
  async resizeForMarketplace(width, height, dpi = 72, applyToAll = false, smartAnchor = true) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      const docW = doc.width;
      const docH = doc.height;
      const edgeThreshold = Math.max(16, Math.round(Math.min(docW, docH) * 0.025));

      let touchBottom = false;
      let touchTop = false;
      let touchLeft = false;
      let touchRight = false;

      if (smartAnchor) {
        // 1. Detect edge contact from subject layer or mask
        let layer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
        if (!layer || layer.isBackgroundLayer || layer.name === "BG Color" || layer.name === "BG Image") {
          const nonBg = (doc.layers || []).filter(l => !l.isBackgroundLayer && l.name !== "BG Color" && l.name !== "BG Image");
          layer = nonBg.length > 0 ? nonBg[0] : null;
        }

        if (layer) {
          let b = null;
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
            if (res && res[0] && res[0].hasUserMask) {
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
                const sbL = (sb.left && sb.left._value !== undefined) ? sb.left._value : sb.left;
                const sbT = (sb.top && sb.top._value !== undefined) ? sb.top._value : sb.top;
                const sbR = (sb.right && sb.right._value !== undefined) ? sb.right._value : sb.right;
                const sbB = (sb.bottom && sb.bottom._value !== undefined) ? sb.bottom._value : sb.bottom;
                if (sbR > sbL && sbB > sbT) {
                  b = { left: sbL, top: sbT, right: sbR, bottom: sbB };
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
            }
          } catch (mErr) {}

          if (!b && layer.bounds) {
            const lb = layer.bounds;
            const lbL = (lb.left && lb.left._value !== undefined) ? lb.left._value : lb.left;
            const lbT = (lb.top && lb.top._value !== undefined) ? lb.top._value : lb.top;
            const lbR = (lb.right && lb.right._value !== undefined) ? lb.right._value : lb.right;
            const lbB = (lb.bottom && lb.bottom._value !== undefined) ? lb.bottom._value : lb.bottom;
            b = { left: lbL, top: lbT, right: lbR, bottom: lbB };
          }

          if (b) {
            const fillsCanvas = (b.left <= edgeThreshold && b.right >= docW - edgeThreshold && b.top <= edgeThreshold && b.bottom >= docH - edgeThreshold);
            if (!fillsCanvas) {
              if (b.bottom >= docH - edgeThreshold) touchBottom = true;
              if (b.top <= edgeThreshold) touchTop = true;
              if (b.left <= edgeThreshold) touchLeft = true;
              if (b.right >= docW - edgeThreshold) touchRight = true;
            }
          }
        }

        // 2. If touches not found (e.g. flat background photo like raw camera exports), run autoCutout (Select Subject)
        if (!touchBottom && !touchTop && !touchLeft && !touchRight) {
          try {
            await batchPlay([
              {
                _obj: "autoCutout",
                sampleAllLayers: false,
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });

            if (doc.selection && doc.selection.bounds) {
              const sb = doc.selection.bounds;
              const sbL = (sb.left && sb.left._value !== undefined) ? sb.left._value : sb.left;
              const sbT = (sb.top && sb.top._value !== undefined) ? sb.top._value : sb.top;
              const sbR = (sb.right && sb.right._value !== undefined) ? sb.right._value : sb.right;
              const sbB = (sb.bottom && sb.bottom._value !== undefined) ? sb.bottom._value : sb.bottom;
              if (sbR > sbL && sbB > sbT) {
                if (sbB >= docH - edgeThreshold) touchBottom = true;
                if (sbT <= edgeThreshold) touchTop = true;
                if (sbL <= edgeThreshold) touchLeft = true;
                if (sbR >= docW - edgeThreshold) touchRight = true;
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
          } catch (acErr) {}
        }
      }

      // 3. Determine Canvas Expansion Anchor
      let vLoc = "center";
      let vAnchor = "MIDDLE";
      if (touchBottom && !touchTop) {
        vLoc = "bottom";
        vAnchor = "BOTTOM";
      } else if (touchTop && !touchBottom) {
        vLoc = "top";
        vAnchor = "TOP";
      }

      let hLoc = "center";
      let hAnchor = "CENTER";
      if (touchLeft && !touchRight) {
        hLoc = "left";
        hAnchor = "LEFT";
      } else if (touchRight && !touchLeft) {
        hLoc = "right";
        hAnchor = "RIGHT";
      }

      const anchorMap = {
        "TOPLEFT": AnchorPosition.TOPLEFT,
        "TOPCENTER": AnchorPosition.TOPCENTER,
        "TOPRIGHT": AnchorPosition.TOPRIGHT,
        "MIDDLELEFT": AnchorPosition.MIDDLELEFT,
        "MIDDLECENTER": AnchorPosition.MIDDLECENTER,
        "MIDDLERIGHT": AnchorPosition.MIDDLERIGHT,
        "BOTTOMLEFT": AnchorPosition.BOTTOMLEFT,
        "BOTTOMCENTER": AnchorPosition.BOTTOMCENTER,
        "BOTTOMRIGHT": AnchorPosition.BOTTOMRIGHT
      };
      const anchorKey = `${vAnchor}${hAnchor}`;
      const targetAnchor = anchorMap[anchorKey] || AnchorPosition.MIDDLECENTER;

      // 4. Proportional Scale to fit inside width x height
      const scale = Math.min(width / docW, height / docH);
      const fitW = Math.max(1, Math.round(docW * scale));
      const fitH = Math.max(1, Math.round(docH * scale));

      // Ensure background color is pure white
      try {
        await batchPlay([
          {
            _obj: "set",
            _target: [{ _ref: "color", _property: "backgroundColor" }],
            to: {
              _obj: "RGBColor",
              red: 255,
              grain: 255,
              blue: 255
            },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (colErr) {}

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
            dialogOptions: "dontDisplay"
          },
          {
            _obj: "canvasSize",
            width: { _unit: "pixelsUnit", _value: width },
            height: { _unit: "pixelsUnit", _value: height },
            horizontal: { _enum: "horizontalLocation", _value: hLoc },
            vertical: { _enum: "verticalLocation", _value: vLoc },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (bpErr) {
        if (doc.resizeImage) {
          try {
            await doc.resizeImage(fitW, fitH, dpi);
          } catch (e1) {}
        }
        if (doc.resizeCanvas) {
          await doc.resizeCanvas(width, height, targetAnchor);
        }
      }
    }, `Resize to ${width}x${height} @ ${dpi}DPI`);
  },

  /**
   * 2. BG REMOVE: AI Select Subject + Mask on Layer 1 from main layer
   * User workflow: First copy layer from background -> Remove background -> Mask Layer 1.
   * Leaves Background layer natively locked.
   */
  async bgRemove(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      const layers = doc.layers || [];
      const layerCount = layers.length;
      const activeLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : (layers[0] || null);

      // When document has only 1 layer (like default Background), or active layer is Background
      if (layerCount === 1 || (activeLayer && activeLayer.isBackgroundLayer)) {
        // 1. Duplicate main layer to Layer 1
        await batchPlay([
          {
            _obj: "duplicate",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            name: "Layer 1",
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });

        // Ensure Layer 1 is selected and active
        try {
          const l1 = doc.layers ? doc.layers.find(l => l.name === "Layer 1") : null;
          if (l1) {
            doc.activeLayers = [l1];
          }
        } catch (e) {}

        // 2. AI Select Subject on Layer 1
        await batchPlay([
          {
            _obj: "autoCutout",
            sampleAllLayers: false,
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });

        // 3. Apply Layer Mask onto Layer 1
        try {
          await batchPlay([
            {
              _obj: "make",
              new: { _class: "channel" },
              at: { _ref: "channel", _enum: "channel", _value: "mask" },
              using: { _enum: "userMaskOptions", _value: "revealSelection" },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (maskErr) {
          await batchPlay([
            {
              _obj: "make",
              new: { _class: "channel" },
              at: { _ref: "channel", _enum: "channel", _value: "mask" },
              using: { _enum: "userMaskOptions", _value: "revealAll" },
              dialogOptions: "dontDisplay"
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
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });

      try {
        await batchPlay([
          {
            _obj: "make",
            new: { _class: "channel" },
            at: { _ref: "channel", _enum: "channel", _value: "mask" },
            using: { _enum: "userMaskOptions", _value: "revealSelection" },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (maskErr) {
        await batchPlay([
          {
            _obj: "make",
            new: { _class: "channel" },
            at: { _ref: "channel", _enum: "channel", _value: "mask" },
            using: { _enum: "userMaskOptions", _value: "revealAll" },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      }
    }, "AI BG Remove");
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
      // 1. Identify Background vs Subject / Foreground Layers
      const isBackgroundLike = (l) => {
        if (!l) return true;
        if (l.isBackgroundLayer) return true;
        const name = (l.name || "").trim().toLowerCase();
        if (name === "background" || name === "original bg") return true;
        if (name === "bg color" || name === "bg image" || name === "bg") return true;
        if (name.startsWith("color fill")) return true;
        return false;
      };

      // Collect all subject / foreground layers (product, shadows, retouch, adjustments)
      let subjectLayers = (doc.layers || []).filter(l => !isBackgroundLike(l));

      // If document only has a background layer, convert it to a regular layer
      if (subjectLayers.length === 0) {
        let candidate = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : (doc.layers ? doc.layers[0] : null);
        if (candidate && candidate.isBackgroundLayer) {
          try {
            candidate.isBackgroundLayer = false;
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
        subjectLayers = (doc.layers || []).filter(l => !isBackgroundLike(l));
      }

      if (subjectLayers.length === 0) throw new Error("No subject layers found to size.");

      // Unlock any locked subject layers so they can be transformed
      for (const lyr of subjectLayers) {
        if (lyr.locked) {
          try { lyr.locked = false; } catch (e) {}
        }
      }

      // Identify the primary subject layer (e.g. Layer 1 / Product) for measuring margins
      const isShadowName = (l) => {
        const n = (l.name || "").toLowerCase();
        return n.includes("shadow");
      };

      let mainSubjectLayer = null;
      if (doc.activeLayers && doc.activeLayers.length > 0) {
        const active = doc.activeLayers[0];
        if (subjectLayers.some(sl => sl.id === active.id)) {
          if (isShadowName(active)) {
            // If user has a shadow layer selected, prefer the actual product layer
            const nonShadow = subjectLayers.find(l => !isShadowName(l));
            mainSubjectLayer = nonShadow || active;
          } else {
            mainSubjectLayer = active;
          }
        }
      }
      if (!mainSubjectLayer) {
        mainSubjectLayer = subjectLayers.find(l => !isShadowName(l)) || subjectLayers[0];
      }

      // Check if main subject layer has a user mask before measuring
      let hasMask = false;
      try {
        const res = await batchPlay([
          {
            _obj: "get",
            _target: [
              { _ref: "property", _property: "hasUserMask" },
              { _ref: "layer", _id: mainSubjectLayer.id }
            ],
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
        hasMask = Boolean(res && res[0] && res[0].hasUserMask);
      } catch (e) {
        hasMask = false;
      }

      // 2. Measure Exact Subject Bounds on main subject layer
      let b = null;
      if (hasMask) {
        try {
          doc.activeLayers = [mainSubjectLayer];
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
        b = mainSubjectLayer.bounds;
      }

      const w = b.right - b.left;
      const h = b.bottom - b.top;
      if (w <= 0 || h <= 0) throw new Error("Selected subject layer has no visible content.");

      const canvasW = doc.width;
      const canvasH = doc.height;

      // Center of main subject before transform
      const cx_main = (b.left + b.right) / 2;
      const cy_main = (b.top + b.bottom) / 2;

      // Record pre-transform centers for all subject layers (for proportional alignment)
      const layerPositions = subjectLayers.map(lyr => {
        const lb = lyr.bounds;
        return {
          layer: lyr,
          id: lyr.id,
          isMain: lyr.id === mainSubjectLayer.id,
          centerX: (lb.left + lb.right) / 2,
          centerY: (lb.top + lb.bottom) / 2
        };
      });

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
      const scaleRatio = scalePct / 100;

      // 3. Proportional Scale ALL Subject Layers simultaneously
      let multiScaleSuccess = false;
      if (subjectLayers.length > 1) {
        try {
          doc.activeLayers = subjectLayers;
          await batchPlay([
            {
              _obj: "transform",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              width: { _unit: "percentUnit", _value: scalePct },
              height: { _unit: "percentUnit", _value: scalePct },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
          multiScaleSuccess = true;
        } catch (mErr) {
          multiScaleSuccess = false;
        }
      }

      // Fallback: Scale each subject layer individually if multi-transform is unavailable
      if (!multiScaleSuccess) {
        for (const item of layerPositions) {
          const lyr = item.layer;
          try {
            if (AnchorPosition && AnchorPosition.MIDDLECENTER) {
              await lyr.scale(scalePct, scalePct, AnchorPosition.MIDDLECENTER);
            } else {
              await lyr.scale(scalePct, scalePct);
            }
          } catch (scaleErr) {
            try {
              doc.activeLayers = [lyr];
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
        }
      }

      // 4. Measure New Bounds on Main Subject Layer after scaling
      let newBounds = null;
      if (hasMask) {
        try {
          doc.activeLayers = [mainSubjectLayer];
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
        newBounds = mainSubjectLayer.bounds;
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

      // Move ALL subject layers in unison
      let multiMoveSuccess = false;
      if (multiScaleSuccess && subjectLayers.length > 1 && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
        try {
          doc.activeLayers = subjectLayers;
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
          multiMoveSuccess = true;
        } catch (mErr) {
          multiMoveSuccess = false;
        }
      }

      if (!multiMoveSuccess) {
        for (const item of layerPositions) {
          const lyr = item.layer;
          // If multiScaleSuccess was true, layers were already scaled around common center.
          // Otherwise, each layer was scaled around its own center, so apply proportional shift relative to main subject.
          const shiftX = multiScaleSuccess ? 0 : (scaleRatio - 1) * (item.centerX - cx_main);
          const shiftY = multiScaleSuccess ? 0 : (scaleRatio - 1) * (item.centerY - cy_main);
          const layerDx = dx + shiftX;
          const layerDy = dy + shiftY;

          if (Math.abs(layerDx) > 0.5 || Math.abs(layerDy) > 0.5) {
            try {
              await lyr.translate(layerDx, layerDy);
            } catch (transErr) {
              try {
                doc.activeLayers = [lyr];
                await batchPlay([
                  {
                    _obj: "move",
                    _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                    to: {
                      _obj: "offset",
                      horizontal: { _unit: "pixelsUnit", _value: layerDx },
                      vertical: { _unit: "pixelsUnit", _value: layerDy }
                    },
                    dialogOptions: "dontDisplay"
                  }
                ], { synchronousExecution: true });
              } catch (e) {}
            }
          }
        }
      }

      // Restore active layer to the primary subject layer
      try {
        doc.activeLayers = [mainSubjectLayer];
      } catch (e) {}

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
   * 5. EXPORT: Ready for Delivery
   * Exports optimized copies for specific e-commerce marketplaces (Shopify, Amazon, WooCommerce, etc.)
   * into a dedicated "Ready For Delivery" subfolder with correct format (JPG, PNG, WebP) and sRGB profile.
   * @param {string} marketplaceKey - Marketplace key (shopify, amazon, woocommerce, etc.)
   * @param {string} format - Target format ("JPG", "PNG", "WebP")
   * @param {boolean} applyToAll - Process all open documents in Photoshop
   */
  async exportForDelivery(marketplaceKey = "amazon", format = "JPG", applyToAll = false, customMaxBytes = 0, targetProfile = "sRGB") {
    const docs = applyToAll ? app.documents : (app.activeDocument ? [app.activeDocument] : []);
    if (!docs || docs.length === 0) throw new Error("No active document open in Photoshop.");

    let count = 0;
    let lastSummary = "";
    for (let i = 0; i < docs.length; i++) {
      lastSummary = await this.exportSingleDocForDelivery(docs[i], marketplaceKey, format, customMaxBytes, targetProfile);
      count++;
    }

    const keyClean = (marketplaceKey || "").toLowerCase();
    const marketName = keyClean === "woocommerce" ? "WooCommerce" : (keyClean ? keyClean.charAt(0).toUpperCase() + keyClean.slice(1) : "Marketplace");
    if (applyToAll) {
      return `Ready for Delivery: ${count} of ${docs.length} images exported for ${marketName} (${format})`;
    }
    return `Saved for ${marketName} (${format}): ${lastSummary}`;
  },

  /**
   * Exports a single document for Delivery into "Ready For Delivery" subfolder
   * Strictly enforces maximum file size constraint per marketplace (Etsy 1MB, Walmart 5MB, Amazon 10MB, etc.)
   */
  async exportSingleDocForDelivery(doc, marketplaceKey, format = "JPG", customMaxBytes = 0, targetProfile = "sRGB") {
    // Definitive strict max size lookup for each marketplace
    const MARKETPLACE_MAX_BYTES = {
      etsy: 1 * 1024 * 1024,        // 1 MB
      walmart: 5 * 1024 * 1024,     // 5 MB
      woocommerce: 5 * 1024 * 1024, // 5 MB
      amazon: 10 * 1024 * 1024,     // 10 MB
      ebay: 12 * 1024 * 1024,       // 12 MB
      shopify: 20 * 1024 * 1024,    // 20 MB
      zalando: 20 * 1024 * 1024,    // 20 MB
      custom: 10 * 1024 * 1024      // Custom fallback default
    };

    const keyClean = (marketplaceKey || "").toLowerCase();
    const maxBytesAllowed = customMaxBytes || MARKETPLACE_MAX_BYTES[keyClean] || (10 * 1024 * 1024);
    // Strict safety threshold: 98% of max limit so Windows File Explorer never exceeds the MB threshold
    const targetLimit = Math.floor(maxBytesAllowed * 0.98);

    // 1. Resolve document path on disk
    let rawPath = "";
    try { rawPath = doc.path || ""; } catch (e) {}

    if (!rawPath) {
      try {
        const res = await batchPlay([
          {
            _obj: "get",
            _target: [
              { _property: "fileReference" },
              { _ref: "document", _id: doc.id }
            ]
          }
        ], { synchronousExecution: true });
        if (res && res[0] && res[0].fileReference) {
          const ref = res[0].fileReference;
          rawPath = typeof ref === "string" ? ref : (ref._path || ref.path || "");
        }
      } catch (e) {}
    }

    if (!rawPath) {
      throw new Error(`Document "${doc.title}" is not saved on disk. Please save the PSD/image first.`);
    }

    // 2. Folder resolution
    let folderPath = rawPath.replace(/\\/g, "/");
    if (/\.[a-zA-Z0-9]{2,5}$/.test(folderPath)) {
      folderPath = folderPath.substring(0, folderPath.lastIndexOf("/"));
    }

    const title = doc.title || doc.name || "untitled";
    const baseName = title.replace(/\.[^/.]+$/, "");
    const fmtLower = format.toLowerCase();
    const ext = fmtLower === "webp" ? "webp"
      : fmtLower === "png" ? "png"
      : (fmtLower === "tif" || fmtLower === "tiff") ? "tif"
      : fmtLower === "psd" ? "psd"
      : "jpg";
    const outFileName = `${baseName}.${ext}`;

    // 3. Resolve directory entry via UXP storage
    const uxp = require("uxp");
    const localFS = uxp.storage.localFileSystem;
    const types = uxp.storage.types;

    const normalized = folderPath.replace(/^\/+/, "");
    const parts = normalized.split("/");
    const encodedParts = parts.map(part => /^[a-zA-Z]:$/.test(part) ? part : encodeURIComponent(part));
    const encodedClean = encodedParts.join("/");

    const candidates = [
      "file:/" + encodedClean,
      "file:///" + encodedClean,
      "file:" + normalized,
      "file:/" + normalized,
      "file:///" + normalized
    ];

    let srcEntry = null;
    let lastErr = null;
    for (const url of candidates) {
      try {
        srcEntry = await localFS.getEntryWithUrl(url);
        if (srcEntry) break;
      } catch (err) { lastErr = err; }
    }

    if (!srcEntry) {
      throw new Error(`Cannot access directory "${folderPath}": ${lastErr ? (lastErr.message || lastErr) : "Not found"}`);
    }

    if (srcEntry.isFile) {
      srcEntry = await srcEntry.parent;
    }

    // 4. Create or locate "Ready For Delivery" subfolder
    let deliveryFolder = null;
    try {
      const children = await srcEntry.getEntries();
      deliveryFolder = children.find(e => e.isFolder && (e.name === "Ready For Delivery" || e.name.toLowerCase() === "ready for delivery"));
    } catch (e) {}

    if (!deliveryFolder) {
      try {
        if (typeof srcEntry.createFolder === "function") {
          deliveryFolder = await srcEntry.createFolder("Ready For Delivery");
        } else {
          deliveryFolder = await srcEntry.createEntry("Ready For Delivery", { type: types.folder });
        }
      } catch (err) {
        try {
          const children = await srcEntry.getEntries();
          deliveryFolder = children.find(e => e.isFolder && (e.name === "Ready For Delivery" || e.name.toLowerCase() === "ready for delivery"));
        } catch (e2) {}
      }
    }

    if (!deliveryFolder) {
      throw new Error('Failed to create or access "Ready For Delivery" folder.');
    }

    // 5. Create output file entry & token
    let fileEntry = null;
    try {
      if (typeof deliveryFolder.createFile === "function") {
        fileEntry = await deliveryFolder.createFile(outFileName, { overwrite: true });
      } else {
        fileEntry = await deliveryFolder.createEntry(outFileName, { type: types.file, overwrite: true });
      }
    } catch (fileErr) {
      throw new Error(`Failed to create file "${outFileName}": ${fileErr.message || fileErr}`);
    }

    const token = await localFS.createSessionToken(fileEntry);

    // 6. Save execution with auto size optimization
    const fmtUpper = (format || "JPG").toUpperCase();
    let currentQuality = fmtUpper === "JPG" ? 11 : (fmtUpper === "WEBP" ? 90 : 6);
    let initialHistory = null;

    // Helper inside executeAsModal to write the current document state to fileEntry
    const saveToDisk = async (qLevel) => {
      let saveSuccess = false;
      let saveErrorMsg = "";

      if (fmtUpper === "TIF" || fmtUpper === "TIFF") {
        // Save as TIF – all layers preserved, no flatten
        try {
          if (doc.saveAs && typeof doc.saveAs.tiff === "function") {
            await doc.saveAs.tiff(fileEntry, {
              imageCompression: "lzw",
              saveAlpha: true,
              layers: true
            }, true);
            saveSuccess = true;
          }
        } catch (domErr) { saveErrorMsg = domErr.message || String(domErr); }

        if (!saveSuccess) {
          try {
            await batchPlay([
              {
                _obj: "save",
                as: {
                  _obj: "TIFF",
                  byteOrder: { _enum: "byteOrder", _value: "IBM" },
                  encoding: { _enum: "encoding", _value: "LZW" },
                  transparency: true,
                  layers: true
                },
                in: { _path: token, _kind: "local" },
                documentID: doc.id,
                copy: true,
                lowerCase: true,
                saveStage: { _enum: "saveStageType", _value: "saveSucceeded" },
                _options: { dialogOptions: "dontDisplay" }
              }
            ], { synchronousExecution: true });
            saveSuccess = true;
          } catch (bpErr) { saveErrorMsg = bpErr.message || String(bpErr); }
        }
      } else if (fmtUpper === "PSD") {
        // Save as PSD – all layers preserved
        try {
          if (doc.saveAs && typeof doc.saveAs.psd === "function") {
            await doc.saveAs.psd(fileEntry, {
              embedColorProfile: true,
              maximizeCompatibility: true
            }, true);
            saveSuccess = true;
          }
        } catch (domErr) { saveErrorMsg = domErr.message || String(domErr); }

        if (!saveSuccess) {
          try {
            await batchPlay([
              {
                _obj: "save",
                as: {
                  _obj: "photoshop35Format",
                  embedColorProfile: true,
                  maximizeCompatibility: true,
                  saveAlpha: true,
                  layers: true
                },
                in: { _path: token, _kind: "local" },
                documentID: doc.id,
                copy: true,
                lowerCase: true,
                saveStage: { _enum: "saveStageType", _value: "saveSucceeded" },
                _options: { dialogOptions: "dontDisplay" }
              }
            ], { synchronousExecution: true });
            saveSuccess = true;
          } catch (bpErr) { saveErrorMsg = bpErr.message || String(bpErr); }
        }
      } else if (fmtUpper === "PNG") {
        try {
          if (doc.saveAs && typeof doc.saveAs.png === "function") {
            await doc.saveAs.png(fileEntry, { compression: 6 }, true);
            saveSuccess = true;
          }
        } catch (domErr) { saveErrorMsg = domErr.message || String(domErr); }

        if (!saveSuccess) {
          try {
            await batchPlay([
              {
                _obj: "save",
                as: {
                  _obj: "PNGFormat",
                  method: { _enum: "PNGMethod", _value: "quick" },
                  compression: 6
                },
                in: { _path: token, _kind: "local" },
                documentID: doc.id,
                copy: true,
                lowerCase: true,
                saveStage: { _enum: "saveStageType", _value: "saveSucceeded" },
                _options: { dialogOptions: "dontDisplay" }
              }
            ], { synchronousExecution: true });
            saveSuccess = true;
          } catch (bpErr) { saveErrorMsg = bpErr.message || String(bpErr); }
        }
      } else if (fmtUpper === "WEBP") {
        try {
          await batchPlay([
            {
              _obj: "save",
              as: {
                _obj: "WebPFormat",
                compression: { _enum: "compression", _value: "lossy" },
                quality: qLevel || 90
              },
              in: { _path: token, _kind: "local" },
              documentID: doc.id,
              copy: true,
              lowerCase: true,
              saveStage: { _enum: "saveStageType", _value: "saveSucceeded" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ], { synchronousExecution: true });
          saveSuccess = true;
        } catch (webpErr) { saveErrorMsg = webpErr.message || String(webpErr); }

        if (!saveSuccess) {
          try {
            if (doc.saveAs && typeof doc.saveAs.jpg === "function") {
              await doc.saveAs.jpg(fileEntry, { quality: Math.min(10, Math.round((qLevel || 90) / 10)) }, true);
              saveSuccess = true;
            }
          } catch (e) {}
        }
      } else {
        // Default: JPG
        const jpgQ = qLevel || 11;
        try {
          if (doc.saveAs && typeof doc.saveAs.jpg === "function") {
            await doc.saveAs.jpg(fileEntry, { quality: jpgQ }, true);
            saveSuccess = true;
          }
        } catch (domErr) { saveErrorMsg = domErr.message || String(domErr); }

        if (!saveSuccess) {
          try {
            await batchPlay([
              {
                _obj: "save",
                as: {
                  _obj: "JPEG",
                  extendedQuality: Math.min(12, jpgQ),
                  matteColor: { _enum: "matteColor", _value: "none" }
                },
                in: { _path: token, _kind: "local" },
                documentID: doc.id,
                copy: true,
                lowerCase: true,
                saveStage: { _enum: "saveStageType", _value: "saveSucceeded" },
                _options: { dialogOptions: "dontDisplay" }
              }
            ], { synchronousExecution: true });
            saveSuccess = true;
          } catch (bpErr) { saveErrorMsg = bpErr.message || String(bpErr); }
        }
      }

      if (!saveSuccess) {
        throw new Error(`Failed to save ${fmtUpper}: ${saveErrorMsg || "Unknown save error"}`);
      }
    };

    // Step A: Modal scope for color conversion & initial save
    await core.executeAsModal(async () => {
      app.activeDocument = doc;
      initialHistory = doc.activeHistoryState;

      // Ensure RGB Color Mode
      try {
        await batchPlay([
          {
            _obj: "convertMode",
            to: { _obj: "RGBColorMode" },
            _options: { dialogOptions: "dontDisplay" }
          }
        ], { synchronousExecution: true });
      } catch (e) {}

      // Color profile conversion (sRGB unless RGB explicitly requested)
      const needSRGB = !targetProfile || targetProfile.toUpperCase() !== "RGB";
      if (needSRGB) {
        try {
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
        } catch (profErr) {}
      }

      await saveToDisk(currentQuality);
    }, { commandName: `Export for Delivery: ${format}` });

    // Step B: Check file size on disk OUTSIDE modal scope to prevent IPC deadlocks
    let curSize = 0;
    try {
      const meta = await fileEntry.getMetadata();
      curSize = meta ? meta.size : 0;
    } catch (e) {}

    // Step C: Auto-optimize if file exceeds marketplace maximum allowed bytes
    // Note: TIF and PSD are lossless layer formats – size optimization skipped for those
    const isLayerFormat = fmtUpper === "TIF" || fmtUpper === "TIFF" || fmtUpper === "PSD";
    let passes = 0;
    while (!isLayerFormat && curSize > targetLimit && passes < 4) {
      passes++;

      await core.executeAsModal(async () => {
        app.activeDocument = doc;

        if (fmtUpper === "JPG") {
          if (currentQuality > 6) {
            currentQuality = Math.max(5, currentQuality - 2);
          } else {
            const scaleFactor = Math.min(0.92, Math.sqrt(targetLimit / curSize) * 0.96);
            const targetW = Math.max(500, Math.round(doc.width * scaleFactor));
            const targetH = Math.max(500, Math.round(doc.height * scaleFactor));
            try {
              await batchPlay([
                {
                  _obj: "imageSize",
                  width: { _unit: "pixelsUnit", _value: targetW },
                  height: { _unit: "pixelsUnit", _value: targetH },
                  linked: true,
                  interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "automaticInterpolation" }
                }
              ], { synchronousExecution: true });
            } catch (szErr) {}
          }
        } else if (fmtUpper === "PNG") {
          // PNG lossless reduction: scale dimensions proportionally based on pixel area
          const scaleFactor = Math.min(0.94, Math.sqrt(targetLimit / curSize) * 0.96);
          const targetW = Math.max(500, Math.round(doc.width * scaleFactor));
          const targetH = Math.max(500, Math.round(doc.height * scaleFactor));
          try {
            await batchPlay([
              {
                _obj: "imageSize",
                width: { _unit: "pixelsUnit", _value: targetW },
                height: { _unit: "pixelsUnit", _value: targetH },
                linked: true,
                interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "automaticInterpolation" }
              }
            ], { synchronousExecution: true });
          } catch (szErr) {}
        } else if (fmtUpper === "WEBP") {
          if (currentQuality > 50) {
            currentQuality = Math.max(40, currentQuality - 20);
          } else {
            const scaleFactor = Math.min(0.92, Math.sqrt(targetLimit / curSize) * 0.96);
            const targetW = Math.max(500, Math.round(doc.width * scaleFactor));
            const targetH = Math.max(500, Math.round(doc.height * scaleFactor));
            try {
              await batchPlay([
                {
                  _obj: "imageSize",
                  width: { _unit: "pixelsUnit", _value: targetW },
                  height: { _unit: "pixelsUnit", _value: targetH },
                  linked: true,
                  interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "automaticInterpolation" }
                }
              ], { synchronousExecution: true });
            } catch (szErr) {}
          }
        }

        // Re-save optimized copy
        await saveToDisk(currentQuality);
      }, { commandName: `Auto-Optimize Size (${passes})` });

      // Re-read file size on disk outside modal scope
      try {
        const meta = await fileEntry.getMetadata();
        curSize = meta ? meta.size : curSize;
      } catch (e) {}
    }

    // Step D: Restore original document state so active document is 100% untouched
    await core.executeAsModal(async () => {
      app.activeDocument = doc;
      if (initialHistory) {
        try {
          doc.activeHistoryState = initialHistory;
        } catch (hErr) {}
      }
    }, { commandName: "Restore Document State" });

    // Format human-friendly size
    const sizeStr = curSize < 1048576 
      ? `${Math.round(curSize / 1024)} KB`
      : `${(curSize / 1048576).toFixed(1)} MB`;

    return `${outFileName} (${sizeStr})`;
  },

  // Legacy preset compatibility
  async exportPreset(type = "amazon") {
    return await this.exportForDelivery(type);
  },


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
   * @param {boolean} applyToAll - Apply to all open documents in Photoshop
   */
  async applyFrequencySeparation(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      // 1. Try to load and play user's "Frequency Separation.atn" from plugin directory / actionTree
      let actionPlayed = false;
      try {
        const uxp = require("uxp");
        if (uxp && uxp.storage && uxp.storage.localFileSystem) {
          const lfs = uxp.storage.localFileSystem;
          const pluginDir = await lfs.getPluginFolder();
          let atnFile = null;
          try { atnFile = await pluginDir.getEntry("Frequency Separation.atn"); } catch(e) {}
          if (atnFile) {
            const token = lfs.createSessionToken(atnFile);
            try {
              await batchPlay([
                {
                  _obj: "open",
                  _target: [{ _ref: "file", _token: token }],
                  dialogOptions: "dontDisplay"
                }
              ], { synchronousExecution: true });
            } catch (opErr) {}
          }
        }

        // Search in app.actionTree for the loaded action
        if (app.actionTree && app.actionTree.length > 0) {
          for (const set of app.actionTree) {
            const setName = set.name || "";
            const setNameLower = setName.toLowerCase();
            if (setNameLower.includes("wrinkle") || setNameLower.includes("frequency") || setNameLower.includes("retouch")) {
              const act = set.actions && set.actions.find(a => {
                const n = (a.name || "").toLowerCase();
                return n.includes("frequency") || n.includes("wrinkle") || n.includes("separation");
              });
              if (act) {
                // Play via batchPlay for maximum compatibility
                await batchPlay([
                  {
                    _obj: "play",
                    _target: [
                      { _ref: "action", _name: act.name },
                      { _ref: "actionSet", _name: setName }
                    ],
                    dialogOptions: "dontDisplay"
                  }
                ], { synchronousExecution: true });
                actionPlayed = true;
                break;
              }
            }
          }
        }
      } catch (atErr) {
        console.warn("ATN Action execution failed, falling back to high-precision native FS", atErr);
      }

      if (actionPlayed) return;

      // 2. High-precision Native Frequency Separation with Apply Image math (8-Bit & 16-Bit)
      let currentLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      if (!currentLayer) {
        currentLayer = doc.layers && doc.layers.length > 0 ? doc.layers[0] : null;
      }
      if (!currentLayer) return;

      if (currentLayer.isBackgroundLayer) {
        currentLayer.isBackgroundLayer = false;
      }
      if (currentLayer.locked) {
        currentLayer.locked = false;
      }

      const is16Bit = doc.bitsPerChannel === 16;

      // Step 1: Duplicate base layer as "Blur" (Low Frequency)
      const blurLayer = await currentLayer.duplicate();
      blurLayer.name = "Blur";

      // Step 2: Duplicate base layer as "High" (High Frequency)
      const highLayer = await currentLayer.duplicate();
      highLayer.name = "High";

      // Step 3: Duplicate base layer as "Blur with mask"
      const blurWithMask = await currentLayer.duplicate();
      blurWithMask.name = "Blur with mask";

      // 1. On "Blur" layer: apply Gaussian Blur (Radius 8.0 px)
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

      // 2. On "High" layer: Apply Image subtraction against "Blur" layer
      doc.activeLayers = [highLayer];
      try {
        if (is16Bit) {
          // 16-bit: Add mode, Scale 2, Offset 0, Invert true
          await batchPlay([
            {
              _obj: "applyImageEvent",
              with: {
                _obj: "calculation",
                to: {
                  _ref: [
                    { _ref: "channel", _enum: "channel", _value: "RGB" },
                    { _ref: "layer", _name: "Blur" }
                  ]
                },
                calculation: { _enum: "calculationType", _value: "add" },
                scale: 2,
                offset: 0,
                invert: true
              },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } else {
          // 8-bit: Subtract mode, Scale 2, Offset 128
          await batchPlay([
            {
              _obj: "applyImageEvent",
              with: {
                _obj: "calculation",
                to: {
                  _ref: [
                    { _ref: "channel", _enum: "channel", _value: "RGB" },
                    { _ref: "layer", _name: "Blur" }
                  ]
                },
                calculation: { _enum: "calculationType", _value: "subtract" },
                scale: 2,
                offset: 128
              },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        }
      } catch (applyErr) {
        // Fallback to High Pass if Apply Image fails
        try {
          await batchPlay([
            {
              _obj: "highPass",
              radius: { _unit: "pixelsUnit", _value: 8.0 },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (hpErr) {}
      }

      // Set blend mode of "High" layer to Linear Light
      try {
        highLayer.blendMode = "linearLight";
      } catch (bm1) {}

      // 3. On "Blur with mask" layer: apply Gaussian Blur at 37.5 px & add inverted Black Mask
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
      } catch (mErr) {}

      // 4. Group all 3 layers inside "Wrinkle Retouch"
      try {
        if (doc.createLayerGroup) {
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

      // 5. Select "Blur with mask" layer & set Brush Tool
      try {
        doc.activeLayers = [blurWithMask];
        await batchPlay([
          {
            _obj: "select",
            _target: [{ _ref: "pbush" }]
          }
        ], { synchronousExecution: true });
      } catch (selErr) {}
    }, "Frequency Separation (Wrinkle Retouch)");
  },

  /**
   * Dodge and Burn (D&B):
   * Creates a single Soft Light layer named "Dodge & Burn" filled with 50% neutral gray,
   * selects the Brush tool (B), and sets Opacity to 100% & Flow to 5%.
   * @param {boolean} applyToAll - Apply to all open documents in Photoshop
   */
  async applyDodgeAndBurn(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      let currentLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      if (!currentLayer) {
        currentLayer = doc.layers && doc.layers.length > 0 ? doc.layers[0] : null;
      }
      if (!currentLayer) return;

      let dnbLayer = null;

      // 1. Create a clean, empty transparent layer with Soft Light blend mode named "Dodge & Burn"
      try {
        await batchPlay([
          {
            _obj: "make",
            _target: [{ _ref: "layer" }],
            using: {
              _obj: "layer",
              name: "Dodge & Burn",
              mode: { _enum: "blendMode", _value: "softLight" }
            },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
        dnbLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      } catch (e1) {
        try {
          if (doc.createLayer) {
            dnbLayer = await doc.createLayer({ name: "Dodge & Burn" });
            try { dnbLayer.blendMode = "softLight"; } catch (bmErr) {}
          }
        } catch (e2) {}
      }

      // 2. Select Brush Tool (paintbrushTool)
      try {
        await batchPlay([
          {
            _obj: "select",
            _target: [{ _ref: "paintbrushTool" }]
          }
        ], { synchronousExecution: true });
      } catch (bErr1) {
        try {
          await batchPlay([
            {
              _obj: "select",
              _target: [{ _ref: "pbush" }]
            }
          ], { synchronousExecution: true });
        } catch (bErr2) {}
      }

      // 3. Set Brush Tool Options: Opacity 100%, Flow 5%
      const flowDescriptors = [
        // Exact Photoshop action descriptor for setting Brush Flow 5% and Opacity 100%
        {
          _obj: "set",
          _target: [{ _ref: "paintbrushTool" }],
          to: {
            _obj: "paintbrushTool",
            flow: { _unit: "percentUnit", _value: 5 },
            opacity: { _unit: "percentUnit", _value: 100 }
          },
          dialogOptions: "dontDisplay"
        },
        {
          _obj: "set",
          _target: [{ _ref: "currentToolOptions" }],
          to: {
            _obj: "currentToolOptions",
            flow: { _unit: "percentUnit", _value: 5 },
            opacity: { _unit: "percentUnit", _value: 100 }
          },
          dialogOptions: "dontDisplay"
        },
        {
          _obj: "set",
          _target: [{ _ref: "paintbrushTool" }],
          to: {
            _obj: "paintbrushTool",
            flow: 5,
            opacity: 100
          },
          dialogOptions: "dontDisplay"
        }
      ];

      for (const desc of flowDescriptors) {
        try {
          await batchPlay([desc], { synchronousExecution: true });
        } catch (fErr) {}
      }
    }, "Dodge and Burn (Clothing)");
  },

  /**
   * Save single document for Evoto
   */
  async saveSingleDocForEvoto(doc) {
    // 1. Get document raw path
    let rawPath = "";
    try {
      rawPath = doc.path || "";
    } catch (e) {}

    // Fallback: query document fileReference via batchPlay
    if (!rawPath) {
      try {
        const res = await batchPlay([
          {
            _obj: "get",
            _target: [
              { _property: "fileReference" },
              { _ref: "document", _id: doc.id }
            ]
          }
        ], { synchronousExecution: true });
        if (res && res[0] && res[0].fileReference) {
          const ref = res[0].fileReference;
          rawPath = typeof ref === "string" ? ref : (ref._path || ref.path || "");
        }
      } catch (e) {}
    }

    if (!rawPath) {
      throw new Error(`Document "${doc.title}" is not saved on disk yet. Please save the file first.`);
    }

    // 2. Extract folder path from rawPath
    let folderPath = rawPath.replace(/\\/g, "/");
    if (/\.[a-zA-Z0-9]{2,5}$/.test(folderPath)) {
      folderPath = folderPath.substring(0, folderPath.lastIndexOf("/"));
    }

    const title = doc.title || doc.name || "untitled";
    const baseName = title.replace(/\.[^/.]+$/, "");
    const jpgFileName = baseName + ".jpg";

    // 3. Resolve folder entry via UXP localFileSystem (OUTSIDE executeAsModal)
    const uxp = require("uxp");
    const localFS = uxp.storage.localFileSystem;
    const types = uxp.storage.types;

    const normalized = folderPath.replace(/^\/+/, "");
    const parts = normalized.split("/");
    const encodedParts = parts.map(part => {
      if (/^[a-zA-Z]:$/.test(part)) return part;
      return encodeURIComponent(part);
    });
    const encodedClean = encodedParts.join("/");

    const candidates = [
      "file:/" + encodedClean,
      "file:///" + encodedClean,
      "file:" + normalized,
      "file:/" + normalized,
      "file:///" + normalized
    ];

    let srcEntry = null;
    let lastErr = null;
    for (const url of candidates) {
      try {
        srcEntry = await localFS.getEntryWithUrl(url);
        if (srcEntry) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!srcEntry) {
      throw new Error(`Cannot access folder "${folderPath}": ${lastErr ? (lastErr.message || lastErr) : "Not found"}`);
    }

    if (srcEntry.isFile) {
      srcEntry = await srcEntry.parent;
    }

    // 4. Create or get "Save for Evoto" subfolder
    let evotoFolder = null;
    try {
      const children = await srcEntry.getEntries();
      evotoFolder = children.find(e => e.isFolder && (e.name === "Save for Evoto" || e.name.toLowerCase() === "save for evoto"));
    } catch (e) {}

    if (!evotoFolder) {
      try {
        if (typeof srcEntry.createFolder === "function") {
          evotoFolder = await srcEntry.createFolder("Save for Evoto");
        } else {
          evotoFolder = await srcEntry.createEntry("Save for Evoto", { type: types.folder });
        }
      } catch (err) {
        try {
          const children = await srcEntry.getEntries();
          evotoFolder = children.find(e => e.isFolder && (e.name === "Save for Evoto" || e.name.toLowerCase() === "save for evoto"));
        } catch (e2) {}
      }
    }

    if (!evotoFolder) {
      throw new Error('Failed to create or access "Save for Evoto" folder.');
    }

    // 5. Create output JPG file entry & session token
    let fileEntry = null;
    try {
      if (typeof evotoFolder.createFile === "function") {
        fileEntry = await evotoFolder.createFile(jpgFileName, { overwrite: true });
      } else {
        fileEntry = await evotoFolder.createEntry(jpgFileName, { type: types.file, overwrite: true });
      }
    } catch (fileErr) {
      throw new Error(`Failed to create file "${jpgFileName}": ${fileErr.message || fileErr}`);
    }

    const token = await localFS.createSessionToken(fileEntry);

    // 6. Execute save inside executeAsModal (without touching active document layers)
    await core.executeAsModal(async () => {
      app.activeDocument = doc;
      let saved = false;
      let saveError = null;

      try {
        await doc.saveAs.jpg(fileEntry, { quality: 10 }, true);
        saved = true;
      } catch (domErr) {
        saveError = domErr;
      }

      if (!saved) {
        try {
          await batchPlay([
            {
              _obj: "save",
              as: {
                _obj: "JPEG",
                extendedQuality: 10,
                matteColor: { _enum: "matteColor", _value: "none" }
              },
              in: {
                _path: token,
                _kind: "local"
              },
              documentID: doc.id,
              copy: true,
              lowerCase: true,
              saveStage: { _enum: "saveStageType", _value: "saveSucceeded" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ], { synchronousExecution: true });
          saved = true;
        } catch (bpErr) {
          throw new Error("Save JPG failed: " + (bpErr.message || bpErr || saveError?.message || "Unknown save error"));
        }
      }
    }, { commandName: "Save for Evoto (JPG)" });

    return "Save for Evoto/" + jpgFileName;
  },

  /**
   * Save for Evoto:
   * Creates a "Save for Evoto" subfolder inside the source document folder
   * and saves a high-quality flat JPG copy there without modifying or flattening the active document.
   * @param {boolean} applyToAll - Apply to all open documents in Photoshop
   */
  async saveForEvoto(applyToAll = false) {
    const docs = applyToAll ? app.documents : (app.activeDocument ? [app.activeDocument] : []);
    if (!docs || docs.length === 0) throw new Error("No active document open in Photoshop.");

    let lastPath = "";
    let count = 0;
    for (let i = 0; i < docs.length; i++) {
      lastPath = await this.saveSingleDocForEvoto(docs[i]);
      count++;
    }

    if (applyToAll) {
      return `Save for Evoto (${count} of ${docs.length} images saved)`;
    }
    return lastPath;
  },

  /**
   * Legacy smoothing method (kept for fallback compatibility)
   */
  async smoothClothingWrinkles() {
    return await this.applyFrequencySeparation();
  },

  /**
   * Helper: Load and play ATN action from plugin directory if available
   */
  async playAtnActionIfExists(atnFileName, possibleActionNames = []) {
    try {
      const uxp = require("uxp");
      if (uxp && uxp.storage && uxp.storage.localFileSystem) {
        const lfs = uxp.storage.localFileSystem;
        const pluginDir = await lfs.getPluginFolder();
        let atnFile = null;
        try { atnFile = await pluginDir.getEntry(atnFileName); } catch(e) {}
        if (atnFile) {
          const token = lfs.createSessionToken(atnFile);
          try {
            await batchPlay([
              {
                _obj: "open",
                _target: [{ _ref: "file", _token: token }],
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          } catch (opErr) {}
        }
      }

      if (app.actionTree && app.actionTree.length > 0) {
        for (const set of app.actionTree) {
          for (const act of (set.actions || [])) {
            const actName = act.name || "";
            const actNameLower = actName.toLowerCase();
            const match = possibleActionNames.some(p => actNameLower.includes(p.toLowerCase()));
            if (match) {
              await batchPlay([
                {
                  _obj: "play",
                  _target: [
                    { _ref: "action", _name: actName },
                    { _ref: "actionSet", _name: set.name }
                  ],
                  dialogOptions: "dontDisplay"
                }
              ], { synchronousExecution: true });
              return true;
            }
          }
        }
      }
    } catch(e) {}
    return false;
  },

  /**
   * Shadow 1: Drop Shadow
   * Soft, floating ambient shadow applied directly to the subject cutout layer (e.g. Layer 1)
   */
  async applyDropShadow(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      const layers = doc.layers || [];
      if (layers.length === 0) return;

      // 1. Identify Subject cutout layer (e.g. "Layer 1")
      let subjectLayer = layers.find(l => {
        const n = (l.name || "").trim().toLowerCase();
        return !l.isBackgroundLayer && n !== "background" && n !== "original bg" && n !== "bg color" && n !== "bg image" && !n.includes("shadow") && !n.startsWith("color fill");
      });

      if (!subjectLayer && doc.activeLayers && doc.activeLayers.length > 0) {
        subjectLayer = doc.activeLayers[0];
      }

      if (!subjectLayer) return;

      // 2. Select the subject cutout layer explicitly so Drop Shadow applies to it
      doc.activeLayers = [subjectLayer];

      // 3. Remove Drop Shadow effect from BG Color / BG Image if accidentally applied earlier
      for (const l of layers) {
        const n = (l.name || "").trim().toLowerCase();
        if (l !== subjectLayer && (n === "bg color" || n === "bg image" || n.startsWith("color fill") || l.isBackgroundLayer)) {
          try {
            await batchPlay([
              {
                _obj: "disableLayerStyle",
                _target: [{ _ref: "layer", _id: l.id }],
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          } catch (e) {}
        }
      }

      // 4. Apply Drop Shadow to the subject cutout layer
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
              color: { _obj: "RGBColor", red: 0, grain: 0, blue: 0 },
              opacity: { _unit: "percentUnit", _value: 54 },
              useGlobalAngle: false,
              localLightingAngle: { _unit: "angleUnit", _value: 142 },
              distance: { _unit: "pixelsUnit", _value: 10 },
              chokeMatte: { _unit: "percentUnit", _value: 5 },
              blur: { _unit: "pixelsUnit", _value: 16 },
              noise: { _unit: "percentUnit", _value: 0 },
              antiAlias: true,
              layerConceals: true
            }
          },
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });

      // Keep subject cutout layer active
      try { doc.activeLayers = [subjectLayer]; } catch (e) {}
    }, "Adjustment: Drop Shadow");
  },

  /**
   * Core Helper: Create non-destructive shadow layer duplicated from bottom Background layer.
   * Works regardless of which layer is currently selected.
   * Always positions the created shadow layer directly ABOVE 'BG Color' and BELOW 'Layer 1' / subject layer.
   */
  async _createShadowFromBackground(doc, shadowName, maskAdjustFn, desaturate = true) {
    const layers = doc.layers || [];
    if (layers.length === 0) return;

    // 1. Deselect any active selection first
    try {
      await batchPlay([
        {
          _obj: "set",
          _target: [{ _ref: "channel", _property: "selection" }],
          to: { _enum: "ordinal", _value: "none" },
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });
    } catch (e) {}

    // 2. Remove any previously created shadow layer if re-applying
    const oldShadow = layers.find(l => l.name === "Shadow" || l.name === "Natural Shadow" || l.name === "Existing Shadow" || l.name === "Cast Shadow");
    if (oldShadow) {
      try { await oldShadow.delete(); } catch (e) {}
    }

    const currentLayers = doc.layers || layers;

    // 3. Intelligently identify Background layer at the bottom of layer stack
    let bgLayer = null;
    for (let i = currentLayers.length - 1; i >= 0; i--) {
      const l = currentLayers[i];
      if (!l) continue;
      const n = (l.name || "").trim().toLowerCase();
      if (l.isBackgroundLayer || n === "background" || n === "original bg") {
        bgLayer = l;
        break;
      }
    }
    if (!bgLayer) {
      for (let i = currentLayers.length - 1; i >= 0; i--) {
        const l = currentLayers[i];
        if (!l) continue;
        const n = (l.name || "").trim().toLowerCase();
        if (n !== "bg color" && n !== "bg image" && !n.includes("shadow") && !n.startsWith("color fill")) {
          bgLayer = l;
          break;
        }
      }
    }
    if (!bgLayer && currentLayers.length > 0) {
      bgLayer = currentLayers[currentLayers.length - 1];
    }
    if (!bgLayer) return;

    // 4. Identify Subject layer (e.g. "Layer 1") and BG Color layer
    let subjectLayer = currentLayers.find(l => {
      const n = (l.name || "").trim().toLowerCase();
      return !l.isBackgroundLayer && n !== "background" && n !== "original bg" && n !== "bg color" && n !== "bg image" && !n.includes("shadow") && !n.startsWith("color fill");
    });
    if (!subjectLayer && doc.activeLayers && doc.activeLayers.length > 0) {
      subjectLayer = doc.activeLayers[0];
    }

    let bgColorLayer = currentLayers.find(l => {
      const n = (l.name || "").trim().toLowerCase();
      return n === "bg color" || n === "bg image" || n.startsWith("color fill");
    });

    // 5. Non-destructive Cleanup Shadow processing & Shadow Layer Creation
    const cleanupLayer = (doc.layers || []).find(l => {
      const n = (l.name || "").trim().toLowerCase();
      return n === "cleanup shadow" || n.includes("cleanup shadow");
    });

    let shadowLayer = null;

    if (cleanupLayer) {
      // Restore visibility of all document layers
      (doc.layers || []).forEach(l => {
        try { l.visible = true; } catch (e) {}
      });

      // Duplicate original bgLayer non-destructively so original Background remains 100% untouched
      let tempCleanLayer = null;
      try {
        const tempBgCopy = await bgLayer.duplicate();
        try {
          await cleanupLayer.move(tempBgCopy, constants.ElementPlacement ? constants.ElementPlacement.PLACEBEFORE : "before");
        } catch (e) {}

        doc.activeLayers = [cleanupLayer];
        await batchPlay([
          {
            _obj: "mergeLayersNew",
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });

        tempCleanLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      } catch (mergeErr) {
        tempCleanLayer = cleanupLayer;
      }

      // Create shadow layer from the clean merged temp layer
      if (tempCleanLayer) {
        try {
          shadowLayer = await tempCleanLayer.duplicate();
          shadowLayer.name = shadowName;
        } catch (e) {}

        // Delete temporary clean layer to leave original Background untouched!
        try {
          if (tempCleanLayer !== bgLayer) {
            await tempCleanLayer.delete();
          }
        } catch (delTempErr) {}
      }
    }

    // Standard fallback if no Cleanup Shadow layer existed or if duplication above wasn't done
    if (!shadowLayer) {
      doc.activeLayers = [bgLayer];
      try {
        shadowLayer = await bgLayer.duplicate();
        shadowLayer.name = shadowName;
      } catch (dupErr) {
        await batchPlay([
          { _obj: "copyToLayer", dialogOptions: "dontDisplay" }
        ], { synchronousExecution: true });
        shadowLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
        if (shadowLayer) shadowLayer.name = shadowName;
      }
    }

    if (!shadowLayer) return;

    if (shadowLayer.isBackgroundLayer) shadowLayer.isBackgroundLayer = false;
    if (shadowLayer.locked) shadowLayer.locked = false;

    // 6. CRITICAL: Remove any pre-existing layer mask from the duplicated layer
    // Prevents "The command 'Make' is not currently available" error when adding new mask!
    try {
      await batchPlay([
        {
          _obj: "delete",
          _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });
    } catch (delMaskErr) {}

    // 7. CRITICAL: Shadow layer must ALWAYS be directly ABOVE 'BG Color'
    const fixShadowPlacement = async () => {
      try {
        const liveDoc = app.activeDocument;
        if (!liveDoc) return;
        const liveLayers = Array.from(liveDoc.layers || []);

        const sIdx = liveLayers.findIndex(l => (l.name || "").trim().toLowerCase() === shadowName.toLowerCase());
        const bIdx = liveLayers.findIndex(l => {
          const n = (l.name || "").trim().toLowerCase();
          return n === "bg color" || n === "bg image" || n.startsWith("color fill") || n.includes("solid color");
        });

        if (sIdx !== -1 && bIdx !== -1 && sIdx > bIdx) {
          // Shadow is currently BELOW BG Color in layer stack (index 0 is top)
          // Try DOM move first
          try {
            const shadowL = liveLayers[sIdx];
            const bgL = liveLayers[bIdx];
            const placement = (constants && constants.ElementPlacement && constants.ElementPlacement.PLACEBEFORE) || "placeBefore";
            shadowL.move(bgL, placement);
          } catch (domErr) {}

          // Bring Forward via batchPlay until shadow index is less than BG Color index
          let curLayers = Array.from(liveDoc.layers || []);
          let curS = curLayers.findIndex(l => (l.name || "").trim().toLowerCase() === shadowName.toLowerCase());
          let curB = curLayers.findIndex(l => {
            const n = (l.name || "").trim().toLowerCase();
            return n === "bg color" || n === "bg image" || n.startsWith("color fill") || n.includes("solid color");
          });

          let attempts = 0;
          while (curS !== -1 && curB !== -1 && curS > curB && attempts < 5) {
            attempts++;
            try {
              await batchPlay([
                {
                  _obj: "select",
                  _target: [{ _ref: "layer", _name: shadowName }],
                  dialogOptions: "dontDisplay"
                },
                {
                  _obj: "move",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  to: { _ref: "layer", _enum: "ordinal", _value: "previous" },
                  dialogOptions: "dontDisplay"
                }
              ], { synchronousExecution: true });
            } catch (bpErr) {
              break;
            }

            curLayers = Array.from(liveDoc.layers || []);
            curS = curLayers.findIndex(l => (l.name || "").trim().toLowerCase() === shadowName.toLowerCase());
            curB = curLayers.findIndex(l => {
              const n = (l.name || "").trim().toLowerCase();
              return n === "bg color" || n === "bg image" || n.startsWith("color fill") || n.includes("solid color");
            });
          }
        }
      } catch (err) {
        console.error("fixShadowPlacement error:", err);
      }
    };

    await fixShadowPlacement();

    // 8. Create luminosity selection (Inverted RGB) and Mask on shadowLayer
    doc.activeLayers = [shadowLayer];

    // Set selection to RGB channel luminosity
    await batchPlay([
      {
        _obj: "set",
        _target: [{ _ref: "channel", _property: "selection" }],
        to: { _ref: "channel", _enum: "channel", _value: "RGB" },
        dialogOptions: "dontDisplay"
      }
    ], { synchronousExecution: true });

    // Invert selection
    await batchPlay([
      {
        _obj: "inverse",
        dialogOptions: "dontDisplay"
      }
    ], { synchronousExecution: true });

    // Make layer mask revealing selection
    await batchPlay([
      {
        _obj: "make",
        new: { _class: "channel" },
        at: { _ref: "channel", _enum: "channel", _value: "mask" },
        using: { _enum: "userMaskOptions", _value: "revealSelection" },
        dialogOptions: "dontDisplay"
      }
    ], { synchronousExecution: true });

    // 9. Apply contrast adjustment to mask channel & auto-clean floor dust/specks (Plan 1)
    try {
      await batchPlay([
        {
          _obj: "select",
          _target: [{ _ref: "channel", _enum: "ordinal", _value: "targetEnum" }],
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });

      if (typeof maskAdjustFn === "function") {
        await maskAdjustFn();
      }

      // Plan 1: Dust & Scratches filter to eliminate high-frequency floor specks, scratches & dust from shadow mask
      try {
        await batchPlay([
          {
            _obj: "dustAndScratches",
            radius: 10,
            threshold: 2,
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (dustErr) {
        try {
          await batchPlay([
            {
              _obj: "median",
              radius: { _unit: "pixelsUnit", _value: 3 },
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (medErr) {}
      }
    } catch (mErr) {}

    // 10. Select RGB channel
    try {
      await batchPlay([
        {
          _obj: "select",
          _target: [{ _ref: "channel", _enum: "channel", _value: "RGB" }],
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });
    } catch (e) {}

    shadowLayer.name = shadowName;

    // 11. Set Multiply blend mode
    try {
      shadowLayer.blendMode = "multiply";
    } catch (bmErr) {
      await batchPlay([
        {
          _obj: "set",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _obj: "layer", mode: { _enum: "blendMode", _value: "multiply" } },
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });
    }

    // 12. Desaturate if requested
    if (desaturate) {
      try {
        await batchPlay([
          {
            _obj: "desaturate",
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (dsErr) {}
    }

    // 13. Clean up: remove marching ants selection
    try {
      await batchPlay([
        {
          _obj: "set",
          _target: [{ _ref: "channel", _property: "selection" }],
          to: { _enum: "ordinal", _value: "none" },
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });
    } catch (e) {}

    // 14. Final Guarantee: ensure Shadow layer is positioned directly above BG Color
    await fixShadowPlacement();

    // 15. Explicitly select the Shadow layer and its Layer Mask so user can immediately paint/retouch
    try {
      doc.activeLayers = [shadowLayer];
      await batchPlay([
        {
          _obj: "select",
          _target: [{ _ref: "layer", _name: shadowName }],
          dialogOptions: "dontDisplay"
        },
        {
          _obj: "select",
          _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
          dialogOptions: "dontDisplay"
        }
      ], { synchronousExecution: true });
    } catch (selMaskErr) {
      try { doc.activeLayers = [shadowLayer]; } catch (e) {}
    }
  },

  /**
   * Shadow 2: Natural Shadow
   * Fully automated Natural Shadow algorithm that works regardless of active layer:
   * 1. Duplicates original Background layer from the bottom
   * 2. Positions Shadow layer directly ABOVE 'BG Color' and BELOW 'Layer 1'
   * 3. Applies inverted RGB luminosity mask with Natural Shadow contrast Curve
   * 4. Desaturates and sets Multiply blend mode
   * @param {boolean} applyToAll - Apply to all open documents in Photoshop
   */
  async applyNaturalShadow(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      const naturalShadowCurveLut = [
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,4,5,6,8,9,10,12,13,14,16,17,18,19,
        21,22,23,25,26,27,28,30,31,32,34,35,36,38,39,40,41,43,44,45,47,48,49,50,52,53,54,56,
        57,58,60,61,62,63,65,66,67,69,70,71,72,74,75,76,78,79,80,82,83,84,85,87,88,89,91,92,
        93,94,96,97,98,100,101,102,104,105,106,107,109,110,111,113,114,115,116,118,119,120,
        122,123,124,126,127,128,129,131,132,133,135,136,137,139,140,141,142,144,145,146,148,
        149,150,151,153,154,155,157,158,159,161,162,163,164,166,167,168,170,171,172,173,175,
        176,177,179,180,181,183,184,185,186,188,189,190,192,193,194,195,197,198,199,201,202,
        203,205,206,207,208,210,211,212,214,215,216,217,219,220,221,223,224,225,227,228,229,
        230,232,233,234,236,237,238,239,241,242,243,245,246,247,249,250,251,252,254,255,255,
        255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
        255,255,255,255,255,255,255,255,255,255,255,255,255,255,255
      ];

      await this._createShadowFromBackground(doc, "Shadow", async () => {
        try {
          await batchPlay([
            {
              _obj: "curves",
              presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
              adjustment: [
                {
                  _obj: "curveAdjustment",
                  channel: { _ref: "channel", _enum: "ordinal", _value: "targetEnum" },
                  mapping: naturalShadowCurveLut
                }
              ],
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (cErr) {
          try {
            await batchPlay([
              {
                _obj: "curves",
                adjustment: [
                  {
                    _obj: "curveAdjustment",
                    channel: { _ref: "channel", _enum: "ordinal", _value: "targetEnum" },
                    curve: [
                      { _obj: "point", horizontal: 22, vertical: 0 },
                      { _obj: "point", horizontal: 235, vertical: 255 }
                    ]
                  }
                ],
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          } catch (cErr2) {}
        }
      }, true);
    }, "Adjustment: Natural Shadow");
  },

  /**
   * Shadow 3: Existing Shadow
   * Creates a natural, soft existing shadow by isolating the floor shadow from the background image:
   * 1. Duplicates original Background layer from the bottom
   * 2. Positions Shadow layer directly ABOVE 'BG Color' and BELOW 'Layer 1'
   * 3. Applies inverted RGB luminosity mask with Levels (input: [41, 255]) on mask channel
   * 4. Desaturates and sets Multiply blend mode
   * @param {boolean} applyToAll - Apply to all open documents in Photoshop
   */
  async applyExistingShadow(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      await this._createShadowFromBackground(doc, "Existing Shadow", async () => {
        await batchPlay([
          {
            _obj: "levels",
            presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
            adjustment: [
              {
                _obj: "levelAdjustment",
                channel: { _ref: "channel", _enum: "ordinal", _value: "targetEnum" },
                input: [41, 255]
              }
            ],
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      }, true);
    }, "Adjustment: Existing Shadow");
  },

  /**
   * Shadow 4: Cast Shadow
   * Fully automated implementation of Cast Shadow:
   * 1. Duplicates original Background layer from the bottom
   * 2. Positions Shadow layer directly ABOVE 'BG Color' and BELOW 'Layer 1'
   * 3. Applies inverted RGB luminosity mask with Levels (input: [41, 255]) on mask channel
   * 4. Sets Multiply blend mode while preserving original colors/reflections
   * @param {boolean} applyToAll - Apply to all open documents in Photoshop
   */
  async applyCastShadow(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      await this._createShadowFromBackground(doc, "Cast Shadow", async () => {
        await batchPlay([
          {
            _obj: "levels",
            presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
            adjustment: [
              {
                _obj: "levelAdjustment",
                channel: { _ref: "channel", _enum: "ordinal", _value: "targetEnum" },
                input: [41, 255]
              }
            ],
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      }, false);
    }, "Adjustment: Cast Shadow");
  },

  /**
   * Legacy contact shadow alias
   */
  async applyContactShadow() {
    return await this.applyNaturalShadow();
  },

  /**
   * Cleanup Shadow Workflow:
   * 1. Duplicates bottom-most layer (or active layer) as "Cleanup Shadow"
   * 2. Displays interactive "Dust & Scratches" dialog box for user to adjust parameters
   * 3. Upon user clicking OK:
   *    - Applies a Black Layer Mask (Hide All) to "Cleanup Shadow" layer
   *    - Hides visibility (turns off eye icon) of all layers ABOVE "Cleanup Shadow"
   *    - Sets foreground color to White (#FFFFFF) & activates Brush Tool (PBBrush)
   * @param {boolean} applyToAll - Apply to all open documents
   */
  async cleanUpShadow(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      // Restore visibility of all document layers if previously hidden
      (doc.layers || []).forEach(l => {
        try { l.visible = true; } catch (e) {}
      });

      // Remove previous Cleanup Shadow draft if re-running
      const oldCleanup = (doc.layers || []).find(l => (l.name || "").trim().toLowerCase() === "cleanup shadow");
      if (oldCleanup) {
        try { await oldCleanup.delete(); } catch (e) {}
      }

      // 1. Find bottom layer (or fallback to active layer)
      let sourceLayer = null;
      if (doc.layers && doc.layers.length > 0) {
        sourceLayer = doc.layers[doc.layers.length - 1]; // Bottom-most layer
      } else if (doc.activeLayers && doc.activeLayers.length > 0) {
        sourceLayer = doc.activeLayers[0];
      }

      if (!sourceLayer) return;

      // Make source layer active
      doc.activeLayers = [sourceLayer];

      // Duplicate bottom layer as "Cleanup Shadow"
      let cleanupLayer = null;
      try {
        cleanupLayer = await sourceLayer.duplicate();
        cleanupLayer.name = "Cleanup Shadow";
        doc.activeLayers = [cleanupLayer];
      } catch (dupErr) {
        return;
      }

      // 2. Hide visibility of all upper layers BEFORE displaying Dust & Scratches dialog
      // Uses native batchPlay "hide" action to guarantee Photoshop UI eye icons turn off immediately!
      const currentDocLayers = doc.layers || [];
      const cleanupId = cleanupLayer ? cleanupLayer.id : null;
      const sourceId = sourceLayer ? sourceLayer.id : null;

      for (let i = 0; i < currentDocLayers.length; i++) {
        const l = currentDocLayers[i];
        if (!l) continue;
        const isCleanup = (cleanupId && l.id === cleanupId) || (l.name || "").trim().toLowerCase() === "cleanup shadow";
        const isSource = (sourceId && l.id === sourceId) || l.isBackgroundLayer || (l.name || "").trim().toLowerCase() === "background";

        // Hide all layers above Cleanup Shadow (e.g. Layer 1 copy, BG Color)
        if (!isCleanup && !isSource) {
          try { l.visible = false; } catch (e) {}
          try {
            const targetRef = l.id ? { _ref: "layer", _id: l.id } : { _ref: "layer", _name: l.name };
            await batchPlay([
              {
                _obj: "hide",
                _target: [targetRef],
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          } catch (hideErr) {}
        }
      }

      // 3. Display Dust & Scratches dialog interactively for user to fit values
      let userConfirmed = false;
      try {
        await batchPlay([
          {
            _obj: "dustAndScratches",
            radius: 10,
            threshold: 2,
            _options: { dialogOptions: "display" }
          }
        ], {
          synchronousExecution: true,
          modalBehavior: "execute"
        });
        userConfirmed = true;
      } catch (dialogErr) {
        console.log("Dust & Scratches cancelled by user:", dialogErr);
      }

      if (!userConfirmed) {
        // If user cancelled, restore visibility of all layers and clean up the draft layer
        const resetLayers = doc.layers || [];
        for (let i = 0; i < resetLayers.length; i++) {
          const l = resetLayers[i];
          try { l.visible = true; } catch (e) {}
          try {
            const targetRef = l.id ? { _ref: "layer", _id: l.id } : { _ref: "layer", _name: l.name };
            await batchPlay([
              {
                _obj: "show",
                _target: [targetRef],
                dialogOptions: "dontDisplay"
              }
            ], { synchronousExecution: true });
          } catch (e) {}
        }
        try { await cleanupLayer.delete(); } catch (delErr) {}
        return;
      }

      // 4. Add Black Mask (Hide All) to "Cleanup Shadow" layer
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
      } catch (maskErr) {}

      // 5. Set Foreground Color to White (#FFFFFF) so user can paint to reveal on black mask
      try {
        await batchPlay([
          {
            _obj: "set",
            _target: [{ _ref: "color", _property: "foregroundColor" }],
            to: {
              _obj: "RGBColor",
              red: 255,
              grain: 255,
              blue: 255
            },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (colorErr) {}

      // 6. Activate Brush Tool (PBBrush)
      try {
        await batchPlay([
          {
            _obj: "select",
            _target: [{ _ref: "broadClass", _value: "PBBrush" }],
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (toolErr) {}
    }, "Cleanup Shadow", { interactive: true });
  },

  /**
   * Dedicated Dust & Scratches Automation:
   * 1. Duplicates target layer as "Dust & Scratches Clean"
   * 2. Displays interactive "Dust & Scratches" dialog window for user to adjust parameters live
   * 3. Adds Black Mask (Hide All) for non-destructive retouching
   * 4. Sets Foreground to White (#FFFFFF) & Activates Brush Tool (PBBrush)
   * @param {boolean} applyToAll - Apply to all open documents
   */
  async applyDustAndScratches(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      // 1. Target the source image as the bottom-most / main original image layer
      const allDocLayers = doc.layers || [];
      let sourceLayer = null;
      const bgLayer = allDocLayers.find(l => l.isBackgroundLayer || (l.name || "").trim().toLowerCase() === "background");
      if (bgLayer) {
        sourceLayer = bgLayer;
      } else if (allDocLayers.length > 0) {
        sourceLayer = allDocLayers[allDocLayers.length - 1]; // Bottom-most layer (main image)
      } else if (doc.activeLayers && doc.activeLayers.length > 0) {
        sourceLayer = doc.activeLayers[0];
      }

      if (!sourceLayer) {
        throw new Error("No open image or layer found in Photoshop.");
      }

      // Convert Background layer or unlock layer so duplication succeeds smoothly
      try {
        if (sourceLayer.isBackgroundLayer) {
          sourceLayer.isBackgroundLayer = false;
        }
      } catch (e) {}
      try {
        if (sourceLayer.locked) {
          sourceLayer.locked = false;
        }
      } catch (e) {}

      // Make source layer active before duplicating
      doc.activeLayers = [sourceLayer];

      // 2. Duplicate source layer as "Dust & Scratches Clean"
      let cleanLayer = null;
      try {
        cleanLayer = await sourceLayer.duplicate();
        cleanLayer.name = "Dust & Scratches Clean";
      } catch (dupErr) {
        // Fallback: Duplicate via batchPlay
        try {
          await batchPlay([
            {
              _obj: "select",
              _target: [{ _ref: "layer", _id: sourceLayer.id }],
              dialogOptions: "dontDisplay"
            },
            {
              _obj: "duplicate",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              name: "Dust & Scratches Clean",
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
          cleanLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
        } catch (bpErr) {
          throw new Error("Could not duplicate layer: " + bpErr.message);
        }
      }

      if (!cleanLayer) {
        throw new Error("Failed to create Dust & Scratches Clean layer.");
      }

      doc.activeLayers = [cleanLayer];

      // 3. Move "Dust & Scratches Clean" layer to the VERY TOP of the document stack
      try {
        await batchPlay([
          {
            _obj: "move",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            to: { _ref: "layer", _enum: "ordinal", _value: "front" },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (moveErr) {
        try {
          if (doc.layers && doc.layers.length > 0 && cleanLayer.id !== doc.layers[0].id) {
            cleanLayer.move(doc.layers[0], (constants && constants.ElementPlacement && constants.ElementPlacement.PLACEBEFORE) || "placeBefore");
          }
        } catch (domMoveErr) {}
      }

      // Ensure cleanLayer remains active and visible on top
      try {
        cleanLayer.visible = true;
        doc.activeLayers = [cleanLayer];
      } catch (e) {}

      // Display native Dust & Scratches dialog window interactively
      let userConfirmed = false;
      try {
        await batchPlay([
          {
            _obj: "dustAndScratches",
            radius: 10,
            threshold: 2,
            dialogOptions: "display",
            _options: { dialogOptions: "display" }
          }
        ], { synchronousExecution: true, modalBehavior: "execute" });
        userConfirmed = true;
      } catch (dialogErr) {
        console.log("Dust & Scratches dialog cancelled by user:", dialogErr);
      }

      if (!userConfirmed) {
        if (cleanLayer) {
          try { await cleanLayer.delete(); } catch (e) {}
        }
        return;
      }

      // Add Black Layer Mask (Hide All)
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
      } catch (mErr) {}

      // Set Foreground Color to White (#FFFFFF)
      try {
        await batchPlay([
          {
            _obj: "set",
            _target: [{ _ref: "color", _property: "foregroundColor" }],
            to: { _obj: "RGBColor", red: 255, grain: 255, blue: 255 },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (cErr) {}

      // Activate Brush Tool (PBBrush)
      try {
        await batchPlay([
          {
            _obj: "select",
            _target: [{ _ref: "broadClass", _value: "PBBrush" }],
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (tErr) {}
    }, "Dust & Scratches", { interactive: true });
  },

  /**
   * White Balance:
   * 1. Duplicates layer as "White balance layer" & executes targeted Auto Color & Auto Levels
   * 2. Creates a Curves adjustment layer named "White Balance Curves" and applies
   *    Auto Neutral Extrema / Auto Levels to modify Curves RGB channels automatically.
   * @param {boolean} applyToAll - Apply to all open documents in Photoshop
   */
  async applyWhiteBalance(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      let currentLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      if (!currentLayer) {
        currentLayer = doc.layers && doc.layers.length > 0 ? doc.layers[0] : null;
      }
      if (!currentLayer) return;

      // Step 1: Duplicate base layer as "White balance layer"
      let wbLayer = null;
      try {
        wbLayer = await currentLayer.duplicate();
        wbLayer.name = "White balance layer";
        doc.activeLayers = [wbLayer];
      } catch (e) {}

      // Step 2: Target wbLayer explicitly and execute Auto Color & Auto Levels
      if (wbLayer) {
        try {
          doc.activeLayers = [wbLayer];
          await batchPlay([
            {
              _obj: "autoColor",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (acErr1) {
          try {
            await batchPlay([{ _obj: "autoColor", dialogOptions: "dontDisplay" }], { synchronousExecution: true });
          } catch (e) {}
        }

        try {
          await batchPlay([
            {
              _obj: "autoLevels",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (alErr1) {
          try {
            await batchPlay([{ _obj: "autoLevels", dialogOptions: "dontDisplay" }], { synchronousExecution: true });
          } catch (e) {}
        }
      }

      // Step 3: Create Curves Adjustment Layer named "White Balance Curves"
      let curvesLayer = null;
      try {
        await batchPlay([
          {
            _obj: "make",
            _target: [{ _ref: "adjustmentLayer" }],
            using: {
              _obj: "adjustmentLayer",
              name: "White Balance Curves",
              type: {
                _obj: "curves",
                presetKind: { _enum: "presetKindType", _value: "presetKindDefault" }
              }
            },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
        curvesLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      } catch (cErr) {}

      // Step 4: Apply Auto-Correction on the Curves Adjustment Layer (modifies Red, Green, Blue curve points)
      if (curvesLayer) {
        const curvesAutoCommands = [
          // A: Target Neutral Extrema autoCutOptions
          {
            _obj: "set",
            _target: [{ _ref: "adjustmentLayer", _enum: "ordinal", _value: "targetEnum" }],
            to: {
              _obj: "curves",
              autoCutOptions: {
                _obj: "autoCutOptions",
                targetNeutralExtrema: true
              }
            },
            dialogOptions: "dontDisplay"
          },
          // B: Auto Levels on adjustment layer
          {
            _obj: "autoLevels",
            _target: [{ _ref: "adjustmentLayer", _enum: "ordinal", _value: "targetEnum" }],
            dialogOptions: "dontDisplay"
          },
          // C: Auto Color on adjustment layer
          {
            _obj: "autoColor",
            _target: [{ _ref: "adjustmentLayer", _enum: "ordinal", _value: "targetEnum" }],
            dialogOptions: "dontDisplay"
          },
          // D: Curves auto property
          {
            _obj: "set",
            _target: [{ _ref: "adjustmentLayer", _enum: "ordinal", _value: "targetEnum" }],
            to: {
              _obj: "curves",
              auto: true
            },
            dialogOptions: "dontDisplay"
          }
        ];

        for (const cmd of curvesAutoCommands) {
          try {
            await batchPlay([cmd], { synchronousExecution: true });
          } catch (e) {}
        }
      }

      // Step 5: Keep Curves layer selected for fine-tuning
      if (curvesLayer) {
        try { doc.activeLayers = [curvesLayer]; } catch (sErr) {}
      } else if (wbLayer) {
        try { doc.activeLayers = [wbLayer]; } catch (sErr) {}
      }
    }, "White Balance");
  },

  /**
   * EXPORT: Save Working File
   * Saves a PSD copy (all layers preserved) into a "Working File" subfolder
   * inside the same folder where the source document lives.
   * Filename: same as original (with .psd extension). Non-destructive.
   * @param {boolean} applyToAll - Save working file for all open documents
   */
  async saveWorkingFile(applyToAll = false) {
    const docs = applyToAll ? app.documents : (app.activeDocument ? [app.activeDocument] : []);
    if (!docs || docs.length === 0) throw new Error("No active document open in Photoshop.");

    let count = 0;
    let lastSummary = "";
    const errors = [];
    for (let i = 0; i < docs.length; i++) {
      try {
        lastSummary = await this.saveSingleDocWorkingFile(docs[i]);
        count++;
      } catch (err) {
        errors.push(`${docs[i].title || 'Doc ' + (i + 1)}: ${err.message}`);
      }
    }

    if (errors.length > 0 && count === 0) {
      throw new Error(errors.join("; "));
    }

    if (applyToAll) {
      return `${count} of ${docs.length} Working Files (PSD) saved` + (errors.length ? ` (${errors.length} skipped)` : "");
    }
    return lastSummary;
  },

  /**
   * Saves a single document as Working File (PSD)
   */
  async saveSingleDocWorkingFile(doc) {
    if (!doc) throw new Error("No active document open in Photoshop.");

    // 1. Resolve document path via doc.path or batchPlay
    let rawPath = "";
    try { rawPath = doc.path || ""; } catch (e) {}

    if (!rawPath) {
      try {
        const res = await batchPlay([
          {
            _obj: "get",
            _target: [
              { _property: "fileReference" },
              { _ref: "document", _id: doc.id }
            ]
          }
        ], { synchronousExecution: true });
        if (res && res[0] && res[0].fileReference) {
          const ref = res[0].fileReference;
          rawPath = typeof ref === "string" ? ref : (ref._path || ref.path || "");
        }
      } catch (e) {}
    }

    if (!rawPath) {
      throw new Error("Document is not saved on disk. Please save the PSD first.");
    }

    // 2. Normalise parent folder path
    let folderPath = rawPath.replace(/\\/g, "/");
    if (/\.[a-zA-Z0-9]{2,5}$/.test(folderPath)) {
      folderPath = folderPath.substring(0, folderPath.lastIndexOf("/"));
    }

    // Output filename = original name (no extension) + .psd
    const title = doc.title || doc.name || "untitled";
    const baseName = title.replace(/\.[^/.]+$/, "");
    const outFileName = baseName + ".psd";
    const subFolderName = "Working File";

    // 3. UXP storage – resolve parent folder entry
    const uxp = require("uxp");
    const localFS = uxp.storage.localFileSystem;
    const types = uxp.storage.types;

    const normalized = folderPath.replace(/^\/+/, "");
    const encodedClean = normalized.split("/")
      .map(p => /^[a-zA-Z]:$/.test(p) ? p : encodeURIComponent(p))
      .join("/");

    const candidates = [
      "file:/" + encodedClean,
      "file:///" + encodedClean,
      "file:" + normalized,
      "file:/" + normalized,
      "file:///" + normalized
    ];

    let parentEntry = null;
    let lastErr = null;
    for (const url of candidates) {
      try {
        parentEntry = await localFS.getEntryWithUrl(url);
        if (parentEntry) break;
      } catch (err) { lastErr = err; }
    }

    if (!parentEntry) throw new Error("Cannot access folder: " + (lastErr ? lastErr.message : "Not found"));
    if (parentEntry.isFile) parentEntry = await parentEntry.parent;

    // 4. Create or reuse "Working File" subfolder
    let subFolder = null;
    try {
      const children = await parentEntry.getEntries();
      subFolder = children.find(e => e.isFolder && e.name === subFolderName) || null;
    } catch (e) {}

    if (!subFolder) {
      try {
        if (typeof parentEntry.createFolder === "function") {
          subFolder = await parentEntry.createFolder(subFolderName);
        } else {
          subFolder = await parentEntry.createEntry(subFolderName, { type: types.folder });
        }
      } catch (mkErr) {
        throw new Error("Failed to create 'Working File' folder: " + (mkErr.message || mkErr));
      }
    }

    if (!subFolder) throw new Error("Could not resolve 'Working File' subfolder.");

    // 5. Create output file entry inside subfolder
    let fileEntry = null;
    try {
      if (typeof subFolder.createFile === "function") {
        fileEntry = await subFolder.createFile(outFileName, { overwrite: true });
      } else {
        fileEntry = await subFolder.createEntry(outFileName, { type: types.file, overwrite: true });
      }
    } catch (fileErr) {
      throw new Error("Failed to create file: " + (fileErr.message || fileErr));
    }

    const token = await localFS.createSessionToken(fileEntry);

    // 6. Save as PSD – all layers preserved
    let saved = false;
    let saveErr = "";

    await core.executeAsModal(async () => {
      app.activeDocument = doc;

      // Try DOM saveAs.psd first
      try {
        if (doc.saveAs && typeof doc.saveAs.psd === "function") {
          await doc.saveAs.psd(fileEntry, {
            embedColorProfile: true,
            maximizeCompatibility: true
          }, true);
          saved = true;
        }
      } catch (domErr) {
        saveErr = domErr.message || String(domErr);
      }

      // batchPlay fallback
      if (!saved) {
        try {
          await batchPlay([
            {
              _obj: "save",
              as: {
                _obj: "photoshop35Format",
                embedColorProfile: true,
                maximizeCompatibility: true,
                saveAlpha: true,
                layers: true
              },
              in: { _path: token, _kind: "local" },
              documentID: doc.id,
              copy: true,
              lowerCase: true,
              saveStage: { _enum: "saveStageType", _value: "saveSucceeded" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ], { synchronousExecution: true });
          saved = true;
        } catch (bpErr) {
          saveErr = bpErr.message || String(bpErr);
        }
      }

      if (!saved) throw new Error("PSD save failed: " + (saveErr || "Unknown error"));

    }, { commandName: "Save Working File (PSD)" });

    return subFolderName + "/" + outFileName;
  },

  /**
   * Color Correction:
   * Balanced auto-contrast and tonal levels correction (without sRGB conversion)
   * @param {boolean} applyToAll - Apply to all open documents in Photoshop
   */
  async applyColorCorrection(applyToAll = false) {
    return await this.executeOnTargetDocs(applyToAll, async (doc) => {
      // 1. Deselect any active selection first
      try {
        await batchPlay([
          {
            _obj: "set",
            _target: [{ _ref: "channel", _property: "selection" }],
            to: { _enum: "ordinal", _value: "none" },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (e) {}

      // 2. Auto Levels (balanced contrast and tonal dynamic range)
      try {
        await batchPlay([
          {
            _obj: "autoLevels",
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (alErr) {}

      // 3. Auto Contrast
      try {
        await batchPlay([
          {
            _obj: "autoContrast",
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (acErr) {}
    }, "Adjustment: Color Correction");
  }

};

window.PSAutomation = PSAutomation;
window.AdjustmentModule = PSAutomation;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PSAutomation;
}

/**
 * Editing Adjustments Module:
 * - Wrinkle on clothing (Frequency Separation & Save for Evoto)
 * - Shadow (Natural contact & drop shadow)
 * - Color Correction & sRGB
 */
const { app, core, action } = require("photoshop");
const batchPlay = action.batchPlay;

const AdjustmentModule = {
  /**
   * Frequency Separation (Wrinkle Retouch Action):
   * Built exactly from user's "Wrinkle On CLothing / Frequency Separation.atn":
   * 1. High layer (Linear Light, Apply Image Subtract/Add with Blur)
   * 2. Blur with mask (Gaussian Blur 37.5px with Black Hide-All Mask)
   * 3. Blur layer (Gaussian Blur 8.0px)
   * 4. Enclosed in group: "Wrinkle Retouch"
   */
  async applyFrequencySeparation() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document in Photoshop.");

    return await core.executeAsModal(async () => {
      let currentLayer = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
      if (!currentLayer) throw new Error("No layer selected to retouch.");

      if (currentLayer.isBackgroundLayer) {
        currentLayer.isBackgroundLayer = false;
      }
      if (currentLayer.locked) {
        currentLayer.locked = false;
      }

      // Step 1: Create a merged stamp or duplicate active layer as "Blur"
      let blurLayer = null;
      try {
        await batchPlay([
          {
            _obj: "mergeVisible",
            duplicate: true,
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
        blurLayer = doc.activeLayers[0];
      } catch (e) {
        blurLayer = await currentLayer.duplicate();
      }

      if (!blurLayer) {
        blurLayer = await currentLayer.duplicate();
      }
      blurLayer.name = "Blur";

      // Step 2: Create "High" layer duplicate from blurLayer
      const highLayer = await blurLayer.duplicate();
      highLayer.name = "High";

      // Step 3: On "Blur" layer, apply Gaussian Blur with Radius 8.0 px
      doc.activeLayers = [blurLayer];
      try {
        await batchPlay([
          {
            _obj: "gaussianBlur",
            radius: { _unit: "pixelsUnit", _value: 8.0 },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (gbErr1) {}

      // Step 4: On "High" layer, Apply Image with "Blur" layer
      doc.activeLayers = [highLayer];
      const is16Bit = doc.bitsPerChannel === 16;
      let applied = false;
      try {
        await batchPlay([
          {
            _obj: "applyImageEvent",
            with: {
              _obj: "calculation",
              to: { _ref: "channel", _enum: "channel", _value: "RGB" },
              layer: "Blur",
              calculation: { _enum: "calculation", _value: is16Bit ? "add" : "subtract" },
              scale: 2,
              offset: is16Bit ? 0 : 128,
              invert: is16Bit
            },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
        applied = true;
      } catch (appErr) {}

      if (!applied) {
        // Fallback: High Pass filter with 8.0 px
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

      // Set "High" layer blend mode to Linear Light
      try {
        await batchPlay([
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
      } catch (bmErr) {}

      // Step 5: Duplicate "Blur" layer as "Blur with mask"
      doc.activeLayers = [blurLayer];
      const blurWithMask = await blurLayer.duplicate();
      blurWithMask.name = "Blur with mask";
      doc.activeLayers = [blurWithMask];

      // On "Blur with mask", apply Gaussian Blur with Radius 37.5 px & Hide-All Mask
      try {
        await batchPlay([
          {
            _obj: "gaussianBlur",
            radius: { _unit: "pixelsUnit", _value: 37.5 },
            dialogOptions: "dontDisplay"
          },
          {
            _obj: "make",
            new: { _class: "channel" },
            at: { _ref: "channel", _enum: "channel", _value: "mask" },
            using: { _enum: "userMaskOptions", _value: "hideAll" },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (bwmErr) {}

      // Step 6: Create Group "Wrinkle Retouch"
      try {
        if (typeof doc.createLayerGroup === "function") {
          await doc.createLayerGroup({
            name: "Wrinkle Retouch",
            fromLayers: [highLayer, blurWithMask, blurLayer]
          });
        }
      } catch (grpErr) {}

      // Step 7: Select "Blur with mask" layer ready for painting on wrinkles
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
              type: {
                _obj: "curves",
                curve: [
                  {
                    _obj: "channelType",
                    channel: { _enum: "channelType", _value: "composite" },
                    curvePoints: [
                      { _obj: "paint", horizontal: 0, vertical: 0 },
                      { _obj: "paint", horizontal: 128, vertical: 165 },
                      { _obj: "paint", horizontal: 255, vertical: 255 }
                    ]
                  }
                ]
              }
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
        // Fallback: 50% Gray Soft Light layer
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
              type: {
                _obj: "curves",
                curve: [
                  {
                    _obj: "channelType",
                    channel: { _enum: "channelType", _value: "composite" },
                    curvePoints: [
                      { _obj: "paint", horizontal: 0, vertical: 0 },
                      { _obj: "paint", horizontal: 128, vertical: 95 },
                      { _obj: "paint", horizontal: 255, vertical: 255 }
                    ]
                  }
                ]
              }
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
        // Fallback: 50% Gray Soft Light layer
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

      // 3. Put in Group
      try {
        if (typeof doc.createLayerGroup === "function" && dodgeLayer && burnLayer) {
          await doc.createLayerGroup({
            name: "Dodge & Burn (Clothing)",
            fromLayers: [dodgeLayer, burnLayer]
          });
        }
      } catch (grpErr) {}

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

window.AdjustmentModule = AdjustmentModule;

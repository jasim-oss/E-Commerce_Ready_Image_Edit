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
   * Frequency Separation (Clothing Retouching):
   * Creates a dedicated High/Low frequency group:
   * - Low Frequency: Blurs color/tone for smooth wrinkle removal
   * - High Frequency: Keeps fabric texture sharp with Linear Light blend
   */
  async applyFrequencySeparation() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document in Photoshop.");

    return await core.executeAsModal(async () => {
      let currentLayer = doc.activeLayers[0];
      if (!currentLayer) throw new Error("No layer selected to retouch.");

      if (currentLayer.isBackgroundLayer) {
        currentLayer.isBackgroundLayer = false;
      }
      if (currentLayer.locked) {
        currentLayer.locked = false;
      }

      // 1. Create Low Frequency (Color / Tone) Layer
      const lowFreq = await currentLayer.duplicate();
      lowFreq.name = "Low Frequency (Color / Tone)";
      doc.activeLayers = [lowFreq];

      try {
        await batchPlay([
          {
            _obj: "gaussianBlur",
            radius: { _unit: "pixelsUnit", _value: 4.0 },
            dialogOptions: "dontDisplay"
          }
        ], { synchronousExecution: true });
      } catch (e) {
        try {
          await batchPlay([
            {
              _obj: "surfaceBlur",
              radius: { _unit: "pixelsUnit", _value: 6 },
              threshold: 20,
              dialogOptions: "dontDisplay"
            }
          ], { synchronousExecution: true });
        } catch (e2) {}
      }

      // 2. Create High Frequency (Texture) Layer
      const highFreq = await currentLayer.duplicate();
      highFreq.name = "High Frequency (Texture)";
      doc.activeLayers = [highFreq];

      try {
        await batchPlay([
          {
            _obj: "highPass",
            radius: { _unit: "pixelsUnit", _value: 4.0 },
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

      // 3. Put both in a Layer Group
      try {
        if (typeof doc.createLayerGroup === "function") {
          await doc.createLayerGroup({
            name: "Frequency Separation (Clothing)",
            fromLayers: [lowFreq, highFreq]
          });
        }
      } catch (grpErr) {}

      // 4. Select Low Frequency layer so user can immediately paint or smooth wrinkles
      try {
        doc.activeLayers = [lowFreq];
      } catch (selErr) {}
    }, { commandName: "Frequency Separation (Clothing)" });
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

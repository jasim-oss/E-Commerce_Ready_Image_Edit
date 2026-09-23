/**
 * Editing Adjustments Module:
 * - Wrinkle on clothing
 * - Shadow (Natural contact & drop shadow)
 * - Color Correction & sRGB
 */
const { app, core, action } = require("photoshop");
const batchPlay = action.batchPlay;

const AdjustmentModule = {
  /**
   * Wrinkle on clothing:
   * Creates a dedicated smoothing frequency separation / surface blur layer
   * allowing non-destructive smoothing of fabric wrinkles.
   */
  async smoothClothingWrinkles() {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document.");

    return await core.executeAsModal(async () => {
      // 1. Duplicate active layer as "Wrinkle Smoothing"
      const currentLayer = doc.activeLayers[0];
      const smoothLayer = await currentLayer.duplicate();
      smoothLayer.name = "Wrinkle Smoothing (Surface Blur)";
      smoothLayer.opacity = 65;

      // 2. Apply Surface Blur to soften fabric micro-wrinkles while preserving edges
      await batchPlay([
        {
          _obj: "surfaceBlur",
          radius: { _unit: "pixelsUnit", _value: 8 },
          threshold: 20,
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });
    }, { commandName: "Adjustment: Wrinkle on Clothing" });
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
          _options: { dialogOptions: "dontDisplay" }
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
          _options: { dialogOptions: "dontDisplay" }
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
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: true });
    }, { commandName: "Adjustment: Color Correction" });
  }
};

window.AdjustmentModule = AdjustmentModule;

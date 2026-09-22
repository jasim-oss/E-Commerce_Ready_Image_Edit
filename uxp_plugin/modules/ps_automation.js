/**
 * Photoshop Automation Module using UXP batchPlay & DOM API
 */
const { app, core, action } = require("photoshop");
const batchPlay = action.batchPlay;

const PSAutomation = {
  /**
   * Run Photoshop Native "Select Subject" AI
   */
  async selectSubject() {
    return await core.executeAsModal(async () => {
      const result = await batchPlay(
        [
          {
            _obj: "autoCutout",
            sampleAllLayers: false,
            _options: { dialogOptions: "dontDisplay" }
          }
        ],
        { synchronousExecution: true }
      );
      return result;
    }, { commandName: "Amazon: Select Subject" });
  },

  /**
   * Convert Active Selection into a Layer Mask on Active Layer
   */
  async createMaskFromSelection() {
    return await core.executeAsModal(async () => {
      return await batchPlay(
        [
          {
            _obj: "make",
            new: { _class: "channel" },
            at: { _ref: "channel", _enum: "channel", _value: "mask" },
            using: { _enum: "userMaskOptions", _value: "revealSelection" },
            _options: { dialogOptions: "dontDisplay" }
          }
        ],
        { synchronousExecution: true }
      );
    }, { commandName: "Amazon: Create Mask" });
  },

  /**
   * Create Pure White (#FFFFFF) Solid Background Layer behind current layer
   */
  async createPureWhiteBackground() {
    return await core.executeAsModal(async () => {
      // 1. Create solid color fill layer with RGB(255, 255, 255)
      await batchPlay(
        [
          {
            _obj: "make",
            _target: [{ _ref: "contentLayer" }],
            using: {
              _obj: "contentLayer",
              type: {
                _obj: "solidColorLayer",
                color: {
                  _obj: "RGBColor",
                  red: 255,
                  grain: 255,
                  blue: 255
                }
              }
            },
            _options: { dialogOptions: "dontDisplay" }
          },
          // 2. Move background layer to the bottom of the layer stack
          {
            _obj: "move",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            to: { _ref: "layer", _enum: "ordinal", _value: "back" },
            _options: { dialogOptions: "dontDisplay" }
          }
        ],
        { synchronousExecution: true }
      );
    }, { commandName: "Amazon: Add Pure White BG" });
  },

  /**
   * Scale and Center Subject to comply with Amazon's 85% rule
   * @param {number} fillRatio - Default 0.85 (85%)
   * @param {number} targetCanvasSize - Default 2000 px
   */
  async fitAndCenterSubject(fillRatio = 0.85, targetCanvasSize = 2000) {
    const doc = app.activeDocument;
    if (!doc) throw new Error("No active document found.");

    return await core.executeAsModal(async () => {
      // 1. Resize Canvas to square Amazon standard first
      await doc.resizeCanvas(targetCanvasSize, targetCanvasSize, app.Constants.AnchorPosition.MIDDLECENTER);

      // 2. Select Product Layer
      const activeLayer = doc.activeLayers[0];
      if (!activeLayer) throw new Error("Product layer not selected.");

      const bounds = activeLayer.bounds;
      const layerWidth = bounds.right - bounds.left;
      const layerHeight = bounds.bottom - bounds.top;

      if (layerWidth <= 0 || layerHeight <= 0) {
        throw new Error("Invalid layer bounds detected.");
      }

      // 3. Compute target dimension based on Amazon 85% rule
      const maxTargetDimension = targetCanvasSize * fillRatio;
      const scaleFactor = Math.min(maxTargetDimension / layerWidth, maxTargetDimension / layerHeight) * 100;

      // 4. Scale layer proportionally
      await activeLayer.scale(scaleFactor, scaleFactor, app.Constants.AnchorPosition.MIDDLECENTER);

      // 5. Re-center layer on canvas (target center = targetCanvasSize / 2)
      const updatedBounds = activeLayer.bounds;
      const curCenterX = (updatedBounds.left + updatedBounds.right) / 2;
      const curCenterY = (updatedBounds.top + updatedBounds.bottom) / 2;
      const deltaX = (targetCanvasSize / 2) - curCenterX;
      const deltaY = (targetCanvasSize / 2) - curCenterY;

      await activeLayer.translate(deltaX, deltaY);
    }, { commandName: "Amazon: 85% Fit & Center" });
  },

  /**
   * Convert Document Color Profile to standard sRGB IEC61966-2.1
   */
  async convertToSRGB() {
    return await core.executeAsModal(async () => {
      await batchPlay(
        [
          {
            _obj: "convertMode",
            to: {
              _obj: "RGBColorMode"
            },
            _options: { dialogOptions: "dontDisplay" }
          },
          {
            _obj: "convertToProfile",
            destination: "sRGB IEC61966-2.1",
            intent: {
              _enum: "intent",
              _value: "colorimetric"
            },
            blackPointCompensation: true,
            dither: true,
            _options: { dialogOptions: "dontDisplay" }
          }
        ],
        { synchronousExecution: true }
      );
    }, { commandName: "Amazon: Convert to sRGB" });
  },

  /**
   * Add a Natural Ground Contact Shadow under product
   */
  async addNaturalContactShadow() {
    const doc = app.activeDocument;
    if (!doc) return;

    return await core.executeAsModal(async () => {
      // Create subtle drop shadow / contact shadow using layer style
      await batchPlay(
        [
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
                opacity: { _unit: "percentUnit", _value: 20 },
                useGlobalAngle: false,
                localLightingAngle: { _unit: "angleUnit", _value: 90 },
                distance: { _unit: "pixelsUnit", _value: 14 },
                chokeMatte: { _unit: "pixelsUnit", _value: 0 },
                blur: { _unit: "pixelsUnit", _value: 28 }
              }
            },
            _options: { dialogOptions: "dontDisplay" }
          }
        ],
        { synchronousExecution: true }
      );
    }, { commandName: "Amazon: Add Contact Shadow" });
  }
};

window.PSAutomation = PSAutomation;

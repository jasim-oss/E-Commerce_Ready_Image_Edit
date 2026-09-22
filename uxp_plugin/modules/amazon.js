/**
 * Amazon Marketplace Automation Orchestrator
 */
const AmazonModule = {
  /**
   * Run Complete One-Click Amazon Pipeline
   */
  async runFullAmazonAutoFit(options = {}) {
    const {
      canvasSize = 2000,
      fillRatio = 0.85,
      shadowType = "natural",
      autoSRGB = true,
      log = console.log
    } = options;

    log("Starting Amazon Auto-Fit Pipeline...", "info");

    try {
      // Step 1: Color Space to sRGB
      if (autoSRGB) {
        log("[1/5] Converting color profile to sRGB...", "info");
        await window.PSAutomation.convertToSRGB();
      }

      // Step 2: Photoshop AI Select Subject & Mask
      log("[2/5] Running Photoshop AI Select Subject...", "info");
      await window.PSAutomation.selectSubject();
      await window.PSAutomation.createMaskFromSelection();
      log("Subject selected and cleanly masked.", "success");

      // Step 3: Pure White Background (#FFFFFF)
      log("[3/5] Generating Pure White #FFFFFF background...", "info");
      await window.PSAutomation.createPureWhiteBackground();

      // Step 4: Fit to 85% and Center in 2000x2000 Canvas
      log(`[4/5] Resizing canvas to ${canvasSize}x${canvasSize} & fitting to ${Math.round(fillRatio * 100)}%...`, "info");
      await window.PSAutomation.fitAndCenterSubject(fillRatio, canvasSize);
      log("Product fitted and centered strictly to Amazon guidelines.", "success");

      // Step 5: Shadow
      if (shadowType === "natural" || shadowType === "soft_drop") {
        log("[5/5] Applying natural contact shadow...", "info");
        await window.PSAutomation.addNaturalContactShadow();
      } else if (shadowType === "ai_shadow") {
        log("[5/5] Invoking Local Python AI Shadow engine...", "info");
        // Handled via AI Bridge
      } else {
        log("[5/5] Pure clean background retained without shadow.", "info");
      }

      log("🎉 Amazon Auto-Fit Completed Successfully!", "success");
      return true;
    } catch (err) {
      log(`Error in Amazon Pipeline: ${err.message}`, "error");
      throw err;
    }
  }
};

window.AmazonModule = AmazonModule;

/**
 * Local Python AI Service Bridge
 */
const AIBridge = {
  baseUrl: "http://127.0.0.1:8000",
  isOnline: false,

  /**
   * Check connection to Python AI backend
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        this.isOnline = true;
        return { online: true, data };
      }
    } catch (err) {
      this.isOnline = false;
    }
    return { online: false };
  },

  /**
   * Request realistic contact/ground shadow from Python AI
   */
  async generateAIShadow(imageDataBase64, shadowConfig = {}) {
    if (!this.isOnline) {
      throw new Error("Local Python AI backend is not running at http://127.0.0.1:8000");
    }

    const res = await fetch(`${this.baseUrl}/api/ai/shadow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imageDataBase64,
        type: shadowConfig.type || "contact",
        intensity: shadowConfig.intensity || 0.35,
        blur: shadowConfig.blur || 15
      })
    });

    if (!res.ok) {
      throw new Error(`AI Shadow generation failed: ${res.statusText}`);
    }
    return await res.json();
  }
};

window.AIBridge = AIBridge;

# E-Commerce Ready Image Edit — Photoshop UXP Plugin 🚀

A high-performance **Adobe Photoshop UXP Panel** built specifically for e-commerce image editing, marketplace compliance (Amazon, eBay, Etsy, Shopify, Walmart, WooCommerce, Zalando), and batch image processing with an **Apple Minimal Dark UI**.

[![GitHub Repository](https://img.shields.io/badge/GitHub-E--Commerce__Ready__Image__Edit-blue?style=flat-square&logo=github)](https://github.com/jasim-oss/E-Commerce_Ready_Image_Edit.git)
[![Adobe UXP](https://img.shields.io/badge/Adobe%20Photoshop-UXP%20v5-purple?style=flat-square&logo=adobephotoshop)](https://developer.adobe.com/photoshop/uxp/)

---

## 🎨 UI Aesthetic: Apple Minimal Dark

The plugin features a custom **Apple Minimal Dark Theme** designed for pro image editors:
- **San Francisco Typographic Hierarchy**
- **iOS-Style Pill Toggle Switches**
- **Compact Control Drawers & Precise Micro-Interactions**
- **Clean Border Strokes & Apple Blue `#007AFF` Accent**

---

## 🚀 Key Features

1. **Marketplace Preset Auto-Resize:**
   - Pre-configured specs for **Amazon (2000x2000 72 DPI)**, **eBay (1600x1600 72 DPI)**, **Etsy**, **Shopify (2048x2048)**, **Walmart (2200x2200 300 DPI)**, **WooCommerce**, **Zalando**, and **Custom Dimensions**.
   - **Smart Edge Anchor:** Detects edge-attached product objects and anchors them intelligently during canvas resizing.

2. **Background Automation:**
   - One-click **BG Remove** (Native Photoshop Select Subject AI).
   - Solid White `#FFFFFF`, Custom Color Picker (Hex), or Custom Image Overlay.

3. **Editing Adjustments:**
   - **Wrinkle on Clothing:** Frequency Separation, Dodge & Burn (D&B), Save for Evoto.
   - **Shadow Generation:** Drop Shadow, Natural Shadow, Existing Shadow, Cast Shadow.
   - **Color Correction:** White Balance for PATH, Auto Color Correction.
   - **Dust & Scratches:** Interactive Dialog Window & Retouch Mask (Radius & Threshold live control).

4. **SCSM Margin Padding:**
   - Automatic percentage margin fitting for **Product**, **Model**, or **Custom Margins (1% - 45%)**.

5. **Batch Processing & Export:**
   - Process single document or **ALL open documents** in Photoshop with one click.
   - Export for delivery in **JPG**, **PNG**, or **WebP** format with sRGB color profile & maximum file size rules.
   - Export **Working File (PSD)** (single document or **ALL open documents** in batch).

---

## 📁 Project Structure

```
Photoshop Panel Making for e-commerce market place/
├── uxp_plugin/                    # Adobe UXP Photoshop Plugin
│   ├── manifest.json              # UXP v5 Plugin Manifest
│   ├── index.html                 # Apple Minimal Interface
│   ├── styles.css                 # Apple Studio Dark Theme Styles
│   ├── main.js                    # Core Panel Controller & Event Listeners
│   ├── modules/
│   │   └── ps_automation.js       # Photoshop batchPlay DOM Automation
│   └── *.ATN                      # Photoshop Action Files (Shadows & Color)
└── python_backend/                # Local Python AI Microservice (Optional)
    ├── app.py                     # FastAPI Server (127.0.0.1:8000)
    └── requirements.txt           # Python AI Dependencies
```

---

## 📥 How Users / Clients Install and Use the Plugin

### Method 1: Installing via `.ccx` Installer Package (Recommended for Clients)

1. Double-click the **`E-Commerce_Ready_Edit.ccx`** installer file.
2. **Adobe Creative Cloud Desktop** will automatically prompt to install the plugin.
3. Click **Install**.
4. Open **Adobe Photoshop** -> Go to **Window > Plugins > E-Commerce Ready Edit**.

---

### Method 2: Developer / Testing Load (Adobe UXP Developer Tool)

1. Open **Adobe UXP Developer Tool (UDT)**.
2. Click **Add Plugin** -> Select `uxp_plugin/manifest.json`.
3. Click **Actions (•••) > Load**.
4. The panel will launch instantly inside Photoshop!

---

## 🔗 Repository & Version Control

- **GitHub Repository:** [https://github.com/jasim-oss/E-Commerce_Ready_Image_Edit.git](https://github.com/jasim-oss/E-Commerce_Ready_Image_Edit.git)
- **Branch:** `main`

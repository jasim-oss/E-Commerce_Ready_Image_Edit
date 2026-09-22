# E-Commerce Auto Photo Editor (Photoshop Panel + AI)

An automated Adobe Photoshop UXP panel built specifically for e-commerce marketplaces, featuring built-in Photoshop automation actions and a local Python AI backend.

---

## 🚀 Key Features (Starting with Amazon)

1. **One-Click Amazon Auto-Fit:**
   - **Pure White Background:** `#FFFFFF` (RGB 255, 255, 255).
   - **85% Frame Fill Rule:** Automatically scales the product to fill 85% of the frame with 7.5% margins.
   - **2000 x 2000 px Standard:** Perfect square high-res canvas for Amazon zoom.
   - **Auto sRGB:** Converts document color profile to `sRGB IEC61966-2.1`.
   - **Realistic Shadows:** Natural contact shadow, soft drop shadow, or AI ground shadow.
2. **Dual AI Integration:**
   - **Photoshop Built-In AI:** Native `Select Subject` and edge-aware masking.
   - **Python Local Backend:** Custom realistic shadow generation, edge refinement, and model integration.
3. **Multi-Marketplace Architecture:**
   - Amazon (Active)
   - Shopify, eBay, Walmart, Etsy (Modular tabs ready for next iterations).

---

## 📁 Project Structure

```
Photoshop Panel Making for e-commerce market place/
├── uxp_plugin/                    # Adobe UXP Photoshop Panel
│   ├── manifest.json              # UXP v5 Plugin Manifest
│   ├── index.html                 # Modern Panel Interface
│   ├── styles.css                 # Dark theme Photoshop UI
│   ├── main.js                    # UI Event handlers
│   └── modules/
│       ├── ps_automation.js       # Photoshop batchPlay DOM functions
│       ├── amazon.js              # Amazon compliance orchestrator
│       └── ai_bridge.js           # Python AI backend bridge
└── python_backend/                # Local Python AI Service
    ├── app.py                     # FastAPI server (127.0.0.1:8000)
    ├── requirements.txt           # Python dependencies
    └── services/
        └── shadow_service.py      # Photorealistic shadow engine
```

---

## 🛠️ How to Run & Test in Photoshop

### 1. Load the Plugin in Photoshop (UXP Developer Tool)
1. Download or open **Adobe UXP Developer Tool (UDT)** (available for free via Adobe Creative Cloud desktop app).
2. In UDT, click **Add Plugin**.
3. Select the `manifest.json` file inside `uxp_plugin/manifest.json`.
4. Click the **Actions (•••)** menu next to the plugin and choose **Load**.
5. The panel will instantly appear inside Photoshop under **Plugins > E-Commerce Auto Editor**!

### 2. Run the Local Python AI Backend (Optional)
```bash
cd "python_backend"
pip install -r requirements.txt
python app.py
```
The server will start at `http://127.0.0.1:8000`. The panel's header will show a green dot: `AI: Online`.

---

## 🔗 How to Connect This Project to Your GitHub Account

Follow these quick steps in PowerShell or Git Bash:

### Step 1: Create a New Repository on GitHub
1. Go to [https://github.com/new](https://github.com/new).
2. Repository name দিন: e.g. `photoshop-ecommerce-auto-editor`
3. **Private** অথবা **Public** সিলেক্ট করুন।
4. **Initialize with README বা .gitignore টিক মার্ক দেওয়ার প্রয়োজন নেই** (কারণ আমরা অলরেডি লোকালি এগুলো তৈরি করেছি)।
5. **Create repository** বাটনে ক্লিক করুন।

### Step 2: Push Local Code to GitHub
আপনার কম্পিউটারের টার্মিনাল বা PowerShell ওপেন করে নিচের কমান্ডগুলো চালান:

```bash
cd "D:\Current Task\#In-progress\Photoshop Panel Making for e-commerce market place"

# Git remote যুক্ত করুন (YOUR_USERNAME এবং REPO_NAME আপনার গিটহাব অনুযায়ী বসান)
git remote add origin https://github.com/YOUR_USERNAME/photoshop-ecommerce-auto-editor.git

# কোড গিটহাবে পুশ করুন
git add .
git commit -m "Initial commit: E-Commerce Photoshop UXP panel with Amazon automation and Python AI backend"
git push -u origin main
```

 ██████╗██████╗ ██╗███████╗███╗   ███╗    █████╗ ██╗
██╔══██╗██╔══██╗██║██╔════╝████╗ ████║   ██╔══██╗██║
██████╔╝██████╔╝██║███████╗██╔████╔██║   ███████║██║
██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║   ██╔══██║██║
██║     ██║  ██║██║███████║██║ ╚═╝ ██║   ██║  ██║██║
╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝   ╚═╝  ╚═╝╚═╝
AI-Powered Database Management Engine · Create · Query · Explore
Electron React Vite TypeScript Supabase TailwindCSS

🚀 PRISM AI DESKTOP 🚀

✦ Overview
Prism AI is a powerful, AI-driven database management desktop application that lets you create, manage, and explore databases using natural human language. No complex queries, no steep learning curve — just tell Prism AI what you want, and it handles the rest. Built with a strong focus on safety, simplicity, and a user‑friendly experience, making database management accessible directly from your desktop.

"See your data clearly. Manage it naturally."

✦ Key Features
| Feature | Description |
|---|---|
| 🧠 Human Language Management | Control your database using natural language prompts without writing SQL |
| 🔐 Built-in Safety Mode | Prevents dangerous or destructive operations, accidental data loss, and unauthorized schema changes |
| 🎨 Native Desktop Experience | Fast, lightweight Electron-based desktop app with a clean and modern interface |
| 🔌 Easy Project Integration | Seamlessly connect to your existing Supabase projects or external databases |
| 🔍 Simple Data Exploration | Browse tables visually and ask questions in natural language |

✦ Tech Stack
**Core Application Layer**
| Layer | Technology |
|---|---|
| Desktop Framework | Electron (Electron Forge & Builder) |
| Framework | React 18 + TypeScript |
| Build Tool | Vite + SWC |

**Styling & UI**
| Layer | Technology |
|---|---|
| Styling | Tailwind CSS |
| UI Components | shadcn/ui & Radix UI |
| Icons | Lucide React |
| Charts | Recharts |

**Data Management & State**
| Layer | Technology |
|---|---|
| Database Client | Supabase Client (`@supabase/supabase-js`) |
| State Management| TanStack React Query |
| Form Validation | React Hook Form + Zod |

✦ Project Structure
```text
prism-ai/
│
├── 📄 electron.js                 # Electron main process entry point
├── 📄 forge.config.cjs            # Electron Forge configuration
├── 📄 package.json                # Project dependencies and scripts
├── 📄 vite.config.ts              # Vite bundler configuration
├── 📄 tailwind.config.ts          # Tailwind CSS styling configuration
│
├── 📁 src/                        # React application (Renderer process)
│   ├── 📁 components/             # Reusable UI components (shadcn/ui)
│   ├── 📁 pages/                  # Route-level page components
│   ├── 📁 lib/                    # Utility functions and shared logic
│   └── 📄 main.tsx                # React application entry point
│
├── 📁 public/                     # Static frontend assets
└── 📁 assets/                     # Desktop application icons and assets
```

✦ Getting Started
**Prerequisites**
* Node.js (v18+ recommended)
* npm, yarn, or bun
* Git

**1 · Clone the Repository**
```bash
git clone <YOUR_GIT_URL>
cd prism-ai
```

**2 · Setup & Development**
```bash
# Install dependencies
npm install

# Start the development server (runs Vite and Electron concurrently)
npm run dev
```
The React app runs locally while the Electron window loads it directly.

**3 · Build for Production**
```bash
# Builds the Vite project and packages the Electron application
npm run dist

# Alternatively, use Electron Forge directly to package
npm run package
npm run make
```

✦ AI Interaction Examples
┌──────────────────────────────────────────────────────────────────┐
│  CREATE  │  "Create a users table with name, email, and role"        │
│          │  → Generates table schema and applies it safely           │
├──────────────────────────────────────────────────────────────────┤
│  QUERY   │  "Show me all users created in the last 7 days"           │
│          │  → Fetches records and displays in a clean data table     │
├──────────────────────────────────────────────────────────────────┤
│  MODIFY  │  "Add a safety flag to this database"                     │
│          │  → Alters schema with proper user confirmation            │
└──────────────────────────────────────────────────────────────────┘

✦ Intelligence Pipeline
  Natural Language Input
      │
      ▼
  AI Processing Engine
  ┌─────────────────────────────────────────┐
  │  • Intent Recognition & Parsing         │
  │  • SQL Query / Schema Generation        │
  └─────────────────────────────────────────┘
      │
      ▼
  Safety Validation Layer
  ┌─────────────────────────────────────────┐
  │  • Destructive action detection         │
  │  • Schema constraint validation         │
  │  • User confirmation prompt             │
  └─────────────────────────────────────────┘
      │
      ▼
  Database Execution
  ┌─────────────────────────────────────────┐
  │  • Supabase API Integration             │
  │  • Real-time data fetch/mutation        │
  └─────────────────────────────────────────┘
      │
      ▼
  Clean UI Presentation

✦ Contributing
Contributions are welcome and appreciated! Here's how to get started:

```bash
# 1. Fork the repo
# 2. Create your feature branch
git checkout -b feature/your-amazing-feature

# 3. Make your changes and commit
git commit -m "feat: add your amazing feature"

# 4. Push and open a Pull Request
git push origin feature/your-amazing-feature
```

✦ Acknowledgements
* Electron — for cross-platform desktop application capabilities
* Supabase — for powerful open-source database infrastructure
* shadcn/ui — for beautiful, accessible UI components
* Vite — for the blazing-fast developer experience

Built with ❤️  by Kartikesh Gaonkar
See your data clearly · Manage it naturally

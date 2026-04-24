<div align="center">

```text
██████╗ ██████╗ ██╗███████╗███╗   ███╗     █████╗ ██╗
██╔══██╗██╔══██╗██║██╔════╝████╗ ████║    ██╔══██╗██║
██████╔╝██████╔╝██║███████╗██╔████╔██║    ███████║██║
██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║    ██╔══██║██║
██║     ██║  ██║██║███████║██║ ╚═╝ ██║    ██║  ██║██║
╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝    ╚═╝  ╚═╝╚═╝
```

### AI-Powered Database Management Desktop Application

![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-44bb44?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

</div>

---

🚀 **PRISM AI DESKTOP** 🚀

✦ **Overview**
Prism AI is a powerful, AI-driven database management desktop application that lets you create, manage, and explore databases using natural human language. No complex queries, no steep learning curve — just tell Prism AI what you want, and it handles the rest. Built with a strong focus on safety, simplicity, and a user‑friendly experience, making database management accessible directly from your desktop.

> *"See your data clearly. Manage it naturally."*

✦ **Key Features**
| Feature | Description |
| :--- | :--- |
| 🧠 **Human Language Management** | Control your database using natural language prompts without writing SQL |
| 🔐 **Built-in Safety Mode** | Prevents dangerous or destructive operations and accidental data loss |
| 🎨 **Native Desktop Experience** | Fast, lightweight Electron-based app with a clean, modern interface |
| 🔌 **Easy Project Integration** | Seamlessly connect to your existing Supabase projects |
| 🔍 **Simple Data Exploration** | Browse tables visually and ask questions in natural language |

✦ **Tech Stack**
**Core Application Layer**
| Layer | Technology |
| :--- | :--- |
| Desktop Framework | Electron (Electron Forge & Builder) |
| Framework | React 18 + TypeScript |
| Build Tool | Vite + SWC |

**Styling & UI**
| Layer | Technology |
| :--- | :--- |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui & Radix UI |
| Icons | Lucide React |
| Charts | Recharts |

**Data Management & State**
| Layer | Technology |
| :--- | :--- |
| Database Client | Supabase Client (`@supabase/supabase-js`) |
| State Management| TanStack React Query |
| Form Validation | React Hook Form + Zod |

✦ **Project Structure**
```text
prism-ai/
│
├── 📄 electron.js                 # Electron main process entry point
├── 📄 forge.config.cjs            # Electron Forge configuration
├── 📄 package.json                # Project dependencies and scripts
├── 📄 vite.config.ts              # Vite bundler configuration
│
├── 📁 src/                        # React application (Renderer process)
│   ├── 📁 components/             # Reusable UI components (shadcn/ui)
│   ├── 📁 pages/                  # Route-level page components
│   └── 📄 main.tsx                # React application entry point
│
├── 📁 public/                     # Static frontend assets
└── 📁 assets/                     # Desktop application icons and assets
```

✦ **Getting Started**
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

**3 · Build for Production**
```bash
# Builds the Vite project and packages the Electron application
npm run dist

# Alternatively, use Electron Forge directly to package
npm run package
npm run make
```

✦ **AI Interaction Examples**
| User Prompt | Prism Action |
| :--- | :--- |
| **"Create a users table..."** | Generates schema & applies it safely |
| **"Show me all users..."** | Fetches & displays in data table |
| **"Add a safety flag..."** | Alters schema with user confirmation |

✦ **Intelligence Pipeline**
```text
1. 💡 Natural Language Input
       ↓
2. 🤖 AI Processing (NLP → SQL)
       ↓
3. 🛡️ Safety Validation Layer
       ↓
4. ⚡ Database Execution (Supabase)
       ↓
5. ✨ Results Presentation (UI)
```

✦ **Contributing**
Contributions are welcome and appreciated!
```bash
# 1. Fork the repo
# 2. Create your feature branch
git checkout -b feature/your-amazing-feature

# 3. Make your changes and commit
git commit -m "feat: add your amazing feature"

# 4. Push and open a Pull Request
git push origin feature/your-amazing-feature
```

✦ **Acknowledgements**
* **Electron** — for cross-platform desktop application capabilities
* **Supabase** — for powerful open-source database infrastructure
* **shadcn/ui** — for beautiful, accessible UI components
* **Vite** — for the blazing-fast developer experience

Built with ❤️ by **Kartikesh Gaonkar**
*See your data clearly · Manage it naturally*

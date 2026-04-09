<img src="Media/paradox-header.png" alt="Paradox AntiCheat Logo">

# Getting Involved

Paradox AntiCheat is an open-source project maintained and developed by multiple contributors over the years. We welcome anyone who wants to help improve the project.

If you need assistance at any time, join the Discord support server and reach out to a maintainer.

---

# Tech Stack

Paradox is written in **TypeScript**, a superset of JavaScript that adds static typing and stricter structure.

### Why TypeScript?

* Detects errors before runtime
* Improves maintainability
* Prevents common scripting mistakes
* Saves time when developing for Minecraft Bedrock

Because Minecraft scripting environments require reloading worlds to test changes, TypeScript helps catch many issues before that step is even necessary.

---

# Development Environment Setup

Follow the steps below to configure your local environment.

---

## 1️⃣ Install Visual Studio Code

Download and install VS Code:

[https://code.visualstudio.com/](https://code.visualstudio.com/)

Alternatively, on Linux you can install via your package manager:

```bash
sudo apt update
sudo apt install code
```

---

## 2️⃣ Install Node.js (Automatic Setup)

This project includes automated setup scripts that install:

* Latest **nvm** (Linux only)
* Latest **Node.js LTS**
* Sets LTS as default version

### Linux

From the project root:

```bash
chmod +x ./bin/setup-node-linux.sh
./bin/setup-node-linux.sh
```

### Windows (PowerShell)

From the project root:

```powershell
bin\setup-node-windows.ps1
```

---

## 3️⃣ Install Project Dependencies

After Node.js is installed, run:

```bash
npm install
```

---

## 4️⃣ Fork and Clone the Repository

1. Fork the repository on GitHub.
2. Clone your fork:

```bash
git clone https://github.com/<your-github-username>/Paradox_AntiCheat.git
cd Paradox_AntiCheat
```

---

## 5️⃣ Open the Project in VS Code

```bash
code .
```

---

# Making Changes

1. Edit files using VS Code
2. Save your changes

---

# Committing Changes

Stage your changes:

```bash
git add .
```

Commit with a meaningful message:

```bash
git commit -m "Your commit message here"
```

---

# Pushing Changes to Your Fork

```bash
git push origin main
```

---

# Creating a Pull Request

1. Go to your fork on GitHub.
2. Click **Compare & pull request**.
3. Provide a clear description of your changes.
4. Submit the PR.

Project maintainers will review your request and may provide feedback before merging.

---

# Contribution Guidelines

To improve review speed:

* Follow existing code style.
* Keep PRs focused (avoid massive unrelated changes).
* Clearly explain *why* changes were made.
* Test builds before submitting.

---

Thank you for contributing to Paradox AntiCheat 🚀

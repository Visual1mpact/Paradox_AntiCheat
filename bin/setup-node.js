#!/usr/bin/env node

import { execSync } from "node:child_process";

function run(command) {
    execSync(command, { stdio: "inherit", shell: "/bin/bash" });
}

function runOutput(command) {
    return execSync(command, {
        encoding: "utf8",
        shell: "/bin/bash",
    }).trim();
}

function getLatestNvmVersion() {
    const version = runOutput(`curl -s https://api.github.com/repos/nvm-sh/nvm/releases/latest | grep 'tag_name' | cut -d '"' -f4`);

    return version;
}

function nvmExists() {
    try {
        execSync("command -v nvm", {
            stdio: "ignore",
            shell: "/bin/bash",
        });
        return true;
    } catch {
        return false;
    }
}

try {
    console.log("🔎 Checking for nvm...");

    if (!nvmExists()) {
        console.log("📦 Installing latest nvm...");

        const latest = getLatestNvmVersion();
        console.log(`➡ Latest nvm version: ${latest}`);

        run(`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${latest}/install.sh | bash`);
    }

    const loadNvm = `
export NVM_DIR="$HOME/.nvm";
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh";
`;

    console.log("🚀 Installing latest Node.js LTS...");
    run(`${loadNvm} nvm install --lts`);

    console.log("🔁 Setting latest LTS as default...");
    run(`${loadNvm} nvm alias default 'lts/*'`);

    console.log("✅ Using latest LTS...");
    run(`${loadNvm} nvm use --lts`);

    console.log("🎉 Done! Current versions:");
    run(`${loadNvm} nvm --version`);
    run("node -v");
} catch (err) {
    console.error("❌ Setup failed:", err.message);
    process.exit(1);
}

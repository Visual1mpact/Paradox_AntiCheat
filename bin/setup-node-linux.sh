#!/usr/bin/env bash
set -e

echo "🔎 Checking for nvm..."

# Check if nvm exists
if command -v nvm >/dev/null 2>&1; then
    echo "✅ nvm is already installed."
else
    echo "📦 Installing latest nvm..."
    latest=$(curl -s https://api.github.com/repos/nvm-sh/nvm/releases/latest | grep 'tag_name' | cut -d '"' -f4)
    echo "➡ Latest nvm version: $latest"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/$latest/install.sh | bash
fi

# Load nvm for this shell session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "🚀 Installing latest Node.js LTS..."
nvm install --lts

echo "🔁 Setting latest LTS as default..."
nvm alias default 'lts/*'

echo "✅ Using latest LTS..."
nvm use --lts

echo "🎉 Done! Current versions:"
nvm --version
node -v
npm -v

echo "💡 Now you can run 'npm install' to install all dependencies."

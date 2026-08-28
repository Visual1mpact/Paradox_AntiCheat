<div align="center">
  <img src="docs/Media/paradox-header.png" alt="Paradox AntiCheat Logo" width="600">

  <h1>Paradox AntiCheat</h1>
  <p><strong>High-performance security for Minecraft Bedrock (Realms &amp; BDS)</strong></p>

  <p>
    <a href="https://minecraft.net">
      <img src="https://img.shields.io/badge/Minecraft%20Bedrock-v1.26.40-brightgreen?style=for-the-badge&amp;logo=minecraft" alt="Compatibility">
    </a>
    <a href="https://discord.gg/qVd53N2xhq">
      <img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&amp;logo=discord&amp;logoColor=white" alt="Discord">
    </a>
    <a href="https://visual1mpact.github.io/Paradox_AntiCheat/#/">
      <img src="https://img.shields.io/badge/Documentation-Read%20Now-007ACC?style=for-the-badge&amp;logo=gitbook&amp;logoColor=white" alt="Docs">
    </a>
  </p>
</div>

<hr>

<div align="center">

### 📦 API Compatibility Matrix

| API Module | Required Version | Description / Purpose |
| :---: | :---: | :--- |
| `@minecraft/server` | `2.10.0-Beta` | Core Script Engine API for world events, entity handling, block management, and main logic loops. |
| `@minecraft/server-net` | `1.0.0-Beta` | Handles external HTTP network communication for remote logging, telemetry, and external server synchronization. |
| `@minecraft/server-admin` | `1.0.0-Beta` | Manages elevated server administrative functions, secret configuration properties, and execution variables. |
| `@minecraft/server-ui` | `2.2.0-Beta` | Renders custom in-game UI menus, dynamic modal dialogs, and action forms directly to players. |

</div>

<hr>


<h2>📖 About Paradox AntiCheat</h2>

<p>
  Paradox AntiCheat is a high-performance anti-cheat system engineered for <strong>Minecraft Bedrock Edition</strong>. Designed for seamless integration into both <strong>Realms</strong> and <strong>BDS (Dedicated Server)</strong> environments, it ensures a balanced and fair gameplay experience for everyone.
</p>

<blockquote>
  <p><strong>Paradox</strong> <em>(noun)</em>: A statement or situation that contradicts itself, yet reveals a fundamental truth.</p>
</blockquote>

<p>
  The name reflects our philosophy: leveraging advanced, non-obvious detection algorithms to outsmart cheaters in ways that seem counterintuitive on the surface.
</p>

<h3>Key Highlights</h3>
<ul>
  <li><strong>Modular Design:</strong> Tailor individual checks and enforcement rules to match your server's needs.</li>
  <li><strong>Realms &amp; BDS Ready:</strong> Native support for both official Minecraft Realms and custom Dedicated Servers.</li>
  <li><strong>Developer Friendly:</strong> Simple setup workflow with comprehensive documentation.</li>
</ul>

<p>
  For complete integration instructions and API references, check out the 
  <a href="https://visual1mpact.github.io/Paradox_AntiCheat/#/">Official Documentation</a>.
</p>

<hr>

<div align="center">
  <h2>📊 Project Status &amp; Metrics</h2>
  <p>
    <a href="https://www.codefactor.io/repository/github/Visual1mpact/paradox_anticheat">
      <img src="https://img.shields.io/codefactor/grade/github/Visual1mpact/paradox_anticheat/rewrite?style=for-the-badge&amp;logo=codefactor" alt="CodeFactor Grade">
    </a>
    <a href="https://github.com/Visual1mpact/Paradox_AntiCheat/releases">
      <img src="https://img.shields.io/github/downloads/Visual1mpact/Paradox_AntiCheat/total?style=for-the-badge&amp;color=blue" alt="Total Downloads">
    </a>
    <a href="https://github.com/Visual1mpact/Paradox_AntiCheat/releases/latest">
      <img src="https://img.shields.io/github/downloads/Visual1mpact/Paradox_AntiCheat/latest/total?style=for-the-badge&amp;color=teal" alt="Latest Downloads">
    </a>
    <a href="https://github.com/Visual1mpact/Paradox_AntiCheat/commits">
      <img src="https://img.shields.io/github/commit-activity/m/Visual1mpact/Paradox_AntiCheat?style=for-the-badge" alt="Commit Activity">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/Visual1mpact/Paradox_AntiCheat?style=for-the-badge&amp;color=orange" alt="License">
    </a>
  </p>
</div>

<hr>

<h2>🚀 Quick Start Guide</h2>

<h3>1. Installation</h3>
<ol>
  <li>
    Download the latest release from the <a href="https://github.com/Visual1mpact/Paradox_AntiCheat/releases">Releases</a> page based on your server setup:
    <ul>
      <li><strong>Realms &amp; Singleplayer:</strong> Download the <code>.mcpack</code> file.</li>
      <li><strong>Bedrock Dedicated Server (BDS):</strong> Download the <code>.zip</code> file.</li>
    </ul>
  </li>
  <li>
    Apply the anti-cheat to your server:
    <ul>
      <li><strong>Realms / Singleplayer:</strong> Import the <code>.mcpack</code> file directly and apply it to your world's <strong>Behavior Packs</strong>.</li>
      <li><strong>BDS:</strong> Extract the <code>.zip</code> file directly into your server's <code>behavior_packs</code> folder and register the folder name in <code>world_behavior_packs.json</code>.</li>
    </ul>
  </li>
  <li>Move the pack to the <strong>top priority position</strong> in your active list.</li>
  <li>Enable <strong>Beta APIs</strong> in your World Settings under Experiments.</li>
</ol>


<blockquote>
  <p>⚠️ <strong>Important:</strong> Setting the pack to the highest priority and enabling <strong>Beta APIs</strong> are strictly required for state detection and event hooks to work.</p>
</blockquote>

<h3>2. Versioning Format</h3>
<p>Paradox follows a <code>Major.Minor.Patch</code> semantic scheme:</p>

<table>
  <thead>
    <tr>
      <th align="center">Segment</th>
      <th align="left">Meaning</th>
      <th align="left">Example Scenario</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><strong><code>X</code></strong>.0.0</td>
      <td><strong>Major Version</strong></td>
      <td>Core architecture overhauls or breaking changes</td>
    </tr>
    <tr>
      <td align="center">0.<strong><code>X</code></strong>.0</td>
      <td><strong>Major Revision</strong></td>
      <td>Feature additions, feature updates, or check removals</td>
    </tr>
    <tr>
      <td align="center">0.0.<strong><code>X</code></strong></td>
      <td><strong>Minor Revision</strong></td>
      <td>Urgent patches, bug fixes, and minor adjustments</td>
    </tr>
  </tbody>
</table>

<hr>

<h2>🛠️ Development Environment Setup</h2>

<h3>Prerequisites &amp; Dependencies</h3>
<ul>
  <li><a href="https://nodejs.org/">Node.js</a> (LTS Version)</li>
  <li><a href="https://code.visualstudio.com/">Visual Studio Code</a></li>
  <li><a href="https://git-scm.com/">Git</a></li>
</ul>

<hr>

<h3>Option A: Linux Setup</h3>
<ol>
  <li>
    <p><strong>Run the Automated Setup Script:</strong></p>
    <pre><code>chmod +x ./bin/setup-node-linux.sh
./bin/setup-node-linux.sh</code></pre>
    <p><em>This automatically installs NVM, fetches the latest Node.js LTS, and sets default aliases.</em></p>
  </li>
  <li>
    <p><strong>Install Node Packages:</strong></p>
    <pre><code>npm install</code></pre>
  </li>
</ol>

<h3>Option B: Windows Setup</h3>
<ol>
  <li>
    <p><strong>Run the Automated PowerShell Script:</strong></p>
    <pre><code>.\bin\setup-node-windows.ps1</code></pre>
    <p><em>This downloads the Node.js LTS installer and updates your system environment path.</em></p>
  </li>
  <li>
    <p><strong>Install Node Packages:</strong></p>
    <pre><code>npm install</code></pre>
  </li>
</ol>

<h3>Option C: Manual Workspace Setup</h3>
<p>If you prefer installing tools manually:</p>
<ol>
  <li>
    <p><strong>Install VS Code via installer or package manager:</strong></p>
    <pre><code>sudo apt update &amp;&amp; sudo apt install code</code></pre>
  </li>
  <li>
    <p><strong>Clone your repository:</strong></p>
    <pre><code>git clone https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat.git
cd Paradox_AntiCheat</code></pre>
  </li>
  <li>
    <p><strong>Install dependencies &amp; launch workspace:</strong></p>
    <pre><code>npm install
code .</code></pre>
  </li>
</ol>

<hr>

<h2>🤝 Contributing</h2>
<p>We welcome contributions! Follow these step-by-step instructions to get started:</p>
<ol>
  <li><strong>Fork the Repository:</strong> Visit the <a href="https://github.com/Visual1mpact/Paradox_AntiCheat/fork">Paradox AntiCheat Repository</a> and click <strong>Fork</strong>.</li>
  <li>
    <strong>Clone your fork:</strong>
    <pre><code>git clone https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat.git
cd Paradox_AntiCheat</code></pre>
  </li>
  <li>
    <strong>Install dependencies:</strong>
    <pre><code>npm install</code></pre>
  </li>
  <li>
    <strong>Create a branch and make changes:</strong>
    <pre><code>git checkout -b feature/my-new-check</code></pre>
  </li>
  <li>
    <strong>Stage &amp; Commit your updates:</strong>
    <pre><code>git add .
git commit -m "feat: add new speed detection module"</code></pre>
  </li>
  <li>
    <strong>Push to GitHub &amp; Open Pull Request:</strong>
    <pre><code>git push origin feature/my-new-check</code></pre>
    <p>Then navigate to the original repository to initiate a <strong>Pull Request</strong>.</p>
  </li>
</ol>

<hr>

<div align="center">
  <p>Need help? Join our <a href="https://discord.gg/qVd53N2xhq">Discord Server</a> for support and discussion.</p>
</div>

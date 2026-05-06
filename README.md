<div align="center">
  <img src="docs\Media\paradox-header.png" alt="Paradox AntiCheat Logo">
  <br><br>
  <div>
    <em>Updated for Minecraft Bedrock 1.26.20</em>
    <br>
    Paradox AntiCheat now utilizes the 2.8.0-Beta server, 1.0.0-Beta server-net, 1.0.0-Beta server-admin and 2.1.0-Beta server-ui APIs, enhancing compatibility and performance for Minecraft Bedrock; both Realms and BDS environments.
  </div>
</div>
<hr>
<div align="left">
  <div align="center">
    <h2>About Paradox AntiCheat</h2>
  </div>
  <p>Paradox AntiCheat is a high-performance anti-cheat system for Minecraft Bedrock. It is designed to detect and prevent cheating in both Realms and BDS environments, ensuring a fair gameplay experience for all players.</p>
  <p>The name "Paradox" reflects our approach: a system that uses sophisticated algorithms and advanced detection techniques to outsmart cheaters in ways that might seem counterintuitive at first glance.</p>
  <blockquote>
    <p>Paradox: A statement or situation that contradicts itself yet reveals truth.</p>
  </blockquote>
  <p>Highly modular and customizable, Paradox AntiCheat allows developers to tailor detection and enforcement to their worlds’ specific needs. Whether you’re managing a public server or a private Realm, Paradox provides reliable protection against unfair play.</p>
  <p>For full documentation and setup guides, visit the <a href="https://visual1mpact.github.io/Paradox_AntiCheat/#/">official documentation site</a>.</p>
</div>
<hr>
<div align="left">
  <div align="center">
    <h2>Get Support</h2>
  </div>
  <p>Join the Paradox AntiCheat community on <a href="https://discord.gg/qVd53N2xhq">Discord</a> for support. Our community is active and dedicated to providing help and assistance to game developers who use Paradox AntiCheat in their projects. We also welcome feedback and suggestions on how we can improve the tool.</p>
</div>

<div align="center">
  <h2>Project Status</h2>
  <img src="https://www.codefactor.io/repository/github/Visual1mpact/paradox_anticheat/badge/rewrite" alt="Grade">
  <img src="https://img.shields.io/github/downloads/Visual1mpact/Paradox_AntiCheat/total?style=plastic&logo=appveyor" alt="Downloads">
  <img src="https://img.shields.io/github/downloads/Visual1mpact/Paradox_AntiCheat/latest/total?style=plastic&logo=appveyor" alt="Latest Downloads">
  <img src="https://img.shields.io/github/commit-activity/m/Visual1mpact/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="Commits Per Month">
  <img src="https://img.shields.io/github/last-commit/Visual1mpact/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="Last Commit">
  <img src="https://img.shields.io/github/license/Visual1mpact/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="License">
</div>

<h2>Applying the Paradox AntiCheat Pack</h2>
<p>When applying the pack to your world, make sure the addon is at the top of the behavior pack list and Beta APIs is enabled. This is to ensure all checks and systems work properly. The versioning system for Paradox goes as follows:</p>
<ul>
  <li>The first number denotes the pack version. This will rarely change unless there have been major changes to the code.</li>
  <li>The second number denotes the major revision of the pack version. These particular changes mostly involve features being added or removed.</li>
  <li>The third number indicates the minor revision of the Pack. This evolves around bug fixes.</li>
</ul>

<h2>Installing the Paradox AntiCheat Pack</h2>
<p>To install this anticheat to your realm/world, follow these steps:</p>
<ol>
  <li>Install the <code>.mcpack</code>.</li>
  <li>Apply it to your world.</li>
  <li>Enable Beta APIs.</li>
</ol>
<p>Once you have done this, the anticheat should be fully up and running.</p>

<h2>Development Environment Setup for Linux</h2>
<ol>
  <li>
    <strong>Install Node.js (Latest LTS Automatically):</strong>
    <ul>
      <li>
        This project includes a setup script that installs:
        <ul>
          <li>The latest <strong>nvm</strong></li>
          <li>The latest <strong>Node.js LTS</strong></li>
          <li>Sets LTS as your default Node version</li>
        </ul>
      </li>
      <li>
        From the project root, run the Linux setup script:
        <pre><code>./bin/setup-node-linux.sh</code></pre>
        <small>Make sure the script is executable: <code>chmod +x ./bin/setup-node-linux.sh</code></small>
      </li>
    </ul>
  </li>
  <li>
    <strong>Install Project Dependencies:</strong>
    <ul>
      <li>After Node.js is installed, run:</li>
      <pre><code>npm install</code></pre>
    </ul>
  </li>
</ol>

<h2>Development Environment Setup for Windows</h2>
<ol>
  <li>
    <strong>Install Node.js (Latest LTS Automatically):</strong>
    <ul>
      <li>
        This project includes a setup script that installs:
        <ul>
          <li>The latest <strong>Node.js LTS</strong> (no nvm on Windows)</li>
          <li>Updates your PATH so Node and npm are available</li>
        </ul>
      </li>
      <li>
        From the project root, run the Windows setup script in PowerShell:
        <pre><code>bin\setup-node-windows.ps1</code></pre>
      </li>
    </ul>
  </li>
  <li>
    <strong>Install Project Dependencies:</strong>
    <ul>
      <li>After Node.js is installed, run:</li>
      <pre><code>npm install</code></pre>
    </ul>
  </li>
</ol>
  <li><strong>Install Visual Studio Code (VS Code):</strong>
    <ul>
      <li>Download and install VS Code from <a href="https://code.visualstudio.com/">the official website</a>.</li>
      <li>Alternatively, you can install it via your package manager. For example, on Debian-based systems:
        <pre><code>sudo apt update
sudo apt install code</code></pre>
      </li>
    </ul>
  </li>
  <li><strong>Clone the Repository:</strong>
    <ul>
      <li>Open a terminal.</li>
      <li>Execute the following command to clone the repository:
        <pre><code>git clone https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat.git</code></pre>
      </li>
      <li>Navigate to the project directory:
        <pre><code>cd Paradox_AntiCheat</code></pre>
      </li>
    </ul>
  </li>
  <li><strong>Install Project Dependencies:</strong>
    <ul>
      <li>Run the following command to install the project dependencies:
        <pre><code>npm i</code></pre>
      </li>
    </ul>
  </li>
  <li><strong>Open the Project in VS Code:</strong>
    <ul>
      <li>You can open the project in VS Code by running:
        <pre><code>code .</code></pre>
      </li>
    </ul>
  </li>
</ol>

<h2>Contributing to the Project</h2>
<ol>
  <li><strong>Fork the project repository:</strong> Click on the "Fork" button in the top-right corner of the repository page: <a href="https://github.com/Visual1mpact/Paradox_AntiCheat/fork">Paradox_AntiCheat_Fork</a></li>
  <li><strong>Clone the forked repository to your local machine:</strong>
    <pre><code>git clone https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat.git</code></pre>
  </li>
  <li><strong>Navigate to the cloned project directory:</strong>
    <pre><code>cd Paradox_AntiCheat</code></pre>
  </li>
  <li><strong>Install project dependencies:</strong>
    <pre><code>npm install</code></pre>
  </li>
  <li><strong>Make changes to the project files.</strong></li>
  <li><strong>Save the files.</strong></li>
  <li><strong>Stage the changes to include all modifications:</strong>
    <pre><code>git add .</code></pre>
  </li>
  <li><strong>Commit the changes with a meaningful commit message:</strong>
    <pre><code>git commit -m "Your commit message here"</code></pre>
  </li>
  <li><strong>Push the committed changes to your forked repository on GitHub:</strong>
    <pre><code>git push origin</code></pre>
  </li>
  <li><strong>Create a pull request to submit the changes to the original repository.</strong></li>
</ol>

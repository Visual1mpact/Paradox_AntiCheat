<!DOCTYPE html>
<html lang="en">
<body>

  <div align="center">
    <img src="Media/paradox-header.png" alt="Paradox AntiCheat Logo">
  </div>

  <h1>Contributing to the Paradox AntiCheat Documentation</h1>

  <p>Welcome to the Paradox AntiCheat documentation repository! This guide will help you contribute to the website, make changes, and test them locally before submitting a pull request.</p>

  <h2>Prerequisites</h2>
  <p>Before contributing to the documentation, make sure you have the following installed:</p>
  <ul>
    <li><a href="https://nodejs.org/">Node.js</a> (Latest LTS recommended, e.g., v22.x)</li>
    <li><a href="https://www.npmjs.com/">npm</a> (comes with Node.js)</li>
    <li>A text editor like <a href="https://code.visualstudio.com/">Visual Studio Code</a></li>
  </ul>

  <h2>Cloning the Repository</h2>
  <ol>
    <li><strong>Fork the repository</strong>: Click on the "Fork" button on the <a href="https://github.com/Visual1mpact/Paradox_AntiCheat">Paradox_AntiCheat GitHub page</a>.</li>
    <li><strong>Clone your fork</strong>: Clone your fork to your local machine:
      <pre><code>git clone https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat.git</code></pre>
    </li>
    <li><strong>Navigate to the project root</strong>:
      <pre><code>cd Paradox_AntiCheat</code></pre>
    </li>
  </ol>

  <h2>Setting Up the Development Environment</h2>
  <ol>
    <li><strong>Install Dependencies</strong>: In the project root, run the following command:
      <pre><code>npm install</code></pre>
    </li>
    <li><strong>Optional Setup Scripts</strong>: For Linux or Windows, you may use the included setup scripts to automatically install Node.js LTS and configure your environment:
      <ul>
        <li>Linux: <code>./bin/setup-node-linux.sh</code> (ensure executable: <code>chmod +x ./bin/setup-node-linux.sh</code>)</li>
        <li>Windows (PowerShell): <code>bin\\setup-node-windows.ps1</code></li>
      </ul>
    </li>
  </ol>

  <h2>Testing the Docs Locally with Docsify</h2>
  <p>Docsify is used to generate the documentation site. To test changes locally:</p>
  <ol>
    <li><strong>Start the Local Server</strong>:
      <pre><code>node bin/server.js</code></pre>
      Preview the documentation at <a href="http://localhost:4000" target="_blank">http://localhost:4000</a>.
    </li>
    <li><strong>Make Changes</strong>: Edit the Markdown files in the /docs directory. Update content, add new sections, or fix formatting.</li>
    <li><strong>Preview Your Changes</strong>: The local Docsify server automatically reloads as you refresh the page.</li>
    <li><strong>Stop the Server</strong>: Press <code>Ctrl + C</code> in the terminal when finished.</li>
  </ol>

  <h2>Submitting Changes</h2>
  <ol>
    <li><strong>Commit Your Changes</strong>:
      <pre><code>git add .
git commit -m "Description of the changes"</code></pre>
    </li>
    <li><strong>Push to Your Fork</strong>:
      <pre><code>git push origin &lt;branch-name&gt;</code></pre>
    </li>
    <li><strong>Create a Pull Request</strong>: Submit a pull request to the original <a href="https://github.com/Visual1mpact/Paradox_AntiCheat" target="_blank">Paradox_AntiCheat repository</a> with a clear description.</li>
  </ol>

  <h2>Additional Notes</h2>
  <ul>
    <li><strong>Markdown Formatting</strong>: Ensure your Markdown files are properly formatted. Use tools like <a href="https://github.com/DavidAnson/markdownlint" target="_blank">Markdownlint</a>.</li>
    <li><strong>Docsify Features</strong>: Check the <a href="https://docsify.js.org/" target="_blank">Docsify documentation</a> for customization options.</li>
    <li><strong>Keep Docs in Sync</strong>: Refer to the main <a href="https://visual1mpact.github.io/Paradox_AntiCheat/#/" target="_blank">Paradox AntiCheat Documentation</a> to ensure consistency when adding or updating content.</li>
  </ul>

  <p>Thank you for contributing to Paradox AntiCheat documentation!</p>

</body>
</html>

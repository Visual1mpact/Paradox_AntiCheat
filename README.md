<div align="center">
  <img src="https://i.imgur.com/ZS38i7c.png" alt="Paradox AntiCheat Logo">
  <br><br>
  <div>
    <em>Updated for 1.20.30</em>
    <br>
    Paradox AntiCheat is a fork of Scythe AntiCheat, which was released under the GPLv3 License. Paradox was created to fix some differences within Scythe and to provide a more reliable and effective anti-cheat solution for Minecraft Bedrock. All original commit history pertaining to Scythe still exists within this project and is free to review.
  </div>
</div>
<hr>
<div align="center">
  <h2>About Paradox AntiCheat</h2>
  <p>Paradox AntiCheat is a powerful tool designed to combat cheating in Minecraft Bedrock worlds. The name "Paradox" was chosen because the concept of paradox perfectly represents the essence of what we do.</p>
  <p>Paradox AntiCheat is a statement that contradicts itself. It is a tool that fights cheating by using advanced algorithms and techniques that are themselves paradoxical in nature.</p>
  <blockquote>
    <p>Paradox: A statement or situation that contradicts itself, opposed to common sense and yet perhaps true.</p>
  </blockquote>
  <p>Paradox AntiCheat offers a comprehensive solution for detecting and preventing cheating in Minecraft Bedrock. It uses detection methods to ensure that cheaters are caught and punished. In addition, Paradox AntiCheat is highly customizable, allowing game developers to tailor the tool to their specific needs and requirements.</p>
  <p>If you're looking for a reliable and effective anti-cheat solution for your Minecraft Bedrock experience, look no further than Paradox AntiCheat. For more information, check out the <a href="https://github.com/Pete9xi/Paradox_AntiCheat/wiki">wiki</a>.</p>
</div>
<hr>
<div align="center">
  <h2>Get Support</h2>
  <p>Join the Paradox AntiCheat community on <a href="https://discord.gg/qVd53N2xhq">Discord</a> for support. Our community is active and dedicated to providing help and assistance to game developers who use Paradox AntiCheat in their projects. We also welcome feedback and suggestions on how we can improve the tool.</p>
</div>

<div align="center">
  <h2>Project Status</h2>
  <img src="https://www.codefactor.io/repository/github/pete9xi/paradox_anticheat/badge/main" alt="Grade">
  <img src="https://img.shields.io/github/downloads/Pete9xi/Paradox_AntiCheat/total?style=plastic&logo=appveyor" alt="Downloads">
  <img src="https://img.shields.io/github/downloads/Pete9xi/Paradox_AntiCheat/latest/total?style=plastic&logo=appveyor" alt="Latest Downloads">
  <img src="https://img.shields.io/github/commit-activity/m/Pete9xi/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="Commits Per Month">
  <img src="https://img.shields.io/github/last-commit/Pete9xi/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="Last Commit">
  <img src="https://img.shields.io/github/license/Visual1mpact/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="License">
</div>

<h1><img src="https://i.imgur.com/5W2YXCD.png" border="0" width="150"></h1>
<h1>Applying the Paradox AntiCheat Pack</h1>
<p>When applying the pack to your world make sure the addon is at the top of the behavior pack list and Beta APIs is enabled. This is to ensure all checks and systems work properly. The versioning system for Paradox goes as follows:</p>
<ul>
  <li>The first number denotes the pack version. This will rarely change unless there has been major changes to the code.</li>
  <li>The second number denotes the major revision of the pack version. These particular changes mostly involve around features being added or removed.</li>
  <li>The third number indicates the minor revision of the Pack. This evolves around bug fixes.</li>
</ul>

<h1><img src="https://i.imgur.com/AXWmBA3.png" border="0" width="150"></h1>
<h1>Installing the Paradox AntiCheat Pack</h1>
<p>To install this anticheat to your realm/world you need to:</p>
<ol>
  <li>Install the .mcpack</li>
  <li>Apply it to your world</li>
  <li>Enable Beta APIs</li>
</ol>
<p>Once you have done this the anticheat should be fully up and running. Education Edition is required for the command <code>!fly &lt;username&gt;</code> to work.</p>

<h2>Gaining Permission to Use Paradox</h2>
<p>Follow these steps to grant yourself permission to use Paradox in your world:</p>
<ol>
  <li>If you're a Realm owner or prefer using a password:
    <ol type="a">
      <li>Edit the <code>config.js</code> file located at <code>/scripts/data/config.js</code>.</li>
      <li>Scroll down to the <code>encryption</code> section.</li>
      <li>Inside <code>encryption</code>, find <code>password</code>.</li>
      <li>Enter your chosen password:
        <pre><code class="language-javascript">encryption: {
    password: "mypassword",
}</code></pre>
      </li>
    </ol>
    <ol type="a" start="5">
      <li>Keep your password safe and confidential.</li>
    </ol>
  </li>
  <li>For all users not using a password:
    <ol type="a">
      <li>Install the Anti Cheat and load your Minecraft world.</li>
      <li>In the game's chat, enter <code>&lt;prefix&gt;op</code>. Replace <code>&lt;prefix&gt;</code> with your server's command prefix, e.g., <code>!</code>.</li>
      <li>If you have necessary permissions, this grants you Paradox AntiCheat access.</li>
      <li>Once granted, you'll have Paradox AntiCheat features.</li>
      <li>To give Paradox-Op permissions to others, use <code>&lt;prefix&gt;op &lt;player&gt;</code>.</li>
      <li>Learn more by entering <code>&lt;prefix&gt;op help</code>.</li>
      <li>For Bedrock Dedicated Server (BDS), add the following to the <code>server.properties</code> file:
        <pre><code>op-permission-level=2
#min=2
#max=4</code></pre>
      </li>
  </li>
</ol>
<p>Note: If you're using a password (Realm owners), use <code>&lt;prefix&gt;op &lt;password&gt;</code> for permission.</p>
<p>Remember, keep your password secure and share it cautiously.</p>

<h2>Important Notes</h2>
<ul>
  <li>Paradox will kick you out if you have any illegal items in your inventory so if you think Paradox may flag you after installing then it is highly suggested to drop your entire inventory prior to activating this Anti Cheat!!!</li>
</ul>

<!-- Development Environment Setup -->
<h1><img src="https://i.imgur.com/PibjwGN.png" alt="Paradox Contributing Logo"></h1>
<h2>Development Environment Setup:</h2>

<ol>
  <li>Install Visual Studio Code (VSC) from the official website: <a href="https://code.visualstudio.com/">https://code.visualstudio.com/</a></li>
  <li>Install the latest Node.js version from the official website: <a href="https://nodejs.org/">https://nodejs.org/</a></li>
</ol>

<!-- Contributing to the Project -->
<h2>Contributing to the Project:</h2>

<ol>
  <li>Fork the project repository by clicking on the "Fork" button in the top-right corner of the repository page: <a href="https://github.com/Pete9xi/Paradox_AntiCheat">https://github.com/Pete9xi/Paradox_AntiCheat</a></li>
  <li>Clone the forked repository to your local machine using the built-in terminal of Visual Studio Code:</li>
</ol>

<pre><code>git clone https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat.git
</code></pre>

<ol start="3">
  <li>Navigate to the cloned project directory using the built-in terminal of Visual Studio Code:</li>
</ol>

<pre><code>cd Paradox_AntiCheat
</code></pre>

<ol start="4">
  <li>Install project dependencies using the built-in terminal of Visual Studio Code:</li>
</ol>

<pre><code>npm i
</code></pre>

<!-- Building for Development -->
<h2>Building for Development:</h2>

<ul>
  <li>To build the project for development on Linux, run the following command in the built-in terminal of Visual Studio Code:</li>
</ul>

<pre><code>npm run build
</code></pre>

<ul>
  <li>To build the project for development on Windows, use the following command in the built-in terminal of Visual Studio Code:</li>
</ul>

<pre><code>npm run build_win
</code></pre>

<!-- Making and Committing Changes -->
<h2>Making and Committing Changes:</h2>

<ol>
  <li>Make changes to the project files using Visual Studio Code.</li>
  <li>Save the files.</li>
</ol>

<!-- Committing Changes to Git -->
<h2>Committing Changes to Git:</h2>

<ol>
  <li>Stage the changes to include all modifications in the built-in terminal of Visual Studio Code:</li>
</ol>

<pre><code>git add .
</code></pre>

<p>(Alternatively, use <code>git add &lt;filename&gt;</code> to stage specific files.)</p>

<ol start="2">
  <li>Commit the changes with a meaningful commit message in the built-in terminal of Visual Studio Code:</li>
</ol>

<pre><code>git commit -m "Your commit message here"
</code></pre>

<!-- Pushing Commits Upstream -->
<h2>Pushing Commits Upstream:</h2>

<ol>
  <li>Before pushing, pull any changes from the original repository to avoid conflicts in the built-in terminal of Visual Studio Code:</li>
</ol>

<pre><code>git pull origin main
</code></pre>

<p>(This ensures your fork is up to date with the original repository.)</p>

<ol start="2">
  <li>Push the committed changes to your forked repository on GitHub in the built-in terminal of Visual Studio Code:</li>
</ol>

<pre><code>git push origin main
</code></pre>

<!-- Creating a Pull Request -->
<h2>Creating a Pull Request:</h2>

<ol>
  <li>Go to your forked repository on GitHub: <a href="https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat">https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat</a></li>
  <li>Click on the "Compare &amp; pull request" button.</li>
  <li>Review the changes in the pull request and provide a meaningful description of your changes.</li>
  <li>Click on the "Create pull request" button to submit the pull request to the original repository.</li>
</ol>

<p>Congratulations! You have successfully set up the development environment, cloned the project, built it for development, made changes, committed those changes, pushed them upstream, and created a pull request to contribute your changes back to the original repository.</p>

<p>Please note that the project maintainers will review your pull request, and if they find it suitable, they will merge it into the main project. Keep an eye on your pull request for any feedback or updates from the maintainers.</p>

<p>Happy contributing to the Paradox AntiCheat project! If you have any further questions or need additional assistance, feel free to ask.</p>

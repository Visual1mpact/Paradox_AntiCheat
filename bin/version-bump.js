import { spawnSync } from "child_process";
import semver from "semver";

/**
 * Runs a Git command safely.
 *
 * @param {string[]} args - Command arguments array.
 * @param {string} [gitRoot=process.cwd()] - Working directory root.
 * @returns {string} Trimmed command stdout output.
 */
function runGit(args, gitRoot = process.cwd()) {
    const result = spawnSync("git", args, { cwd: gitRoot, encoding: "utf-8" });
    if (result.status !== 0) {
        throw new Error(`Git command failed: git ${args.join(" ")}\n${result.stderr}`);
    }
    return result.stdout.trim();
}

/**
 * Gets the root directory path of the active Git repository.
 *
 * @returns {string} Root directory path.
 */
function getGitRoot() {
    return runGit(["rev-parse", "--show-toplevel"]);
}

/**
 * Gets all commits created since a specific tag.
 *
 * @param {string} tag - Target tag name.
 * @param {string} gitRoot - Git repository root.
 * @returns {Array<{hash: string, subject: string, body: string}>} List of commits.
 */
function getCommitsSinceTag(tag, gitRoot) {
    const logFormat = "%H%n%s%n%b%n---END-COMMIT---";
    const log = runGit(["log", `${tag}..HEAD`, `--pretty=format:${logFormat}`], gitRoot);
    return log
        .split("---END-COMMIT---\n")
        .filter(Boolean)
        .map((c) => {
            const lines = c.trim().split("\n");
            return {
                hash: lines[0],
                subject: lines[1] || "",
                body: lines.slice(2).join("\n") || "",
            };
        });
}

/**
 * Gets a list of file paths changed in a single commit.
 *
 * @param {string} hash - Target commit hash.
 * @param {string} gitRoot - Git repository root.
 * @returns {string[]} File paths array.
 */
function getFilesChangedInCommit(hash, gitRoot) {
    const output = runGit(["diff-tree", "--no-commit-id", "--name-only", "-r", hash], gitRoot);
    return output ? output.split("\n") : [];
}

/**
 * Evaluates whether a commit represents a major breaking change.
 *
 * @param {string} subject - Commit subject line.
 * @param {string} body - Commit message body.
 * @param {string[]} filesChanged - Changed file paths.
 * @param {string} text - Full combined commit text.
 * @returns {{isMajor: boolean, reason?: string}} Major evaluation result.
 */
function evaluateMajorImpact(subject, body, filesChanged, text) {
    const breakingMatch = body.match(/BREAKING CHANGE:\s*(.+)/i);
    if (/^[a-z]+(\([^)]+\))?!:/i.test(subject) || breakingMatch) {
        const explanation = breakingMatch ? breakingMatch[1].trim() : "Breaking change detected in commit syntax";
        return { isMajor: true, reason: `Major: breaking change - ${explanation}` };
    }

    const manifestsChanged = filesChanged.some((f) => f.endsWith("manifest.json"));
    if (manifestsChanged && /(?:minecraft|bedrock) (?:version|update)|script api/i.test(text)) {
        return { isMajor: true, reason: "Major: Minecraft engine or Script API shift" };
    }

    return { isMajor: false };
}

/**
 * Analyzes impact of a commit using SemVer rules.
 *
 * @param {{hash: string, subject: string, body: string}} commit - Target commit object.
 * @param {string} gitRoot - Git repository root.
 * @returns {{major: boolean, minor: boolean, patch: boolean, reasons: string[]}} Impact result.
 */
function analyzeCommitImpact(commit, gitRoot) {
    const { hash, subject, body } = commit;
    const text = `${subject}\n${body}`;
    const filesChanged = getFilesChangedInCommit(hash, gitRoot);
    const reasons = [];

    if (/^(docs|style|test|ci|chore)(\([^)]+\))?:/i.test(subject)) {
        reasons.push(`Ignored non-functional commit ${hash}: ${subject}`);
        return { major: false, minor: false, patch: false, reasons };
    }

    const majorCheck = evaluateMajorImpact(subject, body, filesChanged, text);
    if (majorCheck.isMajor) {
        reasons.push(`${majorCheck.reason} in ${hash}`);
        return { major: true, minor: false, patch: false, reasons };
    }

    let minor = false;
    let patch = false;

    if (/^feat(\([^)]+\))?:/i.test(subject)) {
        minor = true;
        reasons.push(`Minor: new feature added in ${hash} - ${subject}`);
    }

    if (/^(fix|refactor|perf|sec|fix-ci)(\([^)]+\))?:/i.test(subject) || /bug|fix|typo|patch|refactor|optimize/i.test(subject)) {
        patch = true;
        reasons.push(`Patch: fix/improvement in ${hash} - ${subject}`);
    }

    if (!minor && !patch && filesChanged.length > 0) {
        patch = true;
        reasons.push(`Patch: unclassified code change in ${hash} - ${subject}`);
    }

    return { major: false, minor, patch, reasons };
}

/**
 * Determines overall version bump across all commits.
 *
 * @param {Array<{hash: string, subject: string, body: string}>} commits - Commits list.
 * @param {string} gitRoot - Git repository root.
 * @returns {{bump: "major" | "minor" | "patch" | "none", explanation: string[]}} Bump calculation result.
 */
function determineBump(commits, gitRoot) {
    const priority = { major: 3, minor: 2, patch: 1, none: 0 };
    let highestImpact = "none";
    const explanation = [];

    for (const commit of commits) {
        const impact = analyzeCommitImpact(commit, gitRoot);
        explanation.push(...impact.reasons);

        if (impact.major) {
            highestImpact = "major";
            break;
        }

        if (impact.minor && priority.minor > priority[highestImpact]) {
            highestImpact = "minor";
        } else if (impact.patch && priority.patch > priority[highestImpact]) {
            highestImpact = "patch";
        }
    }

    return { bump: highestImpact, explanation };
}

/**
 * Main execution entrypoint.
 */
function main() {
    try {
        const gitRoot = getGitRoot();
        const lastTag = runGit(["describe", "--tags", "--abbrev=0"], gitRoot);

        let oldVersion = lastTag.startsWith("v") ? lastTag.slice(1) : lastTag;
        if (!semver.valid(oldVersion)) {
            console.warn(`Warning: last tag (${lastTag}) is not valid semver. Defaulting to 0.0.0`);
            oldVersion = "0.0.0";
        }

        const commits = getCommitsSinceTag(lastTag, gitRoot);
        if (commits.length === 0) {
            console.log("No new commits since last tag. Version stays the same.");
            return;
        }

        const { bump, explanation } = determineBump(commits, gitRoot);

        if (bump === "none") {
            console.log("No impactful commits detected. Version stays the same.");
            return;
        }

        const newVersion = semver.inc(oldVersion, bump);
        console.log(`Current Version: ${oldVersion}`);
        console.log(`Calculated Bump: ${bump.toUpperCase()}`);
        console.log(`Next Version:    ${newVersion}\n`);
        console.log("Reasoning:");
        explanation.forEach((reason) => console.log("- " + reason));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();

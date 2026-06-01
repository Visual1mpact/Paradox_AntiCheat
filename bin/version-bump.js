import { spawnSync } from "child_process";
import semver from "semver";

/** Run Git command safely */
function runGit(args, gitRoot) {
    const result = spawnSync("git", args, { cwd: gitRoot, encoding: "utf-8" });
    if (result.status !== 0) {
        throw new Error(`Git command failed: git ${args.join(" ")}\n${result.stderr}`);
    }
    return result.stdout.trim();
}

/** Get root of Git repo */
function getGitRoot() {
    return runGit(["rev-parse", "--show-toplevel"]);
}

/** Get commits since a tag */
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

/** Get files changed in a commit */
function getFilesChangedInCommit(hash, gitRoot) {
    const output = runGit(["diff-tree", "--no-commit-id", "--name-only", "-r", hash], gitRoot);
    return output ? output.split("\n") : [];
}

/** Check if files exist in last released tag */
function isReleasedFile(files, gitRoot, lastTag) {
    if (files.length === 0) return false;
    const releasedFiles = runGit(["ls-tree", "-r", "--name-only", lastTag], gitRoot).split("\n");
    // If ANY of the changed files were in the previous release, it's a released-impact change
    return files.some((f) => releasedFiles.includes(f));
}

/** Analyze impact of a commit */
function analyzeCommitImpact(commit, gitRoot, lastTag) {
    const { hash, subject, body } = commit;
    const text = `${subject}\n${body}`;
    const filesChanged = getFilesChangedInCommit(hash, gitRoot);
    const released = isReleasedFile(filesChanged, gitRoot, lastTag);
    const reasons = [];
    let major = false,
        minor = false,
        patch = false;
    let breakingExplanation = "";

    // Documentation-only commits (only if the subject starts with docs:)
    if (/^docs:/i.test(subject)) {
        reasons.push(`Ignored documentation-only commit ${hash}`);
        return { major, minor, patch, reasons, breakingExplanation };
    }

    // Detect explicit BREAKING CHANGE in body
    const breakingMatch = body.match(/BREAKING CHANGE:\s*(.+)/i);

    // Major: breaking changes
    if (/BREAKING CHANGE|!:/.test(subject) || breakingMatch) {
        minor = true;
        if (breakingMatch) {
            breakingExplanation = breakingMatch[1].trim();
            reasons.push(`Minor: breaking change detected ${hash} - Reason: ${breakingExplanation}`);
        } else {
            reasons.push(`Minor: breaking change detected ${hash}`);
        }
    }

    // Major: Minecraft or Script API updates
    // Verified by checking if manifest.json was modified alongside keyword detection
    const hasPlatformKeywords = /(?:minecraft|bedrock) (?:version|update)|script api/i.test(text);
    const manifestChanged = filesChanged.includes("manifest.json");

    if (hasPlatformKeywords && manifestChanged) {
        major = true;
        reasons.push(`Major: Minecraft or Script API update verified in manifest.json ${hash}`);
    }

    // Minor: features or enhancements
    if (/^feat:/i.test(subject) || /api change/i.test(text)) {
        minor = true;
        reasons.push(`Minor: feature or enhancement ${hash}`);
    }

    // Patch: fixes or improvements
    if (/^fix:|bug|typo|patch|refactor|optimize|performance/i.test(subject)) {
        patch = true;
        reasons.push(`Patch: fix or improvement ${hash}`);
    }

    // Critical areas
    if (/core|auth|security|database|network|api/i.test(text) && !major) {
        minor = true;
        reasons.push(`Minor: touches critical areas ${hash}`);
    }

    // Risk keywords
    if (/critical|urgent|security|hotfix/i.test(text) && released) {
        minor = true;
        reasons.push(`Minor: high-risk keywords in released commit ${hash}`);
    }

    if (filesChanged.length > 0) {
        reasons.push(`Files changed: ${filesChanged.join(", ")}`);
    }

    return { major, minor, patch, reasons, breakingExplanation };
}

/** Determine overall version bump */
function determineBump(commits, gitRoot, lastTag) {
    const priority = { major: 3, minor: 2, patch: 1, none: 0 };
    let highestImpact = "none";
    const explanation = [];

    for (const commit of commits) {
        const impact = analyzeCommitImpact(commit, gitRoot, lastTag);
        explanation.push(...impact.reasons);

        if (impact.major) highestImpact = "major";
        else if (impact.minor && priority["minor"] > priority[highestImpact]) highestImpact = "minor";
        else if (impact.patch && priority["patch"] > priority[highestImpact]) highestImpact = "patch";

        if (highestImpact === "major") break;
    }

    return { bump: highestImpact, explanation };
}

/** Main */
function main() {
    try {
        const gitRoot = getGitRoot();
        let lastTag = runGit(["describe", "--tags", "--abbrev=0"], gitRoot);

        let oldVersion = lastTag.startsWith("v") ? lastTag.slice(1) : lastTag;
        if (!semver.valid(oldVersion)) {
            console.warn(`Warning: last tag (${lastTag}) is not a valid semver. Defaulting to 0.0.0`);
            oldVersion = "0.0.0";
        }

        const commits = getCommitsSinceTag(lastTag, gitRoot);
        if (commits.length === 0) {
            console.log("No new commits since last tag. Version stays the same.");
            return;
        }

        const { bump, explanation } = determineBump(commits, gitRoot, lastTag);

        if (bump === "none") {
            console.log("No impactful commits detected. Version stays the same.");
            return;
        }

        const newVersion = semver.inc(oldVersion, bump);
        console.log(`Next version should be: ${newVersion}`);
        console.log("Reasoning behind version selection:");
        explanation.forEach((reason) => console.log("- " + reason));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();

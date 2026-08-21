import { spawnSync } from "child_process";
import semver from "semver";

/** Run Git command safely */
function runGit(args, gitRoot = process.cwd()) {
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

/** Analyze impact of a commit using SemVer rules */
function analyzeCommitImpact(commit, gitRoot) {
    const { hash, subject, body } = commit;
    const text = `${subject}\n${body}`;
    const filesChanged = getFilesChangedInCommit(hash, gitRoot);
    const reasons = [];

    let major = false;
    let minor = false;
    let patch = false;

    // 1. Skip non-code changes (docs, style, test, ci, chore)
    if (/^(docs|style|test|ci|chore)(\([^)]+\))?:/i.test(subject)) {
        reasons.push(`Ignored non-functional commit ${hash}: ${subject}`);
        return { major, minor, patch, reasons };
    }

    // 2. MAJOR: Breaking Changes (Conventional Commits '!' or 'BREAKING CHANGE')
    const breakingMatch = body.match(/BREAKING CHANGE:\s*(.+)/i);
    if (/^[a-z]+(\([^)]+\))?!:/i.test(subject) || breakingMatch) {
        major = true;
        const explanation = breakingMatch ? breakingMatch[1].trim() : "Breaking change detected in commit syntax";
        reasons.push(`Major: breaking change in ${hash} - ${explanation}`);
    }

    // 3. MAJOR: Platform & Manifest level changes (Minecraft Script API major shifts)
    const manifestsChanged = filesChanged.some((f) => f.endsWith("manifest.json"));
    if (manifestsChanged && /(?:minecraft|bedrock) (?:version|update)|script api/i.test(text)) {
        major = true;
        reasons.push(`Major: Minecraft engine or Script API shift in ${hash}`);
    }

    // 4. MINOR: New Features (feat: or additions)
    if (/^feat(\([^)]+\))?:/i.test(subject)) {
        minor = true;
        reasons.push(`Minor: new feature added in ${hash} - ${subject}`);
    }

    // 5. PATCH: Fixes, Refactors, Performance, Security Hotfixes
    if (/^(fix|refactor|perf|sec|fix-ci)(\([^)]+\))?:/i.test(subject) || /bug|fix|typo|patch|refactor|optimize/i.test(subject)) {
        patch = true;
        reasons.push(`Patch: fix/improvement in ${hash} - ${subject}`);
    }

    // Fallback: If code changed without a conventional prefix, default to a patch
    if (!major && !minor && !patch && filesChanged.length > 0) {
        patch = true;
        reasons.push(`Patch: unclassified code change in ${hash} - ${subject}`);
    }

    return { major, minor, patch, reasons };
}

/** Determine overall version bump */
function determineBump(commits, gitRoot) {
    const priority = { major: 3, minor: 2, patch: 1, none: 0 };
    let highestImpact = "none";
    const explanation = [];

    for (const commit of commits) {
        const impact = analyzeCommitImpact(commit, gitRoot);
        explanation.push(...impact.reasons);

        if (impact.major) highestImpact = "major";
        else if (impact.minor && priority["minor"] > priority[highestImpact]) highestImpact = "minor";
        else if (impact.patch && priority["patch"] > priority[highestImpact]) highestImpact = "minor" && priority["patch"] > priority[highestImpact] ? "patch" : highestImpact;

        // Correct priority tracking:
        if (impact.major) highestImpact = "major";
        else if (impact.minor && priority.minor > priority[highestImpact]) highestImpact = "minor";
        else if (impact.patch && priority.patch > priority[highestImpact]) highestImpact = "patch";

        if (highestImpact === "major") break; // Max bump reached
    }

    return { bump: highestImpact, explanation };
}

/** Main execution */
function main() {
    try {
        const gitRoot = getGitRoot();
        let lastTag = runGit(["describe", "--tags", "--abbrev=0"], gitRoot);

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

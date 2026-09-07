import fs from "fs";
import path from "path";
import chalk from "chalk";

const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pascalCasePattern = /^[A-Z][a-zA-Z0-9]*$/;

// O(1) set-based lookups
const ignoreExtensions = new Set([".json", ".md", ".d.ts", ".d.ts.map"]);
const ignoreFiles = new Set(["package.json", "package-lock.json"]);
const ignoreDirs = new Set(["node_modules", "dist", "build"]);

/**
 * Converts string token to PascalCase format.
 *
 * @param {string} str - Target string name.
 * @returns {string} PascalCase string.
 */
function toPascalCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => (index === 0 ? match.toUpperCase() : match.toUpperCase())).replace(/\s+/g, "");
}

/**
 * Checks whether a TypeScript file contains a class declaration.
 *
 * @param {string} filePath - Absolute path to file.
 * @returns {boolean} True if class exists in file.
 */
function containsClassDefinition(filePath) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return /\bclass\s+[A-Z][a-zA-Z0-9]*\b/.test(fileContent);
}

/**
 * Filters directory entries based on ignore constraints.
 *
 * @param {string} item - Directory entry item name.
 * @returns {boolean} True if item should be checked.
 */
function filterDirectoryItems(item) {
    if (ignoreFiles.has(item) || ignoreDirs.has(item)) return false;
    if (item.endsWith(".d.ts") || item.endsWith(".d.ts.map")) return false;
    return !ignoreExtensions.has(path.extname(item));
}

/**
 * Recursively validates file and folder naming conventions.
 *
 * @param {string} directory - Directory path.
 * @param {number} [depth=0] - Hierarchy tree depth.
 * @param {boolean[]} [parentHasMore=[]] - Parent tree branches status.
 * @returns {boolean} True if naming discrepancies exist.
 */
function checkNamingConventions(directory, depth = 0, parentHasMore = []) {
    const items = fs.readdirSync(directory).filter(filterDirectoryItems);

    items.sort((a, b) => {
        const aIsDir = fs.statSync(path.join(directory, a)).isDirectory();
        const bIsDir = fs.statSync(path.join(directory, b)).isDirectory();
        return aIsDir === bIsDir ? a.localeCompare(b) : aIsDir ? -1 : 1;
    });

    let hasDiscrepancies = false;

    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const fullPath = path.join(directory, item);
        const isDirectory = fs.statSync(fullPath).isDirectory();
        const isLast = index === items.length - 1;

        const indentation = parentHasMore.map((hasMore) => (hasMore ? "│   " : "    ")).join("");
        const branch = isLast ? "└── " : "├── ";

        if (isDirectory) {
            console.log(`${indentation}${branch}${chalk.blue(item)}`);
            const childHasError = checkNamingConventions(fullPath, depth + 1, [...parentHasMore, !isLast]);
            hasDiscrepancies = hasDiscrepancies || childHasError;
            continue;
        }

        const ext = path.extname(item);
        const baseName = path.basename(item, ext);

        if (ext === ".ts" || ext === ".js") {
            if (!kebabCasePattern.test(baseName)) {
                console.log(`${indentation}${branch}${chalk.red(item)} ${chalk.red("(Error: Does not follow kebab-case)")}`);
                console.log(`${indentation}    ${chalk.yellow("Reason:")} "${chalk.red(baseName)}" should be kebab-case`);
                hasDiscrepancies = true;
            } else {
                console.log(`${indentation}${branch}${chalk.green(item)}`);
            }

            if (ext === ".ts" && containsClassDefinition(fullPath)) {
                const className = toPascalCase(baseName.replace(/-([a-z])/g, (_, c) => c.toUpperCase()));
                if (!pascalCasePattern.test(className) && baseName !== "index") {
                    console.log(`${indentation}    ${chalk.red("Class naming issue:")} ${chalk.yellow(className)} should be PascalCase`);
                    hasDiscrepancies = true;
                }
            }
        } else {
            console.log(`${indentation}${branch}${chalk.yellow(item)} ${chalk.yellow("(Warning: unexpected extension)")}`);
        }
    }

    return hasDiscrepancies;
}

const discrepancies = checkNamingConventions(path.join("./penrose"));
process.exit(discrepancies ? 1 : 0);

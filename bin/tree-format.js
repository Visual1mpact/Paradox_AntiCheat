import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pascalCasePattern = /^[A-Z][a-zA-Z0-9]*$/;

// List of file extensions to ignore (e.g., package.json, package-lock.json, .md, .json files, etc.)
const ignoreFileExtensions = new Set([".json", ".md", ".d.ts", ".d.ts.map"]);
// List of files to explicitly ignore (e.g., package.json, package-lock.json)
const ignoreFiles = new Set(["package.json", "package-lock.json"]);
// List of directories to ignore (e.g., node_modules)
const ignoreDirs = new Set(["node_modules", "dist", "build"]);

function toPascalCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => (index === 0 ? match.toUpperCase() : match.toUpperCase())).replace(/\s+/g, "");
}

function containsClassDefinition(filePath) {
    // Read the file content and check for any class declarations
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return /\bclass\s+[A-Z][a-zA-Z0-9]*\b/.test(fileContent);
}

function checkNamingConventions(directory, depth = 0, parentHasMore = []) {
    let items = fs.readdirSync(directory);

    // filter ignored items first so they don't affect tree structure
    items = items.filter((item) => {
        if (ignoreFiles.has(item)) return false;
        if (ignoreDirs.has(item)) return false;

        const ext = path.extname(item);
        if (item.endsWith(".d.ts") || item.endsWith(".d.ts.map")) return false;
        if (ignoreFileExtensions.has(ext)) return false;

        return true;
    });

    // sort: directories first, then files alphabetically
    items.sort((a, b) => {
        const aIsDir = fs.statSync(path.join(directory, a)).isDirectory();
        const bIsDir = fs.statSync(path.join(directory, b)).isDirectory();

        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;

        return a.localeCompare(b);
    });

    let hasDiscrepancies = false;

    items.forEach((item, index) => {
        const fullPath = path.join(directory, item);
        const isDirectory = fs.statSync(fullPath).isDirectory();

        const isLast = index === items.length - 1;

        // build indentation from parent levels
        const indentation = parentHasMore.map((hasMore) => (hasMore ? "│   " : "    ")).join("");

        const branch = isLast ? "└── " : "├── ";

        if (isDirectory) {
            console.log(`${indentation}${branch}${chalk.blue(item)}`);

            const result = checkNamingConventions(fullPath, depth + 1, [...parentHasMore, !isLast]);

            hasDiscrepancies = hasDiscrepancies || result;
            return;
        }

        const ext = path.extname(item);
        const fileNameWithoutExtension = path.basename(item, ext);

        const isKebabCase = kebabCasePattern.test(fileNameWithoutExtension);

        if (ext === ".ts" || ext === ".js") {
            if (!isKebabCase) {
                console.log(`${indentation}${branch}${chalk.red(item)} ${chalk.red("(Error: Does not follow kebab-case)")}`);

                console.log(`${indentation}    ${chalk.yellow("Reason:")} "${chalk.red(fileNameWithoutExtension)}" should be kebab-case (e.g. "${chalk.green("command-handler.ts")}")`);

                hasDiscrepancies = true;
            } else {
                console.log(`${indentation}${branch}${chalk.green(item)}`);
            }

            if (ext === ".ts" && containsClassDefinition(fullPath)) {
                const className = toPascalCase(fileNameWithoutExtension.replace(/-([a-z])/g, (_, c) => c.toUpperCase()));

                if (!pascalCasePattern.test(className) && fileNameWithoutExtension !== "index") {
                    console.log(`${indentation}    ${chalk.red("Class naming issue:")} ${chalk.yellow(className)} should be PascalCase`);

                    hasDiscrepancies = true;
                }
            }
        } else {
            console.log(`${indentation}${branch}${chalk.yellow(item)} ${chalk.yellow("(Warning: unexpected extension)")}`);
        }
    });

    return hasDiscrepancies;
}

// Run the check on the penrose directory
const discrepancies = checkNamingConventions(path.join("./penrose"));
if (discrepancies) {
    process.exit(1); // Exit with an error code if discrepancies are found
} else {
    process.exit(0); // Exit with success code if no discrepancies are found
}

import { exec } from "child_process";
import chalk from "chalk";

/**
 * Builds tree representation object.
 *
 * @param {string[]} files - List of file paths.
 * @returns {object} Tree node object.
 */
function buildTree(files) {
    const tree = {};
    for (let i = 0; i < files.length; i++) {
        const parts = files[i].split("/");
        let current = tree;
        for (let j = 0; j < parts.length; j++) {
            const part = parts[j];
            if (!current[part]) {
                current[part] = j === parts.length - 1 ? null : {};
            }
            current = current[part];
        }
    }
    return tree;
}

/**
 * Recursively prints directory tree hierarchy.
 *
 * @param {object} node - Tree node.
 * @param {string} [prefix=""] - Line prefix.
 * @returns {void}
 */
function printTree(node, prefix = "") {
    const keys = Object.keys(node);
    const lastIndex = keys.length - 1;

    for (let i = 0; i <= lastIndex; i++) {
        const key = keys[i];
        const isLast = i === lastIndex;
        const branch = isLast ? "└── " : "├── ";
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        const styledKey = node[key] ? chalk.blue.bold(key) : chalk.green(key);

        console.log(`${prefix}${branch}${styledKey}`);
        if (node[key]) printTree(node[key], newPrefix);
    }
}

exec("git ls-tree -r --name-only HEAD", (err, stdout, stderr) => {
    if (err) {
        console.error(chalk.red(`Error executing Git command: ${stderr}`));
        process.exit(1);
    }

    const files = stdout.split("\n").filter((line) => line.trim() !== "");
    console.log(chalk.cyan("Git Repository Tree:"));
    printTree(buildTree(files));
});

import { system } from "@minecraft/server";
import { paradoxModulesDB } from "../paradox";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

let currentJobId: number | null = null;

/**
 * Formats an item type ID by removing the "minecraft:" prefix and converting it to a readable format.
 * Example: "minecraft:golden_apple" → "Golden Apple"
 *
 * @param {string} itemTypeId - The raw item type ID.
 * @returns {string} - The formatted item name.
 */
function formatItemName(itemTypeId: string): string {
    return itemTypeId
        .replace(/^minecraft:/, "") // Remove "minecraft:" prefix
        .split("_") // Split words by underscores
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join(" "); // Join words with spaces
}

/**
 * A generator function that continuously checks inventory contents of blocks being viewed
 * by players with Level 4 security clearance and displays the items on the action bar.
 *
 * @param {number} jobId - The ID of the running job for cleanup purposes.
 */
function* visionGenerator(jobId: number): Generator<void, void, unknown> {
    while (true) {
        // Check if the vision module is enabled
        const visionEnabled = paradoxModulesDB.get<boolean>("visionCheck_b") ?? false;
        if (!visionEnabled) {
            if (jobId) {
                system.clearJob(jobId);
                return;
            }
            return;
        }

        // Get all players with Level 4 security clearance
        const players = getSecurityClearanceLevel4Players();

        let foundContainer = false;

        for (const player of players) {
            // Get the block the player is currently looking at
            const blockTarget = player.getBlockFromViewDirection({ maxDistance: 10 });

            if (!blockTarget) continue;

            // Retrieve inventory component if the block has one
            const block = blockTarget.block;

            if (!block) continue;

            const blockComponent = block.getComponent("minecraft:inventory");

            if (!blockComponent) continue;

            const blockContainer = blockComponent.container;

            if (!blockContainer) continue;

            foundContainer = true; // A container has been found and processed

            const blockInventorySize = blockContainer.size;
            const itemCounts: Record<string, number> = {}; // Object to count items

            for (let i = 0; i < blockInventorySize; i++) {
                const item = blockContainer.getItem(i);
                if (!item) continue;

                const formattedName = formatItemName(item.typeId);
                itemCounts[formattedName] = (itemCounts[formattedName] || 0) + item.amount;
            }

            let displayText = Object.entries(itemCounts)
                .map(([name, count]) => `§2[§f${name}§2]§7 Amount: §2x${count}§f`) // Format items with count
                .join("\n"); // Newline for better formatting

            // If the container is empty, display a message
            if (!displayText) {
                displayText = "§cContainer Is Empty";
            }

            // Display the item list on the player's action bar
            player.onScreenDisplay.setActionBar(displayText);

            yield; // Allow other tasks to execute before continuing
        }

        if (foundContainer) {
            // If a container was found, schedule a delayed resume after 30 ticks (1.5 seconds)
            let done = false;
            system.waitTicks(30).then(() => (done = true));
            while (!done) yield; // Yield until the delay is complete
        } else {
            // If no container was found, just yield normally (resume next tick)
            yield;
        }
    }
}

/**
 * Starts or restarts the vision check job, allowing Level 4 players to inspect block inventories.
 * Ensures that any existing job is cleared before starting a new one.
 */
export function startVisionCheck() {
    if (currentJobId !== null) {
        system.clearJob(currentJobId); // Stop any existing job
    }

    currentJobId = system.runJob(visionGenerator(currentJobId!)); // Start a new job
}

/**
 * Stops the vision check job if it is currently running.
 */
export function stopVisionCheck() {
    if (currentJobId !== null) {
        system.clearJob(currentJobId);
        currentJobId = null;
    }
}

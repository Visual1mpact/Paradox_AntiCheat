import { world, Block, Player, Dimension, system, Vector } from "@minecraft/server";
import { startTimer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

let blockAtPlayer0: Block;
let blockAtPlayer1: Block;
const playerTags: string[] = ["vanish", "swimming", "riding", "flying", "ground"];

const playerCount = new Map<string, number>();

function timer(player: Player, dimension: Dimension, x: number, y: number, z: number) {
    player.teleport({ x: x, y: y - 2, z: z }, { dimension: dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
    playerCount.set(player.name, 0);
}

function jesusa(id: number) {
    // Get Dynamic Property
    const jesusaBoolean = dynamicPropertyRegistry.get("jesusa_b");

    // Unsubscribe if disabled in-game
    if (jesusaBoolean === false) {
        playerCount.clear();
        system.clearRun(id);
        return;
    }
    // run as each player
    const players = world.getPlayers();
    for (const player of players) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        const { x, y, z } = player.location;
        const dimension = player.dimension;
        try {
            // Below Below player
            blockAtPlayer0 = player.dimension.getBlock({ x: x, y: y - 1, z: z });
            // Below player
            blockAtPlayer1 = player.dimension.getBlock({ x: x, y: y, z: z });
        } catch (error) {}

        const playerFeetY = Math.floor(y); // Round down to get the player's feet Y-coordinate

        if (
            (playerTags.every((tag) => !player.hasTag(tag)) && blockAtPlayer1.typeId === "minecraft:water" && blockAtPlayer0.typeId === "minecraft:water" && playerFeetY === blockAtPlayer1.y) ||
            (playerTags.every((tag) => !player.hasTag(tag)) && blockAtPlayer1.typeId === "minecraft:lava" && blockAtPlayer0.typeId === "minecraft:lava" && playerFeetY === blockAtPlayer1.y)
        ) {
            const count = playerCount.get(player.name) || 0;
            playerCount.set(player.name, count + 1);

            /**
             * startTimer will make sure the key is properly removed
             * when the time for theVoid has expired. This will preserve
             * the integrity of our Memory.
             */
            const timerExpired = startTimer("jesusa", player.name, Date.now());
            if (timerExpired.namespace.indexOf("jesusa") !== -1 && timerExpired.expired) {
                const deletedKey = timerExpired.key; // extract the key without the namespace prefix
                playerCount.delete(deletedKey);
            }

            // Flag them after 2 seconds of activity
            if (count === 1) {
                timer(player, dimension, x, y, z);
            }
        }
        // Reset count
        if (player.hasTag("ground")) {
            playerCount.delete(player.name);
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function JesusA() {
    const jesusAId = system.runInterval(() => {
        jesusa(jesusAId);
    }, 20);
}

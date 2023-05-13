import { world, BlockBreakEvent, Block, BlockPermutation } from "@minecraft/server";
import { flag, startTimer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

let lastBreakTime = new Map<string, number>();
let blocksBroken = new Map<string, number>();
let brokenBlockLocations = new Map<string, Array<Block>>();
let blockIDMap = new Map<string, Map<Block, BlockPermutation>>();

async function nukera(object: BlockBreakEvent) {
    // Get Dynamic Property
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");

    if (antiNukerABoolean === false) {
        lastBreakTime.clear();
        blocksBroken.clear();
        brokenBlockLocations.clear();
        blockIDMap.clear();
        world.events.blockBreak.unsubscribe(nukera);
        return;
    }

    // Properties from class
    const { block, player, dimension, brokenBlockPermutation } = object;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    /**
     * startTimer will make sure the key is properly removed
     * when the time for theVoid has expired. This will preserve
     * the integrity of our Memory.
     */
    const timerExpired = startTimer("antinukera", player.id, Date.now());
    if (timerExpired.namespace.indexOf("antinukera") !== -1 && timerExpired.expired) {
        const deletedKey = timerExpired.key; // extract the key without the namespace prefix
        blocksBroken.delete(deletedKey);
        lastBreakTime.delete(deletedKey);
        brokenBlockLocations.delete(deletedKey);
        blockIDMap.delete(deletedKey);
    }

    // Get the properties of the blocks being destroyed
    const blockID = brokenBlockPermutation.clone();

    // Block dimension and location for permutation
    const blockLoc = dimension.getBlock(block.location);

    // Map block to its corresponding blockID
    let playerBlockMap = blockIDMap.get(player.id);
    if (!playerBlockMap) {
        playerBlockMap = new Map<Block, BlockPermutation>();
        blockIDMap.set(player.id, playerBlockMap);
    }
    playerBlockMap.set(block, blockID);

    const now = Date.now();
    const lastBreak = lastBreakTime.get(player.id);
    if (lastBreak && now - lastBreak < 50) {
        // less than 50 milliseconds since last break
        const count = (blocksBroken.get(player.id) || 0) + 1;
        blocksBroken.set(player.id, count);
        if (count >= 2) {
            // 2 or more blocks broken in less than one tick
            flag(player, "Nuker", "A", "Break", null, null, null, null, false, null);
            blocksBroken.delete(player.id);
            const blocks: Block[] = brokenBlockLocations.get(player.id) || [];
            for (const block of blocks) {
                const playerBlockMap = blockIDMap.get(player.id);
                for (const [loc, blockID] of playerBlockMap.entries()) {
                    if (loc.x === block.location.x && loc.y === block.location.y && loc.z === block.location.z) {
                        block.setPermutation(blockID);
                        playerBlockMap.delete(loc);
                        try {
                            await player.runCommandAsync(`kill @e[x=${block.location.x},y=${block.location.y},z=${block.location.z},r=10,c=1,type=item]`);
                        } catch (error) {}
                        break;
                    }
                }
            }
            brokenBlockLocations.delete(player.id);
            blockIDMap.delete(player.id);
        }
    } else {
        lastBreakTime.set(player.id, now);
        blocksBroken.set(player.id, 1);
        const locations: Array<Block> = brokenBlockLocations.get(player.id) || [];
        locations.push(blockLoc);
        brokenBlockLocations.set(player.id, locations);
    }
}

const NukerA = () => {
    world.events.blockBreak.subscribe(nukera);
};

export { NukerA };

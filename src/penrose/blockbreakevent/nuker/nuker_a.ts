import { world, BlockBreakEvent, Vector } from "@minecraft/server";
import { flag, startTimer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";
import { kickablePlayers } from "../../../kickcheck.js";

const lastBreakTime = new Map<string, number>();
const blockCounter = new Map<string, number>();

async function nukera(object: BlockBreakEvent): Promise<void> {
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");
    if (antiNukerABoolean === false) {
        blockCounter.clear();
        lastBreakTime.clear();
        world.events.blockBreak.unsubscribe(nukera);
        return;
    }

    const { block, player, dimension, brokenBlockPermutation } = object;
    const { x, y, z } = block.location;

    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    if (uniqueId === player.name) {
        return;
    }

    /**
     * startTimer will make sure the key is properly removed
     * when the time for theVoid has expired. This will preserve
     * the integrity of our Memory.
     */
    const timerExpired = startTimer("nukera", player.id, Date.now());
    if (timerExpired.namespace.indexOf("nukera") !== -1 && timerExpired.expired) {
        const deletedKey = timerExpired.key; // extract the key without the namespace prefix
        blockCounter.delete(deletedKey);
        lastBreakTime.delete(deletedKey);
    }

    let counter = blockCounter.get(player.id) || 0;

    const now = Date.now();
    const lastBreak = lastBreakTime.get(player.id);
    if (lastBreak && now - lastBreak < 50) {
        counter++;
        if (counter >= 2) {
            const blockLoc = dimension.getBlock(new Vector(x, y, z));
            const blockID = brokenBlockPermutation.clone();

            flag(player, "Nuker", "A", "Break", null, null, null, null, false, null);
            blockLoc.setPermutation(blockID);
            blockCounter.delete(player.id);
            lastBreakTime.delete(player.id);

            try {
                await player.runCommandAsync(`kill @e[x=${x},y=${y},z=${z},r=10,c=1,type=item]`);
            } catch (error) {}

            try {
                player.addTag("Reason:Anti-NukerA");
                player.addTag("By:Paradox");
                player.addTag("isBanned");
            } catch (error) {
                kickablePlayers.add(player);
                player.triggerEvent("paradox:kick");
            }
            return;
        }
        // Reset the counter if a certain condition is not met
        counter = 0;
    } else {
        lastBreakTime.set(player.id, now);
    }

    // Update the counter value in the map
    blockCounter.set(player.id, counter);
}

const NukerA = () => {
    world.events.blockBreak.subscribe(nukera);
};

export { NukerA };

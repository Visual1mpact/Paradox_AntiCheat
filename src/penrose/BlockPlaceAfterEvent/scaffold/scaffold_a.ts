import { world, MinecraftBlockTypes, BlockPlaceAfterEvent, PlayerLeaveAfterEvent } from "@minecraft/server";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

const blockTimer = new Map<string, Date[]>();

function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    // Remove the player's data from the map when they log off
    const playerName = event.playerId;
    blockTimer.delete(playerName);
}

function scaffolda(object: BlockPlaceAfterEvent) {
    // Get Dynamic Property
    const antiScaffoldABoolean = dynamicPropertyRegistry.get("antiscaffolda_b");

    // Unsubscribe if disabled in-game
    if (antiScaffoldABoolean === false) {
        blockTimer.clear();
        world.afterEvents.playerLeave.unsubscribe(onPlayerLogout);
        world.afterEvents.blockPlace.unsubscribe(scaffolda);
        return;
    }

    // Properties from class
    const { block, player, dimension } = object;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Block coordinates
    const { x, y, z } = block.location;

    let timer: Date[];
    if (blockTimer.has(player.id)) {
        timer = blockTimer.get(player.id);
    } else {
        timer = [];
    }

    timer.push(new Date());

    const tiktok = timer.filter((time) => time.getTime() > new Date().getTime() - 100);
    blockTimer.set(player.id, tiktok);

    if (tiktok.length >= config.modules.antiscaffoldA.max) {
        dimension.getBlock({ x: x, y: y, z: z }).setType(MinecraftBlockTypes.air);
        flag(player, "Scaffold", "A", "Placement", null, null, null, null, false);
        /*
        try {
            player.runCommand(`tag "${disabler(player.name)}" add "
            :Illegal Scaffolding"`);
            player.runCommand(`tag "${disabler(player.name)}" add "By:Paradox"`);
            player.addTag('isBanned');
        } catch (error) {
            kickablePlayers.add(player); player.triggerEvent('paradox:kick');
        }*/
    }
}

const ScaffoldA = () => {
    world.afterEvents.playerLeave.subscribe(onPlayerLogout);
    world.afterEvents.blockPlace.subscribe(scaffolda);
};

export { ScaffoldA };

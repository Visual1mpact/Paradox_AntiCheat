import { world, Player, system, Vector } from "@minecraft/server";
import { getScore, sendMsg } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

async function Freeze(id: number) {
    let posx: number;
    let posy: number;
    let posz: number;
    let posx1: number;
    let posy1: number;
    let posz1: number;
    let realmID: number;
    let realmIDString: string;
    let backx: number;
    let backy: number;
    let backz: number;
    let player: Player;
    let hastag: boolean;

    // Record their location
    try {
        posx = player.location.x;
        posy = player.location.y;
        posz = player.location.z;
    } catch (error) {}

    try {
        hastag = player.hasTag("freezeactive");
    } catch (error) {}

    if (!hastag) {
        // Save which dimension they were in
        // realm 0 = overworld, realm 1 = nether, realm 2 = the end
        if (player.dimension.id === "minecraft:overworld") {
            await player.runCommandAsync(`scoreboard players set @s realm 0`);
        } else if (player.dimension.id === "minecraft:nether") {
            await player.runCommandAsync(`scoreboard players set @s realm 1`);
        } else if (player.dimension.id === "minecraft:the_end") {
            await player.runCommandAsync(`scoreboard players set @s realm 2`);
        } else {
            player.removeTag("freezeactive");
            player.removeTag("freeze");
            await player.runCommandAsync(`effect @s clear`);
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Cannot determine dimension for ${player.nameTag}.`);
            system.clearRun(id);
            return;
        }
        // We just need this in case they log off and log back on
        await player.runCommandAsync(`scoreboard players set @s xPosFreeze ${Math.floor(posx)}`);
        await player.runCommandAsync(`scoreboard players set @s yPosFreeze ${Math.floor(posy)}`);
        await player.runCommandAsync(`scoreboard players set @s zPosFreeze ${Math.floor(posz)}`);
        // Backup coords for returning home
        backx = Math.floor(posx);
        backy = Math.floor(posy);
        backz = Math.floor(posz);
        // Set them up high in the sky
        // We target Y only but can use X and Z if desired
        posx = Math.floor(posx);
        posy = Math.floor(245);
        posz = Math.floor(posz);
        // TP them at the new location in the overworld
        player.teleport({ x: posx, y: posy, z: posz }, { dimension: world.getDimension("overworld"), rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
        // Create prison around player
        try {
            await player.runCommandAsync(`fill ~1 ~2 ~1 ~-1 ~-1 ~-1 barrier [] hollow`);
        } catch (erro) {}
        // Save coordinates at prison
        posx1 = player.location.x;
        posy1 = player.location.y;
        posz1 = player.location.z;
        // We just need this in case they log off and log back on
        await player.runCommandAsync(`scoreboard players set @s xPos1 ${Math.floor(posx1)}`);
        await player.runCommandAsync(`scoreboard players set @s yPos1 ${Math.floor(posy1)}`);
        await player.runCommandAsync(`scoreboard players set @s zPos1 ${Math.floor(posz1)}`);
        player.addTag("freezeactive");
    }
    // Since they could log off while frozen we store their coords and dimension as a score
    // Then we use this to insure we know their last location when we unfreeze
    posx1 = getScore("xPos1", player);
    posy1 = getScore("yPos1", player);
    posz1 = getScore("zPos1", player);
    // Verify if player moved from the prison
    if (posx1 !== posx || posy1 !== posy || posz1 !== posz) {
        // If they move then tp them back
        try {
            player.teleport({ x: posx1, y: posy1, z: posz1 }, { dimension: world.getDimension("overworld"), rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
        } catch (error) {}
    }

    try {
        hastag = player.hasTag("freeze");
    } catch (error) {}

    // Check if they no longer have the tag freeze
    if (!hastag) {
        // We use this in case they log off and return later
        backx = getScore("xPosFreeze", player);
        backy = getScore("yPosFreeze", player);
        backz = getScore("zPosFreeze", player);
        realmID = getScore("realm", player);
        // Convert dimension score to realm dimension
        if (realmID === 0) {
            realmIDString = "overworld";
        }
        if (realmID === 1) {
            realmIDString = "nether";
        }
        if (realmID === 2) {
            realmIDString = "the end";
        }
        // Release from prison
        await player.runCommandAsync(`fill ~1 ~2 ~1 ~-1 ~-1 ~-1 air [] hollow`);
        // Return them back to original coordinates
        player.teleport({ x: backx, y: backy, z: backz }, { dimension: world.getDimension(realmIDString), rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
        player.removeTag("freezeactive");
        world.afterEvents.playerLeave.unsubscribe(() => StopTickFreeze(id));
        system.clearRun(id);
    }
}

// If they log off then unsubscribe Freeze
function StopTickFreeze(id: number) {
    system.clearRun(id);
}

// Where the magic begins
function TickFreeze(data: Player) {
    const player = data;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Skip if they have permission
    if (uniqueId !== player.name) {
        /**
         * We store the identifier in a variable
         * to cancel the execution of this scheduled run
         * if needed to do so.
         */
        const freezeId = system.runInterval(() => {
            Freeze(freezeId);
        });
        world.afterEvents.playerLeave.subscribe(() => StopTickFreeze(freezeId));
    }
}

export { TickFreeze };

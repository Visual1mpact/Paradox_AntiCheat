import { world, Location, Player } from "mojang-minecraft";
import config from "../../../data/config.js";
import { getScore, crypto, sendMsg } from "../../../util.js";

const World = world;
const tickEventCallback = World.events.tick;
const playerLeaveEventCallback = World.events.playerLeave;

// Global definitions within script
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

function Freeze() {
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
            player.runCommand(`scoreboard players set @s realm 0`);
        } else if (player.dimension.id === "minecraft:nether") {
            player.runCommand(`scoreboard players set @s realm 1`);
        } else if (player.dimension.id === "minecraft:the_end") {
            player.runCommand(`scoreboard players set @s realm 2`);
        } else {
            player.removeTag("freezeactive");
            player.removeTag("freeze");
            player.runCommand(`effect @s clear`);
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Cannot determine dimension for ${player.nameTag}.`);
            tickEventCallback.unsubscribe(Freeze);
            return;
        }
        // We just need this in case they log off and log back on
        player.runCommand(`scoreboard players set @s xPosFreeze ${Math.floor(posx)}`);
        player.runCommand(`scoreboard players set @s yPosFreeze ${Math.floor(posy)}`);
        player.runCommand(`scoreboard players set @s zPosFreeze ${Math.floor(posz)}`);
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
        player.teleport(new Location(posx, posy, posz), World.getDimension("overworld"), 0, 0);
        // Create prison around player
        try {
            player.runCommand(`fill ~1 ~2 ~1 ~-1 ~-1 ~-1 barrier 0 hollow`);
        } catch (erro) {}
        // Save coordinates at prison
        posx1 = player.location.x;
        posy1 = player.location.y;
        posz1 = player.location.z;
        // We just need this in case they log off and log back on
        player.runCommand(`scoreboard players set @s xPos1 ${Math.floor(posx1)}`);
        player.runCommand(`scoreboard players set @s yPos1 ${Math.floor(posy1)}`);
        player.runCommand(`scoreboard players set @s zPos1 ${Math.floor(posz1)}`);
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
            player.teleport(new Location(posx1, posy1, posz1), World.getDimension("overworld"), 0, 0);
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
        player.runCommand(`fill ~1 ~2 ~1 ~-1 ~-1 ~-1 air 0 hollow`);
        // Return them back to original coordinates
        player.teleport(new Location(backx, backy, backz), World.getDimension(realmIDString), 0, 0);
        player.removeTag("freezeactive");
        playerLeaveEventCallback.unsubscribe(StopTickFreeze);
        tickEventCallback.unsubscribe(Freeze);
    }
}

// If they log off then unsubscribe Freeze
function StopTickFreeze() {
    tickEventCallback.unsubscribe(Freeze);
}

// Where the magic begins
function TickFreeze(data) {
    player = data;
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    if (hash === undefined || encode !== hash) {
        try {
            tickEventCallback.subscribe(Freeze);
        } catch (error) {}
        playerLeaveEventCallback.subscribe(StopTickFreeze);
    }
}

export { TickFreeze };

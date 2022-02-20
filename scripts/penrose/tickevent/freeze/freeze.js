import * as Minecraft from "mojang-minecraft";

const World = Minecraft.world;
const tickEventCallback = World.events.tick;
const playerLeaveEventCallback = World.events.playerLeave;

// Global definitions within script
let posx;
let posy;
let posz;
let posx1;
let posy1;
let posz1;
let realmID;
let backx;
let backy;
let backz;
let player;
let hastag;

// Since they could log off while frozen we store their coords and dimension as a score
// Then we use this to insure we know their last location when we unfreeze
function getScore(objective, player, { minimum, maximum } = {}) {
    const data = player.runCommand(
      `scoreboard players test "${player.nameTag}" ${objective} ${
        minimum ? minimum : "*"
      } ${maximum ? maximum : "*"}`
    );
    if (!data.statusMessage) return;
    return parseInt(data.statusMessage.match(/-?\d+/));
  }

function Freeze() {
    // Record their location
    try {
        posx = player.location.x;
        posy = player.location.y;
        posz = player.location.z;
    } catch (error) {}

    try {
        hastag = player.hasTag('freezeactive');
    } catch (error) {}

    if (!hastag) {
        // Save which dimension they were in
        // This will have to do until the property id for dimension is released
        // realm 0 = overworld, realm 1 = nether, realm 2 = the end
        let o = World.getDimension('overworld'),
            n = World.getDimension('nether'),
            e = World.getDimension('the end')
        let {x, y, z} = player.location
        let pos = new Minecraft.BlockLocation(
            Math.floor(x),
            Math.floor(y),
            Math.floor(z)
        )
        if (o.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == player.nameTag)) {
            player.runCommand(`scoreboard players set "${player.nameTag}" realm 0`);
        } else if (n.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == player.nameTag)) {
            player.runCommand(`scoreboard players set "${player.nameTag}" realm 1`);
        } else if (e.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == player.nameTag)) {
            player.runCommand(`scoreboard players set "${player.nameTag}" realm 2`);
        } else {
            player.removeTag('freezeactive');
            player.removeTag('freeze');
            player.runCommand(`effect "${member.nameTag}" clear`)
            player.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Cannot determine ${player.nameTag} dimension."}]}`);
            playerLeaveEventCallback.unsubscribe(StopTickFreeze);
            tickEventCallback.unsubscribe(Freeze);
            return;
        }
        // We just need this in case they log off and log back on
        player.runCommand(`scoreboard players set "${player.nameTag}" xPosFreeze ${Math.floor(posx)}`);
        player.runCommand(`scoreboard players set "${player.nameTag}" yPosFreeze ${Math.floor(posy)}`);
        player.runCommand(`scoreboard players set "${player.nameTag}" zPosFreeze ${Math.floor(posz)}`);
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
        player.teleport(new Minecraft.Location(posx, posy, posz), World.getDimension('overworld'), 0, player.bodyRotation);
        // Create prison around player
        try {
            player.runCommand(`fill ~1 ~2 ~1 ~-1 ~-1 ~-1 barrier 0 hollow`);
        } catch (erro) {}
        // Save coordinates at prison
        posx1 = player.location.x;
        posy1 = player.location.y;
        posz1 = player.location.z;
        // We just need this in case they log off and log back on
        player.runCommand(`scoreboard players set "${player.nameTag}" xPos1 ${Math.floor(posx1)}`);
        player.runCommand(`scoreboard players set "${player.nameTag}" yPos1 ${Math.floor(posy1)}`);
        player.runCommand(`scoreboard players set "${player.nameTag}" zPos1 ${Math.floor(posz1)}`);
        player.addTag('freezeactive');
        player.addTag('objective:xPosFreeze');
        player.addTag('objective:yPosFreeze');
        player.addTag('objective:zPosFreeze');
    }
    // We use this in case they log off and return later
    posx1 = getScore(
        "xPos1",
        player
        );
    posy1 = getScore(
        "yPos1",
        player
        );
    posz1 = getScore(
        "zPos1",
        player
        );
    // Verify if player moved from the prison
    if (posx1 !== posx || posy1 !== posy || posz1 !== posz) {
        // If they move then tp them back
        try {
            player.teleport(new Minecraft.Location(posx1, posy1, posz1), World.getDimension('overworld'), 0, player.bodyRotation);
        } catch (error) {}
    }

    try {
        hastag = player.hasTag('freeze');
    } catch (error) {}

    // Check if they no longer have the tag freeze
    if (!hastag) {
        // We use this in case they log off and return later
        backx = getScore(
            "xPosFreeze",
            player
            );
        backy = getScore(
            "yPosFreeze",
            player
            );
        backz = getScore(
            "zPosFreeze",
            player
            );
        realmID = getScore(
            "realm",
            player
            );
        // Convert dimension score to realm dimension
        if (realmID === 0) {
            realmID = "overworld";
        }
        if (realmID === 1) {
            realmID = "nether";
        }
        if (realmID === 2) {
            realmID = "the end";
        }
        // Release from prison
        player.runCommand(`fill ~1 ~2 ~1 ~-1 ~-1 ~-1 air 0 hollow`);
        // Return them back to original coordinates
        player.teleport(new Minecraft.Location(backx, backy, backz), World.getDimension(realmID), 0, player.bodyRotation);
        player.removeTag('freezeactive');
        player.removeTag('objective:xPosFreeze');
        player.removeTag('objective:yPosFreeze');
        player.removeTag('objective:zPosFreeze');
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
    try {
        tickEventCallback.subscribe(Freeze);
    } catch (error) {}
    playerLeaveEventCallback.subscribe(StopTickFreeze);
}

export { TickFreeze };
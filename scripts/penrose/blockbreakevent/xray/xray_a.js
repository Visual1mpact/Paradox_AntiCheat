import * as Minecraft from "mojang-minecraft";

const World = Minecraft.world;

const XrayA = () => {
    World.events.blockBreak.subscribe(datablock => {
        let player = datablock.player.nameTag;
        let blocks = datablock.brokenBlockPermutation.type.id;
        let posx = datablock.player.location.x;
        let posy = datablock.player.location.y;
        let posz = datablock.player.location.z;

        if (blocks === "minecraft:ancient_debris" || blocks === "minecraft:diamond_ore" || blocks === "minecraft:deepslate_diamond_ore") {
            try{
                datablock.player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r §4[Xray]§r ${player.replace("\"", "").replace("\\", "")}§6 has found §r1x ${blocks.replace("minecraft:", "")}§6 at X= §r${posx.toFixed(0)}§6 Y= §r${posy.toFixed(0)}§6 Z= §r${posz.toFixed(0)}."}]}`);
            } catch(error) {}
        }
    });
};

export { XrayA };
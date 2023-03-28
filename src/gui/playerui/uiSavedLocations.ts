import { Player, Vector, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { decryptString, sendMsgToPlayer, setTimer } from "../../util.js";
import { paradoxui } from "../paradoxui.js";

export function uiSAVEDLOCATIONS(savedlocationsResult: ModalFormResponse, Locations: string[], player: Player, coordArray: string[]) {
    const [selectedLocationvalue, teleportToSelectedLocation, deleteSelectedLocation] = savedlocationsResult.formValues;
    let x: number;
    let y: number;
    let z: number;
    let dimension: string;
    for (let i = 0; i < coordArray.length; i++) {
        if (coordArray[i].includes("LocationHome:" && Locations[selectedLocationvalue])) {
            x = parseInt(coordArray[i + 1].replace("X:", ""));
            y = parseInt(coordArray[i + 2].replace("Y:", ""));
            z = parseInt(coordArray[i + 3].replace("Z:", ""));
            dimension = coordArray[i + 4].replace("Dimension:", "");
        }
        continue;
    }
    if (teleportToSelectedLocation && deleteSelectedLocation === true) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cant teleport and delete the location!`);
        return paradoxui(player);
    }
    if (teleportToSelectedLocation === true) {
        setTimer(player.name);
        player.teleport(new Vector(x, y, z), world.getDimension(dimension), 0, 0);
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Welcome back!`);
        return player;
    }
    if (deleteSelectedLocation === true) {
        const salt = world.getDynamicProperty("crypt");
        // Find and delete this saved home location
        let encryptedString: string = "";
        const tags = player.getTags();
        for (let i = 0; i < tags.length; i++) {
            if (tags[i].startsWith("6f78")) {
                encryptedString = tags[i];
                // Decode it so we can verify it
                tags[i] = decryptString(tags[i], String(salt));
            }
            if (tags[i].startsWith("LocationHome:" && Locations[selectedLocationvalue] + " X", 13)) {
                player.removeTag(encryptedString);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Successfully deleted home '${Locations[selectedLocationvalue]}'!`);
                break;
            }
        }
    }

    return paradoxui(player);
}

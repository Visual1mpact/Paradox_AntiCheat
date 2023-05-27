import { Player, Vector, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import config from "../../data/config.js";
import { decryptString, encryptString, sendMsgToPlayer, setTimer } from "../../util.js";
import { paradoxui } from "../paradoxui.js";

export function uiSAVEDLOCATIONS(savedlocationsResult: ModalFormResponse, Locations: string[], player: Player, coordArray: string[]) {
    const [selectedLocationvalue, teleportToSelectedLocation, deleteSelectedLocation, newLocationName] = savedlocationsResult.formValues;
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
        //If both toggles are enabled the message bellow will be sent to the player and the UI will be dispalyed.
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cant teleport and delete the location!`);
        return paradoxui(player);
    }
    if (teleportToSelectedLocation === true) {
        //Teleport the player to the location set in the dropdown.
        setTimer(player.id);
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
    if (!newLocationName) {
        //do nothing as a name value was not set.
    } else {
        //A value was entered execute the code bellow.
        //First check to make sure the same location name entered doesnt already exist
        let counter = 0;
        for (let i = 0; i < coordArray.length; i++) {
            //Count how many tags already exist based on the array.
            if (coordArray[i].includes("LocationHome:")) {
                counter = ++counter;
            }
            if (coordArray[i].includes("LocationHome:" && newLocationName)) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r This name already exists please try again.`);
                return paradoxui(player);
            }
            //Check to make sure they havent exceeded the max locations in config.js
            if (counter >= config.modules.setHome.max && config.modules.setHome.enabled) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You can only have ${config.modules.setHome.max} saved locations at a time!`);
                return paradoxui(player);
            }
            continue;
        }
        // Get current location of the player.
        const { x, y, z } = player.location;
        const currentX = x.toFixed(0);
        const currentY = y.toFixed(0);
        const currentZ = z.toFixed(0);
        let currentDimension: string;
        //save boolean to make sure we can save the location.
        let doSave: boolean;
        // Hash the coordinates for security
        const salt = world.getDynamicProperty("crypt");
        //Check to make sure there are no spaces in the name that has been entered.
        if (newLocationName.includes(" ")) {
            doSave = false;
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r No spaces in names please!`);
            return paradoxui(player);
        }
        // Save which dimension they were in
        if (player.dimension.id === "minecraft:overworld") {
            currentDimension = "overworld";
            doSave = true;
        }
        if (player.dimension.id === "minecraft:nether") {
            currentDimension = "nether";
            doSave = true;
        }
        if (player.dimension.id === "minecraft:the_end") {
            doSave = false;
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Not allowed to save a location in this dimension!`);
        }
        if (doSave === true) {
            const decryptedLocationString = `LocationHome:${newLocationName} X:${currentX} Y:${currentY} Z:${currentZ} Dimension:${currentDimension}`;
            const security = encryptString(decryptedLocationString, String(salt));
            player.addTag(security);
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r New Location has been saved.`);
        }
    }

    return paradoxui(player);
}

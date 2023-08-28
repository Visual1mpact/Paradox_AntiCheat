import { Player, world } from "@minecraft/server";
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
    const coordArrayLength = coordArray.length;
    for (let i = 0; i < coordArrayLength; i++) {
        if (coordArray[i].includes("LocationHome:" && Locations[selectedLocationvalue as number])) {
            x = parseInt(coordArray[i + 1].replace("X:", ""));
            y = parseInt(coordArray[i + 2].replace("Y:", ""));
            z = parseInt(coordArray[i + 3].replace("Z:", ""));
            dimension = coordArray[i + 4].replace("Dimension:", "");
        }
        continue;
    }
    if (teleportToSelectedLocation && deleteSelectedLocation === true) {
        //If both toggles are enabled the message bellow will be sent to the player and the UI will be dispalyed.
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cant teleport and delete the location!`);
        return paradoxui(player);
    }
    if (teleportToSelectedLocation === true) {
        //Teleport the player to the location set in the dropdown.
        setTimer(player.id);
        player.teleport({ x: x, y: y, z: z }, { dimension: world.getDimension(dimension), rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Welcome back!`);
        return player;
    }
    if (deleteSelectedLocation === true) {
        const salt = world.getDynamicProperty("crypt");
        // Find and delete this saved home location
        let encryptedString: string = "";
        const tags = player.getTags();
        const tagsLength = tags.length;
        for (let i = 0; i < tagsLength; i++) {
            // 6f78 is temporary and will be removed
            if (tags[i].startsWith("6f78")) {
                // Remove old encryption
                player.removeTag(tags[i]);
                // Change to AES Encryption so we can abandon the old method
                tags[i] = decryptString(tags[i], salt as string);
                tags[i] = encryptString(tags[i], salt as string);
                player.addTag(tags[i]);
            }
            if (tags[i].startsWith("1337")) {
                encryptedString = tags[i];
                // Decode it so we can verify it
                tags[i] = decryptString(tags[i], salt as string);
            }
            if (tags[i].startsWith("LocationHome:" && Locations[selectedLocationvalue as number] + " X", 13)) {
                player.removeTag(encryptedString);
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Successfully deleted home '${Locations[selectedLocationvalue as number]}'!`);
                break;
            }
        }
    }
    if (newLocationName) {
        //A value was entered execute the code bellow.
        //First check to make sure the same location name entered doesnt already exist
        let counter = 0;
        const coordArrayLength = coordArray.length;
        for (let i = 0; i < coordArrayLength; i++) {
            //Count how many tags already exist based on the array.
            if (coordArray[i].includes("LocationHome:")) {
                counter = ++counter;
            }
            if (coordArray[i].includes("LocationHome:" + newLocationName)) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f This name already exists please try again.`);
                return paradoxui(player);
            }
            //Check to make sure they havent exceeded the max locations in config.js
            if (counter >= config.modules.setHome.max && config.modules.setHome.enabled) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You can only have ${config.modules.setHome.max} saved locations at a time!`);
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
        if (typeof newLocationName === "string" && newLocationName.includes(" ")) {
            doSave = false;
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f No spaces in names please!`);
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
            return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Not allowed to save a location in this dimension!`);
        }
        if (doSave === true) {
            const decryptedLocationString = `LocationHome:${newLocationName} X:${currentX} Y:${currentY} Z:${currentZ} Dimension:${currentDimension}`;
            const security = encryptString(decryptedLocationString, salt as string);
            player.addTag(security);
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f New Location has been saved.`);
        }
    }

    return paradoxui(player);
}

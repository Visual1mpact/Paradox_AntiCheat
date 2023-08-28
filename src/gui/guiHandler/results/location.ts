import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { decryptString, encryptString, sendMsgToPlayer } from "../../../util";
import config from "../../../data/config";
import { uiSAVEDLOCATIONS } from "../../playerui/uiSavedLocations";

export function locationHandler(player: Player) {
    //No Opped Menu to show Saved Locations
    const savedlocationsui = new ModalFormData();
    // Hash the coordinates for security
    const salt = world.getDynamicProperty("crypt");
    const tags = player.getTags();
    const tagsLength = tags.length;
    let counter = 0;
    const Locations: string[] = [];
    const coordsArray: string[] = [];
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
            // Decode it so we can verify it
            tags[i] = decryptString(tags[i], salt as string);
            // If invalid then skip it
            if (tags[i].startsWith("LocationHome:") === false) {
                continue;
            }
            // Split string into array
            const coordinatesArray = tags[i].split(" ");
            const coordArrayLength = coordinatesArray.length;
            counter = ++counter;
            for (let i = 0; i < coordArrayLength; i++) {
                // Get their location from the array
                coordsArray.push(coordinatesArray[i]);
                if (coordinatesArray[i].includes("LocationHome:")) {
                    Locations.push(coordinatesArray[i].replace("LocationHome:", ""));
                }
                continue;
            }
        }
    }
    if (Locations.length === 0) {
        /*No locations saved so it will crap its self!
        So if there is no data we push a line to keep the array with at least 1 value.
        If there are saved locations then it will continue as normal.
        */
        Locations.push("You have no saved Locations");
    }
    savedlocationsui.title("§4Paradox - Saved Locations§4");
    savedlocationsui.dropdown(`\n§fSelect a Location:§f\n\nSaved Location's\n`, Locations);
    savedlocationsui.toggle("Teleport to the selected location:", false);
    savedlocationsui.toggle("Deletes the selected Location:", false);
    savedlocationsui.textField("Enter a name to save your current Location:", "");
    if (config.customcommands.sethome === true && config.customcommands.delhome === true && config.customcommands.listhome === true && config.customcommands.gohome === true) {
        savedlocationsui
            .show(player)
            .then((savedlocationsResult) => {
                uiSAVEDLOCATIONS(savedlocationsResult, Locations, player, coordsArray);
            })
            .catch((error) => {
                console.error("Paradox Unhandled Rejection: ", error);
                // Extract stack trace information
                if (error instanceof Error) {
                    const stackLines = error.stack.split("\n");
                    if (stackLines.length > 1) {
                        const sourceInfo = stackLines;
                        console.error("Error originated from:", sourceInfo[0]);
                    }
                }
            });
    } else {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Saved Locations have been disabled by the Admins.`);
        return;
    }
}

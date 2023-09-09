import { Player, world } from "@minecraft/server";
import { ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui";
import { EncryptionManager } from "../../classes/EncryptionManager";

export function uiManagePlayerSavedLocations(managePlayerSavedLocationsUIResult: ModalFormResponse, onlineList: string[], player: Player) {
    handleUImanagePlayerSavedLocations(managePlayerSavedLocationsUIResult, onlineList, player).catch((error) => {
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
}
async function handleUImanagePlayerSavedLocations(managePlayerSavedLocationsUIResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = managePlayerSavedLocationsUIResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped.`);
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldn't find that player!`);
    }

    //Grab the selected player saved locations.
    const salt = world.getDynamicProperty("crypt");
    const tags = member.getTags();
    const tagsLength = tags.length;
    let counter = 0;
    const Locations: string[] = [];
    const coordsArray: string[] = [];
    for (let i = 0; i < tagsLength; i++) {
        if (tags[i].startsWith("1337")) {
            // Decode it so we can verify it
            tags[i] = EncryptionManager.decryptString(tags[i], salt as string);
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
        Locations.push("This player has not saved a Location");
    }
    /*no we have the selected player and have the locations in an array we will build a UI
    to show the player, where they can then remove the location if needed.
    */
    const managePlayerSavedLocationsUI = new ModalFormData();
    managePlayerSavedLocationsUI.title(`§4Paradox - §6${member.name}'s §4Locations`);
    managePlayerSavedLocationsUI.dropdown(`\n§fSelect a Location:§f\n\nSaved Location's\n`, Locations);
    managePlayerSavedLocationsUI.toggle("Delete", false);
    managePlayerSavedLocationsUI
        .show(player)
        .then((managePlayerSavedLocationsUIResult) => {
            const [selectedLocationvalue, deleteToggle] = managePlayerSavedLocationsUIResult.formValues;
            if (deleteToggle == true) {
                const salt = world.getDynamicProperty("crypt");
                // Find and delete this saved home location
                let encryptedString: string = "";
                const tags = member.getTags();
                const tagsLength = tags.length;
                for (let i = 0; i < tagsLength; i++) {
                    if (tags[i].startsWith("1337")) {
                        encryptedString = tags[i];
                        // Decode it so we can verify it
                        tags[i] = EncryptionManager.decryptString(tags[i], salt as string);
                    }
                    if (tags[i].startsWith("LocationHome:" && Locations[selectedLocationvalue as number] + " X", 13)) {
                        member.removeTag(encryptedString);
                        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Successfully deleted home '${Locations[selectedLocationvalue as number]}'!`);
                        break;
                    }
                }
                return paradoxui(player);
            }
            return paradoxui(player);
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
}

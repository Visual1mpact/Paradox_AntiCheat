import { world, Location } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name listhome
 * @param {object} message - Message object
 */
export function listhome(message) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/listhome.js:8)");
    }

    message.cancel = true;

    let player = message.sender;

    let tags = player.getTags();
    let counter = 0;
    let verify = false;
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].startsWith("Home:")) {
            // Split string into array
            let coordinatesArray = tags[i].split(' ');
            let home;
            let homex;
            let homey;
            let homez;
            let dimension;
            counter = ++counter;
            // Show a list of homes
            for (let i = 0; i < coordinatesArray.length; i++) {
                // Get their location from the array
                if (coordinatesArray[i].includes("Home:")) {
                    home = coordinatesArray[i].replace("Home:", "");
                }
                if (coordinatesArray[i].includes("X:")) {
                    homex = parseInt(coordinatesArray[i].replace("X:", ""));
                }
                if (coordinatesArray[i].includes("Y:")) {
                    homey = parseInt(coordinatesArray[i].replace("Y:", ""));
                }
                if (coordinatesArray[i].includes("Z:")) {
                    homez = parseInt(coordinatesArray[i].replace("Z:", ""));
                }
                if (coordinatesArray[i].includes("Dimension:")) {
                    dimension = coordinatesArray[i].replace("Dimension:", "");
                }
                if (!homex || !homey || !homez || !dimension) {
                    continue;
                } else {
                    verify = true;
                    if (counter === 1) {
                        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"§l§6[§4List Of Homes§6]§r"}]}`);
                    }
                    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§4[§f${home}§4]§r §6=>§r ${homex} ${homey} ${homez}"}]}`);
                    continue;
                }
            }
            continue;
        }
        continue;
    }
    if (verify === false) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You do not have any saved locations!"}]}`);
    }
    return;
}

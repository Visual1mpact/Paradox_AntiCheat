import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command } from "../../../../penrose/classes/command-handler";

interface ScaleObject {
    enabled: boolean;
    scale: number;
}

/**
 * Represents the "tiny" command.
 */
export const tinyCommand: Command = {
    name: "tiny",
    description: "Changes the size of a player.",
    usage: "{prefix}tiny <username>",
    examples: [`{prefix}tiny`, `{prefix}tiny "Player Name"`, `{prefix}tiny Player Name`, `{prefix}tiny --help`],
    category: "Utility",
    securityClearance: 4,

    /**
     * Executes the "tiny" command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        const player = message.sender;

        // Find the player object based on the command arguments or use the sender
        const playerName = args.join(" ").trim().replace(/["@]/g, "");
        const target: Player | undefined = playerName.length > 0 ? world.getAllPlayers().find((p) => p.name === playerName) : message.sender;

        if (!target) {
            return player.sendMessage(`§cPlayer "${playerName}" not found.`);
        }

        const targetComp = target.getComponent("scale");
        const dpScaleCheck = target.getDynamicProperty("tinySize") as string;
        const dpScaleObject: ScaleObject = dpScaleCheck ? JSON.parse(dpScaleCheck) : { enabled: false, scale: -999 };
        const compScaleSize: number | boolean = targetComp ? targetComp.value : false;

        if (dpScaleObject.enabled === false && isNaN(compScaleSize as number) === false) {
            // Enable tiny size
            dpScaleObject.enabled = true;
            dpScaleObject.scale = compScaleSize as number;

            system.run(() => {
                targetComp.value = 0.5; // Set to tiny size
                target.setDynamicProperty("tinySize", JSON.stringify(dpScaleObject));
                target.sendMessage(`§2[§7Paradox§2]§o§7 You are now bite-sized.`);
            });
        } else if (dpScaleObject.enabled === true) {
            // Revert to normal size
            dpScaleObject.enabled = false;

            system.run(() => {
                targetComp.value = dpScaleObject.scale; // Restore original size
                target.setDynamicProperty("tinySize", JSON.stringify(dpScaleObject));
                target.sendMessage(`§2[§7Paradox§2]§o§7 You are back to your normal size.`);
            });
        }
    },
};

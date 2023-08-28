import { Player } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { uiCLEARCHAT } from "../../../../moderation/uiClearchat";
import { paradoxui } from "../../../../paradoxui";

export function clearChatHandler(player: Player) {
    //Clear Chat ui
    const clearchatui = new MessageFormData();
    clearchatui.title("§4Clear Chat§4");
    clearchatui.body("Are you sure you want to clear chat?");
    clearchatui.button1("Yes");
    clearchatui.button2("No");
    clearchatui
        .show(player)
        .then((clearchatResult) => {
            if (clearchatResult.selection === 0) {
                uiCLEARCHAT(player);
            }
            if (clearchatResult.selection === 1) {
                paradoxui(player);
            }
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

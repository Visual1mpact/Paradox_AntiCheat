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
    clearchatui.show(player).then((clearchatResult) => {
        if (clearchatResult.selection === 0) {
            uiCLEARCHAT(player);
        }
        if (clearchatResult.selection === 1) {
            paradoxui(player);
        }
    });
}

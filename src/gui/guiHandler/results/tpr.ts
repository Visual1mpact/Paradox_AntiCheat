import { Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { getTeleportRequests } from "../../../commands/utility/tpr";
import { uiTPR } from "../../moderation/uiTpr";
import { uiTPRSEND } from "../../moderation/uiTprSend";

export function tprHandler(player: Player) {
    //TPR ui
    const tprui = new ActionFormData();
    //let onlineList: string[] = [];
    // onlineList = Array.from(world.getPlayers(), (player) => player.name);
    tprui.title("§4Paradox - TPR Menu§4");
    tprui.button("My Requests", "textures/ui/mail_icon");
    tprui.button("Send A Request", "textures/ui/send_icon");
    tprui
        .show(player)
        .then((tprmenuResult) => {
            if (tprmenuResult.selection === 0) {
                //get the current requests and show them in a ui.
                interface TeleportRequest {
                    requester: Player;
                    target: Player;
                    expiresAt: number;
                }
                let teleportRequests: TeleportRequest[] = [];
                teleportRequests = getTeleportRequests();
                const requestIndex = teleportRequests.findIndex((r) => r.target === player);
                const request = teleportRequests[requestIndex];
                let respons: string;
                const toMinutes: Date = new Date(request.expiresAt);
                const tprinboxui = new MessageFormData();
                tprinboxui.title("Paradox - Your TP Request.");
                tprinboxui.body(request.requester.name + " Has sent you a request to be teleported to your location, use the buttons below to approve or decline this request. \n This request expires in: " + toMinutes.getMinutes());
                tprinboxui.button1("Yes");
                tprinboxui.button2("No");
                tprinboxui
                    .show(player)
                    .then((tprInboxResult) => {
                        if (tprInboxResult.selection === 0) {
                            respons = "yes";
                            uiTPR(request.requester.name, player, respons);
                        }
                        //beacuse for some reason the no button is 0 yet its the second control
                        if (tprInboxResult.selection === 1) {
                            respons = "no";
                            uiTPR(request.requester.name, player, respons);
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

            if (tprmenuResult.selection === 1) {
                //show the ui to send a request.
                const tprsendrequestxui = new ModalFormData();
                let onlineList: string[] = [];
                onlineList = Array.from(world.getPlayers(), (player) => player.name);
                tprsendrequestxui.title("§4Paradox - Send TP Request§4");
                tprsendrequestxui.dropdown(`\nSelect a player to send a request:\n\nPlayer's Online\n`, onlineList);
                tprsendrequestxui
                    .show(player)
                    .then((tprSendRequestResult) => {
                        //Send Logic
                        uiTPRSEND(tprSendRequestResult, onlineList, player);
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

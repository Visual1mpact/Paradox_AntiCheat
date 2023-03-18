import { Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import config from "../data/config";
import { dynamicPropertyRegistry } from "../penrose/worldinitializeevent/registry";
import { crypto } from "../util";
import { uiBAN } from "./moderation/uiBan";
import { uiCHATRANKS } from "./moderation/uiChatranks";
import { uiCLEARCHAT } from "./moderation/uiClearchat";
import { uiDEOP } from "./moderation/uiDeop";
import { uiEWIPE } from "./moderation/uiEwipe";
import { uiFLY } from "./moderation/uiFly";
import { uiFREEZE } from "./moderation/uiFreeze";
import { uiKICK } from "./moderation/uiKick";
import { uiLOCKDOWN } from "./moderation/uiLockdown";
import { uiMUTE } from "./moderation/uiMute";
import { uiNOTIFY } from "./moderation/uiNotify";
import { uiOP } from "./moderation/uiOp";
import { uiPREFIX } from "./moderation/uiPrefix";
import { uiPUNISH } from "./moderation/uiPunish";
import { uiRULES } from "./moderation/uiRules";
import { uiTPA } from "./moderation/uiTpa";
import { uiTPR } from "./moderation/uiTpr";
import { uiTPRSEND } from "./moderation/uiTprSend";
import { uiUNBAN } from "./moderation/uiUnban";
import { uiUNMUTE } from "./moderation/uiUnmute";
import { uiVANISH } from "./moderation/uiVanish";
import { uiANTIFALL } from "./modules/uiAntiFall";
import { uiANTIKNOCKBACK } from "./modules/uiAntiKnockback";
import { uiGAMEMODES } from "./modules/uiGamemodes";
import { uiANTIFLY } from "./modules/uiAntiFly";
import { uiINVALIDSPRINT } from "./modules/uiInvalidSprint";
import { uiNOWSLOW } from "./modules/uiNowslow";
import { uiANTISCAFFOLD } from "./modules/uiAntiScaffold";
import { uiANTIJESUS } from "./modules/uiAntiJesus";
async function paradoxui(player: Player) {
    const maingui = new ActionFormData();

    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    const encode = crypto(salt, config.modules.encryption.password) ?? null;
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);
    maingui.title("§4Paradox§4");
    maingui.body("§eA utility to fight against malicious hackers on Bedrock Edition§e");
    if (uniqueId !== player.name) {
        maingui.button("§0op§2", "textures/ui/op");
        maingui.button("§0TPR§2", "textures/ui/op");
    } else {
        maingui.button("§0op§2", "textures/ui/op");
        maingui.button("§0deop§2", "textures/items/ender_pearl");
        maingui.button("§0Moderation§2", "textures/items/book_normal");
        maingui.button("§0Modules§2", "textures/blocks/command_block");
        maingui.button("§0Prefix§2", "textures/ui/UpdateGlyph");
        maingui.button("§0TPR§2", "textures/ui/op");
    }
    maingui.show(player).then((result) => {
        if (result.selection === 0) {
            // New window for op
            const opgui = new ModalFormData();
            let onlineList: string[] = [];
            opgui.title("§4OP§4");
            if (uniqueId !== player.name) {
                opgui.textField(`\nPassword\n`, `Enter password here.`);
            } else {
                onlineList = Array.from(world.getPlayers(), (player) => player.name);
                opgui.dropdown(`\n§rSelect a player to give access to Paradox.§r\n\nPlayer's Online\n`, onlineList);
            }
            opgui.show(player).then((opResult) => {
                uiOP(opResult, salt, hash, encode, onlineList, player);
            });
        }
        if (result.selection === 1) {
            if (uniqueId !== player.name) {
                //TPR ui
                const tprui = new ActionFormData();
                //let onlineList: string[] = [];
                // onlineList = Array.from(world.getPlayers(), (player) => player.name);
                tprui.title("§4Pardox - TPR Menu§4");
                tprui.button("My Requests.", "textures/ui/mail_icon");
                tprui.button("Send A Request.", "textures/ui/send_icon");
                tprui.show(player).then((tprmenuResult) => {
                    if (tprmenuResult.selection === 0) {
                        //get the current requests and show them in a ui.
                        let requester: string;

                        try {
                            let playerscurrenttags = player.getTags();
                            let rq: string;
                            playerscurrenttags.forEach((t) => {
                                if (t.startsWith("Requester:")) {
                                    rq = t;
                                }
                            });
                            //from the tag get the requster as a player so we can pass this to the function
                            let pl: string;
                            pl = rq.slice(10);
                            requester = pl;
                        } catch (error) {
                            // This will throw if the player has no tags that match.
                            //sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong! Error: ${error}`);
                        }
                        const tprinboxui = new MessageFormData();
                        tprinboxui.title("Paradox Your TP Request.");
                        tprinboxui.body(requester + " Has sent you a request to be teleported to your location, use the buttons bellow to approve or decline this request.");
                        tprinboxui.button1("Yes");
                        tprinboxui.button2("No");
                        tprinboxui.show(player).then((tprInboxResult) => {
                            if (tprInboxResult.selection === 1) {
                                uiTPR(requester, player);
                            }
                            //beacuse for some reason the no button is 0 yet its the second control
                            if (tprInboxResult.selection === 0) {
                                //get the players tags so we can loop through them to find the requester
                                let playertags = player.getTags();
                                //store the requester tag
                                let tagtoremove: string;
                                playertags.forEach((t) => {
                                    if (t.startsWith("Requester:")) {
                                        tagtoremove = t;
                                    }
                                });
                                // remove the tag
                                player.removeTag(tagtoremove);
                                player.removeTag("RequestPending");
                            }
                        });
                    }

                    if (tprmenuResult.selection === 1) {
                        //show the ui to send a request.
                        const tprsendrequestxui = new ModalFormData();
                        let onlineList: string[] = [];
                        onlineList = Array.from(world.getPlayers(), (player) => player.name);
                        tprsendrequestxui.title("§4Pardox - Send TP Request§4");
                        tprsendrequestxui.dropdown(`\nSelect a player to send a request.\n\nPlayer's Online\n`, onlineList);
                        tprsendrequestxui.show(player).then((tprSendRequestResult) => {
                            //Send Logic
                            uiTPRSEND(tprSendRequestResult, onlineList, player);
                        });
                    }
                });
            } else {
                // New window for deop
                const deopgui = new ModalFormData();
                let onlineList: string[] = [];
                deopgui.title("§4DEOP§4");
                onlineList = Array.from(world.getPlayers(), (player) => player.name);
                deopgui.dropdown(`\n§rSelect a player to remove access to Paradox.§r\n\nPlayer's Online\n`, onlineList);
                deopgui.show(player).then((opResult) => {
                    uiDEOP(opResult, onlineList, player);
                });
            }
        }
        if (result.selection === 2) {
            //new window for Moderation
            const moderationui = new ActionFormData();
            moderationui.title("§4Paradox Moderation§4");
            moderationui.button("Ban", "textures/ui/hammer_l");
            moderationui.button("Unban", "textures/ui/check");
            moderationui.button("Rules", "textures/items/book_writable");
            moderationui.button("Chat", "textures/ui/newOffersIcon");
            moderationui.button("Lockdown", "textures/ui/lock_color");
            moderationui.button("Punish", "textures/ui/trash");
            moderationui.button("Teleport Assistance", "textures/blocks/portal_placeholder");
            moderationui.button("Kick a player.", "textures/items/gold_boots");
            moderationui.button("Wipe an Enderchest", "textures/blocks/ender_chest_front");
            moderationui.button("Freeze a player", "textures/ui/frozen_effect");
            moderationui.button("Allow a player to fly.", "textures/ui/flyingascend");
            moderationui.button("Vanish", "textures/items/potion_bottle_invisibility");
            moderationui.show(player).then((ModUIresult) => {
                if (ModUIresult.selection === 0) {
                    //show ban ui here
                    const banui = new ModalFormData();
                    let onlineList: string[] = [];

                    banui.title("§4Ban A player!§4");
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    banui.dropdown(`\n§rSelect a player to Ban.§r\n\nPlayer's Online\n`, onlineList);
                    banui.textField(`Reason`, `Enter a reason as to why they have been banned.`);
                    banui.show(player).then((banResult) => {
                        //ban function goes here
                        uiBAN(banResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 1) {
                    //show unban ui here
                    const unbanui = new ModalFormData();
                    unbanui.title("§4Unban A player!§4");
                    unbanui.textField(`Player`, `Enter a players username to be unbanned.`);
                    unbanui.show(player).then((unbanResult) => {
                        uiUNBAN(unbanResult, player);
                    });
                }
                if (ModUIresult.selection === 2) {
                    //show rules ui
                    const rulesui = new ModalFormData();
                    rulesui.title("§4Paradox - Configure Rules!§4");
                    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");
                    const KickOnDeclineBoolean = dynamicPropertyRegistry.get("kickondecline_b");
                    rulesui.toggle("Enable Rules", showrulesBoolean);
                    rulesui.toggle("Kick On Decline", KickOnDeclineBoolean);
                    rulesui.show(player).then((rulesResult) => {
                        // due to limitations we can't edit the rules in game.
                        uiRULES(rulesResult, player);
                    });
                }
                if (ModUIresult.selection === 3) {
                    //show chat ui
                    const chatui = new ActionFormData();
                    chatui.title("§4Paradox - Configure Chat§4");
                    chatui.body("§eSettings related to chat.§e");
                    chatui.button("Notify", "textures/ui/chat_send");
                    chatui.button("Ranks", "textures/ui/saleribbon");
                    chatui.button("Mute", "textures/ui/mute_on");
                    chatui.button("Unmute", "textures/ui/mute_off");
                    chatui.button("Clear Chat", "textures/ui/cancel");
                    chatui.show(player).then((chatResult) => {
                        //4 possible options
                        if (chatResult.selection === 0) {
                            //notify ui
                            const notifyui = new ModalFormData();
                            let onlineList: string[] = [];
                            notifyui.title("§4Enable or Disable Notifications!§4");
                            onlineList = Array.from(world.getPlayers(), (player) => player.name);
                            notifyui.dropdown(`\n§rSelect a player to Enable or Disable Notifications.§r\n\nPlayer's Online\n`, onlineList);
                            //by default set the current value to disabled.
                            notifyui.toggle("Notfications", false);
                            notifyui.show(player).then((notifyResult) => {
                                uiNOTIFY(notifyResult, onlineList, player);
                            });
                        }
                        if (chatResult.selection === 1) {
                            //Chat Ranks ui
                            const chatranksui = new ModalFormData();
                            let onlineList: string[] = [];
                            chatranksui.title("§4Change a players chat rank.§4");
                            onlineList = Array.from(world.getPlayers(), (player) => player.name);
                            let predefinedrank: string[] = ["Owner", "Admin", "Mod", "Member"];
                            chatranksui.dropdown(`\n§rSelect a player to change thier rank.§r\n\nPlayer's Online\n`, onlineList);
                            chatranksui.dropdown(`\n§rSelect a pre defined rank or you can set a custom on bellow.§r`, predefinedrank);
                            chatranksui.textField("Enter a custom Rank", "VIP");
                            chatranksui.show(player).then((chatranksResult) => {
                                uiCHATRANKS(chatranksResult, onlineList, predefinedrank, player);
                            });
                        }
                        if (chatResult.selection === 2) {
                            //Mute ui
                            const muteui = new ModalFormData();
                            let onlineList: string[] = [];
                            onlineList = Array.from(world.getPlayers(), (player) => player.name);
                            muteui.title("§4Mute a player in chat.§4");
                            muteui.dropdown(`\n§rSelect a player to mute.§r\n\nPlayer's Online\n`, onlineList);
                            muteui.textField("Reason", "has been posting discord links.");
                            muteui.show(player).then((muteResult) => {
                                uiMUTE(muteResult, onlineList, player);
                            });
                        }
                        if (chatResult.selection === 3) {
                            //UnMute ui
                            const unmuteui = new ModalFormData();
                            let onlineList: string[] = [];
                            onlineList = Array.from(world.getPlayers(), (player) => player.name);
                            unmuteui.title("§4Mute a player in chat.§4");
                            unmuteui.dropdown(`\n§rSelect a player to unmute.§r\n\nPlayer's Online\n`, onlineList);
                            unmuteui.textField("Reason", "Has been given permissions to talk in chat.");
                            unmuteui.show(player).then((muteResult) => {
                                uiUNMUTE(muteResult, onlineList, player);
                            });
                        }
                        if (chatResult.selection === 4) {
                            //Clear Chat ui
                            const clearchatui = new MessageFormData();
                            clearchatui.title("§4Clear Chat.§4");
                            clearchatui.body("Are you sure you want to clear chat?");
                            clearchatui.button1("Yes");
                            clearchatui.button2("No");
                            clearchatui.show(player).then((clearchatResult) => {
                                if (clearchatResult.selection === 1) {
                                    uiCLEARCHAT(player);
                                }
                                if (clearchatResult.selection === 0) {
                                    paradoxui(player);
                                }
                            });
                        }
                    });
                }
                if (ModUIresult.selection === 4) {
                    //Lockdown ui
                    const lockdownui = new ModalFormData();
                    // Get Dynamic Property Boolean
                    const lockdownBoolean = dynamicPropertyRegistry.get("lockdown_b");
                    lockdownui.title("§4Pardox - Lockdown§4");
                    lockdownui.textField("Reason", "Kicked all members but staff due to possible hacker.");
                    lockdownui.toggle("Enable or Disable Lockdown.", lockdownBoolean);
                    lockdownui.show(player).then((lockdownResult) => {
                        uiLOCKDOWN(lockdownResult, player);
                    });
                }
                if (ModUIresult.selection === 5) {
                    //Punish UI im going to use two forms one as a yes/no message so i can advise what this will do.
                    const punishprewarnui = new MessageFormData();
                    punishprewarnui.title("§4Pardox - Punish§4");
                    punishprewarnui.body("This will allow you to wipe a players ender chest as well as thier invenotry.");
                    punishprewarnui.button1("Okay");
                    punishprewarnui.show(player).then((prewarnResult) => {
                        //show the Punish UI
                        const punishui = new ModalFormData();
                        let onlineList: string[] = [];
                        onlineList = Array.from(world.getPlayers(), (player) => player.name);
                        punishui.title("§4Pardox - Punish§4");
                        punishui.dropdown(`\n§rSelect a player to wipe.§r\n\nPlayer's Online\n`, onlineList);
                        punishui.show(player).then((punishResult) => {
                            uiPUNISH(punishResult, onlineList, player);
                        });
                    });
                }
                if (ModUIresult.selection === 6) {
                    const tpaui = new ModalFormData();
                    tpaui.title("§4Pardox - Teleport Assistance.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    tpaui.dropdown(`\n§rSelect a player to teleport.§r\n\nPlayer's Online\n`, onlineList);
                    tpaui.toggle("Teleport To player.", true);
                    tpaui.toggle("Teleport the player to you.", false);
                    tpaui.show(player).then((tpaResult) => {
                        uiTPA(tpaResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 7) {
                    const kickui = new ModalFormData();
                    kickui.title("§4Pardox - Kick a player.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    kickui.dropdown(`\n§rSelect a player to Kick.§r\n\nPlayer's Online\n`, onlineList);
                    kickui.textField("Reason.", "Hacking!");

                    kickui.show(player).then((kickResult) => {
                        uiKICK(kickResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 8) {
                    const ewipeui = new ModalFormData();
                    ewipeui.title("§4Pardox - Wipe a players Enderchest.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    ewipeui.dropdown(`\n§rSelect a player to wipe thier Enderchest.§r\n\nPlayer's Online\n`, onlineList);
                    ewipeui.show(player).then((ewipeResult) => {
                        uiEWIPE(ewipeResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 9) {
                    const freezeui = new ModalFormData();
                    freezeui.title("§4Pardox - Freeze a player.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    freezeui.dropdown(`\n§rSelect a player to freeze.§r\n\nPlayer's Online\n`, onlineList);
                    freezeui.show(player).then((freezeResult) => {
                        uiFREEZE(freezeResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 10) {
                    const flyui = new ModalFormData();
                    flyui.title("§4Pardox - Grant a player fly abilities.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    flyui.dropdown(`\n§rSelect a player to allow the ability to fly.§r\n\nPlayer's Online\n`, onlineList);
                    flyui.show(player).then((flyResult) => {
                        uiFLY(flyResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 10) {
                    const vanishui = new ModalFormData();
                    vanishui.title("§4Pardox -Vanish from the server.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    vanishui.dropdown(`\n§rSelect a player to vanish.§r\n\nPlayer's Online\n`, onlineList);
                    vanishui.show(player).then((vanishResult) => {
                        uiVANISH(vanishResult, onlineList, player);
                    });
                }
            });
        }
        if (result.selection === 3) {
            //Modules ui
            const modulesui = new ActionFormData();
            modulesui.title("§4Paradox - Modules§4");
            modulesui.button("Configure Gamemodes", "textures/items/totem");
            modulesui.button("Configure Movement", "textures/ui/move");

            modulesui.show(player).then((ModulesUIResult) => {
                if (ModulesUIResult.selection === 0) {
                    //GameModes UI
                    const gamemodesui = new ModalFormData();
                    const adventureGMBoolean = dynamicPropertyRegistry.get("adventuregm_b");
                    const creativeGMBoolean = dynamicPropertyRegistry.get("creativegm_b");
                    const survivalGMBoolean = dynamicPropertyRegistry.get("survivalgm_b");
                    gamemodesui.title("§4Paradox - Configure gamemodes.§4");
                    gamemodesui.toggle("Disable Adventure", adventureGMBoolean);
                    gamemodesui.toggle("Disable Creative", creativeGMBoolean);
                    gamemodesui.toggle("Disable Survival", survivalGMBoolean);
                    gamemodesui.show(player).then((gamemodeResult) => {
                        uiGAMEMODES(gamemodeResult, player);
                    });
                }
                if (ModulesUIResult.selection === 1) {
                    const modulesmovementui = new ActionFormData();
                    modulesmovementui.title("§4Paradox Modules-Movement§4");
                    modulesmovementui.button("Anti Knockback", "textures/items/diamond_chestplate");
                    modulesmovementui.button("Anti Fall", "textures/items/diamond_boots");
                    modulesmovementui.button("Anti Fly", "textures/items/elytra");
                    modulesmovementui.button("Invalid Sprint", "textures/items/diamond_boots");
                    modulesmovementui.button("Noslow", "textures/items/diamond_boots");
                    modulesmovementui.button("Anti Scaffold", "textures/blocks/scaffolding_top");
                    modulesmovementui.button("Anti Jesusa", "textures/blocks/lava_placeholder");
                    modulesmovementui.show(player).then((movementResult) => {
                        if (movementResult.selection === 0) {
                            //Anti Knockback UI
                            const modulesantiknockbackui = new ModalFormData();
                            const antikbBoolean = dynamicPropertyRegistry.get("antikb_b");
                            modulesantiknockbackui.title("§4Paradox Modules-Anti KnockBack§4");
                            modulesantiknockbackui.toggle("Anti Knockback", antikbBoolean);
                            modulesantiknockbackui.show(player).then((antikbResult) => {
                                uiANTIKNOCKBACK(antikbResult, player);
                            });
                        }
                        if (movementResult.selection === 1) {
                            //Anti Fall
                            const modulesantifallui = new ModalFormData();
                            const antifallABoolean = dynamicPropertyRegistry.get("antifalla_b");
                            modulesantifallui.title("§4Paradox Modules-Anti Fall§4");
                            modulesantifallui.toggle("Anti Fall", antifallABoolean);
                            modulesantifallui.show(player).then((antifallResult) => {
                                uiANTIFALL(antifallResult, player);
                            });
                        }
                        if (movementResult.selection === 2) {
                            //Anti Fly
                            const modulesantiflyui = new ModalFormData();
                            const flyABoolean = dynamicPropertyRegistry.get("flya_b");
                            modulesantiflyui.title("§4Paradox Modules-Anti Fly§4");
                            modulesantiflyui.toggle("Anti Fly", flyABoolean);
                            modulesantiflyui.show(player).then((antiflyResult) => {
                                uiANTIFLY(antiflyResult, player);
                            });
                        }
                        if (movementResult.selection === 3) {
                            //Invalid Sprint
                            const modulesinvalidsprintui = new ModalFormData();
                            const invalidSprintABoolean = dynamicPropertyRegistry.get("invalidsprinta_b");
                            modulesinvalidsprintui.title("§4Paradox Modules-Invalid Sprint§4");
                            modulesinvalidsprintui.toggle("Invalid Sprint", invalidSprintABoolean);
                            modulesinvalidsprintui.show(player).then((invalidsprintResult) => {
                                uiINVALIDSPRINT(invalidsprintResult, player);
                            });
                        }
                        if (movementResult.selection === 4) {
                            //NoSlowA
                            const modulesnoslowui = new ModalFormData();
                            const noSlowBoolean = dynamicPropertyRegistry.get("noslowa_b");
                            modulesnoslowui.title("§4Paradox Modules-Noslow§4");
                            modulesnoslowui.toggle("Noslow", noSlowBoolean);
                            modulesnoslowui.show(player).then((invalidsprintResult) => {
                                uiNOWSLOW(invalidsprintResult, player);
                            });
                        }
                        if (movementResult.selection === 5) {
                            //AntiScaffold
                            const modulesantiscaffoldui = new ModalFormData();
                            const antiScaffoldABoolean = dynamicPropertyRegistry.get("antiscaffolda_b");
                            modulesantiscaffoldui.title("§4Paradox Modules-Anti Scaffold§4");
                            modulesantiscaffoldui.toggle("Anti Scaffold", antiScaffoldABoolean);
                            modulesantiscaffoldui.show(player).then((antiscaffoldResult) => {
                                uiANTISCAFFOLD(antiscaffoldResult, player);
                            });
                        }
                        if (movementResult.selection === 6) {
                            //Jesus UI
                            const modulesantijesusui = new ModalFormData();
                            const jesusaBoolean = dynamicPropertyRegistry.get("jesusa_b");
                            modulesantijesusui.title("§4Paradox Modules-Anti Jesus§4");
                            modulesantijesusui.toggle("Anti Jesus", jesusaBoolean);
                            modulesantijesusui.show(player).then((antijesusResult) => {
                                uiANTIJESUS(antijesusResult, player);
                            });
                        }
                    });
                }
            });
        }
        if (result.selection === 4) {
            //Prefix ui
            const prefixui = new ModalFormData();
            let onlineList: string[] = [];
            onlineList = Array.from(world.getPlayers(), (player) => player.name);
            prefixui.title("§4Pardox - Change command prefix§4");
            prefixui.dropdown(`\nChanges prefix used for commands\n\nPlayer's Online\n`, onlineList);
            prefixui.textField(`\nPrefix\n`, `Put new prefix here`, null);
            prefixui.toggle(`\nReset Prefix`, false);
            prefixui.show(player).then((prefixResult) => {
                //Prefix logic
                uiPREFIX(prefixResult, onlineList, player);
            });
        }
        if (result.selection === 5) {
            //TPR ui
            const tprui = new ActionFormData();
            //let onlineList: string[] = [];
            // onlineList = Array.from(world.getPlayers(), (player) => player.name);
            tprui.title("§4Pardox - TPR Menu§4");
            tprui.button("My Requests.", "textures/ui/mail_icon");
            tprui.button("Send A Request.", "textures/ui/send_icon");
            tprui.show(player).then((tprmenuResult) => {
                if (tprmenuResult.selection === 0) {
                    //get the current requests and show them in a ui.
                    let requester: string;

                    try {
                        let playerscurrenttags = player.getTags();
                        let rq: string;
                        playerscurrenttags.forEach((t) => {
                            if (t.startsWith("Requester:")) {
                                rq = t;
                            }
                        });
                        //from the tag get the requster as a player so we can pass this to the function
                        let pl: string;
                        pl = rq.slice(10);
                        requester = pl;
                    } catch (error) {
                        // This will throw if the player has no tags that match.
                        //sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong! Error: ${error}`);
                    }
                    const tprinboxui = new MessageFormData();
                    tprinboxui.title("Paradox Your TP Request.");
                    tprinboxui.body(requester + " Has sent you a request to be teleported to your location, use the buttons bellow to approve or decline this request.");
                    tprinboxui.button1("Yes");
                    tprinboxui.button2("No");
                    tprinboxui.show(player).then((tprInboxResult) => {
                        if (tprInboxResult.selection === 1) {
                            uiTPR(requester, player);
                        }
                        //beacuse for some reason the no button is 0 yet its the second control
                        if (tprInboxResult.selection === 0) {
                            //get the players tags so we can loop through them to find the requester
                            let playertags = player.getTags();
                            //store the requester tag
                            let tagtoremove: string;
                            playertags.forEach((t) => {
                                if (t.startsWith("Requester:")) {
                                    tagtoremove = t;
                                }
                            });
                            // remove the tag
                            player.removeTag(tagtoremove);
                            player.removeTag("RequestPending");
                        }
                    });
                }

                if (tprmenuResult.selection === 1) {
                    //show the ui to send a request.
                    const tprsendrequestxui = new ModalFormData();
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    tprsendrequestxui.title("§4Pardox - Send TP Request§4");
                    tprsendrequestxui.dropdown(`\nSelect a player to send a request.\n\nPlayer's Online\n`, onlineList);
                    tprsendrequestxui.show(player).then((tprSendRequestResult) => {
                        //Send Logic
                        uiTPRSEND(tprSendRequestResult, onlineList, player);
                    });
                }
            });
        }

        // We looping here so don't mind me while I dance a little
        if (result.canceled && result.cancelationReason === "userBusy") {
            /**
             * Continue to call the function with the player object
             * until the user is no longer busy. This should mean
             * they do not have a GUI open and we can now show this form.
             */
            paradoxui(player);
        }
    });
}

export { paradoxui };

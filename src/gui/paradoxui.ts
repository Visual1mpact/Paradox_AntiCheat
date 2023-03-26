import { Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import config from "../data/config";
import { dynamicPropertyRegistry } from "../penrose/worldinitializeevent/registry";
import { crypto, getScore } from "../util";
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
import { uiANTIKILLAURA } from "./modules/uiAntiKillaura";
import { getTeleportRequests } from "../commands/utility/tpr";
import { uiANTINUKER } from "./modules/uiAntiNuker";
import { uiANTISHULKER } from "./modules/uiAntiShulker";
import { uiANTISPAM } from "./modules/uiAntiSpam";
import { uiANTIAUTOCLICKER } from "./modules/uiAntiAutoClicker";
import { uiBADPACKETS } from "./modules/uiBadpackets";
import { uiBEDROCKVALIDATION } from "./modules/uiBedrockValidation";
import { uiANTICRASHER } from "./modules/uiAntiCrasher";
import { uiILLEGALITEMS } from "./modules/uiIllegaItems";
import { uiLAGCLEAR } from "./modules/uiLagClear";
import { uiNAMESPOOFING } from "./modules/uiNameSpoofing";
import { uiOPS } from "./modules/uiOnePlayerSleep";
import { uiCOMMANDBLOCKS } from "./modules/uiCommandBlocks";
import { uiREACH } from "./modules/uiReach";
import { uiEXPSALVAGESYSTEM } from "./modules/uiExpSalvageSystem";
import { uiSPAMMER } from "./modules/uiSpammer";
import { uiWORLDBORDER } from "./modules/uiWorldborder";
import { uiXRAY } from "./modules/uiXray";
import { uiENCHANTEDARMOR } from "./modules/uiEnchantedArmor";
import { uiHOTBAR } from "./modules/uiHotbar";
import { uiDESPAWNER } from "./moderation/uiDespawner";
async function paradoxui(player: Player) {
    const maingui = new ActionFormData();

    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    const encode = crypto(salt, config.modules.encryption.password) ?? null;
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);
    maingui.title("§4Paradox§4");
    maingui.body("§eA utility to fight against malicious hackers on Bedrock Edition§e");
    if (uniqueId !== player.name) {
        maingui.button("§0Op§2", "textures/ui/op");
        maingui.button("§0Teleport Requests§2", "textures/blocks/portal_placeholder");
    } else {
        maingui.button("§0Op§2", "textures/ui/op");
        maingui.button("§0Deop§2", "textures/items/ender_pearl");
        maingui.button("§0Moderation§2", "textures/items/book_normal");
        maingui.button("§0Modules§2", "textures/blocks/command_block");
        maingui.button("§0Prefix§2", "textures/ui/UpdateGlyph");
        maingui.button("§0Teleport Requets§2", "textures/blocks/portal_placeholder");
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
                tprui.title("§4Paradox - TPR Menu§4");
                tprui.button("My Requests.", "textures/ui/mail_icon");
                tprui.button("Send A Request.", "textures/ui/send_icon");
                tprui.show(player).then((tprmenuResult) => {
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
                        tprinboxui.title("Paradox-Your TP Request.");
                        tprinboxui.body(request.requester.name + " Has sent you a request to be teleported to your location, use the buttons bellow to approve or decline this request. \n This request expires in: " + toMinutes.getMinutes());
                        tprinboxui.button1("Yes");
                        tprinboxui.button2("No");
                        tprinboxui.show(player).then((tprInboxResult) => {
                            if (tprInboxResult.selection === 1) {
                                respons = "yes";
                                uiTPR(request.requester.name, player, respons);
                            }
                            //beacuse for some reason the no button is 0 yet its the second control
                            if (tprInboxResult.selection === 0) {
                                respons = "no";
                                uiTPR(request.requester.name, player, respons);
                            }
                        });
                    }

                    if (tprmenuResult.selection === 1) {
                        //show the ui to send a request.
                        const tprsendrequestxui = new ModalFormData();
                        let onlineList: string[] = [];
                        onlineList = Array.from(world.getPlayers(), (player) => player.name);
                        tprsendrequestxui.title("§4Paradox - Send TP Request§4");
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
            moderationui.button("Despawn entities", "textures/ui/trash");
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
                    unbanui.textField(`Player`, `Enter a player's username to be unbanned.`);
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
                            notifyui.toggle("Notifications", false);
                            notifyui.show(player).then((notifyResult) => {
                                uiNOTIFY(notifyResult, onlineList, player);
                            });
                        }
                        if (chatResult.selection === 1) {
                            //Chat Ranks ui
                            const chatranksui = new ModalFormData();
                            let onlineList: string[] = [];
                            const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");
                            chatranksui.title("§4Change a player's chat rank.§4");
                            onlineList = Array.from(world.getPlayers(), (player) => player.name);
                            let predefinedrank: string[] = ["Owner", "Admin", "Mod", "Member"];
                            chatranksui.dropdown(`\n§rSelect a player to change thier rank.§r\n\nPlayer's Online\n`, onlineList);
                            chatranksui.dropdown(`\n§rSelect a pre defined rank or you can set a custom on bellow.§r`, predefinedrank);
                            chatranksui.textField("Enter a custom Rank", "VIP");
                            chatranksui.toggle("Chat Ranks: Enables or Disables chat ranks.", chatRanksBoolean);
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
                    lockdownui.title("§4Paradox - Lockdown§4");
                    lockdownui.textField("Reason", "Kicked all members but staff due to possible hacker.");
                    lockdownui.toggle("Enable or Disable Lockdown.", lockdownBoolean);
                    lockdownui.show(player).then((lockdownResult) => {
                        uiLOCKDOWN(lockdownResult, player);
                    });
                }
                if (ModUIresult.selection === 5) {
                    //Punish UI im going to use two forms one as a yes/no message so i can advise what this will do.
                    const punishprewarnui = new MessageFormData();
                    punishprewarnui.title("§4Paradox - Punish§4");
                    punishprewarnui.body("This will allow you to wipe a player's ender chest as well as thier inventory.");
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
                    tpaui.title("§4Paradox - Teleport Assistance.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    tpaui.dropdown(`\n§rSelect a player to teleport.§r\n\nPlayer's Online\n`, onlineList);
                    tpaui.toggle("Teleport to the target player.", true);
                    tpaui.toggle("Teleport the target player to you.", false);
                    tpaui.show(player).then((tpaResult) => {
                        uiTPA(tpaResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 7) {
                    const kickui = new ModalFormData();
                    kickui.title("§4Paradox - Kick a player.§4");
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
                    ewipeui.title("§4Paradox - Wipe a player's Enderchest.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    ewipeui.dropdown(`\n§rSelect a player to wipe thier Enderchest.§r\n\nPlayer's Online\n`, onlineList);
                    ewipeui.show(player).then((ewipeResult) => {
                        uiEWIPE(ewipeResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 9) {
                    const freezeui = new ModalFormData();
                    freezeui.title("§4Paradox - Freeze a player.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    freezeui.dropdown(`\n§rSelect a player to freeze.§r\n\nPlayer's Online\n`, onlineList);
                    freezeui.show(player).then((freezeResult) => {
                        uiFREEZE(freezeResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 10) {
                    const flyui = new ModalFormData();
                    flyui.title("§4Paradox - Grant a player fly abilities.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    flyui.dropdown(`\n§rSelect a player to allow the ability to fly.§r\n\nPlayer's Online\n`, onlineList);
                    flyui.show(player).then((flyResult) => {
                        uiFLY(flyResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 11) {
                    const vanishui = new ModalFormData();
                    vanishui.title("§4Paradox - Vanish from the server.§4");
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    vanishui.dropdown(`\n§rSelect a player to vanish.§r\n\nPlayer's Online\n`, onlineList);
                    vanishui.show(player).then((vanishResult) => {
                        uiVANISH(vanishResult, onlineList, player);
                    });
                }
                if (ModUIresult.selection === 12) {
                    const despawnerui = new ModalFormData();
                    despawnerui.title("§4Paradox - Despawn Entitys.§4");
                    despawnerui.textField("Enter the name of a entity to despawn.", "creeper");
                    despawnerui.toggle("Despawn all entities in the loaded chunks.", false);
                    despawnerui.show(player).then((despawnerResult) => {
                        uiDESPAWNER(despawnerResult, player);
                    });
                }
            });
        }
        if (result.selection === 3) {
            //Modules ui
            const modulesui = new ActionFormData();
            modulesui.title("§4Paradox - Modules§4");
            modulesui.button("Configure Anti Gamemodes", "textures/items/totem");
            modulesui.button("Configure Movement Modules", "textures/ui/move");
            modulesui.button("Configure Anti KillAura", "textures/items/diamond_sword");
            modulesui.button("Configure Anti Nuker", "textures/blocks/tnt_side");
            modulesui.button("Configure Anti Shulker", "textures/blocks/shulker_top_purple");
            modulesui.button("Configure Anti Spam", "textures/ui/mute_off");
            modulesui.button("Configure Anti AutoCliker", "textures/ui/cursor_gamecore");
            modulesui.button("Configure Badpackets", "textures/ui/upload_glyph");
            modulesui.button("Configure Bedrock Validation", "textures/blocks/bedrock");
            modulesui.button("Configure Anti Crasher", "textures/ui/Ping_Red");
            modulesui.button("Configure Enchanted Armor", "textures/items/diamond_leggings");
            modulesui.button("Configure Illegal Items", "textures/items/netherite_pickaxe");
            modulesui.button("Configure Lag Clearing", "textures/ui/interact");
            modulesui.button("Configure Namespoofing", "textures/items/fishing_rod_uncast");
            modulesui.button("Configure One Player Sleep(OPS)", "textures/items/bed_red");
            modulesui.button("Configure Command Blocks", "textures/blocks/command_block");
            modulesui.button("Configure Anti Reach", "textures/ui/crossout");
            modulesui.button("Configure Exp Salvage System", "textures/blocks/smithing_table_front");
            modulesui.button("Configure Spam Modules", "textures/ui/mute_on");
            modulesui.button("Configure World Borders", "textures/blocks/barrier");
            modulesui.button("Configure Xray", "textures/blocks/diamond_ore");
            modulesui.button("Configure Hotbar", "textures/items/paper");
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
                            modulesantiknockbackui.toggle("Anti Knockback: Anti Knockback for all players.", antikbBoolean);
                            modulesantiknockbackui.show(player).then((antikbResult) => {
                                uiANTIKNOCKBACK(antikbResult, player);
                            });
                        }
                        if (movementResult.selection === 1) {
                            //Anti Fall
                            const modulesantifallui = new ModalFormData();
                            const antifallABoolean = dynamicPropertyRegistry.get("antifalla_b");
                            modulesantifallui.title("§4Paradox Modules-Anti Fall§4");
                            modulesantifallui.toggle("Anti Fall: Checks for taking no fall damage in survival. ", antifallABoolean);
                            modulesantifallui.show(player).then((antifallResult) => {
                                uiANTIFALL(antifallResult, player);
                            });
                        }
                        if (movementResult.selection === 2) {
                            //Anti Fly
                            const modulesantiflyui = new ModalFormData();
                            const flyABoolean = dynamicPropertyRegistry.get("flya_b");
                            modulesantiflyui.title("§4Paradox Modules-Anti Fly§4");
                            modulesantiflyui.toggle("Anti Fly: checks for illegal flying in survival.", flyABoolean);
                            modulesantiflyui.show(player).then((antiflyResult) => {
                                uiANTIFLY(antiflyResult, player);
                            });
                        }
                        if (movementResult.selection === 3) {
                            //Invalid Sprint
                            const modulesinvalidsprintui = new ModalFormData();
                            const invalidSprintABoolean = dynamicPropertyRegistry.get("invalidsprinta_b");
                            modulesinvalidsprintui.title("§4Paradox Modules-Invalid Sprint§4");
                            modulesinvalidsprintui.toggle("Invalid Sprint: checks for illegal sprinting with blindness effect.", invalidSprintABoolean);
                            modulesinvalidsprintui.show(player).then((invalidsprintResult) => {
                                uiINVALIDSPRINT(invalidsprintResult, player);
                            });
                        }
                        if (movementResult.selection === 4) {
                            //NoSlowA
                            const modulesnoslowui = new ModalFormData();
                            const noSlowBoolean = dynamicPropertyRegistry.get("noslowa_b");
                            modulesnoslowui.title("§4Paradox Modules-Noslow§4");
                            modulesnoslowui.toggle("Noslow: checks for player's speed hacking.", noSlowBoolean);
                            modulesnoslowui.show(player).then((invalidsprintResult) => {
                                uiNOWSLOW(invalidsprintResult, player);
                            });
                        }
                        if (movementResult.selection === 5) {
                            //AntiScaffold
                            const modulesantiscaffoldui = new ModalFormData();
                            const antiScaffoldABoolean = dynamicPropertyRegistry.get("antiscaffolda_b");
                            modulesantiscaffoldui.title("§4Paradox Modules-Anti Scaffold§4");
                            modulesantiscaffoldui.toggle("Anti Scaffold: Checks player's for illegal scaffolding.", antiScaffoldABoolean);
                            modulesantiscaffoldui.show(player).then((antiscaffoldResult) => {
                                uiANTISCAFFOLD(antiscaffoldResult, player);
                            });
                        }
                        if (movementResult.selection === 6) {
                            //Jesus UI
                            const modulesantijesusui = new ModalFormData();
                            const jesusaBoolean = dynamicPropertyRegistry.get("jesusa_b");
                            modulesantijesusui.title("§4Paradox Modules-Anti Jesus§4");
                            modulesantijesusui.toggle("Anti Jesus: Toggles checks for walking/sprinting on water or lava.", jesusaBoolean);
                            modulesantijesusui.show(player).then((antijesusResult) => {
                                uiANTIJESUS(antijesusResult, player);
                            });
                        }
                    });
                }
                if (ModulesUIResult.selection === 2) {
                    const modulesantikillaura = new ModalFormData();
                    const autoaurascore = getScore("autoaura", player);
                    let autoauraBoolean: boolean = undefined;
                    /**get the score value and then check to see if its already enable or already disabled
                     * so we can then update the control boolean to disaply its current setting to the player
                     * in the menu.
                     */
                    if (autoaurascore <= 0) {
                        autoauraBoolean = false;
                    }
                    if (autoaurascore >= 1) {
                        autoauraBoolean = true;
                    }
                    modulesantikillaura.title("§4Paradox Modules-Anti KillAura§4");
                    modulesantikillaura.toggle("Anti KillAura: Auto KillAura checks for all players.", autoauraBoolean);
                    modulesantikillaura.show(player).then((antikillauraResult) => {
                        uiANTIKILLAURA(antikillauraResult, player);
                    });
                }
                if (ModulesUIResult.selection === 3) {
                    const modulesantinukerui = new ModalFormData();
                    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");
                    modulesantinukerui.title("§4Paradox Modules-Anti Nuker§4");
                    modulesantinukerui.toggle("Anti Nuker: Checks player's for nuking blocks.", antiNukerABoolean);
                    modulesantinukerui.show(player).then((antinukerResult) => {
                        uiANTINUKER(antinukerResult, player);
                    });
                }
                if (ModulesUIResult.selection === 4) {
                    const modulesantishulkerui = new ModalFormData();
                    const antiShulkerBoolean = dynamicPropertyRegistry.get("antishulker_b");
                    modulesantishulkerui.title("§4Paradox Modules-Anti Shulker§4");
                    modulesantishulkerui.toggle("Anti Shulker: Allows or denies shulker boxes in the world.", antiShulkerBoolean);
                    modulesantishulkerui.show(player).then((antishulkerResult) => {
                        uiANTISHULKER(antishulkerResult, player);
                    });
                }
                if (ModulesUIResult.selection === 5) {
                    const modulesantispamui = new ModalFormData();
                    const antiSpamBoolean = dynamicPropertyRegistry.get("antispam_b");
                    modulesantispamui.title("§4Paradox Modules-Anti Spam§4");
                    modulesantispamui.toggle("Anti Spam: Checks for spamming in chat with 2 second cooldown.", antiSpamBoolean);
                    modulesantispamui.show(player).then((antispamResult) => {
                        uiANTISPAM(antispamResult, player);
                    });
                }
                if (ModulesUIResult.selection === 6) {
                    const autoclickerscore = getScore("autoclicker", player);
                    let autoclickerBoolean: boolean = undefined;
                    /**get the score value and then check to see if its already enable or already disabled
                     * so we can then update the control boolean to disaply its current setting to the player
                     * in the menu.
                     */
                    if (autoclickerscore <= 0) {
                        autoclickerBoolean = false;
                    }
                    if (autoclickerscore >= 1) {
                        autoclickerBoolean = true;
                    }
                    const modulesantiautoclickerui = new ModalFormData();
                    modulesantiautoclickerui.title("§4Paradox Modules-Anti AutoClicker§4");
                    modulesantiautoclickerui.toggle("Anti AutoClicker: checks for players using autoclickers while attacking.", autoclickerBoolean);
                    modulesantiautoclickerui.show(player).then((antiautoclickerResult) => {
                        uiANTIAUTOCLICKER(antiautoclickerResult, player);
                    });
                }
                if (ModulesUIResult.selection === 7) {
                    const modulesbadpacketsui = new ModalFormData();
                    const badPackets1Boolean = dynamicPropertyRegistry.get("badpackets1_b");
                    const badPackets2Boolean = dynamicPropertyRegistry.get("badpackets2_b");
                    modulesbadpacketsui.title("§4Paradox Modules-Badpackets§4");
                    modulesbadpacketsui.toggle("Badpackets1: checks for message lengths with each broadcast", badPackets1Boolean);
                    modulesbadpacketsui.toggle("Badpackets2: checks for invalid selected slots by player", badPackets2Boolean);
                    modulesbadpacketsui.show(player).then((badpacketsResult) => {
                        uiBADPACKETS(badpacketsResult, player);
                    });
                }
                if (ModulesUIResult.selection === 8) {
                    const modulesbedrockvalidateui = new ModalFormData();
                    const bedrockValidateBoolean = dynamicPropertyRegistry.get("bedrockvalidate_b");
                    modulesbedrockvalidateui.title("§4Paradox Modules-Bedrock Validation§4");
                    modulesbedrockvalidateui.toggle("Bedrock Validate: checks for bedrock validations", bedrockValidateBoolean);
                    modulesbedrockvalidateui.show(player).then((bedrockvalidationResult) => {
                        uiBEDROCKVALIDATION(bedrockvalidationResult, player);
                    });
                }
                if (ModulesUIResult.selection === 9) {
                    const modulesanticrasherui = new ModalFormData();
                    const crasherABoolean = dynamicPropertyRegistry.get("crashera_b");
                    modulesanticrasherui.title("§4Paradox Modules-Anti Crasher§4");
                    modulesanticrasherui.toggle("Anti Crasher: checks for the infamous Horion Crasher", crasherABoolean);
                    modulesanticrasherui.show(player).then((anticrasherResult) => {
                        uiANTICRASHER(anticrasherResult, player);
                    });
                }
                if (ModulesUIResult.selection === 10) {
                    const modulesenchantedarmorui = new ModalFormData();
                    const encharmorscore = getScore("encharmor", player);
                    let enchantedarmorBoolean: boolean;
                    /**get the score value and then check to see if its already enable or already disabled
                     * so we can then update the control boolean to disaply its current setting to the player
                     * in the menu.
                     */
                    if (encharmorscore <= 0) {
                        enchantedarmorBoolean = false;
                    }
                    if (encharmorscore >= 1) {
                        enchantedarmorBoolean = true;
                    }
                    modulesenchantedarmorui.title("§4Paradox Modules-Enchaneted Armor§4");
                    modulesenchantedarmorui.toggle("Enchanted Armor: Anti Enchanted Armor for all players", enchantedarmorBoolean);
                    modulesenchantedarmorui.show(player).then((enchantedarmorResult) => {
                        uiENCHANTEDARMOR(enchantedarmorResult, player);
                    });
                }

                if (ModulesUIResult.selection === 11) {
                    //Illegal items this will cover a few modules so will group these into one UI.
                    const modulesillegalitemsui = new ModalFormData();
                    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b");
                    const illegalItemsBBoolean = dynamicPropertyRegistry.get("illegalitemsb_b");
                    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b");
                    const illegalItemsDBoolean = dynamicPropertyRegistry.get("illegalitemsd_b");
                    const illegalEnchantmentBoolean = dynamicPropertyRegistry.get("illegalenchantment_b");
                    const illegalLoresBoolean = dynamicPropertyRegistry.get("illegallores_b");
                    const stackBanBoolean = dynamicPropertyRegistry.get("stackban_b");
                    modulesillegalitemsui.title("§4Paradox Modules-Illegal Items§4");
                    modulesillegalitemsui.toggle("Illegal Items A: checks for player's that have illegal items in inventory.", illegalItemsABoolean);
                    modulesillegalitemsui.toggle("Illegal Items B: checks for player's that use illegal items.", illegalItemsBBoolean);
                    modulesillegalitemsui.toggle("Illegal Items C: hecks for player's that place illegal items.", illegalItemsCBoolean);
                    modulesillegalitemsui.toggle("Illegal Items D: checks for illegal dropped items.", illegalItemsDBoolean);
                    modulesillegalitemsui.toggle("Illegal Enchants: checks for items with illegal enchantments.", illegalEnchantmentBoolean);
                    modulesillegalitemsui.toggle("Illegal Lores: checks for illegal Lores on items.", illegalLoresBoolean);
                    modulesillegalitemsui.toggle("Stack Ban: checks for player's with illegal stacks over 64.", stackBanBoolean);
                    modulesillegalitemsui.show(player).then((illegalitemsResult) => {
                        uiILLEGALITEMS(illegalitemsResult, player);
                    });
                }
                if (ModulesUIResult.selection === 12) {
                    //Lagclear
                    const moduleslaglearui = new ModalFormData();
                    const clearLagBoolean = dynamicPropertyRegistry.get("clearlag_b");
                    moduleslaglearui.title("§4Paradox Modules-Clear Lag§4");
                    moduleslaglearui.toggle("Clear Lag: Clears items and entities with timer", clearLagBoolean);
                    moduleslaglearui.show(player).then((lagclearResult) => {
                        uiLAGCLEAR(lagclearResult, player);
                    });
                }
                if (ModulesUIResult.selection === 13) {
                    //Namespoofing
                    const modulesnamespoofingui = new ModalFormData();
                    const nameSpoofABoolean = dynamicPropertyRegistry.get("namespoofa_b");
                    const nameSpoofBBoolean = dynamicPropertyRegistry.get("namespoofb_b");
                    modulesnamespoofingui.title("§4Paradox Modules-Namespoofing§4");
                    modulesnamespoofingui.toggle("Name Spoofing A: checks for player's name exceeding character limitations.", nameSpoofABoolean);
                    modulesnamespoofingui.toggle("Name Spoofing B: checks for player's name that has Non ASCII characters.", nameSpoofBBoolean);
                    modulesnamespoofingui.show(player).then((namespoofingResult) => {
                        uiNAMESPOOFING(namespoofingResult, player);
                    });
                }
                if (ModulesUIResult.selection === 14) {
                    const modulesopsui = new ModalFormData();
                    const opsBoolean = dynamicPropertyRegistry.get("ops_b");
                    modulesopsui.title("§4Paradox Modules-One Player Sleep§4");
                    modulesopsui.toggle("One Player Sleep: Allows 1 player to sleep through the night", opsBoolean);
                    modulesopsui.show(player).then((opsResult) => {
                        uiOPS(opsResult, player);
                    });
                }
                if (ModulesUIResult.selection === 15) {
                    const modulescommandblocksui = new ModalFormData();
                    const cmdsscore = getScore("cmds", player);
                    const commandblocksscore = getScore("commandblocks", player);
                    let removecmdblocksBoolean;
                    Boolean;
                    let cmdoBoolean: boolean;
                    if (cmdsscore <= 0) {
                        cmdoBoolean = false;
                    }
                    if (cmdsscore >= 1) {
                        cmdoBoolean = true;
                    }
                    if (commandblocksscore <= 0) {
                        removecmdblocksBoolean = false;
                    }
                    if (commandblocksscore >= 1) {
                        removecmdblocksBoolean = true;
                    }
                    modulescommandblocksui.title("§4Paradox Modules-Command Blocks§4");
                    modulescommandblocksui.toggle("Override Command Blocks: Forces the commandblocksenabled gamerule to be enabled or disabled at all times.", cmdoBoolean);
                    modulescommandblocksui.toggle("Anti Command Blocks: Clears all Command Blocks when enabled.", removecmdblocksBoolean);
                    modulescommandblocksui.show(player).then((commandblockResult) => {
                        uiCOMMANDBLOCKS(commandblockResult, player);
                    });
                }
                if (ModulesUIResult.selection === 16) {
                    const modulesreachui = new ModalFormData();
                    const reachABoolean = dynamicPropertyRegistry.get("reacha_b");
                    const reachBBoolean = dynamicPropertyRegistry.get("reachb_b");
                    const reachCBoolean = dynamicPropertyRegistry.get("reachc_b");
                    modulesreachui.title("§4Paradox Modules-Reach§4");
                    modulesreachui.toggle("Reach A: checks for player's placing blocks beyond reach.", reachABoolean);
                    modulesreachui.toggle("Reach B: checks for player's breaking blocks beyond reach.", reachBBoolean);
                    modulesreachui.toggle("Reach C: checks for player's attacking beyond reach.", reachCBoolean);
                    modulesreachui.show(player).then((reachResult) => {
                        uiREACH(reachResult, player);
                    });
                }
                if (ModulesUIResult.selection === 17) {
                    //New Slavage System
                    const modulesexpsavlagesystem = new ModalFormData();
                    const salvageBoolean = dynamicPropertyRegistry.get("salvage_b");
                    modulesexpsavlagesystem.title("§4Paradox Modules-Salvage System [Experimental]§4");
                    modulesexpsavlagesystem.toggle("Salvage System: new salvage system [Experimental]", salvageBoolean);
                    modulesexpsavlagesystem.show(player).then((salvagesystemResult) => {
                        uiEXPSALVAGESYSTEM(salvagesystemResult, player);
                    });
                }
                if (ModulesUIResult.selection === 18) {
                    const modulesspamui = new ModalFormData();
                    const spammerABoolean = dynamicPropertyRegistry.get("spammera_b");
                    const spammerBBoolean = dynamicPropertyRegistry.get("spammerb_b");
                    const spammerCBoolean = dynamicPropertyRegistry.get("spammerc_b");
                    const spammerDBoolean = dynamicPropertyRegistry.get("spammerd_b");
                    modulesspamui.title("§4Paradox Modules-Spam Modules§4");
                    modulesspamui.toggle("Spammer A: checks for messages sent while moving.", spammerABoolean);
                    modulesspamui.toggle("Spammer B: checks for messages sent while swinging.", spammerBBoolean);
                    modulesspamui.toggle("Spammer C: checks for messages sent while using items.", spammerCBoolean);
                    modulesspamui.toggle("Spammer D: checks for messages sent while GUI is open.", spammerDBoolean);
                    modulesspamui.show(player).then((spamResult) => {
                        uiSPAMMER(spamResult, player);
                    });
                }
                if (ModulesUIResult.selection === 19) {
                    const modulesworldborderui = new ModalFormData();
                    const overWorldBorderBoolean = dynamicPropertyRegistry.get("worldborder_b");
                    let overworldBorderNumber = dynamicPropertyRegistry.get("worldborder_n");
                    let netherworldBorderNumber = dynamicPropertyRegistry.get("worldborder_nether_n");
                    modulesworldborderui.title("§4Paradox Modules-World Border§4");
                    modulesworldborderui.textField("Over World Border: value in blocks", "1000", String(overworldBorderNumber));
                    modulesworldborderui.textField("Nether World Border: values in blocks. Set to 0 if it needs to be disabled.", "0", String(netherworldBorderNumber));
                    modulesworldborderui.toggle("Enable World Border", overWorldBorderBoolean);
                    modulesworldborderui.show(player).then((spamResult) => {
                        uiWORLDBORDER(spamResult, player);
                    });
                }
                if (ModulesUIResult.selection === 20) {
                    const modulesxtrayui = new ModalFormData();
                    modulesxtrayui.title("§4Paradox Modules-Xray§4");
                    const xrayBoolean = dynamicPropertyRegistry.get("xraya_b");
                    modulesxtrayui.toggle("Xray: Notify's staff when and where player's mine specific ores.", xrayBoolean);
                    modulesxtrayui.show(player).then((xrayResult) => {
                        uiXRAY(xrayResult, player);
                    });
                }
                if (ModulesUIResult.selection === 21) {
                    const moduleshotbarui = new ModalFormData();
                    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");
                    let CurrentHotbarConfig = config.modules.hotbar.message;
                    moduleshotbarui.title("§4Paradox Modules-Hotbar§4");
                    moduleshotbarui.textField("Hotbar Message: ", "", CurrentHotbarConfig);
                    moduleshotbarui.toggle("Enable Hotbar:Displays a hotbar message for all player's currently online.", hotbarBoolean);
                    moduleshotbarui.toggle("Restore to message stored in config.js", false);
                    moduleshotbarui.show(player).then((hotbarResult) => {
                        uiHOTBAR(hotbarResult, player);
                    });
                }
            });
        }
        if (result.selection === 4) {
            //Prefix ui
            const prefixui = new ModalFormData();
            let onlineList: string[] = [];
            onlineList = Array.from(world.getPlayers(), (player) => player.name);
            prefixui.title("§4Paradox - Change command prefix§4");
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
            tprui.title("§4Paradox - TPR Menu§4");
            tprui.button("My Requests.", "textures/ui/mail_icon");
            tprui.button("Send A Request.", "textures/ui/send_icon");
            tprui.show(player).then((tprmenuResult) => {
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
                    tprinboxui.title("Paradox Your TP Requests.");
                    tprinboxui.body(request.requester.name + " Has sent you a request to be teleported to your location, use the buttons bellow to approve or decline this request. \n This request expires in: " + toMinutes.getMinutes());
                    tprinboxui.button1("Yes");
                    tprinboxui.button2("No");
                    tprinboxui.show(player).then((tprInboxResult) => {
                        if (tprInboxResult.selection === 1) {
                            respons = "yes";
                            uiTPR(request.requester.name, player, respons);
                        }
                        //beacuse for some reason the no button is 0 yet its the second control
                        if (tprInboxResult.selection === 0) {
                            respons = "no";
                            uiTPR(request.requester.name, player, respons);
                        }
                    });
                }

                if (tprmenuResult.selection === 1) {
                    //show the ui to send a request.
                    const tprsendrequestxui = new ModalFormData();
                    let onlineList: string[] = [];
                    onlineList = Array.from(world.getPlayers(), (player) => player.name);
                    tprsendrequestxui.title("§4Paradox - Send TP Request§4");
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

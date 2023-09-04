import { ActionFormData } from "@minecraft/server-ui";
import { Player } from "@minecraft/server";
import { gamemodesHandler } from "./results/gamemodes";
import { movementui } from "./guiHandlerMovement/movementui";
import { antiKillAuraHandler } from "./results/antikillaura";
import { antiNukerAHandler } from "./results/antinuker";
import { antiShulkerHandler } from "./results/antishulker";
import { antiSpamHandler } from "./results/antispam";
import { antiAutoClickerHandler } from "./results/antiautoclicker";
import { badPacketsHandler } from "./results/badpackets";
import { bedrockValidationHandler } from "./results/bedrockvalidation";
import { antiCrasherHandler } from "./results/anticrasher";
import { antiEnchantedArmorHandler } from "./results/enchantedarmor";
import { illegalItemsHandler } from "./results/illegalitems";
import { lagClearHandler } from "./results/lagclear";
import { nameSpoofHandler } from "./results/namespoofing";
import { opsHandler } from "./results/oneplayersleep";
import { commandBlocksHandler } from "./results/commandblocks";
import { reachHandler } from "./results/reach";
import { salvageHandler } from "./results/salvage";
import { spammersHandler } from "./results/spammers";
import { worldBorderHandler } from "./results/worldborder";
import { xrayHandler } from "./results/xray";
import { hotbarHandler } from "./results/hotbar";
import { afkHandler } from "./results/afk";
import { antiPhaseAHandler } from "./results/antiphase";

export function modulesui(player: Player) {
    //Modules ui
    const modulesui = new ActionFormData();
    modulesui.title("§4Paradox - Modules§4");
    modulesui.button("Configure Anti Gamemodes", "textures/items/totem");
    modulesui.button("Configure Movement Modules", "textures/ui/move");
    modulesui.button("Configure Anti KillAura", "textures/items/diamond_sword");
    modulesui.button("Configure Anti Nuker", "textures/blocks/tnt_side");
    modulesui.button("Configure Anti Shulker", "textures/blocks/shulker_top_purple");
    modulesui.button("Configure Anti Spam", "textures/ui/mute_off");
    modulesui.button("Configure Anti AutoClicker", "textures/ui/cursor_gamecore");
    modulesui.button("Configure Badpackets", "textures/ui/upload_glyph");
    modulesui.button("Configure Bedrock Validation", "textures/blocks/bedrock");
    modulesui.button("Configure Anti Crasher", "textures/ui/Ping_Red");
    modulesui.button("Configure Enchanted Armor", "textures/items/diamond_leggings");
    modulesui.button("Configure Illegal Items", "textures/items/netherite_pickaxe");
    modulesui.button("Configure Lag Clearing", "textures/ui/interact");
    modulesui.button("Configure Name spoofing", "textures/items/fishing_rod_uncast");
    modulesui.button("Configure One Player Sleep(OPS)", "textures/items/bed_red");
    modulesui.button("Configure Command Blocks", "textures/blocks/command_block");
    modulesui.button("Configure Anti Reach", "textures/ui/crossout");
    modulesui.button("Configure Salvage System", "textures/blocks/smithing_table_front");
    modulesui.button("Configure Spam Modules", "textures/ui/mute_on");
    modulesui.button("Configure World Borders", "textures/blocks/barrier");
    modulesui.button("Configure Xray", "textures/blocks/diamond_ore");
    modulesui.button("Configure Hotbar", "textures/items/paper");
    modulesui.button("Configure AFK", "textures/ui/keyboard_and_mouse_glyph_color");
    modulesui.button("Configure Anti Phase", "textures/blocks/end_portal");
    modulesui
        .show(player)
        .then((ModulesUIResult) => {
            switch (ModulesUIResult.selection) {
                case 0:
                    gamemodesHandler(player);
                    break;
                case 1:
                    movementui(player);
                    break;
                case 2:
                    antiKillAuraHandler(player);
                    break;
                case 3:
                    antiNukerAHandler(player);
                    break;
                case 4:
                    antiShulkerHandler(player);
                    break;
                case 5:
                    antiSpamHandler(player);
                    break;
                case 6:
                    antiAutoClickerHandler(player);
                    break;
                case 7:
                    badPacketsHandler(player);
                    break;
                case 8:
                    bedrockValidationHandler(player);
                    break;
                case 9:
                    antiCrasherHandler(player);
                    break;
                case 10:
                    antiEnchantedArmorHandler(player);
                    break;
                case 11:
                    illegalItemsHandler(player);
                    break;
                case 12:
                    lagClearHandler(player);
                    break;
                case 13:
                    nameSpoofHandler(player);
                    break;
                case 14:
                    opsHandler(player);
                    break;
                case 15:
                    commandBlocksHandler(player);
                    break;
                case 16:
                    reachHandler(player);
                    break;
                case 17:
                    salvageHandler(player);
                    break;
                case 18:
                    spammersHandler(player);
                    break;
                case 19:
                    worldBorderHandler(player);
                    break;
                case 20:
                    xrayHandler(player);
                    break;
                case 21:
                    hotbarHandler(player);
                    break;
                case 22:
                    afkHandler(player);
                    break;
                case 23:
                    antiPhaseAHandler(player);
                    break;
                default:
                    break;
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

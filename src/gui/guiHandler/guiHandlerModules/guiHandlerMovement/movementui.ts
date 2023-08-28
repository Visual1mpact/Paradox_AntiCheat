import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { antiKnockBackHandler } from "./results/antiknockback";
import { antiFallHandler } from "./results/antifall";
import { antiFlyHandler } from "./results/antifly";
import { invalidSprintHandler } from "./results/invalidsprint";
import { noSlowAHandler } from "./results/noslowa";
import { antiScaffoldAHandler } from "./results/antiscaffolda";
import { antiJesusAHandler } from "./results/antijesusa";

export function movementui(player: Player) {
    const modulesmovementui = new ActionFormData();
    modulesmovementui.title("§4Paradox Modules - Movement§4");
    modulesmovementui.button("Anti Knockback", "textures/items/diamond_chestplate");
    modulesmovementui.button("Anti Fall", "textures/items/diamond_boots");
    modulesmovementui.button("Anti Fly", "textures/items/elytra");
    modulesmovementui.button("Invalid Sprint", "textures/items/diamond_boots");
    modulesmovementui.button("No-slow", "textures/items/diamond_boots");
    modulesmovementui.button("Anti Scaffold", "textures/blocks/scaffolding_top");
    modulesmovementui.button("Anti Jesusa", "textures/blocks/lava_placeholder");
    modulesmovementui.show(player).then((movementResult) => {
        switch (movementResult.selection) {
            case 0:
                antiKnockBackHandler(player);
                break;
            case 1:
                antiFallHandler(player);
                break;
            case 2:
                antiFlyHandler(player);
                break;
            case 3:
                invalidSprintHandler(player);
                break;
            case 4:
                noSlowAHandler(player);
                break;
            case 5:
                antiScaffoldAHandler(player);
                break;
            case 6:
                antiJesusAHandler(player);
                break;
            default:
                break;
        }
    });
}

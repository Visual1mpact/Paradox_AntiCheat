import { EntityInventoryComponent, Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsgToPlayer } from "../../util";
import { ActionFormData, ModalFormResponse } from "@minecraft/server-ui";
import { paradoxui } from "../paradoxui.js";

export async function uiINVENTORY(inventoryUIResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = inventoryUIResult.formValues;
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
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }
    const inv = member.getComponent("inventory") as EntityInventoryComponent;
    const container = inv.container;
    const itemArray: (string | number)[] = [];

    const maxSlots = 36; // Maximum number of slots in the player's inventory

    // Loop through the inventory and add items to the itemArray
    for (let i = 0; i < maxSlots; i++) {
        const item = container.getItem(i);
        if (item?.typeId) {
            itemArray.push(i, item.typeId.replace("minecraft:", ""), item.amount, item.typeId.replace("minecraft:", ""));
        } else {
            itemArray.push(i, "empty", 0, "ui/slots_bg");
        }
    }

    // Map of all items/blocks and their texture paths
    const textures = new Map([
        //default texture if the slot is empty or no texture is found in the map
        ["empty", "ui/slots_bg"],
        ["planks", "blocks/planks_oak"],
        ["stonebrick", "blocks/stonebrick"],
        //items
        ["acacia_door", "items/door_acacia"],
        ["amethyst_shard", "items/amethyst_shard"],
        ["apple", "items/apple"],
        ["apple_golden", "items/apple_golden"],
        ["armor_stand", "items/armor_stand"],
        ["arrow", "items/arrow"],
        ["wooden_axe", "textures/items/wood_axe"],
        ["stone_axe", "textures/items/stone_axe"],
        ["iron_axe", "textures/items/iron_axe"],
        ["golden_axe", "textures/items/gold_axe"],
        ["diamond_axe", "textures/items/diamond_axe"],
        ["netherite_axe", "textures/items/netherite_axe"],
        ["banner_pattern", "textures/items/banner_pattern"],
        ["bed", "items/bed_red"],
        ["beef_cooked", "textures/items/beef_cooked"],
        ["beef_raw", "textures/items/beef_raw"],
        ["beetroot", "textures/items/beetroot"],
        ["beetroot_soup", "textures/items/beetroot_soup"],
        ["birch_door", "textures/items/door_birch"],
        ["blaze_powder", "textures/items/blaze_powder"],
        ["blaze_rod", "textures/items/blaze_rod"],
        ["oak_boat", "items/boat_oak"],
        ["spruce_boat", "items/boat_spruce"],
        ["birch_boat", "items/boat_birch"],
        ["jungle_boat", "items/boat_jungle"],
        ["acacia_boat", "items/boat_acacia"],
        ["dark_boat", "items/boat_darkoak"],
        ["mangrove_boat", "items/mangrove_boat"],
        ["cherry_boat", "items/cherry_boat"],
        ["bamboo_raft", "items/bamboo_raft"],
        ["bone", "textures/items/bone"],
        ["book_enchanted", "textures/items/book_enchanted"],
        ["book_normal", "textures/items/book_normal"],
        ["book_portfolio", "textures/items/book_portfolio"],
        ["book_writable", "textures/items/book_writable"],
        ["book_written", "textures/items/book_written"],
        ["leather_helmet", "textures/items/leather_helmet"],
        ["chainmail_helmet", "textures/items/chainmail_helmet"],
        ["iron_helmet", "textures/items/iron_helmet"],
        ["golden_helmet", "textures/items/gold_helmet"],
        ["diamond_helmet", "textures/items/diamond_helmet"],
        ["netherite_helmet", "textures/items/netherite_helmet"],
        ["leather_chestplate", "items/leather_chestplate"],
        ["chainmail_chestplate", "items/chainmail_chestplate"],
        ["iron_chestplate", "items/iron_chestplate"],
        ["golden_chestplate", "items/gold_chestplate"],
        ["diamond_chestplate", "items/diamond_chestplate"],
        ["netherite_chestplate", "items/netherite_chestplate"],
        ["leather_leggings", "items/leather_leggings"],
        ["chainmail_leggings", "items/chainmail_leggings"],
        ["iron_leggings", "items/iron_leggings"],
        ["golden_leggings", "items/gold_leggings"],
        ["diamond_leggings", "items/diamond_leggings"],
        ["netherite", "items/netherite_leggings"],
        ["leather_boots", "textures/items/leather_boots"],
        ["chainmail_boots", "textures/items/chainmail_boots"],
        ["iron_boots", "textures/items/iron_boots"],
        ["golden_boots", "textures/items/gold_boots"],
        ["diamond_boots", "textures/items/diamond_boots"],
        ["netherite_boots", "textures/items/netherite_boots"],
        ["bow", "bow_standby"],
        ["bowl", "textures/items/bowl"],
        ["bread", "textures/items/bread"],
        ["brewing_stand", "textures/items/brewing_stand"],
        ["brick", "textures/items/brick"],
        ["bucket", "textures/items/bucket_empty"],
        ["milk_bucket", "textures/items/bucket_milk"],
        ["water_bucket", "textures/items/bucket_water"],
        ["lava_bucket", "textures/items/bucket_lava"],
        ["cod_bucket", "textures/items/bucket_cod"],
        ["salmon_bucket", "textures/items/bucket_salmon"],
        ["tropical_bucket", "textures/items/bucket_tropical"],
        ["pufferfish_bucket", "textures/items/bucket_pufferfish"],
        ["powder_snow_bucket", "textures/items/bucket_powder_snow"],
        ["axolotl_bucket", "textures/items/bucket_axolotl"],
        ["tadpole_bucket", "textures/items/bucket_tadpole"],
        ["oak_chest_boat", "items/oak_chest_boat"],
        ["spruce_chest_boat", "items/spruce_chest_boat"],
        ["birch_chest_boat", "items/birch_chest_boat"],
        ["jungle_chest_boat", "items/jungle_chest_boat"],
        ["acacia_chest_boat", "items/acacia_chest_boat"],
        ["dark_oak_chest_boat", "items/dark_oak_chest_boat"],
        ["mangrove_chest_boat", "items/mangrove_chest_boat"],
        ["cherry_chest_boat", "items/cherry_chest_boat"],
        ["bamboo_chest_raft", "items/bamboo_chest_raft"],

        // Add more mappings for other items/blocks
    ]);

    // Update the fourth value (texture) in the itemArray
    for (let i = 0; i < itemArray.length; i += 4) {
        const type: string | number = itemArray[i + 3];
        const texture: string = textures.get(type.toString()) || "ui/slots_bg";
        itemArray[i + 3] = texture;
    }

    // Output the updated itemArray
    console.log(itemArray);

    //once the loop is done then move to the next part

    const playerInventory = new ActionFormData();
    playerInventory.title("§4" + member.nameTag + " Inventory" + "§4");
    playerInventory.button(itemArray[1] + " Amount: " + itemArray[2], "textures/" + itemArray[3]);
    playerInventory.button(itemArray[5] + " Amount: " + itemArray[6], "textures/" + itemArray[7]);
    playerInventory.button(itemArray[9] + " Amount: " + itemArray[10], "textures/" + itemArray[11]);
    playerInventory.button(itemArray[13] + " Amount: " + itemArray[14], "textures/" + itemArray[15]);
    playerInventory.show(player).then((playerInventoryResult) => {
        if (playerInventoryResult.selection === 4) {
            return paradoxui(player);
        }
        return paradoxui(player);
    });
}

import { CustomForm, ObservableNumber, ObservableString, ObservableBoolean, DataDrivenScreenClosedReason } from "@minecraft/server-ui";
import { Container, EnchantmentTypes, ItemStack, Player } from "@minecraft/server";
import { PlayerCache } from "../../classes/cache/player-cache";

interface DDUIState {
    selectedPlayer: ObservableNumber;
    inventoryText: ObservableString;
    selectedSlot: ObservableString;
    newName: ObservableString;
    newLore: ObservableString;
    selectedOption: ObservableNumber;
    enchantmentIndex: ObservableNumber;
    enchantmentLevel: ObservableString;
    transferTargetPlayer: ObservableNumber;
    newItemAmount: ObservableString;
    targetSwapSlot: ObservableString;
    isEditNameLore: ObservableBoolean;
    isEditEnchantments: ObservableBoolean;
    isRepairItem: ObservableBoolean;
    isTransferItem: ObservableBoolean;
    isEditAmount: ObservableBoolean;
    isSwapSlot: ObservableBoolean;
}

/**
 * Initializes and binds all DDUI reactive state observables.
 *
 * @returns {DDUIState} Bundle of initialized DDUI state observables.
 */
function createDDUIState(): DDUIState {
    return {
        selectedPlayer: new ObservableNumber(0, { clientWritable: true }),
        inventoryText: new ObservableString("", { clientWritable: true }),
        selectedSlot: new ObservableString("", { clientWritable: true }),
        newName: new ObservableString("", { clientWritable: true }),
        newLore: new ObservableString("", { clientWritable: true }),
        selectedOption: new ObservableNumber(0, { clientWritable: true }),
        enchantmentIndex: new ObservableNumber(0, { clientWritable: true }),
        enchantmentLevel: new ObservableString("0", { clientWritable: true }),
        transferTargetPlayer: new ObservableNumber(0, { clientWritable: true }),
        newItemAmount: new ObservableString("1", { clientWritable: true }),
        targetSwapSlot: new ObservableString("", { clientWritable: true }),
        isEditNameLore: new ObservableBoolean(false),
        isEditEnchantments: new ObservableBoolean(false),
        isRepairItem: new ObservableBoolean(false),
        isTransferItem: new ObservableBoolean(false),
        isEditAmount: new ObservableBoolean(false),
        isSwapSlot: new ObservableBoolean(false),
    };
}

/**
 * Rebuilds full list view text representation of selected player's inventory.
 *
 * @param {number} index - Index of selected player in playerNames array.
 * @param {string[]} playerNames - List of active player names.
 * @param {ObservableString} inventoryText - Observable text element for inventory display.
 */
function updateInventoryText(index: number, playerNames: string[], inventoryText: ObservableString): void {
    const selectedName = playerNames[index];
    if (!selectedName) {
        inventoryText.setData("No player selected");
        return;
    }

    const playerObject = PlayerCache.getPlayerByName(selectedName);
    const container = playerObject?.getComponent("minecraft:inventory")?.container;

    if (!container) {
        inventoryText.setData("No inventory found");
        return;
    }

    const lines: string[] = [];
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;
        lines.push(`Slot ${i}: ${item.typeId.replace("minecraft:", "")} x${item.amount}`);
    }

    inventoryText.setData(lines.length > 0 ? lines.join("\n") : "Inventory is empty.");
}

/**
 * Formats item durability details into a readable string.
 *
 * @param {ItemStack} item - Target item.
 * @returns {string | null} Formatted durability string, or null if unequipped.
 */
function getDurabilityDetail(item: ItemStack): string | null {
    try {
        const durability = item.getComponent("minecraft:durability");
        if (durability) {
            return `Durability: ${durability.maxDurability - durability.damage}/${durability.maxDurability}`;
        }
    } catch {}
    return null;
}

/**
 * Formats item enchantment list details into readable display lines.
 *
 * @param {ItemStack} item - Target item.
 * @returns {string[]} Formatted enchantment lines.
 */
function getEnchantmentDetails(item: ItemStack): string[] {
    const lines: string[] = [];
    try {
        const enchComp = item.getComponent("minecraft:enchantable");
        if (enchComp) {
            const enchants = enchComp.getEnchantments();
            if (enchants.length > 0) {
                lines.push("Enchantments:");
                enchants.forEach((ench) => lines.push(` - ${ench.type.id.replace("minecraft:", "")} ${ench.level}`));
            } else {
                lines.push("Enchantments: None");
            }
        }
    } catch {}
    return lines;
}

/**
 * Formats item lore array into readable display lines.
 *
 * @param {ItemStack} item - Target item.
 * @returns {string[]} Formatted lore lines.
 */
function getLoreDetails(item: ItemStack): string[] {
    const lore = item.getLore?.() ?? [];
    if (lore.length === 0) return [];

    const lines = ["Lore:"];
    lore.forEach((l) => lines.push(` - ${l}`));
    return lines;
}

/**
 * Extracts and formats all summary metadata for a target item.
 *
 * @param {ItemStack} item - Target item stack.
 * @param {number} slot - Target slot index.
 * @returns {string} Formatted multiline item summary.
 */
function getItemDetails(item: ItemStack, slot: number): string {
    const lines: string[] = [`Slot: ${slot}`, `Item: ${item.typeId.replace("minecraft:", "")}`, `Amount: ${item.amount}`];

    const durability = getDurabilityDetail(item);
    if (durability) lines.push(durability);

    lines.push(...getEnchantmentDetails(item));

    if (item.nameTag) lines.push(`Name: ${item.nameTag}`);

    lines.push(...getLoreDetails(item));

    return lines.join("\n");
}

/**
 * Reads slot state, generates detailed item breakdown string, and updates default field values.
 *
 * @param {string} slotRaw - Raw slot index input string.
 * @param {string[]} playerNames - List of active player names.
 * @param {DDUIState} state - Reactive UI state object.
 */
function updateItemFields(slotRaw: string, playerNames: string[], state: DDUIState): void {
    const slot = parseInt(slotRaw);
    if (isNaN(slot)) return;

    const playerIndex = state.selectedPlayer.getData();
    const selectedName = playerNames[playerIndex];
    if (!selectedName) return;

    const playerObject = PlayerCache.getPlayerByName(selectedName);
    const container = playerObject?.getComponent("minecraft:inventory")?.container;

    if (!container || slot < 0 || slot >= container.size) return;

    const item = container.getItem(slot);

    if (!item) {
        state.newName.setData("");
        state.newLore.setData("");
        state.newItemAmount.setData("1");
    } else {
        state.newName.setData(item.nameTag ?? "");
        const lore = item.getLore?.() ?? [];
        state.newLore.setData(lore.join("\n"));
        state.newItemAmount.setData(item.amount.toString());
    }

    if (state.selectedOption.getData() === 0) return;

    if (!item) {
        state.inventoryText.setData(`Slot ${slot}: Empty`);
        return;
    }

    state.inventoryText.setData(getItemDetails(item, slot));
}

/**
 * Applies new custom name tag and lore strings to chosen item stack.
 *
 * @param {Container} container - Target container instance.
 * @param {ItemStack} item - Target item stack.
 * @param {number} slot - Slot index.
 * @param {DDUIState} state - Active DDUI state.
 */
function applyNameLore(container: Container, item: ItemStack, slot: number, state: DDUIState): void {
    const nameInput = state.newName.getData().trim();
    item.nameTag = nameInput;

    const loreInput = state.newLore.getData().trim();
    item.setLore?.(loreInput.length > 0 ? loreInput.split("\n") : []);

    container.setItem(slot, item);
}

/**
 * Resets item durability damage to 0.
 *
 * @param {Container} container - Target container instance.
 * @param {ItemStack} item - Target item stack.
 * @param {number} slot - Slot index.
 */
function repairItem(container: Container, item: ItemStack, slot: number): void {
    try {
        const durability = item.getComponent("minecraft:durability");
        if (durability) {
            durability.damage = 0;
            container.setItem(slot, item);
        }
    } catch {}
}

/**
 * Adds or updates enchantment entries on target item.
 *
 * @param {Container} container - Target container instance.
 * @param {ItemStack} item - Target item stack.
 * @param {number} slot - Slot index.
 * @param {DDUIState} state - Active DDUI state.
 */
function applyEnchant(container: Container, item: ItemStack, slot: number, state: DDUIState): void {
    const enchantComp = item.getComponent("minecraft:enchantable");
    if (!enchantComp) return;

    const level = parseInt(state.enchantmentLevel.getData());
    if (isNaN(level)) return;

    const enchantList = EnchantmentTypes.getAll();
    const selectedEnchantment = enchantList[state.enchantmentIndex.getData()];
    if (!selectedEnchantment) return;

    enchantComp.removeEnchantment(selectedEnchantment);

    if (level > 0) {
        const enchantment = { type: selectedEnchantment, level };
        if (enchantComp.canAddEnchantment(enchantment)) {
            enchantComp.addEnchantment(enchantment);
        }
    }

    container.setItem(slot, item);
}

/**
 * Moves target item from source container into first open slot of target container.
 *
 * @param {Container} sourceContainer - Source container instance.
 * @param {ItemStack} item - Item stack being moved.
 * @param {number} sourceSlot - Source slot index.
 * @param {string[]} playerNames - Player names list.
 * @param {DDUIState} state - Active DDUI state.
 */
function transferItem(sourceContainer: Container, item: ItemStack, sourceSlot: number, playerNames: string[], state: DDUIState): void {
    const targetIndex = state.transferTargetPlayer.getData();
    const targetName = playerNames[targetIndex];
    if (!targetName) return;

    const targetPlayerObject = PlayerCache.getPlayerByName(targetName);
    const targetContainer = targetPlayerObject?.getComponent("minecraft:inventory")?.container;
    if (!targetContainer) return;

    sourceContainer.setItem(sourceSlot, undefined);

    for (let i = 0; i < targetContainer.size; i++) {
        if (!targetContainer.getItem(i)) {
            targetContainer.setItem(i, item);
            return;
        }
    }

    sourceContainer.setItem(sourceSlot, item);
}

/**
 * Updates item stack quantity clamped between 1 and max stack size.
 *
 * @param {Container} container - Target container instance.
 * @param {ItemStack} item - Target item stack.
 * @param {number} slot - Slot index.
 * @param {DDUIState} state - Active DDUI state.
 */
function applyAmount(container: Container, item: ItemStack, slot: number, state: DDUIState): void {
    const amount = parseInt(state.newItemAmount.getData());
    if (isNaN(amount) || amount <= 0) return;

    item.amount = Math.min(amount, item.maxAmount);
    container.setItem(slot, item);
}

/**
 * Swaps two slot items within the same container.
 *
 * @param {Container} container - Target container instance.
 * @param {number} sourceSlot - Source slot index.
 * @param {DDUIState} state - Active DDUI state.
 */
function swapSlots(container: Container, sourceSlot: number, state: DDUIState): void {
    const targetSlot = parseInt(state.targetSwapSlot.getData());
    if (isNaN(targetSlot) || targetSlot < 0 || targetSlot >= container.size || sourceSlot === targetSlot) return;

    const sourceItem = container.getItem(sourceSlot);
    const targetItem = container.getItem(targetSlot);

    container.setItem(sourceSlot, targetItem);
    container.setItem(targetSlot, sourceItem);
}

/**
 * Dispatches modification action execution depending on selected action mode option.
 *
 * @param {Container} container - Target inventory container.
 * @param {number} slot - Selected slot index.
 * @param {number} option - Selected action mode option index.
 * @param {string[]} playerNames - Active player names.
 * @param {DDUIState} state - Active DDUI state object.
 */
function handleActionExecute(container: Container, slot: number, option: number, playerNames: string[], state: DDUIState): void {
    const item = container.getItem(slot);

    if (!item && option >= 1 && option <= 5) return;

    switch (option) {
        case 1:
            if (item) applyNameLore(container, item, slot, state);
            break;
        case 2:
            if (item) applyEnchant(container, item, slot, state);
            break;
        case 3:
            if (item) repairItem(container, item, slot);
            break;
        case 4:
            if (item) transferItem(container, item, slot, playerNames, state);
            break;
        case 5:
            if (item) applyAmount(container, item, slot, state);
            break;
        case 6:
            swapSlots(container, slot, state);
            break;
        default:
            break;
    }
}

/**
 * Handles button click logic for applying inventory changes.
 *
 * @param {Player} player - Form executor player.
 * @param {string[]} playerNames - Active player names list.
 * @param {DDUIState} state - Active DDUI state object.
 */
function applyChanges(player: Player, playerNames: string[], state: DDUIState): void {
    if (!player?.isValid) return;

    const playerIndex = state.selectedPlayer.getData();
    const selectedName = playerNames[playerIndex];
    if (!selectedName) return;

    const playerObject = PlayerCache.getPlayerByName(selectedName);
    const container = playerObject?.getComponent("minecraft:inventory")?.container;
    if (!container) return;

    const slot = parseInt(state.selectedSlot.getData());
    if (isNaN(slot) || slot < 0 || slot >= container.size) return;

    const option = state.selectedOption.getData();
    handleActionExecute(container, slot, option, playerNames, state);

    if (option === 0) {
        updateInventoryText(state.selectedPlayer.getData(), playerNames, state.inventoryText);
    } else {
        updateItemFields(state.selectedSlot.getData(), playerNames, state);
    }
}

/**
 * Subscribes visibility and data listeners to reactive state updates.
 *
 * @param {DDUIState} state - Active DDUI state object.
 * @param {string[]} playerNames - Active player names list.
 */
function setupSubscriptions(state: DDUIState, playerNames: string[]): void {
    state.selectedPlayer.subscribe((newIndex) => {
        updateInventoryText(newIndex, playerNames, state.inventoryText);
    });

    state.selectedSlot.subscribe((value) => {
        updateItemFields(value, playerNames, state);
    });

    state.selectedOption.subscribe((value) => {
        state.isEditNameLore.setData(value === 1);
        state.isEditEnchantments.setData(value === 2);
        state.isRepairItem.setData(value === 3);
        state.isTransferItem.setData(value === 4);
        state.isEditAmount.setData(value === 5);
        state.isSwapSlot.setData(value === 6);

        if (value === 0) {
            updateInventoryText(state.selectedPlayer.getData(), playerNames, state.inventoryText);
        } else {
            updateItemFields(state.selectedSlot.getData(), playerNames, state);
        }
    });
}

/**
 * Custom DDUI inventory viewer and editor for Penrose.
 *
 * Designed to allow admins to inspect player inventories, edit names/lore,
 * modify enchantments, repair durability, transfer items between players,
 * change stack quantities, or swap slot contents.
 *
 * @param {Player} player - The command executor player.
 */
export function showInventoryEditor(player: Player): void {
    if (!player?.isValid) return;

    const state = createDDUIState();
    const playerNames = [...PlayerCache.getPlayerNames()];

    if (playerNames.length === 0) {
        state.inventoryText.setData("No players online.");
        return;
    }

    const enchantList = EnchantmentTypes.getAll();
    const enchantOptions = enchantList.map((ench, index) => ({
        label: ench.id.replace("minecraft:", ""),
        value: index,
    }));

    setupSubscriptions(state, playerNames);
    updateInventoryText(state.selectedPlayer.getData(), playerNames, state.inventoryText);

    const playerDropdownOptions = playerNames.map((name, index) => ({
        label: name,
        value: index,
    }));

    new CustomForm(player, "Inventory Editor")
        .spacer()
        .label("Inventory Editor")
        .spacer()
        .dropdown("Select a player", state.selectedPlayer, playerDropdownOptions)
        .spacer()
        .label(state.inventoryText)
        .spacer()
        .dropdown("select an action", state.selectedOption, [
            { label: "View Inventory", value: 0 },
            { label: "Edit Item Name and Lore", value: 1 },
            { label: "Edit Item Enchantments", value: 2 },
            { label: "Repair Item", value: 3 },
            { label: "Transfer Item to Another Player", value: 4 },
            { label: "Edit Stack Amount", value: 5 },
            { label: "Swap Slots", value: 6 },
        ])
        .divider()
        .textField("Enter slot number ", state.selectedSlot)
        .textField("New name data", state.newName, { visible: state.isEditNameLore })
        .textField("New lore data", state.newLore, { visible: state.isEditNameLore })
        .dropdown("Select enchantment", state.enchantmentIndex, enchantOptions, { visible: state.isEditEnchantments })
        .textField("Enchantment Level", state.enchantmentLevel, { visible: state.isEditEnchantments })
        .dropdown("Select target player for transfer", state.transferTargetPlayer, playerDropdownOptions, { visible: state.isTransferItem })
        .textField("New stack amount", state.newItemAmount, { visible: state.isEditAmount })
        .textField("Target slot to swap with", state.targetSwapSlot, { visible: state.isSwapSlot })
        .button("Apply Changes", () => {
            applyChanges(player, playerNames, state);
        })
        .closeButton()
        .show()
        .then((showResult) => {
            if (showResult === DataDrivenScreenClosedReason.UserBusy) {
                if (player?.isValid) {
                    showInventoryEditor(player);
                }
            }
        })
        .catch((e) => {
            const errorString = String(e);
            if (!errorString.includes("Player quit") && !errorString.includes("UserBusy")) {
                console.error("Inventory Editor Form Error:", e);
            }
        });
}

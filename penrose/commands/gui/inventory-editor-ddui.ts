import { CustomForm, ObservableNumber, ObservableString, ObservableBoolean, DataDrivenScreenClosedReason } from "@minecraft/server-ui";
import { Container, EnchantmentType, EnchantmentTypes, ItemStack, Player } from "@minecraft/server";
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

interface DropdownOption {
    label: string;
    value: number;
}

// Module-scoped persistent caches (lazily initialized to prevent early execution errors)
let enchantmentListCache: readonly EnchantmentType[] | null = null;
let enchantmentOptionsCache: DropdownOption[] | null = null;

const ACTION_OPTIONS: readonly DropdownOption[] = [
    { label: "View Inventory", value: 0 },
    { label: "Edit Item Name and Lore", value: 1 },
    { label: "Edit Item Enchantments", value: 2 },
    { label: "Repair Item", value: 3 },
    { label: "Transfer Item to Another Player", value: 4 },
    { label: "Edit Stack Amount", value: 5 },
    { label: "Swap Slots", value: 6 },
];

/**
 * Initializes static enchantment arrays lazily to prevent early execution native call errors.
 */
function ensureEnchantmentCache(): void {
    if (enchantmentListCache !== null && enchantmentOptionsCache !== null) return;

    const list = EnchantmentTypes.getAll();
    const len = list.length;
    const options: DropdownOption[] = new Array(len);

    for (let i = 0; i < len; i++) {
        const enchantment = list[i];
        if (!enchantment) continue;

        options[i] = {
            label: enchantment.id.replace("minecraft:", ""),
            value: i,
        };
    }

    enchantmentListCache = list;
    enchantmentOptionsCache = options;
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
 * @param {readonly string[]} playerNames - List of active player names.
 * @param {ObservableString} inventoryText - Observable text element for inventory display.
 */
function updateInventoryText(index: number, playerNames: readonly string[], inventoryText: ObservableString): void {
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

    let resultString = "";
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;
        if (resultString.length > 0) resultString += "\n";
        resultString += `Slot ${i}: ${item.typeId.replace("minecraft:", "")} x${item.amount}`;
    }

    inventoryText.setData(resultString.length > 0 ? resultString : "Inventory is empty.");
}

/**
 * Appends item durability details to target string buffer.
 *
 * @param {ItemStack} item - Target item.
 * @param {string} buffer - Current text buffer.
 * @returns {string} Updated string buffer.
 */
function appendDurabilityDetail(item: ItemStack, buffer: string): string {
    try {
        const durability = item.getComponent("minecraft:durability");
        if (durability) {
            return `${buffer}\nDurability: ${durability.maxDurability - durability.damage}/${durability.maxDurability}`;
        }
    } catch {}
    return buffer;
}

/**
 * Appends item enchantment details to target string buffer using indexed loop.
 *
 * @param {ItemStack} item - Target item.
 * @param {string} buffer - Current text buffer.
 * @returns {string} Updated string buffer.
 */
function appendEnchantmentDetails(item: ItemStack, buffer: string): string {
    try {
        const enchComp = item.getComponent("minecraft:enchantable");
        if (enchComp) {
            const enchants = enchComp.getEnchantments();
            const len = enchants.length;
            if (len > 0) {
                buffer += "\nEnchantments:";
                for (let i = 0; i < len; i++) {
                    const enchant = enchants[i];
                    const typeId = enchant?.type?.id ?? "unknown";
                    const level = enchant?.level ?? 0;
                    buffer += `\n - ${typeId.replace("minecraft:", "")} ${level}`;
                }
            } else {
                buffer += "\nEnchantments: None";
            }
        }
    } catch {}
    return buffer;
}

/**
 * Appends item lore details to target string buffer using indexed loop.
 *
 * @param {ItemStack} item - Target item.
 * @param {string} buffer - Current text buffer.
 * @returns {string} Updated string buffer.
 */
function appendLoreDetails(item: ItemStack, buffer: string): string {
    const lore = item.getLore?.();
    if (!lore || lore.length === 0) return buffer;

    buffer += "\nLore:";
    for (let i = 0; i < lore.length; i++) {
        buffer += `\n - ${lore[i]}`;
    }
    return buffer;
}

/**
 * Extracts and formats all summary metadata for a target item without intermediate array allocations.
 *
 * @param {ItemStack} item - Target item stack.
 * @param {number} slot - Target slot index.
 * @returns {string} Formatted multiline item summary.
 */
function getItemDetails(item: ItemStack, slot: number): string {
    let details = `Slot: ${slot}\nItem: ${item.typeId.replace("minecraft:", "")}\nAmount: ${item.amount}`;
    details = appendDurabilityDetail(item, details);
    details = appendEnchantmentDetails(item, details);
    if (item.nameTag) details += `\nName: ${item.nameTag}`;
    return appendLoreDetails(item, details);
}

/**
 * Reads slot state, generates detailed item breakdown string, and updates default field values.
 *
 * @param {string} slotRaw - Raw slot index input string.
 * @param {readonly string[]} playerNames - List of active player names.
 * @param {DDUIState} state - Reactive UI state object.
 */
function updateItemFields(slotRaw: string, playerNames: readonly string[], state: DDUIState): void {
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
        const lore = item.getLore?.();
        state.newLore.setData(lore ? lore.join("\n") : "");
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
 * Safely adds or updates enchantment entries on target item with max-level clamping.
 *
 * @param {Container} container - Target container instance.
 * @param {ItemStack} item - Target item stack.
 * @param {number} slot - Slot index.
 * @param {DDUIState} state - Active DDUI state.
 */
function applyEnchant(container: Container, item: ItemStack, slot: number, state: DDUIState): void {
    const enchantComp = item.getComponent("minecraft:enchantable");
    if (!enchantComp) return;

    const inputLevel = parseInt(state.enchantmentLevel.getData());
    if (isNaN(inputLevel)) return;

    ensureEnchantmentCache();
    const selectedEnchantment = enchantmentListCache![state.enchantmentIndex.getData()];
    if (!selectedEnchantment) return;

    enchantComp.removeEnchantment(selectedEnchantment);

    if (inputLevel > 0) {
        // Clamp requested level strictly to max level defined by game API
        const clampedLevel = Math.min(inputLevel, selectedEnchantment.maxLevel);
        const enchantment = { type: selectedEnchantment, level: clampedLevel };

        try {
            if (enchantComp.canAddEnchantment(enchantment)) {
                enchantComp.addEnchantment(enchantment);
            }
        } catch {}
    }

    container.setItem(slot, item);
}

/**
 * Moves target item from source container into first open slot of target container.
 *
 * @param {Container} sourceContainer - Source container instance.
 * @param {ItemStack} item - Item stack being moved.
 * @param {number} sourceSlot - Source slot index.
 * @param {readonly string[]} playerNames - Player names list.
 * @param {DDUIState} state - Active DDUI state.
 */
function transferItem(sourceContainer: Container, item: ItemStack, sourceSlot: number, playerNames: readonly string[], state: DDUIState): void {
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
 * @param {readonly string[]} playerNames - Active player names.
 * @param {DDUIState} state - Active DDUI state object.
 */
function handleActionExecute(container: Container, slot: number, option: number, playerNames: readonly string[], state: DDUIState): void {
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
    }
}

/**
 * Handles button click logic for applying inventory changes.
 *
 * @param {Player} player - Form executor player.
 * @param {readonly string[]} playerNames - Active player names list.
 * @param {DDUIState} state - Active DDUI state object.
 */
function applyChanges(player: Player, playerNames: readonly string[], state: DDUIState): void {
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
 * @param {readonly string[]} playerNames - Active player names list.
 */
function setupSubscriptions(state: DDUIState, playerNames: readonly string[]): void {
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

    ensureEnchantmentCache();

    const state = createDDUIState();
    const playerNames = PlayerCache.getPlayerNamesArray();

    if (playerNames.length === 0) {
        state.inventoryText.setData("No players online.");
        return;
    }

    setupSubscriptions(state, playerNames);
    updateInventoryText(state.selectedPlayer.getData(), playerNames, state.inventoryText);

    const playerDropdownOptions: DropdownOption[] = new Array(playerNames.length);
    for (let i = 0; i < playerNames.length; i++) {
        const playerName = playerNames[i];
        if (!playerName) continue;
        playerDropdownOptions[i] = { label: playerName, value: i };
    }

    new CustomForm(player, "Inventory Editor")
        .spacer()
        .label("Inventory Editor")
        .spacer()
        .dropdown("Select a player", state.selectedPlayer, playerDropdownOptions)
        .spacer()
        .label(state.inventoryText)
        .spacer()
        .dropdown("select an action", state.selectedOption, ACTION_OPTIONS as DropdownOption[])
        .divider()
        .textField("Enter slot number ", state.selectedSlot)
        .textField("New name data", state.newName, { visible: state.isEditNameLore })
        .textField("New lore data", state.newLore, { visible: state.isEditNameLore })
        .dropdown("Select enchantment", state.enchantmentIndex, enchantmentOptionsCache!, { visible: state.isEditEnchantments })
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

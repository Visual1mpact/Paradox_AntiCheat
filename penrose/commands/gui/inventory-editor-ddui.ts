import { CustomForm, ObservableNumber, ObservableString, ObservableBoolean, DataDrivenScreenClosedReason } from "@minecraft/server-ui";
import { Container, EnchantmentTypes, ItemStack, Player } from "@minecraft/server";
import { PlayerCache } from "../../classes/cache/player-cache";

/**
 * Custom DDUI inventory viewer and editor for Penrose
 *
 * Designed to allow admins to inspect player inventories, edit names/lore,
 * modify enchantments, repair durability, transfer items between players,
 * change stack quantities, or swap slot contents.
 */
export function showInventoryEditor(player: Player) {
    // Check if the executing player is online and valid before rendering
    if (!player?.isValid) return;

    // DDUI reactive state bindings
    const selectedPlayer = new ObservableNumber(0, { clientWritable: true });
    const inventoryText = new ObservableString("", { clientWritable: true });
    const selectedSlot = new ObservableString("", { clientWritable: true });
    const newName = new ObservableString("", { clientWritable: true });
    const newLore = new ObservableString("", { clientWritable: true });
    const selectedOption = new ObservableNumber(0, { clientWritable: true });
    const enchantmentIndex = new ObservableNumber(0, { clientWritable: true });
    const enchantmentLevel = new ObservableString("0", { clientWritable: true });
    const transferTargetPlayer = new ObservableNumber(0, { clientWritable: true });
    const newItemAmount = new ObservableString("1", { clientWritable: true });
    const targetSwapSlot = new ObservableString("", { clientWritable: true });

    // Conditional visibility control observables
    const isEditNameLore = new ObservableBoolean(false);
    const isEditEnchantments = new ObservableBoolean(false);
    const isRepairItem = new ObservableBoolean(false);
    const isTransferItem = new ObservableBoolean(false);
    const isEditAmount = new ObservableBoolean(false);
    const isSwapSlot = new ObservableBoolean(false);

    // Fetch snapshot of available player names from cache
    const playerNames = [...PlayerCache.getPlayerNames()];
    if (playerNames.length === 0) {
        inventoryText.setData("No players online.");
        return;
    }

    // Prepare enchantment list dropdown entries
    const enchantList = EnchantmentTypes.getAll();
    const enchantOptions = enchantList.map((ench, index) => ({
        label: ench.id.replace("minecraft:", ""),
        value: index,
    }));

    // Auto-update inventory view when selected player index changes
    selectedPlayer.subscribe((newIndex) => {
        updateInventory(newIndex);
    });

    // Auto-update item detail summary when user types or updates target slot
    selectedSlot.subscribe((value) => {
        updateItemFields(value);
    });

    // Dynamic UI visibility toggle based on dropdown selection
    selectedOption.subscribe((value) => {
        // Toggle feature visibility flags depending on the chosen action mode
        isEditNameLore.setData(value === 1);
        isEditEnchantments.setData(value === 2);
        isRepairItem.setData(value === 3);
        isTransferItem.setData(value === 4);
        isEditAmount.setData(value === 5);
        isSwapSlot.setData(value === 6);

        if (value === 0) {
            updateInventory(selectedPlayer.getData());
        } else {
            updateItemFields(selectedSlot.getData());
        }
    });

    // Initial load population
    updateInventory(selectedPlayer.getData());

    // Main DDUI Form Definition
    new CustomForm(player, "Inventory Editor")
        .spacer()
        .label("Inventory Editor")
        .spacer()

        // Dropdown to pick target online player
        .dropdown(
            "Select a player",
            selectedPlayer,
            playerNames.map((name, index) => ({
                label: name,
                value: index,
            }))
        )

        .spacer()
        .label(inventoryText)
        .spacer()

        // Main action selector dropdown
        .dropdown("select an action", selectedOption, [
            { label: "View Inventory", value: 0 },
            { label: "Edit Item Name and Lore", value: 1 },
            { label: "Edit Item Enchantments", value: 2 },
            { label: "Repair Item", value: 3 },
            { label: "Transfer Item to Another Player", value: 4 },
            { label: "Edit Stack Amount", value: 5 },
            { label: "Swap Slots", value: 6 },
        ])

        .divider()

        // Slot selection input
        .textField("Enter slot number ", selectedSlot)

        // Sub-menu control fields dynamically displayed based on active option
        .textField("New name data", newName, { visible: isEditNameLore })
        .textField("New lore data", newLore, { visible: isEditNameLore })

        .dropdown("Select enchantment", enchantmentIndex, enchantOptions, { visible: isEditEnchantments })
        .textField("Enchantment Level", enchantmentLevel, { visible: isEditEnchantments })

        .dropdown(
            "Select target player for transfer",
            transferTargetPlayer,
            playerNames.map((name, index) => ({
                label: name,
                value: index,
            })),
            { visible: isTransferItem }
        )

        .textField("New stack amount", newItemAmount, { visible: isEditAmount })
        .textField("Target slot to swap with", targetSwapSlot, { visible: isSwapSlot })

        // Submit action handler button
        .button("Apply Changes", () => {
            if (!player?.isValid) return;

            const playerIndex = selectedPlayer.getData();
            const selectedName = playerNames[playerIndex];

            if (!selectedName) return;

            const playerObject = PlayerCache.getPlayerByName(selectedName);
            const container = playerObject?.getComponent("minecraft:inventory")?.container;

            if (!container) return;

            const slot = parseInt(selectedSlot.getData());
            if (isNaN(slot) || slot < 0 || slot >= container.size) return;

            const item = container.getItem(slot);
            const option = selectedOption.getData();

            // Options 1-5 require an item in the primary slot
            if (!item && option >= 1 && option <= 5) return;

            switch (option) {
                case 1:
                    if (item) applyNameLore(container, item, slot);
                    break;

                case 2:
                    if (item) applyEnchant(container, item, slot);
                    break;

                case 3:
                    if (item) repairItem(container, item, slot);
                    break;

                case 4: {
                    if (!item) break;
                    const targetIndex = transferTargetPlayer.getData();
                    const targetName = playerNames[targetIndex];
                    if (!targetName) break;

                    const targetPlayerObject = PlayerCache.getPlayerByName(targetName);
                    const targetContainer = targetPlayerObject?.getComponent("minecraft:inventory")?.container;

                    if (!targetContainer) break;

                    transferItem(container, targetContainer, item, slot);
                    break;
                }

                case 5:
                    if (item) applyAmount(container, item, slot);
                    break;

                case 6:
                    swapSlots(container, slot);
                    break;

                default:
                    break;
            }

            // Refresh UI text display post mutation
            if (selectedOption.getData() === 0) {
                updateInventory(selectedPlayer.getData());
            } else {
                updateItemFields(selectedSlot.getData());
            }
        })

        .closeButton()
        .show()
        .then((showResult) => {
            // Re-open UI if form failed to open due to UserBusy state
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

    /**
     * Rebuilds full list view text representation of selected player's inventory
     */
    function updateInventory(index: number) {
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
     * Reads slot state and generates detailed item breakdown string + updates default field values
     */
    function updateItemFields(slotRaw: string) {
        const slot = parseInt(slotRaw);
        if (isNaN(slot)) return;

        const playerIndex = selectedPlayer.getData();
        const selectedName = playerNames[playerIndex];
        if (!selectedName) return;

        const playerObject = PlayerCache.getPlayerByName(selectedName);
        const container = playerObject?.getComponent("minecraft:inventory")?.container;

        if (!container || slot < 0 || slot >= container.size) return;

        const item = container.getItem(slot);

        // Keep target text input fields synced with focused item
        if (!item) {
            newName.setData("");
            newLore.setData("");
            newItemAmount.setData("1");
        } else {
            newName.setData(item.nameTag ?? "");
            const lore = item.getLore?.() ?? [];
            newLore.setData(lore.join("\n"));
            newItemAmount.setData(item.amount.toString());
        }

        // Avoid overwriting overall inventory overview if currently viewing Option 0
        if (selectedOption.getData() === 0) {
            return;
        }

        if (!item) {
            inventoryText.setData(`Slot ${slot}: Empty`);
            return;
        }

        const lines: string[] = [`Slot: ${slot}`, `Item: ${item.typeId.replace("minecraft:", "")}`, `Amount: ${item.amount}`];

        // Parse durability details
        try {
            const durability = item.getComponent("minecraft:durability");
            if (durability) {
                const max = durability.maxDurability;
                const damage = durability.damage;
                lines.push(`Durability: ${max - damage}/${max}`);
            }
        } catch {}

        // Parse enchantment list details
        try {
            const enchComp = item.getComponent("minecraft:enchantable");
            if (enchComp) {
                const enchants = enchComp.getEnchantments();

                if (enchants.length > 0) {
                    lines.push("Enchantments:");
                    for (const ench of enchants) {
                        lines.push(` - ${ench.type.id.replace("minecraft:", "")} ${ench.level}`);
                    }
                } else {
                    lines.push("Enchantments: None");
                }
            }
        } catch {}

        // Custom name tag details
        if (item.nameTag) {
            lines.push(`Name: ${item.nameTag}`);
        }

        // Item lore array
        const lore = item.getLore?.() ?? [];
        if (lore.length > 0) {
            lines.push("Lore:");
            for (const l of lore) {
                lines.push(` - ${l}`);
            }
        }

        inventoryText.setData(lines.join("\n"));
    }

    /**
     * Applies new custom name tag and lore strings to chosen item stack
     */
    function applyNameLore(container: Container, item: ItemStack, slot: number) {
        const nameInput = newName.getData().trim();
        item.nameTag = nameInput;

        const loreInput = newLore.getData().trim();
        item.setLore?.(loreInput.length > 0 ? loreInput.split("\n") : []);

        container.setItem(slot, item);
    }

    /**
     * Resets item durability damage to 0
     */
    function repairItem(container: Container, item: ItemStack, slot: number) {
        try {
            const durability = item.getComponent("minecraft:durability");
            if (durability) {
                durability.damage = 0;
                container.setItem(slot, item);
            }
        } catch {}
    }

    /**
     * Adds or updates enchantment entries on target item
     */
    function applyEnchant(container: Container, item: ItemStack, slot: number) {
        const enchantComp = item.getComponent("minecraft:enchantable");
        if (!enchantComp) return;

        const level = parseInt(enchantmentLevel.getData());
        if (isNaN(level)) return;

        const selectedEnchantment = enchantList[enchantmentIndex.getData()];
        if (!selectedEnchantment) return;

        // Clear existing enchantment instance first to prevent Bedrock component conflicts
        enchantComp.removeEnchantment(selectedEnchantment);

        if (level > 0) {
            const enchantment = {
                type: selectedEnchantment,
                level: level,
            };

            if (enchantComp.canAddEnchantment(enchantment)) {
                enchantComp.addEnchantment(enchantment);
            }
        }

        container.setItem(slot, item);
    }

    /**
     * Moves target item from source container into first open slot of target container
     */
    function transferItem(sourceContainer: Container, targetContainer: Container, item: ItemStack, sourceSlot: number) {
        if (!targetContainer) return;

        sourceContainer.setItem(sourceSlot, undefined);

        for (let i = 0; i < targetContainer.size; i++) {
            if (!targetContainer.getItem(i)) {
                targetContainer.setItem(i, item);
                return;
            }
        }

        // Revert back if target inventory was full
        sourceContainer.setItem(sourceSlot, item);
    }

    /**
     * Updates item stack quantity (clamped between 1 and item's max stack size)
     */
    function applyAmount(container: Container, item: ItemStack, slot: number) {
        const amount = parseInt(newItemAmount.getData());
        if (isNaN(amount) || amount <= 0) return;

        item.amount = Math.min(amount, item.maxAmount);
        container.setItem(slot, item);
    }

    /**
     * Swaps two slot items (or moves to an empty slot) within the same player container
     */
    function swapSlots(container: Container, sourceSlot: number) {
        const targetSlot = parseInt(targetSwapSlot.getData());
        if (isNaN(targetSlot) || targetSlot < 0 || targetSlot >= container.size || sourceSlot === targetSlot) return;

        const sourceItem = container.getItem(sourceSlot);
        const targetItem = container.getItem(targetSlot);

        container.setItem(sourceSlot, targetItem);
        container.setItem(targetSlot, sourceItem);
    }
}

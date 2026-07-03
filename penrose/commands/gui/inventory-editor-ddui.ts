import { CustomForm, ObservableNumber, ObservableString, ObservableBoolean, DataDrivenScreenClosedReason } from "@minecraft/server-ui";
import { Container, EnchantmentTypes, ItemStack, Player } from "@minecraft/server";
import { PlayerCache } from "penrose/classes/player-cache";

export function showInventoryEditor(player: Player) {
    const selectedPlayer = new ObservableNumber(0, { clientWritable: true });
    const inventoryText = new ObservableString("", { clientWritable: true });
    const selectedSlot = new ObservableString("", { clientWritable: true });
    const newName = new ObservableString("", { clientWritable: true });
    const newLore = new ObservableString("", { clientWritable: true });
    const selectedOption = new ObservableNumber(0, { clientWritable: true });
    const enchantmentIndex = new ObservableNumber(0, { clientWritable: true });
    const enchantmentLevel = new ObservableString("0", { clientWritable: true });
    const transferTargetPlayer = new ObservableNumber(0, { clientWritable: true });

    // Booleans for enabling or disabling certain fields based on the selected option
    const isEditNameLore = new ObservableBoolean(false);
    const isEditEnchantments = new ObservableBoolean(false);
    const isRepairItem = new ObservableBoolean(false);
    const isTransferItem = new ObservableBoolean(false);

    const playerNames = [...PlayerCache.getPlayerNames()];
    const enchantList = EnchantmentTypes.getAll();
    const enchantOptions = enchantList.map((ench, index) => ({
        label: ench.id.replace("minecraft:", ""),
        value: index,
    }));

    selectedPlayer.subscribe((newIndex) => {
        updateInventory(newIndex);
    });
    selectedSlot.subscribe((value) => {
        updateItemFields(value);
    });
    selectedOption.subscribe((value) => {
        switch (value) {
            case 0: // View Inventory
                isEditNameLore.setData(false);
                isEditEnchantments.setData(false);
                isRepairItem.setData(false);
                updateInventory(selectedPlayer.getData());
                break;
            case 1: // Edit Name and Lore
                isEditNameLore.setData(true);
                isEditEnchantments.setData(false);
                isRepairItem.setData(false);
                updateItemFields(selectedSlot.getData());

                break;
            case 2: // Edit Enchantments
                isEditNameLore.setData(false);
                isEditEnchantments.setData(true);
                isRepairItem.setData(false);
                updateItemFields(selectedSlot.getData());
                break;
            case 3: // Repair Item
                isEditNameLore.setData(false);
                isEditEnchantments.setData(false);
                isRepairItem.setData(true);
                updateItemFields(selectedSlot.getData());
                break;
            case 4: // Transfer Item
                isEditNameLore.setData(false);
                isEditEnchantments.setData(false);
                isRepairItem.setData(false);
                isTransferItem.setData(true);
                updateItemFields(selectedSlot.getData());
                break;
        }
    });

    updateInventory(selectedPlayer.getData());

    new CustomForm(player, "Inventory Editor")
        .spacer()
        .label("Inventory Editor")
        .spacer()
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
        .dropdown("select an action", selectedOption, [
            { label: "View Inventory", value: 0 },
            { label: "Edit Item Name and Lore", value: 1 },
            { label: "Edit Item Enchantments", value: 2 },
            { label: "Repair Item", value: 3 },
            { label: "Transfer Item to Another Player", value: 4 },
        ])
        .divider()
        .textField("Enter slot number ", selectedSlot)
        .textField("New name data", newName, { visible: isEditNameLore })
        .textField("New lore data", newLore, { visible: isEditNameLore })
        .dropdown("Select enchantment", enchantmentIndex, enchantOptions, { visible: isEditEnchantments })
        .textField("Enchantment Level", enchantmentLevel, { visible: isEditEnchantments })
        .dropdown(
            "Select target player for transfer",
            transferTargetPlayer,
            playerNames.map(
                (name, index) => ({
                    label: name,
                    value: index,
                }),
                { visible: isTransferItem }
            )
        )

        .button("Apply Changes", () => {
            const playerIndex = selectedPlayer.getData();
            const selectedName = playerNames[playerIndex];

            const playerObject = PlayerCache.getPlayerByName(selectedName);
            const container = playerObject?.getComponent("minecraft:inventory")?.container;

            if (!container) return;

            const slot = parseInt(selectedSlot.getData());
            if (isNaN(slot) || slot < 0 || slot >= container.size) return;

            const item = container.getItem(slot);
            if (!item) return;

            const option = selectedOption.getData();

            switch (option) {
                case 1: // Edit Name & Lore
                    applyNameLore(container, item, slot);
                    break;

                case 2: // Edit Enchantments
                    applyEnchant(container, item, slot);
                    break;

                case 3: // Repair Item
                    repairItem(container, item, slot);
                    break;
                case 4: // Transfer Item
                    const targetIndex = transferTargetPlayer.getData();
                    const targetName = playerNames[targetIndex];
                    const targetPlayerObject = PlayerCache.getPlayerByName(targetName);
                    const targetContainer = targetPlayerObject?.getComponent("minecraft:inventory")?.container;

                    if (!targetContainer) return;

                    transferItem(container, targetContainer, item, slot);
                    break;

                default:
                    // View Inventory → do nothing
                    break;
            }
            // Update the item fields after applying changes
            updateItemFields(selectedSlot.getData());
        })
        .closeButton()
        .show()
        .then((showResult) => {
            if (showResult === DataDrivenScreenClosedReason.UserBusy) {
                showInventoryEditor(player);
            }
        })
        .catch((e) => {
            console.error(e);
        });

    /**
     * Updates the inventory display text for a selected player.
     *
     * Lists all non-empty slots and their contents.
     *
     * @param {number} index - Index of the selected player.
     */

    function updateInventory(index: number) {
        const selectedName = playerNames[index];
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

        inventoryText.setData(lines.join("\n"));
    }

    /**
     * Updates UI fields based on the selected inventory slot.
     *
     * - Updates name and lore fields
     * - Displays detailed item info (durability, enchantments, etc.)
     *
     * @param {string} slotRaw - Raw slot input string from UI.
     */

    function updateItemFields(slotRaw: string) {
        const slot = parseInt(slotRaw);
        if (isNaN(slot)) return;

        const playerIndex = selectedPlayer.getData();
        const selectedName = playerNames[playerIndex];

        const playerObject = PlayerCache.getPlayerByName(selectedName);
        const container = playerObject?.getComponent("minecraft:inventory")?.container;

        if (!container || slot < 0 || slot >= container.size) return;

        const item = container.getItem(slot);

        // Always update editable fields
        if (!item) {
            newName.setData("");
            newLore.setData("");
        } else {
            newName.setData(item.nameTag ?? "");
            const lore = item.getLore?.() ?? [];
            newLore.setData(lore.join("\n"));
        }

        // If in "View Inventory" mode → DO NOT override label
        if (selectedOption.getData() === 0) {
            return;
        }

        // Otherwise show detailed item view
        if (!item) {
            inventoryText.setData(`Slot ${slot}: Empty`);
            return;
        }

        const lines: string[] = [];

        lines.push(`Slot: ${slot}`);
        lines.push(`Item: ${item.typeId.replace("minecraft:", "")}`);
        lines.push(`Amount: ${item.amount}`);

        // Durability
        try {
            const durability = item.getComponent("minecraft:durability");
            if (durability) {
                const max = durability.maxDurability;
                const damage = durability.damage;
                lines.push(`Durability: ${max - damage}/${max}`);
            }
        } catch {}

        // Enchantments
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

        if (item.nameTag) {
            lines.push(`Name: ${item.nameTag}`);
        }

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
     * Updates an item's name tag and lore.
     *
     * - Name is applied if non-empty.
     * - Lore is split by new lines and applied if non-empty.
     *
     * @param {Container} container - The container holding the item.
     * @param {ItemStack} item - The item to modify.
     * @param {number} slot - The slot index of the item.
     */

    function applyNameLore(container: Container, item: ItemStack, slot: number) {
        const nameInput = newName.getData().trim();
        if (nameInput.length > 0) {
            item.nameTag = nameInput;
        }

        const loreInput = newLore.getData().trim();
        if (loreInput.length > 0) {
            item.setLore?.(loreInput.split("\n"));
        }

        container.setItem(slot, item);
    }

    /**
     * Repairs an item by resetting its durability damage to 0.
     *
     * If the item does not support durability, nothing happens.
     *
     * @param {Container} container - The container holding the item.
     * @param {ItemStack} item - The item to repair.
     * @param {number} slot - The slot index of the item.
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
     * Applies or removes an enchantment on an item.
     *
     * If the provided level is 0 or less, the enchantment is removed.
     * Otherwise, the enchantment is added or updated if valid.
     *
     * @param {Container} container - The container holding the item.
     * @param {ItemStack} item - The item to modify.
     * @param {number} slot - The slot index of the item.
     */

    function applyEnchant(container: Container, item: ItemStack, slot: number) {
        const enchantComp = item.getComponent("minecraft:enchantable");
        if (!enchantComp) return;

        const level = parseInt(enchantmentLevel.getData());
        if (isNaN(level)) return;

        const selectedEnchantment = enchantList[enchantmentIndex.getData()];
        if (!selectedEnchantment) return;

        // REMOVE IF LEVEL IS 0 OR LESS
        if (level <= 0) {
            enchantComp.removeEnchantment(selectedEnchantment);
            container.setItem(slot, item);
            return;
        }

        const enchantment = {
            type: selectedEnchantment,
            level: level,
        };

        if (!enchantComp.canAddEnchantment(enchantment)) return;

        enchantComp.addEnchantment(enchantment);

        container.setItem(slot, item);
    }

    /**
     * Transfers an item from one container to another.
     *
     * Moves the item from the source slot into the first available empty slot
     * in the target container. If no space is found, the item is returned
     * back to the source slot.
     *
     * @param {Container} sourceContainer - The container the item is being moved from.
     * @param {Container} targetContainer - The container receiving the item.
     * @param {ItemStack} item - The item stack to transfer.
     * @param {number} sourceSlot - The slot index in the source container.
     */

    function transferItem(sourceContainer: Container, targetContainer: Container, item: ItemStack, sourceSlot: number) {
        if (!targetContainer) return;

        // Remove item from source
        sourceContainer.setItem(sourceSlot, undefined);

        // Find first empty slot in target
        for (let i = 0; i < targetContainer.size; i++) {
            if (!targetContainer.getItem(i)) {
                targetContainer.setItem(i, item);
                return;
            }
        }

        // If no empty slot found, return item to source
        sourceContainer.setItem(sourceSlot, item);
    }
}

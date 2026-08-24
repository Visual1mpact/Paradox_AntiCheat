import { ItemUseAfterEvent, Player } from "@minecraft/server";
import { commandHandler } from "../../event-listeners/world-initialize";
import { openMainGui } from "../../commands/gui/form-generator";
import { EventCoordinator } from "../core/event-coordinator";

/**
 * Handles item use events to trigger the Paradox GUI if a configured item is used.
 */
class ItemUseSubscription {
    private cleanup: (() => void) | null = null;

    /**
     * Subscribes to the itemUse event via the EventCoordinator.
     */
    subscribe() {
        if (this.cleanup) return;

        this.cleanup = EventCoordinator.subscribeAfter("itemUse", (event: ItemUseAfterEvent) => {
            const player = event.source;
            if (!(player instanceof Player)) return;

            const guiItem = commandHandler.getGuiItem();

            // Check if the used item matches the configured trigger item
            if (guiItem && event.itemStack.typeId === guiItem) {
                openMainGui(player);
            }
        });
    }

    /**
     * Unsubscribes from the itemUse event.
     */
    unsubscribe() {
        if (!this.cleanup) return;

        this.cleanup();
        this.cleanup = null;
    }
}

export const itemUseSubscription = new ItemUseSubscription();

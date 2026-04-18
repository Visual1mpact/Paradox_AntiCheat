import { world, WorldAfterEvents, WorldBeforeEvents } from "@minecraft/server";

/**
 * World-Class Event Coordinator
 * Reduces bridge-crossing overhead by using a single native listener
 * to distribute events to multiple internal modules.
 */
export class EventCoordinator {
    // Separate storage for After and Before events to prevent namespace collisions
    private static afterListeners = new Map<keyof WorldAfterEvents, Set<(arg: any) => void>>();
    private static beforeListeners = new Map<keyof WorldBeforeEvents, Set<(arg: any) => void>>();

    private static afterNativeSubs = new Map<keyof WorldAfterEvents, any>();
    private static beforeNativeSubs = new Map<keyof WorldBeforeEvents, any>();

    /**
     * Subscribe a callback lazily to an AfterEvent.
     * Only creates the native Minecraft subscription if this is the first listener.
     */
    static subscribeAfter<K extends keyof WorldAfterEvents>(event: K, callback: (arg: Parameters<Parameters<WorldAfterEvents[K]["subscribe"]>[0]>[0]) => void) {
        if (!this.afterListeners.has(event)) {
            this.afterListeners.set(event, new Set());
        }

        const set = this.afterListeners.get(event)!;
        set.add(callback);

        if (set.size === 1) {
            const nativeSub = (world.afterEvents[event] as any).subscribe((data: any) => {
                for (const listener of this.afterListeners.get(event)!) {
                    try {
                        listener(data);
                    } catch (e) {
                        console.error(`[Coordinator] Error in afterEvents.${event} listener:`, e);
                    }
                }
            });
            this.afterNativeSubs.set(event, nativeSub);
        }
    }

    /**
     * Subscribe a callback lazily to a BeforeEvent.
     * These are critical for cancellation logic (e.g., Anti-Spam or Movement correction).
     */
    static subscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: Parameters<Parameters<WorldBeforeEvents[K]["subscribe"]>[0]>[0]) => void) {
        if (!this.beforeListeners.has(event)) {
            this.beforeListeners.set(event, new Set());
        }

        const set = this.beforeListeners.get(event)!;
        set.add(callback);

        if (set.size === 1) {
            const nativeSub = (world.beforeEvents[event] as any).subscribe((data: any) => {
                for (const listener of this.beforeListeners.get(event)!) {
                    try {
                        listener(data);
                    } catch (e) {
                        console.error(`[Coordinator] Error in beforeEvents.${event} listener:`, e);
                    }
                }
            });
            this.beforeNativeSubs.set(event, nativeSub);
        }
    }

    /**
     * Unsubscribe a callback from an AfterEvent.
     */
    static unsubscribeAfter<K extends keyof WorldAfterEvents>(event: K, callback: (arg: Parameters<Parameters<WorldAfterEvents[K]["subscribe"]>[0]>[0]) => void) {
        const set = this.afterListeners.get(event);
        if (!set) return;

        set.delete(callback);
        if (set.size === 0) {
            (world.afterEvents[event] as any).unsubscribe(this.afterNativeSubs.get(event));
            this.afterNativeSubs.delete(event);
        }
    }

    /**
     * Unsubscribe a callback from a BeforeEvent.
     */
    static unsubscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: Parameters<Parameters<WorldBeforeEvents[K]["subscribe"]>[0]>[0]) => void) {
        const set = this.beforeListeners.get(event);
        if (!set) return;

        set.delete(callback);
        if (set.size === 0) {
            (world.beforeEvents[event] as any).unsubscribe(this.beforeNativeSubs.get(event));
            this.beforeNativeSubs.delete(event);
        }
    }
}

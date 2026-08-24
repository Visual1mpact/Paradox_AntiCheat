import { world, WorldAfterEvents, WorldBeforeEvents } from "@minecraft/server";

// Helper types to extract event data types directly from event signals using conditional inferencing
type ExtractEventArg<T> = T extends { subscribe(callback: (arg: infer A) => void): unknown } ? A : never;

type AfterEventArg<K extends keyof WorldAfterEvents> = ExtractEventArg<WorldAfterEvents[K]>;
type BeforeEventArg<K extends keyof WorldBeforeEvents> = ExtractEventArg<WorldBeforeEvents[K]>;

/**
 * World-Class Event Coordinator
 * Reduces bridge-crossing overhead by using a single native listener
 * to distribute events to multiple internal modules.
 */
export class EventCoordinator {
    // Listener sets stored internally as generic (arg: unknown) => void
    private static afterListeners = new Map<keyof WorldAfterEvents, Set<(arg: unknown) => void>>();
    private static beforeListeners = new Map<keyof WorldBeforeEvents, Set<(arg: unknown) => void>>();

    private static afterNativeSubs = new Map<keyof WorldAfterEvents, unknown>();
    private static beforeNativeSubs = new Map<keyof WorldBeforeEvents, unknown>();

    /**
     * Subscribe a callback lazily to an AfterEvent.
     * Only creates the native Minecraft subscription if this is the first listener.
     * Returns a cleanup function for easy unsubscription.
     */
    static subscribeAfter<K extends keyof WorldAfterEvents>(event: K, callback: (arg: AfterEventArg<K>) => void): () => void {
        let set = this.afterListeners.get(event);
        if (!set) {
            set = new Set();
            this.afterListeners.set(event, set);
        }

        set.add(callback as (arg: unknown) => void);

        if (set.size === 1) {
            // OPTIMIZATION: Bypassed nested closure allocation
            const sub = world.afterEvents[event].subscribe((data) => {
                const listeners = this.afterListeners.get(event);
                if (listeners) {
                    // OPTIMIZATION: Iterate Set directly to avoid Array.from() GC thrashing
                    for (const listener of listeners) {
                        try {
                            listener(data);
                        } catch (err) {
                            console.error(`[Coordinator] Error in afterEvents.${String(event)} listener:`, err);
                        }
                    }
                }
            });
            this.afterNativeSubs.set(event, sub);
        }

        return () => this.unsubscribeAfter(event, callback);
    }

    /**
     * Subscribe a callback lazily to a BeforeEvent.
     * These are critical for cancellation logic (e.g., Anti-Spam or Movement correction).
     * Returns a cleanup function for easy unsubscription.
     */
    static subscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: BeforeEventArg<K>) => void): () => void {
        let set = this.beforeListeners.get(event);
        if (!set) {
            set = new Set();
            this.beforeListeners.set(event, set);
        }

        set.add(callback as (arg: unknown) => void);

        if (set.size === 1) {
            const sub = world.beforeEvents[event].subscribe((data) => {
                const listeners = this.beforeListeners.get(event);
                if (listeners) {
                    for (const listener of listeners) {
                        try {
                            listener(data);
                        } catch (err) {
                            console.error(`[Coordinator] Error in beforeEvents.${String(event)} listener:`, err);
                        }
                    }
                }
            });
            this.beforeNativeSubs.set(event, sub);
        }

        return () => this.unsubscribeBefore(event, callback);
    }

    /**
     * Unsubscribe a callback from an AfterEvent.
     */
    static unsubscribeAfter<K extends keyof WorldAfterEvents>(event: K, callback: (arg: AfterEventArg<K>) => void) {
        const set = this.afterListeners.get(event);
        if (!set) return;

        set.delete(callback as (arg: unknown) => void);
        if (set.size === 0) {
            const sub = this.afterNativeSubs.get(event);
            if (sub !== undefined) {
                // Safely cast to access the generic unsubscribe method without generating dynamic closures
                (world.afterEvents[event] as unknown as { unsubscribe(s: unknown): void }).unsubscribe(sub);
            }
            this.afterNativeSubs.delete(event);
        }
    }

    /**
     * Unsubscribe a callback from a BeforeEvent.
     */
    static unsubscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: BeforeEventArg<K>) => void) {
        const set = this.beforeListeners.get(event);
        if (!set) return;

        set.delete(callback as (arg: unknown) => void);
        if (set.size === 0) {
            const sub = this.beforeNativeSubs.get(event);
            if (sub !== undefined) {
                (world.beforeEvents[event] as unknown as { unsubscribe(s: unknown): void }).unsubscribe(sub);
            }
            this.beforeNativeSubs.delete(event);
        }
    }
}

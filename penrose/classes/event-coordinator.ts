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
        if (!this.afterListeners.has(event)) {
            this.afterListeners.set(event, new Set());
        }

        const set = this.afterListeners.get(event)!;
        set.add(callback as (arg: unknown) => void);

        if (set.size === 1) {
            // Helper function cast keeps native subscription strongly typed without triggering generic union collapse
            const subscribeNative = <E extends keyof WorldAfterEvents>(e: E) => {
                return world.afterEvents[e].subscribe((data) => {
                    const listeners = Array.from(this.afterListeners.get(e) || []);
                    for (const listener of listeners) {
                        try {
                            listener(data);
                        } catch (err) {
                            console.error(`[Coordinator] Error in afterEvents.${String(e)} listener:`, err);
                        }
                    }
                });
            };

            this.afterNativeSubs.set(event, subscribeNative(event));
        }

        return () => this.unsubscribeAfter(event, callback);
    }

    /**
     * Subscribe a callback lazily to a BeforeEvent.
     * These are critical for cancellation logic (e.g., Anti-Spam or Movement correction).
     * Returns a cleanup function for easy unsubscription.
     */
    static subscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: BeforeEventArg<K>) => void): () => void {
        if (!this.beforeListeners.has(event)) {
            this.beforeListeners.set(event, new Set());
        }

        const set = this.beforeListeners.get(event)!;
        set.add(callback as (arg: unknown) => void);

        if (set.size === 1) {
            const subscribeNative = <E extends keyof WorldBeforeEvents>(e: E) => {
                return world.beforeEvents[e].subscribe((data) => {
                    const listeners = Array.from(this.beforeListeners.get(e) || []);
                    for (const listener of listeners) {
                        try {
                            listener(data);
                        } catch (err) {
                            console.error(`[Coordinator] Error in beforeEvents.${String(e)} listener:`, err);
                        }
                    }
                });
            };

            this.beforeNativeSubs.set(event, subscribeNative(event));
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
                const unsubscribeNative = <E extends keyof WorldAfterEvents>(e: E, nativeSub: unknown) => {
                    // Safety check for native signal unsubscribe method
                    const signal = world.afterEvents[e] as unknown as { unsubscribe(s: unknown): void };
                    signal.unsubscribe(nativeSub);
                };
                unsubscribeNative(event, sub);
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
                const unsubscribeNative = <E extends keyof WorldBeforeEvents>(e: E, nativeSub: unknown) => {
                    const signal = world.beforeEvents[e] as unknown as { unsubscribe(s: unknown): void };
                    signal.unsubscribe(nativeSub);
                };
                unsubscribeNative(event, sub);
            }
            this.beforeNativeSubs.delete(event);
        }
    }
}

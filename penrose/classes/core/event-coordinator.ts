import { world, WorldAfterEvents, WorldBeforeEvents } from "@minecraft/server";

/**
 * Extracts event payload parameter type from event signal.
 */
type ExtractEventArg<T> = T extends { subscribe(callback: (arg: infer A) => void): unknown } ? A : never;

/**
 * Helper signature for generic event handling.
 */
type AnyListener = (arg: unknown) => void;

/**
 * World-Class Event Coordinator
 * Reduces C++ bridge-crossing overhead by unifying native event listeners.
 */
export class EventCoordinator {
    private static listeners = new Map<string, Set<AnyListener>>();
    private static nativeCallbacks = new Map<string, AnyListener>();

    /**
     * Executes dispatch for target event listeners safely.
     * @param key Fully qualified event key identifier.
     * @param data Payload delivered from Minecraft native event.
     */
    private static dispatch(key: string, data: unknown): void {
        const set = this.listeners.get(key);
        if (!set) return;

        const handlers = [...set];
        for (let i = 0; i < handlers.length; i++) {
            const handler = handlers[i];
            if (!handler) continue;

            try {
                handler(data);
            } catch (err) {
                console.error(`[Coordinator] Error in ${key} listener:`, err);
            }
        }
    }

    /**
     * Subscribes callback to native event handler managed registry.
     * @param map Target world event object collection.
     * @param prefix Scope identifier for namespace mapping.
     * @param event Event key identifier.
     * @param callback Subscriber listener callback function.
     * @returns Cleanup routine to unsubscribe callback.
     */
    private static subscribeGeneric<T extends object, K extends keyof T>(map: T, prefix: string, event: K, callback: AnyListener): () => void {
        const key = `${prefix}:${String(event)}`;
        let set = this.listeners.get(key);

        if (!set) {
            set = new Set();
            this.listeners.set(key, set);
        }

        set.add(callback);

        if (set.size === 1) {
            const nativeCallback = (data: unknown) => this.dispatch(key, data);
            this.nativeCallbacks.set(key, nativeCallback);
            (map[event] as unknown as { subscribe(cb: AnyListener): AnyListener }).subscribe(nativeCallback);
        }

        return () => this.unsubscribeGeneric(map, prefix, event, callback);
    }

    /**
     * Removes subscribed callback and releases native handles on empty sets.
     * @param map Target world event object collection.
     * @param prefix Scope identifier for namespace mapping.
     * @param event Event key identifier.
     * @param callback Subscriber listener callback function.
     */
    private static unsubscribeGeneric<T extends object, K extends keyof T>(map: T, prefix: string, event: K, callback: AnyListener): void {
        const key = `${prefix}:${String(event)}`;
        const set = this.listeners.get(key);
        if (!set) return;

        set.delete(callback);

        if (set.size === 0) {
            const nativeCallback = this.nativeCallbacks.get(key);
            if (nativeCallback) {
                (map[event] as unknown as { unsubscribe(cb: AnyListener): void }).unsubscribe(nativeCallback);
                this.nativeCallbacks.delete(key);
            }
            this.listeners.delete(key);
        }
    }

    /**
     * Subscribe a callback lazily to an AfterEvent.
     * @param event Specific world after event key name.
     * @param callback Event subscriber payload handler.
     * @returns Unsubscribe cleanup callback function.
     */
    static subscribeAfter<K extends keyof WorldAfterEvents>(event: K, callback: (arg: ExtractEventArg<WorldAfterEvents[K]>) => void): () => void {
        return this.subscribeGeneric(world.afterEvents, "after", event, callback as AnyListener);
    }

    /**
     * Subscribe a callback lazily to a BeforeEvent.
     * @param event Specific world before event key name.
     * @param callback Event subscriber payload handler.
     * @returns Unsubscribe cleanup callback function.
     */
    static subscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: ExtractEventArg<WorldBeforeEvents[K]>) => void): () => void {
        return this.subscribeGeneric(world.beforeEvents, "before", event, callback as AnyListener);
    }

    /**
     * Unsubscribe a callback from an AfterEvent.
     * @param event Specific world after event key name.
     * @param callback Event subscriber payload handler.
     */
    static unsubscribeAfter<K extends keyof WorldAfterEvents>(event: K, callback: (arg: ExtractEventArg<WorldAfterEvents[K]>) => void): void {
        this.unsubscribeGeneric(world.afterEvents, "after", event, callback as AnyListener);
    }

    /**
     * Unsubscribe a callback from a BeforeEvent.
     * @param event Specific world before event key name.
     * @param callback Event subscriber payload handler.
     */
    static unsubscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: ExtractEventArg<WorldBeforeEvents[K]>) => void): void {
        this.unsubscribeGeneric(world.beforeEvents, "before", event, callback as AnyListener);
    }
}

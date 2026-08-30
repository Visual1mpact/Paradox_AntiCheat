import { world, WorldAfterEvents, WorldBeforeEvents } from "@minecraft/server";

/**
 * Extracts event payload parameter type from event signal.
 */
type ExtractEventArg<T> = T extends { subscribe(callback: (arg: infer A) => void): unknown } ? A : never;

/**
 * Generic listener signature.
 */
type AnyListener = (arg: unknown) => void;

/**
 * Event Signal Wrapper interface for native API access.
 */
interface EventSignal {
    subscribe(callback: AnyListener): AnyListener;
    unsubscribe(callback: AnyListener): void;
}

/**
 * Consolidated subscriber bucket metadata.
 */
interface EventBucket {
    /** Subscriber callbacks set */
    listeners: Set<AnyListener>;
    /** Reference to native callback bound to Bedrock API */
    nativeCallback: AnyListener;
    /** Snapshot queue used during active iteration to prevent array allocation GC thrashing */
    pendingRemovals: Set<AnyListener> | null;
    /** Active iteration safety state */
    isDispatching: boolean;
}

/**
 * High-Performance World Event Coordinator
 * Features O(1) lookups, zero array allocations on dispatch, and zero GC thrashing.
 */
export class EventCoordinator {
    /** Single Map storage eliminating prefix string concats */
    private static buckets = new Map<string, EventBucket>();

    /**
     * Executes dispatch for target event listeners with ZERO heap allocations.
     * @param bucket Target event metadata collection.
     * @param data Payload delivered from Minecraft native event.
     */
    private static dispatch(bucket: EventBucket, data: unknown): void {
        bucket.isDispatching = true;

        for (const handler of bucket.listeners) {
            try {
                handler(data);
            } catch (err) {
                console.error("[Coordinator] Listener execution error:", err);
            }
        }

        bucket.isDispatching = false;

        // Process delayed unsubscribes queued during dispatch loop
        if (bucket.pendingRemovals) {
            for (const handler of bucket.pendingRemovals) {
                bucket.listeners.delete(handler);
            }
            bucket.pendingRemovals = null;
        }
    }

    /**
     * Subscribes callback lazily with O(1) bucket caching.
     * @param signal Target native Bedrock event signal.
     * @param key Qualified event lookup key.
     * @param callback Target subscriber callback function.
     * @returns Cleanup unsubscribe closure handler.
     */
    private static subscribeGeneric(signal: EventSignal, key: string, callback: AnyListener): () => void {
        let bucket = this.buckets.get(key);

        if (!bucket) {
            const newBucket: EventBucket = {
                listeners: new Set(),
                nativeCallback: (data: unknown) => this.dispatch(newBucket, data),
                pendingRemovals: null,
                isDispatching: false,
            };

            bucket = newBucket;
            this.buckets.set(key, bucket);
            signal.subscribe(bucket.nativeCallback);
        }

        bucket.listeners.add(callback);

        return () => this.unsubscribeGeneric(signal, key, callback);
    }

    /**
     * Unsubscribes callback with zero array copying and safe deferment.
     * @param signal Target native Bedrock event signal.
     * @param key Qualified event lookup key.
     * @param callback Target subscriber callback function.
     */
    private static unsubscribeGeneric(signal: EventSignal, key: string, callback: AnyListener): void {
        const bucket = this.buckets.get(key);
        if (!bucket) return;

        if (bucket.isDispatching) {
            if (!bucket.pendingRemovals) {
                bucket.pendingRemovals = new Set();
            }
            bucket.pendingRemovals.add(callback);
            return;
        }

        bucket.listeners.delete(callback);

        if (bucket.listeners.size === 0) {
            signal.unsubscribe(bucket.nativeCallback);
            this.buckets.delete(key);
        }
    }

    /**
     * Subscribe a callback lazily to an AfterEvent.
     * @param event Specific world after event key name.
     * @param callback Event subscriber payload handler.
     * @returns Unsubscribe cleanup callback function.
     */
    static subscribeAfter<K extends keyof WorldAfterEvents>(event: K, callback: (arg: ExtractEventArg<WorldAfterEvents[K]>) => void): () => void {
        const signal = world.afterEvents[event] as unknown as EventSignal;
        return this.subscribeGeneric(signal, `a:${String(event)}`, callback as AnyListener);
    }

    /**
     * Subscribe a callback lazily to a BeforeEvent.
     * @param event Specific world before event key name.
     * @param callback Event subscriber payload handler.
     * @returns Unsubscribe cleanup callback function.
     */
    static subscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: ExtractEventArg<WorldBeforeEvents[K]>) => void): () => void {
        const signal = world.beforeEvents[event] as unknown as EventSignal;
        return this.subscribeGeneric(signal, `b:${String(event)}`, callback as AnyListener);
    }

    /**
     * Unsubscribe a callback from an AfterEvent.
     * @param event Specific world after event key name.
     * @param callback Event subscriber payload handler.
     */
    static unsubscribeAfter<K extends keyof WorldAfterEvents>(event: K, callback: (arg: ExtractEventArg<WorldAfterEvents[K]>) => void): void {
        const signal = world.afterEvents[event] as unknown as EventSignal;
        this.unsubscribeGeneric(signal, `a:${String(event)}`, callback as AnyListener);
    }

    /**
     * Unsubscribe a callback from a BeforeEvent.
     * @param event Specific world before event key name.
     * @param callback Event subscriber payload handler.
     */
    static unsubscribeBefore<K extends keyof WorldBeforeEvents>(event: K, callback: (arg: ExtractEventArg<WorldBeforeEvents[K]>) => void): void {
        const signal = world.beforeEvents[event] as unknown as EventSignal;
        this.unsubscribeGeneric(signal, `b:${String(event)}`, callback as AnyListener);
    }
}

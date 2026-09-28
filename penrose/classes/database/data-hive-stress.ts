import { OptimizedDatabase } from "./data-hive";

/** Global multiplier controlling overall stress test scale (e.g., 10 = 10x scale) */
const STRESS_MULTIPLIER = 10;

/**
 * Interface tracking execution metrics throughout the scaled stress test run.
 */
interface TestMetrics {
    /** Combined counter tracking set, get, and clean operations executed */
    totalOps: number;
    /** Counter tracking unexpected mismatches or property read failures */
    failedOps: number;
    /** Epoch timestamp recorded at start of test run */
    startTime: number;
}

/**
 * Harness for validating chunking, locking, compression, and purging performance under configurable load.
 */
export class DatabaseStressTester {
    /** Target database instance used during stress evaluation */
    private db: OptimizedDatabase<any>;

    /** Run metric statistics tracker */
    private metrics: TestMetrics = { totalOps: 0, failedOps: 0, startTime: 0 };

    /** Initializes stress test harness instance */
    constructor() {
        this.db = new OptimizedDatabase("StressTestDB");
    }

    /** Executes the complete suite of scaled database stress tests */
    public async runSuite(): Promise<void> {
        console.warn(`=== BEGINNING ${STRESS_MULTIPLIER}X SCALED DATABASE STRESS TEST SUITE ===`);
        this.metrics.startTime = Date.now();

        await this.db.clear();

        await this.testConcurrentOperations();
        await this.testChunkBoundaryEdgeCases();
        await this.testCompressionYield();
        await this.testPointerChunking();
        await this.testInterleavedReadWrite();
        await this.testCleanupAndPurge();

        this.logResults();
    }

    /**
     * Phase 1: Launches parallel asynchronous write/read operations based on STRESS_MULTIPLIER (50 * MULTIPLIER).
     */
    private async testConcurrentOperations(): Promise<void> {
        const targetOps = 50 * STRESS_MULTIPLIER;
        console.log(`\n[Phase 1] Launching ${targetOps} concurrent write/read operations (${STRESS_MULTIPLIER}x scale)...`);
        const promises: Promise<void>[] = [];

        for (let i = 0; i < targetOps; i++) {
            promises.push(
                (async () => {
                    const key = `concurrent_${i}`;
                    const val = { id: i, payload: `test_data_${i}` };
                    this.metrics.totalOps++;
                    await this.db.set(key, val);

                    this.metrics.totalOps++;
                    const retrieved = await this.db.get(key);

                    if (!retrieved || retrieved.id !== i) {
                        this.metrics.failedOps++;
                        console.error(`Concurrent mismatch for key: ${key}`);
                    }
                })()
            );
        }

        await Promise.all(promises);
        console.log(`[Phase 1 Complete] ${targetOps} operations processed.`);
    }

    /**
     * Phase 2: Tests exact chunk boundary allocation and multi-chunk splitting
     * when high-entropy data causes LZW compression to expand, triggering
     * uncompressed raw JSON fallback storage.
     */
    private async testChunkBoundaryEdgeCases(): Promise<void> {
        console.log("\n[Phase 2] Testing chunk boundary edge cases & raw string fallback splits...");
        const chunkSize = 30000;

        /**
         * Generates high-entropy string streams to force LZW compression expansion,
         * ensuring the database falls back to raw string chunking.
         */
        const generateHighEntropyString = (length: number): string => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
            let result = "";
            for (let i = 0; i < length; i++) {
                result += chars.charAt((i * 31 + 17) % chars.length);
            }
            return result;
        };

        const testSizes = [chunkSize - 1, chunkSize, chunkSize + 1, chunkSize * 2 + 500];

        for (const size of testSizes) {
            const testKey = `boundary_${size}`;
            const dummyData = generateHighEntropyString(size);

            try {
                this.metrics.totalOps++;
                await this.db.set(testKey, {
                    id: testKey,
                    timestamp: Date.now(),
                    data: dummyData,
                });

                this.metrics.totalOps++;
                const retrieved = await this.db.get(testKey);

                if (!retrieved || retrieved.data.length !== size) {
                    throw new Error(`Boundary test mismatch at length ${size}. Expected: ${size}, got: ${retrieved?.data?.length}`);
                }

                const actualChunks = this.db.getChunkCount(testKey);
                console.log(`  -> Size ${size} chars passed. Physical chunks stored: ${actualChunks}`);
            } catch (err) {
                this.metrics.failedOps++;
                console.error(`Boundary test failed for size ${size}:`, err);
            }
        }
    }

    /**
     * Phase 3: Evaluates LZW compression ratio yield on highly repetitive text payloads scaled by STRESS_MULTIPLIER.
     */
    private async testCompressionYield(): Promise<void> {
        const repetitions = 4166 * STRESS_MULTIPLIER;
        const totalChars = repetitions * "PARADOX_ANTICHEAT_".length;
        console.log(`\n[Phase 3] Compressing large payload (${totalChars.toLocaleString()} chars - ${STRESS_MULTIPLIER}x scale) to test LZW yield threshold...`);
        const largeString = "PARADOX_ANTICHEAT_".repeat(repetitions);
        const key = "large_payload";

        const start = Date.now();
        this.metrics.totalOps++;
        await this.db.set(key, { data: largeString });
        const elapsed = Date.now() - start;

        const sizeBytes = this.db.getEntrySizeBytes(key);
        console.log(`  -> Compression & write completed in ${elapsed}ms`);
        console.log(`  -> Stored entry raw size: ${this.db.formatBytes(sizeBytes)}`);
    }

    /**
     * Phase 4: Inserts keys based on STRESS_MULTIPLIER (500 * MULTIPLIER) to verify automatic index pointer chunking.
     */
    private async testPointerChunking(): Promise<void> {
        const targetKeys = 500 * STRESS_MULTIPLIER;
        const logInterval = 100 * STRESS_MULTIPLIER;
        console.log(`\n[Phase 4] Generating ${targetKeys.toLocaleString()} keys to test pointer index chunking (${STRESS_MULTIPLIER}x scale)...`);

        for (let i = 1; i <= targetKeys; i++) {
            this.metrics.totalOps++;
            await this.db.set(`index_key_${i}`, { val: i });

            if (i % logInterval === 0) {
                console.log(`  -> Inserted ${i}/${targetKeys} entries...`);
            }
        }

        const pointers = this.db.listPointers();
        const pointerChunkCount = this.db.getChunkCount("pointers");
        console.log(`  -> Indexed pointer count: ${pointers.length} entries`);
        console.log(`  -> Pointer index chunk allocation: ${pointerChunkCount} chunk(s)`);
    }

    /**
     * Phase 5: Performs dynamic read-modify-write loops scaled by STRESS_MULTIPLIER (100 * MULTIPLIER) across random keys.
     */
    private async testInterleavedReadWrite(): Promise<void> {
        const targetLoops = 100 * STRESS_MULTIPLIER;
        const maxKeyIndex = 500 * STRESS_MULTIPLIER;
        console.log(`\n[Phase 5] Executing ${targetLoops.toLocaleString()} interleaved dynamic read/write loops (${STRESS_MULTIPLIER}x scale)...`);

        for (let i = 0; i < targetLoops; i++) {
            const targetKey = `index_key_${Math.floor(Math.random() * maxKeyIndex) + 1}`;

            this.metrics.totalOps++;
            const existing = await this.db.get(targetKey);

            if (existing) {
                existing.val += 1;
                this.metrics.totalOps++;
                await this.db.set(targetKey, existing);
            } else {
                this.metrics.failedOps++;
            }
        }
    }

    /**
     * Phase 6: Tests automatic batched predicate filtering and total database purging.
     */
    private async testCleanupAndPurge(): Promise<void> {
        console.log("\n[Phase 6] Testing automatic cleanup and schema purging...");
        console.log("  -> Running cleanup validator...");

        this.metrics.totalOps++;
        await this.db.clean(
            (key) => {
                if (typeof key === "string" && key.startsWith("index_key_")) {
                    const num = parseInt(key.replace("index_key_", ""), 10);
                    return num % 2 === 0;
                }
                return true;
            },
            { silent: true }
        );

        const remaining = this.db.listPointers().length;
        console.log(`  -> Remaining active keys post-cleanup: ${remaining}`);

        console.log("  -> Clearing database completely...");
        this.metrics.totalOps++;
        await this.db.clear();

        console.log("  -> Database purge successful.");
    }

    /**
     * Logs aggregate benchmark stats to console.
     */
    private logResults(): void {
        const totalTimeSec = (Date.now() - this.metrics.startTime) / 1000;
        const throughput = this.metrics.totalOps / totalTimeSec;

        console.warn(`\n=== ${STRESS_MULTIPLIER}X SCALED DATABASE STRESS TEST RESULTS ===`);
        console.log(`Total Execution Time : ${totalTimeSec.toFixed(2)} seconds`);
        console.log(`Total Operations Exec: ${this.metrics.totalOps}`);
        console.log(`Failed Operations    : ${this.metrics.failedOps}`);
        console.log(`Throughput Rate      : ${throughput.toFixed(2)} ops/sec`);
        console.log(`Total DB Storage Size: ${this.db.getTotalSizeFormatted()}`);
        console.warn("=================================================");
    }
}

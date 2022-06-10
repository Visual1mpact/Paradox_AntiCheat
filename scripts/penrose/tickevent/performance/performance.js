import { EntityQueryOptions, world } from 'mojang-minecraft';

const World = world;

let x = (function* () {
    let delta = 0;
    while(true) {
        const waitTill = Date.now() + 50 - delta;
        while (Date.now() < waitTill);

        const t1 = Date.now();
        yield delta;
        delta = Date.now() - t1;
    }
})();

const PerformanceTest = () => {
    World.events.tick.subscribe(({deltaTime}) => {
        const serverTime = x.next().value;
        let filter = new EntityQueryOptions();
        filter.tags = ['performance'];
        for (let player of World.getPlayers(filter)) {
            player.runCommand(`title @s actionbar §6Server Time: §4${serverTime}ms | §6TPS: §4${(1/deltaTime).toFixed(2)} §4(${(deltaTime * 1000).toFixed(2)}§6ms)`);
        }
    });
};

export { PerformanceTest };

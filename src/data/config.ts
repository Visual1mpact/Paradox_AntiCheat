export default {
    debug: false,
    customcommands: {
        prefix: "!",
        ban: true,
        clearchat: true,
        help: true,
        op: true,
        deop: true,
        credits: true,
        allowgma: true,
        allowgmc: true,
        allowgms: true,
        bedrockvalidate: true,
        modules: true,
        overidecommandblocksenabled: true,
        removecommandblocks: true,
        worldborder: true,
        autoclicker: true,
        jesusa: true,
        phase: true,
        ecwipe: true,
        freeze: true,
        stats: true,
        fullreport: true,
        kick: true,
        mute: true,
        unmute: true,
        fly: true,
        invsee: true,
        notify: true,
        tag: true,
        vanish: true,
        enchantedarmor: true,
        auracheck: true,
        autoaura: true,
        antikb: true,
        report: true,
        badpackets1: true,
        spammera: true,
        spammerb: true,
        spammerc: true,
        spammerd: true,
        antispam: true,
        crashera: true,
        crasherb: true,
        namespoofa: true,
        namespoofb: true,
        reacha: true,
        reachb: true,
        reachc: true,
        noslowa: true,
        invalidsprinta: true,
        flya: true,
        illegalitemsa: true,
        illegalitemsb: true,
        illegalitemsc: false,
        illegalitemsd: true,
        antiscaffolda: true,
        antinukera: true,
        xraya: true,
        unban: true,
        chatranks: true,
        antishulker: true,
        stackban: true,
        lockdown: false,
        punish: true,
        sethome: true,
        gohome: true,
        listhome: true,
        delhome: true,
        tpa: true,
        illegalenchant: true,
        illegallores: true,
        despawn: true,
        hotbar: true,
        ops: true,
        salvage: true,
        badpackets2: true,
        give: true,
        clearlag: true,
    },
    modules: {
        badpackets1: {
            enabled: true,
            minLength: 1,
            maxlength: 512,
        },
        spammerA: {
            enabled: true,
        },
        spammerB: {
            enabled: true,
        },
        spammerC: {
            enabled: true,
        },
        spammerD: {
            enabled: true,
        },
        antispam: {
            enabled: true,
            cooldown: 40,
        },
        crasherA: {
            enabled: true,
        },
        crasherB: {
            enabled: true,
        },
        namespoofA: {
            enabled: true,
            minNameLength: 3,
            maxNameLength: 16,
        },
        namespoofB: {
            enabled: true,
            banregex: /("|\\)/,
            // Deny any invalid character not within the scope of this regex
            // Only kick because playstation and switch consoles are able to rename themselves
            kickregex: /[^A-Za-z0-9_\-() ]/,
        },
        bedrockValidate: {
            enabled: true,
            overworld: true,
            nether: true,
        },
        reachA: {
            enabled: true,
            reach: 7,
        },
        reachB: {
            enabled: true,
            reach: 7,
        },
        reachC: {
            enabled: true,
            reach: 7,
        },
        jesusA: {
            enabled: false,
        },
        noslowA: {
            enabled: true,
            speed: 0.20800000429153442,
        },
        invalidsprintA: {
            enabled: true,
            speed: 0.20800000429153442,
        },
        flyA: {
            enabled: true,
        },
        illegalitemsA: {
            enabled: true,
        },
        illegalitemsB: {
            enabled: true,
        },
        illegalitemsC: {
            enabled: true,
        },
        illegalitemsD: {
            enabled: true,
        },
        stackBan: {
            enabled: false,
        },
        antikbA: {
            enabled: false,
            magnitude: -0.078,
        },
        antiscaffoldA: {
            enabled: true,
            max: 13,
        },
        antinukerA: {
            enabled: true,
            max: 2,
        },
        xrayA: {
            enabled: true,
        },
        chatranks: {
            enabled: true,
        },
        antishulker: {
            enabled: false,
        },
        lockDown: {
            enabled: false,
        },
        worldBorder: {
            enabled: false,
            nether: 0,
            overworld: 0,
        },
        antiTeleport: {
            enabled: true,
            constraint: 50,
        },
        survivalGM: {
            enabled: false,
        },
        adventureGM: {
            enabled: false,
        },
        creativeGM: {
            enabled: false,
        },
        setHome: {
            enabled: true,
            max: 5,
        },
        goHome: {
            seconds: 0,
            minutes: 5,
            hours: 0,
            days: 0,
        },
        clearLag: {
            enabled: false,
            seconds: 0,
            minutes: 10,
            hours: 0,
            days: 0,
        },
        illegalEnchantment: {
            enabled: true,
        },
        illegalLores: {
            enabled: true,
            exclude: "(+DATA)",
        },
        hotbar: {
            enabled: false,
            message: "Hotbar is enabled (Set your message to change this)", // Put Message inside the quotes
        },
        ops: {
            enabled: false,
        },
        salvage: {
            enabled: false,
        },
        badpackets2: {
            enabled: true,
        },
        /**
         * Add a password in-between the quotes.
         *
         * Example:
         * "password": "test"
         *
         * Remember this password as it will be required to gain permission to use Paradox as Staff.
         *
         * Example:
         * !op test
         *
         * After you gain permissions you can give others op in a normal fashion.
         *
         * Example:
         * !op gamertag
         *
         * Change your password frequently and only share with trusted sources.
         */
        encryption: {
            password: "",
        },
    },
};

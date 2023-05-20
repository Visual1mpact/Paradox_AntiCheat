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
        antikillaura: true,
        antikb: true,
        report: true,
        badpackets1: true,
        spammera: true,
        spammerb: true,
        spammerc: true,
        spammerd: true,
        antispam: true,
        crashera: true,
        namespoofa: true,
        namespoofb: true,
        reacha: true,
        reachb: true,
        reachc: true,
        noslowa: true,
        invalidsprinta: true,
        flya: true,
        antifalla: true,
        illegalitemsa: true,
        illegalitemsb: true,
        illegalitemsc: true,
        antiscaffolda: true,
        antinukera: true,
        xraya: true,
        unban: true,
        chatranks: true,
        antishulker: true,
        stackban: true,
        lockdown: true,
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
        showrules: true,
        paradoxiu: true,
        tpr: true,
        autoban: true,
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
        },
        crasherA: {
            enabled: true,
        },
        namespoofA: {
            enabled: true,
            minNameLength: 3,
            maxNameLength: 16,
        },
        namespoofB: {
            enabled: true,
            banregex: /[^\x00-\x7F]|[/:\\*?"<>]|^\.$|\.$/,
            // Deny any invalid character not within the scope of this regex
            // Only kick because playstation and switch consoles are able to rename themselves
            kickregex: /^((?![a-zA-Z0-9_]{3,16}$).)*$/,
        },
        bedrockValidate: {
            enabled: true,
            overworld: true,
            nether: true,
        },
        reachA: {
            enabled: true,
            reach: 6,
        },
        reachB: {
            enabled: true,
            reach: 6,
        },
        reachC: {
            enabled: true,
            reach: 5,
        },
        jesusA: {
            enabled: false,
        },
        noslowA: {
            enabled: true,
            speed: 12.84,
        },
        invalidsprintA: {
            enabled: true,
            speed: 8.21,
        },
        flyA: {
            enabled: true,
        },
        antifallA: {
            enabled: true,
        },
        illegalitemsA: {
            enabled: false,
        },
        illegalitemsB: {
            enabled: false,
        },
        illegalitemsC: {
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
            enabled: false,
        },
        illegalLores: {
            enabled: false,
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
        showrules: {
            enabled: true,
            rule1: "Rule1: No hacking allowed.",
            rule2: "Rule2: Don't grief other players' builds.",
            rule3: "Rule3: Be kind to everyone on the server.",
            rule4: "Rule4: Follow the staff's instructions.",
            rule5: "Rule5: No spamming or advertising.",
        },
        paradoxui: {
            enabled: true,
        },
        tprExpiration: {
            seconds: 0,
            minutes: 2,
            hours: 0,
            days: 0,
        },
        banAppeal: {
            enabled: false,
            discordLink: "§9To appeal your ban visit our discord: §fhttps://discord.gg",
        },
        autoBan: {
            enabled: false,
            //Time interval in ticks 1 second = 20 ticks
            banHammerInterval: 6000,
        },
        antiKillAura: {
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

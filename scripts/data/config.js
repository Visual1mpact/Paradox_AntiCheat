export default
{
    "debug": true,
    "customcommands": {
        "prefix": "!",
        "ban": true,
        "clearchat": true,
        "help": true,
        "op": true,
        "deop": true,
        "credits": true,
        "allowgma": true,
        "allowgmc": true,
        "allowgms": true,
        "bedrockvalidate": true,
        "modules": true,
        "nofrostwalker": true,
        "overidecommandblocksenabled": true,
        "removecommandblocks": true,
        "worldborder": true,
        "autoclicker": true,
        "jesus": true,
        "phase": true,
        "ecwipe": true,
        "freeze": true,
        "stats": true,
        "fullreport": true,
        "kick": true,
        "mute": true,
        "unmute": true,
        "fly": true,
        "invsee": true,
        "notify": true,
        "tag": true,
        "vanish": true,
        "enchantedarmor":true,
        "auracheck":true,
        "autoaura":true,
        "antikb":true
    },
    "modules": {
        "badpackets2": {
            "enabled": true,
            "minLength": 1,
            "maxlength": 512
        },
        "spammerA": {
            "enabled": true
        },
        "spammerB": {
            "enabled": true
        },
        "spammerC": {
            "enabled": true
        },
        "spammerD": {
            "enabled": true
        },
        "crasherA": {
            "enabled": true
        },
        "namespoofA": {
            "enabled": true,
            "minNameLength": 3,
            "maxNameLength": 16
        },
        "namespoofB": {
            "enabled": true,
            "regex": /[^\x00-\xFF]/
        },
        "bedrockValidate": {
            "enabled": false,
            "overworld": false,
            "nether": false
        },
        "reachA": {
            "enabled": true,
            "reach": 7
        },
        "reachB": {
            "enabled": true,
            "reach": 7
        },
        "jesusB": {
            "enabled": true,
            "minMotion": 0.0247,
            "maxMotion": 0.0269
        },
        "noslowA": {
            "enabled": true,
            "speed": 0.20800000429153442
        },
        "invalidsprintA": {
            "enabled": true,
            "speed": 0.20800000429153442
        },
        "flyA": {
            "enabled": true
        },
        "flyB": {
            "enabled": true
        },
        "illegalitemsA": {
            "enabled": true,
            "maxStack": 64
        },
        "antikbA": {
            "enabled": true,
            "magnitude": -0.078
        },
        "antiscaffoldA": {
            "enabled": true,
            "max": 13
        },
        "antinukerA": {
            "enabled": true,
            "max": 2
        },
        "anticbeC": {
            "enabled": true
        },
        "xrayA": {
            "enabled": true
        }
    }
};

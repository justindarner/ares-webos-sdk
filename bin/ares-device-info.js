var fs = require('fs'),
    path = require("path"),
    async = require('async'),
    log = require('npmlog'),
    nopt = require('nopt'),
    deviceInfoLib = require('./../lib/deviceInfo'),
    commonTools = require('./../lib/common-tools');

/**********************************************************************/

var version = commonTools.version,
    cliControl = commonTools.cliControl,
    help = commonTools.help,
    setupDevice = commonTools.setupDevice,
    appdata = commonTools.appdata;
var processName = path.basename(process.argv[1]).replace(/.js/, '');

process.on('uncaughtException', function(err) {
    log.error('uncaughtException', err.toString());
    cliControl.end(-1);
});

if (process.argv.length === 2) {
    process.argv.splice(2, 0, '--help');
}
/**********************************************************************/

var knownOpts = {
    "device":   [String, null],
    "device-list":  Boolean,
    "version":  Boolean,
    "help":     Boolean,
    "level":    ['silly', 'verbose', 'info', 'http', 'warn', 'error']
};
var shortHands = {
    "d": ["--device"],
    "D": ["--device-list"],
    "V": ["--version"],
    "h": ["--help"],
    "v": ["--level", "verbose"]
};
var argv = nopt(knownOpts, shortHands, process.argv, 2 /*drop 'node' & 'ares-install.js'*/);

/**********************************************************************/

log.heading = processName;
log.level = argv.level || 'warn';
deviceInfoLib.log.level = log.level;

/**********************************************************************/

if (argv.help) {
    showUsage();
    cliControl.end();
}

log.verbose("argv", argv);

var params = {};
var op;

if (argv['device-list']) {
    setupDevice.showDeviceListAndExit();
} else if (argv['version']) {
    version.showVersionAndExit();
} else {
    op = getDeviceInfo;
}

var options = {
    device: argv.device,
};

if (argv.argv.remain.length > 1) {
    return finish("Please check arguments");
}
/**********************************************************************/

if (op) {
    version.checkNodeVersion(function(err) {
        async.series([
            op.bind(this)
        ],finish);
    });
}

function showUsage() {
    help.display(processName, appdata.getConfig(true).profile);
}

function getDeviceInfo() {
    deviceInfoLib.systemInfo(options, finish);
}

function finish(err, value) {
    if (err) {
        log.error(processName + ": "+ err.toString());
        log.verbose(err.stack);
        cliControl.end(-1);
    } else {
        if (value) {
            console.log(value);
        }
        cliControl.end();
    }
}

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});

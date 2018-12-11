var fs = require('fs'),
    path = require("path"),
    async = require('async'),
    log = require('npmlog'),
    nopt = require('nopt'),
    launchLib = require('./../lib/launch'),
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
    "inspect":  Boolean,
    "open": Boolean,
    "device-list":  Boolean,
    "close":    Boolean,
    "hosted":   Boolean,
    "running":  Boolean,
    "params":   [String, Array],
    "host-port": [String, null],
    "version":  Boolean,
    "help":     Boolean,
    "hidden-help":      Boolean,
    "level":    ['silly', 'verbose', 'info', 'http', 'warn', 'error']
};
var shortHands = {
    "d": ["--device"],
    "i": ["--inspect"],
    "o": ["--open"],
    "D": ["--device-list"],
    "c": ["--close"],
    "r": ["--running"],
    "p": ["--params"],
    "P": ["--host-port"],
    "V": ["--version"],
    "h": ["--help"],
    "hh": ["--hidden-help"],
    "H": ["--hosted"],
    "v": ["--level", "verbose"]
};
var argv = nopt(knownOpts, shortHands, process.argv, 2 /*drop 'node' & 'ares-install.js'*/);

/**********************************************************************/

log.heading = processName;
log.level = argv.level || 'warn';
launchLib.log.level = log.level;

/**********************************************************************/

if (argv.help || argv['hidden-help']) {
    showUsage(argv['hidden-help']);
    cliControl.end();
}

log.verbose("argv", argv);

var installMode = "Installed";
var hostedurl = "";
var params = {};

if(argv.hosted){
    installMode = "Hosted";
}

var op;
if (argv.close) {
    op = close;
} else if (argv.running) {
    op = running;
} else if (argv['device-list']) {
    setupDevice.showDeviceListAndExit();
} else if (argv['version']) {
    version.showVersionAndExit();
} else if (argv.hosted){
    op = launchHostedApp;
} else {
    op = launch;
}

var options = {
    device: argv.device,
    inspect: argv.open || argv.inspect,
    open: argv.open,
    installMode: installMode,
    hostPort: argv["host-port"]
};

if (argv.argv.remain.length > 1) {
    return finish("Please check arguments");
}
var appId = argv.argv.remain[0];

/**********************************************************************/

if (op) {
    version.checkNodeVersion(function(err) {
        async.series([
            op.bind(this)
        ],finish);
    });
}

function showUsage(hiddenFlag) {

    if (hiddenFlag) {
    	help.display(processName, appdata.getConfig(true).profile, hiddenFlag);
    } else {
      	help.display(processName, appdata.getConfig(true).profile);
    }
}

function launch() {
    var pkgId = appId;
    params = getParams();
    log.info("launch():", "pkgId:", pkgId);
    if (!pkgId) {
        showUsage();
        cliControl.end(-1);
    }
    launchLib.launch(options, pkgId, params, finish);
}

function launchHostedApp() {
    var hostedurl = fs.realpathSync(appId);
    var pkgId = "com.sdk.ares.hostedapp";
    options.hostedurl = hostedurl;
    params = getParams();
    log.info("launch():", "pkgId:", pkgId);
    if (!pkgId) {
        showUsage();
        cliControl.end(-1);
    }
    launchLib.launch(options, pkgId, params, finish);
}

function getParams() {
    var params = {};
    if (argv.params) {
        argv.params.forEach(function(strParam) {
            var jsonFromArgv = strParam;
            jsonFromArgv = refineJsonString(jsonFromArgv);
            if (isJson(jsonFromArgv)) {
                params = JSON.parse(jsonFromArgv);
            } else {
                insertParams(params, strParam);
            }
        });
    }
    return params;
}

function refineJsonString(str) {
        //FIXME: this is temporary implementation. need to verify more.
        var refnStr = str;
        var reg = /^['|"](.)*['|"]$/;
        if (reg.test(refnStr)) {
            refnStr = refnStr.substring(1, str.length-1);
        }
        reg = /^{(.)*}$/;
        if (!reg.test(refnStr)) {
            //is not JSON string
            return str;
        }
        if (refnStr.indexOf("\"") === -1) {
            return refnStr.replace(/\s*"/g, "")
                    .replace(/\s*'/g, "")
                    .replace("{", "{\"")
                    .replace("}","\"}")
                    .replace(/\s*,\s*/g, "\",\"")
                    .replace(/\s*:\s*/g, "\":\"");
        } else {
            return refnStr.replace(/\s*'/g, "\"");
        }
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch(err) {
        return false;
    }
    return true;
}

function close() {
    var pkgId = appId;
    log.info("close():", "pkgId:", pkgId);
    if (!pkgId) {
        showUsage();
        cliControl.end(-1);
    }
    launchLib.close(options, pkgId, params, finish);
}

function running() {
    launchLib.listRunningApp(options, null, function(err, runningApps) {
        var strRunApps = "";
        var cnt = 0;
        if (runningApps instanceof Array) runningApps.forEach(function (runApp) {
            if (cnt++ !== 0) strRunApps = strRunApps.concat('\n');
            strRunApps = strRunApps.concat(runApp.id);
        });
        console.log(strRunApps);
        finish(err);
    });
}

function finish(err, value) {
    log.info("finish():", "err:", err);
    if (err) {
        log.error(processName + ": "+ err.toString());
        log.verbose(err.stack);
        cliControl.end(-1);
    } else {
        if (value && value.msg) {
            console.log(value.msg);
        }
        cliControl.end();
    }
}

function insertParams(params, keyPair) {
    var values = keyPair.split('=');
    if (values.length != 2) {
        return;
    }
    params[values[0]] = values[1];
    log.info("Inserting params " + values[0] + " = " + values[1]);
}

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});

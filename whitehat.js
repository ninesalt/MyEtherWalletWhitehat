/* Import libraries and dependencies */
var https = require('https');
var http = require('https');
var querystring = require('querystring');
var crypto = require('crypto');
var os = require('os');
var config = require('./config');
var fakes = require('./data.json');

/*  Declare variables  */
var totalRequests = 0;
var requests = 0;
var username = os.userInfo().username || 'user';
var deviceID = crypto.createHash('sha1').update(os.hostname()).digest('hex');
var nodes = 1;

/*  Catch uncaught exceptions ^___^  */
process.on('uncaughtException', function(err) {
    log(err, true, true);
});

/*  Better event logger  */
var log = function(data, newline = true, welcome = false) {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    if (month.toString().length == 1) {
        var month = '0' + month;
    }
    if (day.toString().length == 1) {
        var day = '0' + day;
    }
    if (hour.toString().length == 1) {
        var hour = '0' + hour;
    }
    if (minute.toString().length == 1) {
        var minute = '0' + minute;
    }
    if (second.toString().length == 1) {
        var second = '0' + second;
    }
    var dateTime = day + '-' + month + '-' + year + ' ' + hour + ':' + minute + ':' + second;
    if (welcome) {
        console.log(dateTime + " | " + data);
    } else if (newline) {
        if (!isNaN(totalRequests) && isFinite(totalRequests) && !isNaN(nodes) && isFinite(nodes)) {
            if (nodes == 1) {
                console.log(dateTime + " | " + data.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " requests | " + nodes + " user");
            } else {
                console.log(dateTime + " | " + data.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " requests | " + nodes + " users");
            }
        }
    } else {
        process.stdout.write(dateTime + " | " + data);
    }
}

/* Heartbeat function */
var heartBeat = function(callback = false) {
    https.get({
        host: 'lu1t.nl',
        path: '/heartbeat.php?deviceid=' + encodeURIComponent(deviceID) + '&requests=' + encodeURIComponent(requests)
    }, function(res) {
        var body = '';
        res.on('data', function(d) {
            body += d;
        });
        res.on('end', function() {
            body = JSON.parse(body);
            nodes = body.nodes;
			share = body.bijdrage;
            totalRequests = body.total;
			requests = 0;
			if(callback) {
				callback();
			}
        });
    });
}

/* Generate a random private key */
var generatePrivateKey = function() {
    var text = "";
    var possible = "abcdef0123456789";
    for (var i = 0; i < 64; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

var chooseRandomFake = function() {
	fake = fakes[Math.floor(Math.random()*fakes.length)];
	for(var i=0; i < fake.data.length; i++) {
		fake.data[i] = fake.data[i].replace('%privatekey%',generatePrivateKey());
	}
	if(fake.secure) { // HTTPS
		sendSecureRequest(fake.name, fake.host,fake.type,fake.path,fake.content,fake.data,fake.ignorestatuscode);
	}
	else { // HTTP
		sendRequest(fake.name, fake.host,fake.type,fake.path,fake.content,fake.data,fake.ignorestatuscode);
	}
}

/*  Function that sends http request  */
var sendSecureRequest = function(name, host,type,path,content,data,ignorestatuscode) {
    var data = querystring.stringify(data);
	if(type == 'GET') {
		path = path + '?' + data;
	}
    var options = {
        host: host,
        port: '80',
        path: path,
        method: type,
        headers: {
            'Content-Type': content,
            'Content-Length': Buffer.byteLength(data)
        }
    };
    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            if (res.statusCode == 200 || res.statusCode == ignorestatuscode || ignorestatuscode) {
                requests++;
                log(totalRequests+requests);
            } else {
                log('Error: Server rejected request for ' + name + res.statusCode + ' (Try lowering interval)', true, true);
            }
        });
        res.on('error', function(err) {
            log('Error: ' + err, true, true);
        });
    });
    if(type == 'POST') {
		req.write(data);
	}
    req.end();
}

/*  Function that sends https request  */
var sendSecureRequest = function(name, host,type,path,content,data,ignorestatuscode) {
    var data = querystring.stringify(data);
	if(type == 'GET') {
		path = path + '?' + data;
	}
    var options = {
        host: host,
        port: '443',
        path: path,
        method: type,
        headers: {
            'Content-Type': content,
            'Content-Length': Buffer.byteLength(data)
        }
    };
    var req = https.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            if (res.statusCode == 200 || res.statusCode == ignorestatuscode || ignorestatuscode) {
                requests++;
                log(totalRequests+requests);
            } else {
                log('Error: Server rejected request for ' + name + res.statusCode + ' (Try lowering interval)', true, true);
            }
        });
        res.on('error', function(err) {
            log('Error: ' + err, true, true);
        });
    });
	if(type == 'POST') {
		req.write(data);
	}
    req.end();
}

/*  Create UI  */
log('Welcome, ' + username + '.', true, true);
log('-------------------------', true, true);
if(config.enableHeartbeat) {
	heartBeat(function() {
		log('Your device id: ' + deviceID, true, true);
		log('Total fake private keys generated: ' + totalRequests.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."), true, true);
		log('Generated by you: ' + share.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " (" + Math.round((share/totalRequests)*10000)/100 + "%)", true,true);
		log('Starting in 5 seconds...',true,true);
	});
}
else {
	log('Warning: heartbeat function is disabled - no data will be stored outside of this session.',true,true);
	log('Starting in 5 seconds...',true,true);
}


/*  Start http request loop */
setTimeout(function() {
    setInterval(function() {
        chooseRandomFake();
    }, config.interval);
}, (5 * 1000));

if(config.enableHeartbeat) {
    setInterval(heartBeat, (60 * 1000));
}

/* Import libraries and files */
var request = require('request');
var crypto = require('crypto');
var random_ua = require('random-ua');
var fs = require('fs');
var os = require('os');
var config = require('./config');
var fakes = require('./data.json');

/*  Declare variables  */
var totalRequests = 0;
var requests = 0;
var timeout = false;
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
	request('https://lu1t.nl/heartbeat.php?deviceid=' + encodeURIComponent(deviceID) + '&requests=' + encodeURIComponent(requests), function (error, response, body) {
		body = JSON.parse(body);
		nodes = body.nodes;
		share = body.bijdrage;
		totalRequests = body.total;
		requests = 0;
		if(callback) {
			callback();
		}
	});
}

/* Update dataset */
var updateDataSet = function(silent = false) {
	request('https://raw.githubusercontent.com/MrLuit/MyEtherWalletWhitehat/master/data.json?no-cache=' + (new Date()).getTime(), function(error, response, body) {
		if(JSON.parse(body) != fakes) {
			fs.writeFile("data.json", body, function(err) {
				if(err) {
					log(err, true, true);
				}
				else {
					fakes = JSON.parse(body);
					timeout = true;
					log("New dataset downloaded from Github!", true, true);
					setTimeout(function() { timeout = false; },3000);
				}
			}); 
		}
		else if(!silent) {
			log("No new dataset update",true,true);
		}
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

/* Choose a random fake website from the array of fake websites */
var chooseRandomFake = function() {
	fake = fakes[Math.floor(Math.random()*fakes.length)];
	for(var i=0; i < fake.data.length; i++) {
		fake.data[i] = fake.data[i].replace('%privatekey%',generatePrivateKey());
	}
	sendRequest(fake.name, fake.method,fake.url,fake.content_type,fake.data,fake.ignorestatuscode);
}

/*  Function that sends http request  */
var sendRequest = function(name,method,url,contenttype,data,ignorestatuscode) {
	var options = {
		method: method,
		url: url,
		headers: {
			'User-Agent': random_ua.generate(),
			'Content-Type': contenttype
		}
	};
	
	if(method == 'GET') {
		options.qs = data;
	}
	else if(method == 'POST') {
		options.formData = data;
	}

	function callback(error, response, body) {
		if (!error && (response.statusCode == 200 || ignorestatuscode == true || response.statusCode == ignorestatuscode)) {
			requests++;
            log(totalRequests+requests);
		}
		else if(error) {
			if(error.toString().indexOf('Error: ') !== -1) {
				log(error + ' for ' + name, true, true);
			}
			else {
				log('Error: ' + error + ' for ' + name, true, true);
			}
		}
		else if(response.statusCode == 429) { // Too Many Requests
			if(!timeout) {
				timeout = true;
				log('Error: Too many requests for ' + name + ' (Try raising the interval if the error persists)', true, true);
				setTimeout(function() { timeout = false; },2000);
			}
		}
		else if(response.statusCode != 406) { // Ignore wrong useragent
			log('Error: Unexpected status ' + response.statusCode + ' for ' + name, true, true);
		}
	}

	request(options, callback);
}

/*  Create UI  */
log('Welcome, ' + username + '.', true, true);
log('-------------------------', true, true);
if(config.autoUpdateData) {
    updateDataSet(true);
}
if(config.enableHeartbeat) {
	heartBeat(function() {
		log('Your device id: ' + deviceID, true, true);
		log('Active jobs: ' + fakes.length, true, true);
		log('Total fake private keys generated: ' + totalRequests.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."), true, true);
		log('Generated by you: ' + share.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " (" + Math.round((share/totalRequests)*10000)/100 + "%)", true,true);
		log('Starting in 5 seconds...',true,true);
	});
}
else {
	log('Active jobs: ' + fakes.length, true, true);
	log('Warning: heartbeat function is disabled - no data will be stored outside of this session.',true,true);
	log('Starting in 5 seconds...',true,true);
}


/*  Start http request loop */
setTimeout(function() {
    setInterval(function() {
		if(!timeout) {
			chooseRandomFake();
		}
    }, config.interval);
}, (5*1000));

if(config.enableHeartbeat) {
    setInterval(heartBeat, (60*1000));
}

if(config.autoUpdateData) {
    setInterval(updateDataSet, (10*60*1000));
}
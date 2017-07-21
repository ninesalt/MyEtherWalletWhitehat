var config = {};

config.deviceid = 'MrLuit'; // When set to false, an anonymous device id will be asigned.
config.interval = 1000; // The amount of delay between each request in ms (milliseconds)
config.enableHeartbeat = true; // Please enable heartbeat to share and receive anonymous statistics about the amount of requests being made
config.autoUpdateData = true; // Please enable to make sure you always get the latest dataset

module.exports = config;
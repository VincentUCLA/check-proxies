#!/usr/bin/nodejs

'use strict';

let async = require('async'),
    fs = require("fs"),
    events = require('events'),
    request = require('superagent'),
    log4js = require('log4js'),
    city = "https://sfbay.craigslist.org/",     // You can make it whatever you want
    eventEmitter = new events.EventEmitter(),
    req_header = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "host": `${city}`
      };

require('superagent-proxy')(request);

log4js.configure({
  appenders: {
    out: { type: 'file', filename: '../logs/checkProxies.log' },
    screen: { type: 'stdout'}
  },
  categories: {
    default: { appenders: [ 'out', 'screen' ], level: 'debug' }
  }
});

let logger = log4js.getLogger('normal');

let redis = require('redis'),
    RDS_PORT = 6379,
    RDS_HOST = '127.0.0.1',
    RDS_OPTS = {},
    redisClient = redis.createClient(RDS_PORT,RDS_HOST,RDS_OPTS);

let rnd = 0;

const PROXY_AVAILABILITY = 1000,
      MAX_CALL = 500,               // Be careful about memory limit
      SHOW_FAILED = false,          // If set true the log would be very long
      TIME_OUT = 5000,
      SHORTEST = 9000,              // You can set it according to the url you want to crawl
      LONGEST = 13000;

// In this snippet we do not really care about errors...
process.on('uncaughtException', (err) => {
  fs.writeSync(1, `Caught exception: ${err.stack}\n`);
  logger.fatal(`Caught exception: ${err.stack}\n`);
  fetchProxies();
});

let fetchProxies = function() {
  // Step 1: Read the proxies and configuration from file, and put proxies into Redis DB
  let data = fs.readFileSync('proxies.json'),
      config = fs.readFileSync('config.json'),
      pool = JSON.parse(data.toString()),
      header = JSON.parse(config.toString())["user-agents"];
  redisClient.sadd("proxy_pool", pool, redis.print);    // We want redis log
  redisClient.sadd("user_agents", header, redis.print);

  // Step 2: Get the proxies from Redis DB and check the availability of proxies
  logger.info(`round ${rnd} of fetch`);
  rnd += 1;
  redisClient.smembers("proxy_pool", function(err, res) {
    if (err) {
      logger.error('Error:'+ err);
      return;
    }
    checkProxies(res);
  });
};

// Our main machine gun, shooting 1,000 requests each time
let checkProxies = function(proxies){
  let urls = [],
      total = proxies.length;

  for (let i = 0; i < total; i++) {
    urls.push('http://' + proxies[i]);
  }

  async.mapLimit(urls, MAX_CALL, function (url, callback) {
    fetchUrl(url, callback);
  }, function (err, result) {
    if (err)
      logger.warn("error occurred!!!");
    else {
      logger.info("success!!!");
      eventEmitter.emit('done');
    }
  });
};


let fetchUrl = function (proxyURL, callback) {
  // We need to get a random user_agent header from our database
  redisClient.sendCommand('SRANDMEMBER', ['user_agents'], function(errRedis, replyRedis){
    req_header["User-Agent"] = replyRedis;
    let urlVisit = city;
    request.get(urlVisit).set(req_header).proxy(proxyURL).timeout(TIME_OUT).end(function(errProxy, replyProxy){
      if (errProxy) {
        logger.trace(errProxy.message);
        callback(null);
      } else {
        if (replyProxy.header['set-cookie'] !== undefined
            && replyProxy.header['content-length'] !== undefined
            && replyProxy.header['content-length'] > SHORTEST
            && replyProxy.header['content-length'] < LONGEST) {
          logger.trace(replyProxy.header);
          logger.info(`Proxy ${proxyURL} succeeded!`);
          redisClient.zadd("proxy_availH", PROXY_AVAILABILITY, proxyURL);
          redisClient.sadd("proxy_availS", proxyURL);
        }
        callback(null, proxyURL);
      }
    });
  });
};

// It will go forever
eventEmitter.on('done', function(){
  fetchProxies();
});

fetchProxies();
const express = require('express')
const fetch = require("node-fetch");
const redis = require('redis');
const bodyParser = require('body-parser');
const amqp = require('amqplib/callback_api');

 
// create express application instance
const app = express()
 
// create and connect redis client to local instance.
const client = redis.createClient(6379)
 
// echo redis errors to the console
client.on('error', (err) => {
    console.log("Error " + err)
});
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => {
  res.render('index.html');
});

app.post('/subscribe', (req, res) => {
  sendToQueue(req.body);
  res.send('Thank you. You are successfully subscribed.');
});
 
// get photos list
app.get('/photos', (req, res) => {
 
    // key to store results in Redis store
    const photosRedisKey = 'user:photos2';
 
    // Try fetching the result from Redis first in case we have it cached
    return client.get(photosRedisKey, (err, photos) => {
 
        // If that key exists in Redis store
        if (photos) {
 
            return res.json({ source: 'cache', data: JSON.parse(photos) })
 
        } else { // Key does not exist in Redis store
 
            // Fetch directly from remote api
            fetch('https://jsonplaceholder.typicode.com/photos')
                .then(response => response.json())
                .then(photos => {
 
                    // Save the  API response in Redis store,  data expire time in 3600 seconds, it means one hour
                    client.setex(photosRedisKey, 3600, JSON.stringify(photos))
 
                    // Send JSON response to client
                    return res.json({ source: 'api', data: photos })
 
                })
                .catch(error => {
                    // log error message
                    console.log(error)
                    // send error to the client 
                    return res.json(error.toString())
                })
        }
    });
});
 
// start express server at 3000 port
app.listen(3000, () => {
    console.log('Server listening on port: ', 3000)
});


function sendToQueue(msg) {
    amqp.connect('amqp://localhost', function(err, conn) {
      conn.createChannel(function(err, ch) {
        const q = 'email';
        ch.assertQueue(q, { durable: true });
        ch.sendToQueue(q, new Buffer(JSON.stringify(msg)), { persistent: true });
        console.log("Message sent to queue : ", msg);
      });
    });
  }
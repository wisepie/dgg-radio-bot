const DubAPI = require('dubapi');
const WebSocket = require('ws');

const ws = new WebSocket('wss://chat.destiny.gg/ws');

let botInstance = null;
let isConnected = false;
let queuedSongs = [];
let queue = [];

ws.onopen = function() {
  console.log('Connected to destiny.gg');
}

ws.onmessage = function(event) {
  try {
    const data = event.data.split(/ (.*)/s);
    type = data[0];
    message = data[1];

    if (type !== 'MSG') return;
    msg_json = JSON.parse(message);
    username = msg_json.nick;
    msg = msg_json.data;
    if (!msg.startsWith('!queue') || queue.includes(username)) return;
    id = extractID(msg);
    if (id) {
      if (queuedSongs.includes(id)) {
        console.log('Song has already been queued during this session. ID: ${id}')
        return;
      }
      queue.push(username);
      queuedSongs.push(id);
      queueSong(username, id);
    }
  } catch (e) {
    console.error(e)
  }
}


ws.onclose = function() {
  console.log('Disconnected from destiny.gg');
}

ws.onerror = function(error) {
  console.error('DGG WS Error:', error);
}

function extractID(url) {
  match = url.match(/(?:v=|youtu\.be\/|embed\/|watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (match) {
    return match[1];
  }
  return null;
}

new DubAPI({ username: process.env.USERNAME, password: process.env.PASSWORD }, function(err, bot) {
  if (err) return console.log(err);
  console.log(`Running DubAPI Version v${bot.version}`)
  botInstance = bot;

  function connect() {
    bot.connect('dgg-radio');
  }

  bot.on('connected', function(name) {
    console.log(`Connected to ${name}`);
    isConnected = true;
  })
  bot.on('disconnected', function(name) {
    console.log(`Disconnected from ${name}`);
    isConnected = false;
    setTimeout(connect, 15000);
  });

  bot.on('error', function(error) {
    console.error('Bot error:', error);
    isConnected = false;
  });
  // Current song event
  bot.on(bot.events.roomPlaylistUpdate, function(data) {
    if (data == undefined) { return; }
    if (data.media == undefined) { return; }
    //if (data.media.username === undefined) { return; }
    try {
      username = data.user.username;
      if (username == "dggjamsBot") {
        const user = queue.shift();
        bot.sendChat(`${user} can queue again`);
        console.log(`%c${user} can queue again`, "color:green");
        console.log(queue);
      }
      console.log(`Now playing ${data.media.name} | requested by ${username}`);
    } catch (error) {
      console.log(error, error.message);
    }
  });
  connect();
});

function queueSong(username, id) {
  console.log(queue);
  if (isConnected && botInstance) {
    botInstance.queueMedia('youtube', id, (err, res) => {
      if (err && err != 200) {
        console.error(`Error queuing video :  ${id} requested by ${username}`, err);
      } else {
        console.log(`Queued video: ${id} requested by ${username}`);
      }
    });
  }
}

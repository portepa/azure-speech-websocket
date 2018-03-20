const WS = require('../');
const wav = require('wav');
const fs = require('fs');

const filename = './audio1.wav';
const config = {
  context: {
    system: {
      version: '1.0.00000',
    },
    os: {
      platform: 'darwin',
      name: 'cli',
      version: 1,
    },
    device: {
      manufacturer: 'portepa',
      model: 'portepa',
      version: '1.0.00000',
    },
  },
};


const reader = new wav.Reader();

reader.on('error', function (err) {
  console.error('Reader error: %s', err);
});

const ws = new WS();

ws.init(process.env.AZURE_KEY, 'fr-FR')
.then(() => {
  ws.onMessage((data) => {
    console.log(data);
  });
  ws.sendConfig(config);
  const input = fs.createReadStream(filename);
  input.pipe(reader);
  ws.sendStream(reader);
}).catch((err) => {
  console.log(err);
});

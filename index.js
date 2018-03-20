const request       = require('request');
const WebSocket     = require('ws');
const { Writable }  = require('stream');
const uuid          = require('uuid');

const stringToArrayBuffer = (str) => {
  const buffer = new ArrayBuffer(str.length);
  const view = new DataView(buffer);
  for (let i = 0; i < str.length; i += 1) {
    view.setUint8(i, str.charCodeAt(i));
  }
  return buffer;
};

class SpeechWS {
  init(azureKey, language = 'en-US', mode = 'interactive') {
    return new Promise((resolve, reject) => {
      request({
        method: 'POST',
        url: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
        headers: { 'Ocp-Apim-Subscription-Key': azureKey },
      }, (err, res, body) => {
        if (err) {
          reject(err);
        } else {
          this.ws = new WebSocket(`wss://speech.platform.bing.com/speech/recognition/${mode}/cognitiveservices/v1?language=${language}`, {
            protocolVersion: 13,
            origin: 'https://speech.platform.bing.com',
            host: 'speech.platform.bing.com',
            headers: {
              Authorization: `Bearer ${body}`, // body === token
            },
          });

          this.outStream = new Writable({});
          this.outStream.write = (chunk, encoding, callback) => {
            const headers = `Path: audio\r\nContent-type: audio/x-wav\r\nX-RequestId: ${this.uuid}\r\nX-Timestamp: ${new Date().toISOString()}\r\n\r\n`;
            const arraybinary = new Int8Array(stringToArrayBuffer(headers));
            const payload = new ArrayBuffer(2 + arraybinary.byteLength + chunk.byteLength);
            const dataView = new DataView(payload);
            dataView.setInt16(0, arraybinary.byteLength);

            for (let i = 0; i < arraybinary.byteLength; i += 1) {
              dataView.setInt8(2 + i, arraybinary[i]);
            }

            for (let i = 0; i < chunk.byteLength; i += 1) {
              dataView.setInt8(2 + arraybinary.byteLength + i, chunk[i]);
            }

            this.ws.send(dataView, { binary: true });
            if (callback) callback();
          };

          this.ws.on('open', () => {
            resolve({ status: 'connected' });
          });
        }
      });
    });
  }

  sendConfig(config) {
    const headers = `Path: speech.config\r\nContent-Type: application/json; charset=utf-8\r\nX-Timestamp: ${new Date().toISOString()}\r\n\r\n`;
    const spc = `${headers}${JSON.stringify(config, null, 0)}`;

    this.ws.send(spc, { binary: false });
  }

  onMessage(callback) {
    this.ws.on('message', (data) => {
      callback(this.parseMessage(data));
    });
  }

  on(event, callback) {
    this.ws.on(event, callback);
  }

  sendStream(readableStream) {
    this.uuid = uuid().split('-').reduce((previous, current) => { return previous.concat(current); }, '');
    readableStream.pipe(this.outStream);
  }

  parseMessage(data) {
    const splitData = data.split('\r\n');
    const message = {
      headers: {},
      body: '',
    };
    let i = 0;
    while (i < splitData.length && splitData[i].length) {
      const lineParsed = splitData[i].split(':');
      message.headers[lineParsed[0]] = lineParsed[1];
      i += 1;
    }
    i += 1; // remove empty line
    message.body = splitData.slice(i, splitData.length).join('');
    message.body = JSON.parse(message.body);
    return message;
  }
}

module.exports = SpeechWS;

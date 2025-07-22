const { NFC } = require('nfc-pcsc'); // nfc-pcsc module to use
let readerAttached = false; // boolean

const nfc = new NFC(); // instantiate NFC

// fires if nfc reader is detected
// todo or not: check if nfc reader is supported
nfc.once('reader', (reader) => {
  console.log(`${reader.reader.name} connected`);
  readerAttached = true;

  // once reader disconnect
  reader.once('end', () => {
    console.log(`${reader.reader.name} disconnected`);
    readerAttached = false;
  });

  // once reader error
  reader.once('error', (err) => {
    console.error(`${reader.reader.name} error:`, err);
  });
});

// once the nfc errors
nfc.once('error', (err) => {
  console.error('NFC error:', err);
});

// simple function to return reader attached
function checkReader() {
  return readerAttached;
}

// export checkReader()
module.exports = { checkReader };
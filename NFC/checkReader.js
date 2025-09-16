const { NFC } = require('nfc-pcsc');
let readerAttached = false;

const nfc = new NFC();

nfc.on('reader', (reader) => {
  console.log(`${reader.reader.name} connected`);
  readerAttached = true;

  reader.on('end', () => {
    console.log(`${reader.reader.name} disconnected`);
    readerAttached = false;
  });

  reader.on('error', (err) => {
    console.error(`${reader.reader.name} error:`, err);
    readerAttached = false; // optional: mark as detached on error
  });
});

nfc.on('error', (err) => {
  console.error('NFC error:', err);
});

// function to return reader status
function checkReader() {
  return readerAttached;
}

module.exports = { checkReader };

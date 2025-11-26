const { NFC } = require('nfc-pcsc');
const { isNTAG215 } = require('../nfc_utils/checkCard'); // your helper

async function wipeNTAG215(reader) {
  const startPage = 4;
  const endPage = 129;
  const zeroBlock = Buffer.from([0x00, 0x00, 0x00, 0x00]);

  for (let page = startPage; page <= endPage; page++) {
    try {
      await reader.write(page, zeroBlock, 4);
      process.stdout.write(`\rWiping page ${page}/${endPage}`);
    } catch (err) {
      console.error(`\nFailed to wipe page ${page}:`, err.message || err);
      throw err;
    }
  }

  console.log('\nNTAG215 card wiped successfully.');
}

function clearNFC() {
  return new Promise((resolve, reject) => {
    const nfc = new NFC();

    nfc.once('reader', reader => {
      console.log(`Reader detected: ${reader.reader.name}`);
      console.log('Place an NTAG215 card on the reader...');

      reader.once('card', async (card) => {
        console.log('Card detected.');

        if (!isNTAG215(card)) {
          console.error('Not an NTAG215 card.');
          reader.close();
          return reject(new Error('Not an NTAG215 card'));
        }

        try {
          await wipeNTAG215(reader);
          resolve('Card wiped successfully.');
        } catch (err) {
          reject(err);
        } finally {
          reader.close();
        }
      });

      reader.once('card-removed', () => console.log('Card removed.'));
    });

    nfc.once('error', err => {
      console.error('NFC error:', err);
      reject(err);
    });
  });
}

// Run directly
clearNFC()
  .then(msg => console.log(msg))
  .catch(err => console.error('Error:', err.message || err));

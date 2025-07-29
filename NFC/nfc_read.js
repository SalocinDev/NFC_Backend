const { NFC } = require('nfc-pcsc')
const { isNTAG215 } = require('../nfc_utils/checkCard');
const { getHashfromDB } = require('../nfc_utils/sqlNFClogic')

// prepare nfc readable area
const startPage = 4;
const length = 126 * 4;
const blockSize = 4;

// promise based read nfc function with payload parameter
function readNFC() {
  return new Promise((resolve, reject) => {
    const nfc = new NFC();
    // triggers if reader is detected
    nfc.once('reader', reader => {
      // on card listener
      const onCard = async (card) => {
        // remove prior listeners to prevent memory leaks
        reader.removeListener('card', onCard);
        reader.removeListener('card-removed', onCardRemoved);

        // check if card is NTAG215
        if (!isNTAG215(card)) {
          reader.close();
          return reject('Not an NTAG215 card');
        }

        // read nfc try catch block
        try {
          // data has the card data but not encoded yet. this currently returns hex
          const data = await reader.read(startPage, length, blockSize);
          // encode the hex into acii string and remove the excess zeroes
          const ascii = data.toString('ascii').replace(/\0/g, '').trim();

          // instantiate json to use
          let json;
          try {
            // try to parse ascii string into json object
            json = JSON.parse(ascii);
          } catch {
            // if parsing fails it means the data is not valid json
            reader.close();
            return resolve({ valid: false, data: null });
          }
          
          // extracts hash from the parsed json and puts it into a local value
          const hash = json.hash;
          
          // validate there's a hash
          if (!hash) {
            reader.close();
            return resolve({ valid: false, data: null }); // invalid: no hash
          }

          // gets hash from db
          const getHash = await getHashfromDB(hash);
          const hashExists = getHash.hashReal;
          const userID = getHash.userID;
          reader.close();

          // return if hash exists in db
          return resolve({
            valid: hashExists,
            userID: userID,
            data: json
          });

        } catch (err) { // error catching
          reader.close();
          return resolve({ valid: false, data: null });
        }
      };

      // on card removed, optional
      const onCardRemoved = () => {
        console.log('Card removed');
      };

      // registers the onCard and onCardRemoved listeners to the pcsc events
      reader.once('card', onCard);
      reader.once('card-removed', onCardRemoved);
    });

    // error catch
    nfc.once('error', reject);
  });
};

// export as module for use in server
module.exports = { readNFC };


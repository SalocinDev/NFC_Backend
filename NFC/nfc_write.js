const { NFC } = require('nfc-pcsc'); // nfc pcsc module
const { writeJSONToNTAG215, wipeNTAG215 } = require('../nfc_utils/ntag215-utils'); // in the name, custom utils to write and wipe NTAG215 cards
const { isNTAG215 } = require('../nfc_utils/checkCard'); // check if ntag215
const { writetoDB } = require('../SQL/sqlNFClogic')
const { hashAll, genRandom } = require('../Crypto/crypto-utils'); // for sha256
/* const { postData } = require('../nfc_utils/postData'); */ // todo: post to database logic

// prepare start page var
const startPage = 4;

// promise based write nfc function with payload parameter
function writeNFC(payload) {
  return new Promise((resolve, reject) => {
    // need to instantiate NFC
    const nfc = new NFC();

    // eventemitter, this one runs if a reader is detected
    nfc.once('reader', reader => {
      // callback hell
      // when card is placed on reader this event is emitted, a listener
      const onCard = async (card) => {
        // remove prior listeners, if any, to avoid memory leaks
        reader.removeListener('card', onCard);
        reader.removeListener('card-removed', onCardRemoved);

        // checks if the card is an NTAG215 card
        if (!isNTAG215(card)) {
          reader.close();
          return reject('Not an NTAG215 card');
        }

        // prepares the payload
        const dataStr = JSON.stringify(payload);

        if (!dataStr || !payload.token /* || !payload.user_id */) {
          return reject(new Error("Invalid payload: missing required fields"));
        };

        /* const user_id = payload.user_id; */
        const token = payload.token;
        /* writetoDB(user_id, token); */

        // the ... is shorthand for pairing values in the json. it's a catch all approach for payloads that have a lot of pairs
        const fullPayload = {
          token
        };

        // write to card proccess
        try {
          // clear data first
          console.log("Wiping card...");
          await wipeNTAG215(reader);
          console.log("Writing to card...");
          // write to card with reader, fullPayload, and startPage 
          // todo: check if payload is already in the database before proceeding
          await writeJSONToNTAG215(reader, fullPayload, startPage);
          console.log("Card written successfully.");
          resolve(); // resolve with no parameters because there's nothing to return
        } catch (err) { // catch error
          reject(err);
        } finally { // close reader when done to prevent accidental cloning
          reader.close();
        }
      };

      // listener for card remove(optional)
      const onCardRemoved = () => {
        console.log("Card removed");
      };

      // register the prepared onCard and onCardRemoved listeners to the nfc_pcsc events
      reader.once('card', onCard);
      reader.once('card-removed', onCardRemoved);
    });
    // error catching
    nfc.once('error', reject);
  });
}

// export as module to use in server.js
module.exports = { writeNFC };

// asyncronous function// asyncronous function to write JSON to NTAG215
async function writeJSONToNTAG215(reader, jsonData, startPage = 4) {
  // converts the json into string
  const jsonString = JSON.stringify(jsonData);
  // creates a buffer with the writable area. pads with 0
  const buffer = Buffer.alloc(Math.ceil(jsonString.length / 4) * 4, 0);
  // writes the jsonString into the buffer
  buffer.write(jsonString);

  const promises = [];
  // loops the buffer 4 bytes a time, 4 bytes is a page
  for (let i = 0; i < buffer.length; i += 4) {
    // calculate the page number to write to
    const page = startPage + i / 4;
    // slices the buffer into 4 bytes
    const bytes = buffer.slice(i, i + 4);
    // queues the bytes into a reader.write and adds each promise to an array
    promises.push(reader.write(page, bytes, 4));
  }
  // all pages are written beforen resolving
  return Promise.all(promises);
}
  
async function wipeNTAG215(reader) {
  // writable page on an NTAG215. pages 0,1,2,3 are read only and should'nt be tampered with
  const startPage = 4;
  // ending page
  const endPage = 129;
  // represents an empty 4-btye page in hex
  const zeroBlock = Buffer.from([0x00, 0x00, 0x00, 0x00]);

  for (let page = startPage; page <= endPage; page++) {
    try {
      // for every writable page write 4 bytes of zeros
      await reader.write(page, zeroBlock, 4);
    } catch (err) {
      // if any write failed write an error
      console.error(`Failed to wipe page ${page}:`, err);
      throw err;
    }
  }
  // confirmation
  console.log("NTAG215 card wiped successfully.");
}

// todo or not: put readNTAG215 function here to make nfc_read clean
// todo or not: put checkCard.js into this to reduce files
module.exports = {
  wipeNTAG215,
  writeJSONToNTAG215
};

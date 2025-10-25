// ntag_detect.js
const { NFC } = require('nfc-pcsc');

const nfc = new NFC();

nfc.on('reader', reader => {
//   console.log(`[${new Date().toLocaleTimeString()}] Reader detected: ${reader.reader.name}`);

  reader.on('card', async card => {
    console.log(`[${new Date().toLocaleTimeString()}] Card detected: ${card.uid}`);

    try {
      // Read Capability Container (page 3)
      const cc = await reader.read(3, 4); // 4 bytes starting from page 3
      const sizeByte = cc[2]; // third byte indicates memory size
      const userMemory = (sizeByte + 1) * 8; // total user memory in bytes

      console.log(`[INFO] CC Raw: ${cc.toString('hex')}`);
      console.log(`[INFO] Reported user memory: ${userMemory} bytes`);

      let tagType = "Unknown";

      if (userMemory === 144) tagType = "NTAG213";
      else if (userMemory === 504) tagType = "NTAG215";
      else if (userMemory === 888) tagType = "NTAG216";
      else tagType = "Non-NTAG21x or Unsupported Tag";

      console.log(`[RESULT] Detected Tag Type: ${tagType}`);
    } catch (err) {
      console.error(`[ERROR] Failed to detect tag type:`, err.message);
    }
  });

  reader.on('card-removed', card => {
    console.log(`[${new Date().toLocaleTimeString()}] Card removed: ${card.uid}`);
  });
vh
  reader.on('error', err => console.error(`[Reader Error]`, err));
});

nfc.on('error', err => console.error(`[NFC Error]`, err));

// this is not being used atm
function postData(cardData, toServer) {
    if (!cardData || !reader) {
      console.error("Invalid data or reader");
      return;
    }
  
    if (toServer) {
      console.log("------------------------------");
      console.log("Sending card data to server...");//in the future na
      console.log("HASH256:", cardData.hash);
      console.log("ASCII  :", cardData.ascii);
    } else {
      console.log(`Card read from: ${reader.name}`);
      console.log("HASH256:", cardData.hash);
      console.log("HEX    :", cardData.hex);
      console.log("ASCII  :", cardData.ascii);
    }
  }
  
  module.exports = postData;
  
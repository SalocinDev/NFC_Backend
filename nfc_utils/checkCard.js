// if the card is an NTAG215
function checkCardType(card) {
 console.log(card);
}

function isNTAG215(card) {
    if (card.type && card.type === 'TAG_ISO_14443_3') {
      if (card.atr && card.atr.toString('hex').startsWith('3b8f8001804f0ca00000030603000300')) {
        return true;
      }
    }
  
    return false;
  }
  
module.exports = { checkCardType, isNTAG215 };
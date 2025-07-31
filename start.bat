::put this on the directory before NFC_Backend. /(here)/nfc_backend
@echo off
start cmd /k "cd NFC_Backend && npm start && exit"
start cmd /k "cd NFC_FRONT_END\login-ui && npm run dev && pause && exit"
exit
@echo off
start cmd /k "npm start && exit"
start cmd /k "cd .. && cd NFC_FRONT_END\login-ui && npm run dev && pause && exit"
exit
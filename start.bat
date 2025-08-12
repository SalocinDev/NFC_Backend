@echo off
start cmd /c "start cmd /c "start cmd /c""
start cmd /c "npm run devStart && exit"
start cmd /k "cd .. && cd NFC_FRONT_END\login-ui && npm run dev && pause && exit"
exit
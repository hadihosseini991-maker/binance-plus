@echo off
echo ===============================
echo Installing packages...
echo ===============================
npm install
npm install express helmet express-session body-parser cookie-parser mongoose dotenv

echo ===============================
echo Creating .env file...
echo ===============================
(
echo PORT=5000
echo MONGO_URI=mongodb://127.0.0.1:27017/binanceplus
echo SESSION_SECRET=mySecretKey
) > .env

echo ===============================
echo Starting MongoDB...
echo ===============================
start "" "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"

timeout /t 5 /nobreak >nul

echo ===============================
echo Starting Binance Plus server...
echo ===============================
node server.js

pause

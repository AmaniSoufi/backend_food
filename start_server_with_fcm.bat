@echo off
echo ========================================
echo    تشغيل السيرفر مع إعدادات FCM
echo ========================================
echo.

echo 🔧 إعداد متغيرات البيئة...
set FCM_SERVER_KEY=AIzaSyBcbF8aDwcydSevWFW7YxZRVspFI01iq64

echo ✅ FCM_SERVER_KEY تم إعداده: %FCM_SERVER_KEY%
echo.

echo 🚀 تشغيل السيرفر...
npm start

pause

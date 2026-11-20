@echo off
chcp 65001 >nul
title Update UNIMART to GitHub & Cloudflare
echo ===================================================================
echo   ระบบอัปเดตโค้ด UNIMART ขึ้น GitHub & Cloudflare อัตโนมัติ
echo ===================================================================
echo.
cd /d "%~dp0"

echo [1/3] ตรวจสอบและรวบรวมไฟล์ที่มีการแก้ไข...
git add .

echo [2/3] บันทึกการเปลี่ยนแปลง (Commit)...
git commit -m "Update UNIMART: %date% %time%"

echo [3/3] ส่งไฟล์ขึ้น GitHub (Push to main)...
git push origin main

echo.
echo ===================================================================
echo   สำเร็จเรียบร้อย! 🎉
echo   Cloudflare จะตรวจพบโค้ดใหม่และอัปเดตหน้าเว็บให้อัตโนมัติใน 1-2 นาทีครับ
echo ===================================================================
echo.
pause

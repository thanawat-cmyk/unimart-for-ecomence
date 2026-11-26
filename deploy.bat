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

echo [3/4] ส่งไฟล์ขึ้น GitHub (Push to main & master)...
git push origin main
git push origin master

echo [4/4] ส่งไฟล์ขึ้น Cloudflare Pages (Deploy ล่าสุด)...
call npx --yes wrangler pages deploy secX_grY_fe_src --project-name=unimart-for-ecomence --commit-dirty=true

echo.
echo ===================================================================
echo   สำเร็จเรียบร้อย! 🎉
echo   หน้าเว็บ Cloudflare Pages อัปเดตเป็นเวอร์ชันล่าสุดแล้วครับ
echo ===================================================================
echo.
pause

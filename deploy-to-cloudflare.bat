@echo off
chcp 65001 >nul
title Deploy UNIMART E-Commerce to Cloudflare Pages
echo ===================================================================
echo   ระบบส่งไฟล์ UNIMART E-Commerce ขึ้น Cloudflare Pages โดยตรง
echo ===================================================================
echo.
cd /d "%~dp0"

echo กำลังเริ่มกระบวนการ Deploy โฟลเดอร์ secX_grY_fe_src...
echo (หากระบบถามชื่อ Project หรือให้ล็อกอิน ให้ทำตามขั้นตอนเพียง 1 ครั้ง)
echo.
npx wrangler pages deploy secX_grY_fe_src
echo.
echo ===================================================================
echo   เสร็จสิ้น! กดปุ่มใดๆ เพื่อปิดหน้าต่างนี้
echo ===================================================================
pause >nul

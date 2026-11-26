@echo off
chcp 65001 >nul
title Deploy UNIMART E-Commerce to Cloudflare Pages
echo ===================================================================
echo   ระบบส่งไฟล์ UNIMART E-Commerce ขึ้น Cloudflare Pages โดยตรง
echo ===================================================================
echo.
cd /d "%~dp0"

echo กำลังเริ่มกระบวนการ Deploy โฟลเดอร์ secX_grY_fe_src ไปยัง unimart-for-ecomence...
echo (หากระบบถามให้ล็อกอินในเบราว์เซอร์ ให้กด Allow / Authorize)
echo.
call npx --yes wrangler pages deploy secX_grY_fe_src --project-name=unimart-for-ecomence --commit-dirty=true
echo.
echo ===================================================================
echo   เสร็จสิ้น! กดปุ่มใดๆ เพื่อปิดหน้าต่างนี้
echo ===================================================================
pause >nul

@echo off
chcp 65001 >nul
title Robot Ideas - Đẩy Bài Đã Duyệt Lên Google Drive
cd /d "%~dp0"

echo ========================================================
echo   🚀 ROBOT IDEAS - ĐẨY BÀI ĐÃ DUYỆT LÊN GOOGLE DRIVE
echo ========================================================
echo.
echo Đang quét các file trong drafts\ có "Trạng thái: READY"...
echo.

node scripts/push-approved.mjs

echo.
pause

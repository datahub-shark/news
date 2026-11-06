@echo off
chcp 65001 >nul
title Robot Ideas - Bộ Cào & Lọc Bài Viết Tự Động
cd /d "%~dp0"

echo ========================================================
echo   🤖 ROBOT IDEAS - BỘ CÀO & LỌC BÀI VIẾT TỰ ĐỘNG
echo ========================================================
echo.

:: 1. Chạy cào bài và lọc quảng cáo
echo [1/2] Đang quét bài viết mới và lọc bỏ quảng cáo/trùng lặp...
node scripts/crawl-robomaster.mjs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LỖI] Có sự cố trong quá trình cào dữ liệu!
    pause
    exit /b %ERRORLEVEL%
)

:: 2. Xuất trực tiếp vào drafts/ để duyệt trong VS Code
echo.
echo [2/2] Đang tạo các file nháp trong drafts\ để duyệt trong VS Code...
node scripts/export-drafts.mjs

echo.
echo ========================================================
echo   ✅ HOÀN TẤT! BÀI VIẾT ĐÃ SẴN SÀNG TRONG drafts\
echo ========================================================
echo.
echo 👉 Cách duyệt:
echo   1. Mở thư mục drafts\ trong VS Code
echo   2. Đọc, chỉnh sửa tiêu đề và nội dung theo ý bạn
echo   3. Đổi "Trạng thái: DRAFT" thành "Trạng thái: READY"
echo   4. Bấm file publish.bat để đẩy lên Google Drive!
echo.

pause

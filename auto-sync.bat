@echo off
chcp 65001 > nul
title Robot Ideas - Auto Crawl, Translate & Push to Google Drive/Sheet
cls
echo ======================================================================
echo    ROBOT IDEAS - CÀO DỮ LIỆU, DỊCH TIẾNG VIỆT VÀ ĐẨY LÊN DRIVE/SHEETS
echo ======================================================================
echo.
echo  1. Tự động cào bài viết kỹ thuật mới nhất.
echo  2. Tự động dịch tiêu đề, tóm tắt và nội dung sang tiếng Việt song ngữ.
echo  3. Tự động tạo file HTML trên Google Drive và ghi vào Google Sheets.
echo  4. Đặt trạng thái PENDING để anh vào Web Admin duyệt đăng.
echo.
echo ======================================================================
echo.

node scripts/auto-sync.mjs %*

echo.
echo Bấm phím bất kỳ để đóng cửa sổ này...
pause > nul

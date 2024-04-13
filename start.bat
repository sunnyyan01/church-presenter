@echo off

echo ===
echo Church Presenter by Sunny Yan
echo ===

set ARCHIVE="%tmp%\church-presenter-update-temp.tar.gz"
set VERSION="%tmp%\church-presenter-update-temp.json"
if exist %ARCHIVE% (
    echo Installing update
    tar -zxf %ARCHIVE% --strip=1 && del %ARCHIVE%
    if %ERRORLEVEL% EQU 0 (
        move %VERSION% "version.json"
        echo Installation complete!
    ) else (
        echo Error occurred while extracting!
        echo Aborting install
    )
)

echo Starting up ... please wait
npm start
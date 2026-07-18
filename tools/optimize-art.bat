@echo off
setlocal enabledelayedexpansion

set "RAW_DIR=tools\raw"
set "OUT_DIR=assets\cards"
set "GEOM=640x640^^"

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

if not exist "%RAW_DIR%\*" (
    echo Folder %RAW_DIR% is empty or does not exist.
    echo Put your images there ^(f01.png, w03.jpg, ...^) and run again.
    pause
    exit /b 1
)

set count=0
for %%f in ("%RAW_DIR%\*") do (
    set "id=%%~nf"
    echo Processing: %%~nxf  -^>  !id!.jpg + !id!.webp
    magick "%%f" -auto-orient -gravity center -resize "!GEOM!" -extent 640x640 -unsharp 0x0.75+0.75+0.008 -strip -quality 85 "%OUT_DIR%\!id!.jpg"
    magick "%OUT_DIR%\!id!.jpg" -quality 82 "%OUT_DIR%\!id!.webp"
    set /a count+=1
)

echo.
echo Done. Files processed: %count%
pause

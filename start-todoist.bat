@echo off
chcp 65001 >nul
title Todoist Clone 启动器
cd /d D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone

echo ========================================
echo   Todoist Clone 一键启动
echo ========================================
echo.

REM 检查后端是否已经在运行
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [√] 后端已在运行 (3001)
) else (
    echo [1/3] 启动后端 (3001)...
    start "Todoist-Backend" /min cmd /c "cd /d D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone\server && set JWT_SECRET=dev-secret-change-me && node index.js"
    timeout /t 3 /nobreak >nul
)

REM 检查前端是否已经在运行
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [√] 前端已在运行 (5173)
) else (
    echo [2/3] 启动前端 (5173)...
    start "Todoist-Frontend" /min cmd /c "cd /d D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone && npx vite --host"
    timeout /t 4 /nobreak >nul
)

echo [3/3] 打开浏览器...
start http://localhost:5173

echo.
echo ========================================
echo   启动完成！
echo.
echo   本机访问:   http://localhost:5173
echo   局域网访问: http://192.168.0.5:5173
echo   后端API:    http://192.168.0.5:3001
echo.
echo   其他电脑用局域网地址访问即可。
echo   关闭窗口不会停止服务。
echo   要停止服务，关闭 Todoist-Backend 和
echo   Todoist-Frontend 窗口。
echo ========================================
echo.
timeout /t 5

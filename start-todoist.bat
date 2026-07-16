@echo off
chcp 65001 >nul
title Todoist Clone 启动器

set PROJECT_DIR=D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone
set NODE_EXE=C:\Program Files\nodejs\node.exe

echo ========================================
echo   Todoist Clone 一键启动
echo ========================================
echo.

REM 检查 node 是否存在
if not exist "%NODE_EXE%" (
    echo [X] 找不到 Node.js，请确认安装路径
    echo     期望路径: %NODE_EXE%
    pause
    exit /b 1
)

REM 先杀掉旧进程
echo [0/4] 清理旧进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo [1/4] 启动后端 (3001)...
start "Todoist-Backend" /min cmd /k "cd /d "%PROJECT_DIR%\server" && set JWT_SECRET=dev-secret-change-me && "%NODE_EXE%" index.js"
timeout /t 4 /nobreak >nul

echo [2/4] 启动前端 (5173)...
start "Todoist-Frontend" /min cmd /k "cd /d "%PROJECT_DIR%" && npx vite --host"
timeout /t 5 /nobreak >nul

echo [3/4] 验证服务...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel%==0 (
    echo [√] 后端正常
) else (
    echo [!] 后端可能还在启动中...
)

curl -s http://localhost:5173/ >nul 2>&1
if %errorlevel%==0 (
    echo [√] 前端正常
) else (
    echo [!] 前端可能还在启动中...
)

echo [4/4] 打开浏览器...
start http://localhost:5173

echo.
echo ========================================
echo   启动完成！
echo.
echo   本机访问:   http://localhost:5173
echo   局域网访问: http://192.168.0.5:5173
echo   后端API:    http://192.168.0.5:3001
echo.
echo   关闭本窗口不影响服务。
echo   要停止服务：关闭 Todoist-Backend 和
echo   Todoist-Frontend 窗口，或运行：
echo   taskkill /F /IM node.exe
echo ========================================
echo.
pause

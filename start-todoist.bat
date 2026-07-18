@echo off
chcp 65001 >nul
title Todoist Clone 启动器

set PROJECT_DIR=D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone

echo ========================================
echo   Todoist Clone 一键启动
echo ========================================
echo.

REM 先杀掉旧 node 进程
echo [0/4] 清理旧进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM 启动后端（用 cmd /c 而不是 cmd /k，避免引号嵌套问题）
echo [1/4] 启动后端 (3001)...
cd /d "%PROJECT_DIR%\server"
set JWT_SECRET=dev-secret-change-me
start "Todoist-Backend" /min cmd /c "node index.js"
cd /d "%PROJECT_DIR%"
timeout /t 4 /nobreak >nul

REM 启动前端
echo [2/4] 启动前端 (5173)...
start "Todoist-Frontend" /min cmd /c "npx vite --host"
timeout /t 5 /nobreak >nul

REM 验证
echo [3/4] 验证服务...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel%==0 (
    echo [√] 后端正常 (3001)
) else (
    echo [!] 后端可能还在启动中...
)

curl -s http://localhost:5173/ >nul 2>&1
if %errorlevel%==0 (
    echo [√] 前端正常 (5173)
) else (
    echo [!] 前端可能还在启动中...
)

REM 打开浏览器
echo [4/4] 打开浏览器...
start http://localhost:5173

echo.
echo ========================================
echo   启动完成！
echo.
echo   本机访问:   http://localhost:5173
echo   局域网访问: http://192.168.0.5:5173
echo   后端API:    http://localhost:3001
echo.
echo   关闭本窗口不影响服务。
echo   要停止服务：运行 taskkill /F /IM node.exe
echo ========================================
echo.
pause

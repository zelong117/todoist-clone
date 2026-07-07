@echo off
chcp 65001 >nul
echo ========================================
echo   Todoist Clone 启动脚本
echo ========================================
echo.

REM 清理旧进程
echo [1/3] 清理旧进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM 启动后端
echo [2/3] 启动后端服务...
cd /d "%~dp0server"
start "Todoist-后端" cmd /k "node index.js"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端
echo [3/3] 启动前端服务...
cd /d "%~dp0"
start "Todoist-前端" cmd /k "npm run dev"

echo.
echo ========================================
echo   启动完成！
echo   后端: http://localhost:3001
echo   前端: http://localhost:5173
echo ========================================
echo.
pause
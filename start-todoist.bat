@echo off
chcp 65001 >nul
cd /d D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone

echo 启动 Todoist Clone...

echo [1/2] 启动后端服务 (3001)...
start "Todoist Backend" cmd /k "cd /d D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone\server && set JWT_SECRET=dev-secret-change-me && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] 启动前端服务 (5173)...
start "Todoist Frontend" cmd /k "cd /d D:\360MoveData\Users\ww\Desktop\github项目文件\todoist-clone && npm run dev"

timeout /t 5 /nobreak >nul

echo 打开浏览器...
start http://localhost:5173

echo.
echo ✅ 启动完成！
echo 前端: http://localhost:5173
echo 后端: http://localhost:3001
pause

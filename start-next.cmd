@echo off
cd /d "%~dp0%1"
call node_modules\.bin\next.cmd dev

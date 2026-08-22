@echo off
rem Starts the local server for Acts of Life and opens it in the browser.
rem Once installed as a PWA, the app also works offline without this.
cd /d "%~dp0"
start "" http://localhost:5173
python -m http.server 5173

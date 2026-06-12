@echo off
cd /d "d:\Downloads\cesucarprojetc-main\backend"
"C:\Users\atendimento.RAIOSOM\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m uvicorn app:app --host 0.0.0.0 --port 8000

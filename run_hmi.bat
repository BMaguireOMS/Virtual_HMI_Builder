@echo off
title Virtual HMI Runtime

set HMI_OPC_PASSWORD=admin

start "" http://localhost:8000

py runtime_server.py

pause
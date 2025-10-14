@echo off
echo ========================================
echo Deploy CT Supera para Hostinger
echo ========================================
echo.
echo Copiando usuarios\views.py para o servidor...
echo.

scp usuarios\views.py root@72.60.145.13:/root/ct-supera/usuarios/views.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Arquivo copiado com sucesso!
    echo.
    echo Reiniciando servico no servidor...
    echo.
    
    ssh root@72.60.145.13 "cd /root/ct-supera && source venv/bin/activate && systemctl restart ctsupera && systemctl status ctsupera --no-pager -l | head -10"
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo Deploy concluido com sucesso!
        echo ========================================
        echo.
        echo Acesse: http://72.60.145.13
        echo ou: https://ctsupera.com.br
        echo.
    ) else (
        echo.
        echo Erro ao reiniciar o servico!
        echo.
    )
) else (
    echo.
    echo Erro ao copiar arquivo!
    echo Verifique se voce tem acesso SSH ao servidor.
    echo.
)

pause


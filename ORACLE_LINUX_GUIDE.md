# 🚀 Guia Específico para Oracle Linux

## 🔧 Diferenças Importantes do Oracle Linux

### 1. Gerenciador de Pacotes
- **Oracle Linux**: `dnf` (substitui `apt`)
- **Firewall**: `firewalld` (substitui `ufw`)
- **SELinux**: Habilitado por padrão

### 2. Estrutura de Diretórios
- **Usuário padrão**: `oracle` (não `ubuntu`)
- **Diretório home**: `/home/oracle/`
- **Nginx**: `/etc/nginx/conf.d/` (não `sites-available`)

### 3. Configurações Específicas

#### Firewall (firewalld)
```bash
# Abrir portas necessárias
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

# Verificar status
sudo firewall-cmd --list-all
```

#### SELinux
```bash
# Permitir que Nginx se conecte à rede
sudo setsebool -P httpd_can_network_connect 1

# Verificar status do SELinux
sestatus

# Se necessário, desabilitar temporariamente
sudo setenforce 0
```

#### Nginx (Oracle Linux)
```bash
# Configuração específica para Oracle Linux
sudo cp nginx_simple.conf /etc/nginx/conf.d/ctsupera.conf

# Verificar sintaxe
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx
```

## 🚀 Comandos de Configuração para Oracle Linux

### 1. Configuração Inicial
```bash
# Navegar para o diretório
cd /home/oracle/ct-supera

# Executar script específico para Oracle Linux
chmod +x setup_server_oracle_linux.sh
./setup_server_oracle_linux.sh
```

### 2. Instalar Dependências
```bash
# Atualizar sistema
sudo dnf update -y

# Instalar dependências
sudo dnf install -y python3 python3-pip python3-venv nginx git curl unzip wget

# Instalar Oracle Instant Client
cd /tmp
wget https://download.oracle.com/otn_software/linux/instantclient/219000/instantclient-basic-linux.x64-21.9.0.0.0dbru.zip
unzip instantclient-basic-linux.x64-21.9.0.0.0dbru.zip
sudo mv instantclient_21_9 /opt/oracle
sudo ln -s /opt/oracle/instantclient_21_9 /opt/oracle/instantclient
```

### 3. Configurar Variáveis de Ambiente
```bash
# Adicionar ao ~/.bashrc
echo 'export LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH' >> ~/.bashrc
echo 'export PATH=/opt/oracle/instantclient:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### 4. Configurar Firewall
```bash
# Abrir portas necessárias
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 5. Configurar SELinux
```bash
# Permitir conexões de rede para Nginx
sudo setsebool -P httpd_can_network_connect 1

# Verificar configurações
sudo getsebool -a | grep httpd
```

### 6. Configurar Nginx
```bash
# Copiar configuração
sudo cp nginx_simple.conf /etc/nginx/conf.d/ctsupera.conf

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 7. Configurar Serviço Systemd
```bash
# Copiar arquivo de serviço
sudo cp ctsupera.service /etc/systemd/system/

# Recarregar systemd
sudo systemctl daemon-reload

# Ativar e iniciar serviço
sudo systemctl enable ctsupera
sudo systemctl start ctsupera
```

## 🚨 Troubleshooting Específico do Oracle Linux

### Problemas com SELinux
```bash
# Verificar logs do SELinux
sudo ausearch -m AVC -ts recent

# Verificar contexto dos arquivos
ls -Z /home/oracle/ct-supera/

# Corrigir contexto se necessário
sudo chcon -R -t httpd_exec_t /home/oracle/ct-supera/venv/bin/
```

### Problemas com Firewall
```bash
# Verificar status do firewalld
sudo systemctl status firewalld

# Verificar portas abertas
sudo firewall-cmd --list-ports

# Verificar zonas
sudo firewall-cmd --get-active-zones
```

### Problemas com Nginx
```bash
# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar configuração
sudo nginx -t

# Verificar se está rodando
sudo systemctl status nginx
```

### Problemas com Oracle Instant Client
```bash
# Verificar se está instalado
ls -la /opt/oracle/instantclient/

# Verificar variáveis de ambiente
echo $LD_LIBRARY_PATH
echo $PATH

# Testar conexão
python3 -c "import cx_Oracle; print('Oracle Client OK')"
```

## 📋 Checklist de Configuração

- [ ] Sistema atualizado (`sudo dnf update -y`)
- [ ] Dependências instaladas (`python3`, `nginx`, `git`, etc.)
- [ ] Oracle Instant Client instalado
- [ ] Variáveis de ambiente configuradas
- [ ] Firewall configurado (firewalld)
- [ ] SELinux configurado
- [ ] Nginx configurado
- [ ] Serviço systemd configurado
- [ ] Backup automático configurado
- [ ] Logs funcionando

## 🔧 Comandos Úteis

```bash
# Verificar versão do Oracle Linux
cat /etc/oracle-release

# Verificar status dos serviços
sudo systemctl status nginx
sudo systemctl status firewalld
sudo systemctl status ctsupera

# Verificar logs
sudo journalctl -u ctsupera -f
sudo tail -f /var/log/nginx/error.log

# Reiniciar serviços
sudo systemctl restart nginx
sudo systemctl restart ctsupera
``` 
# Configuração do Gunicorn para produção
import multiprocessing

# Configurações do servidor
# IMPORTANTE: Bind em 127.0.0.1 para segurança - aplicação deve ficar atrás do Nginx
# ATENÇÃO: Esta configuração usa porta 8000. Na Hostinger, use porta 8001 para evitar conflito com Coolify
# O service ctsupera_hostinger.service já está configurado corretamente com porta 8001
bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 2

# Configurações de logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Configurações de segurança
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Configurações de processo
preload_app = True
daemon = False
pidfile = "/tmp/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# Configurações de SSL (se necessário)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile" 
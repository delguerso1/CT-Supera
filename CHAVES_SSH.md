# 🔑 Suas Chaves SSH

## 📋 Chaves Encontradas

Você possui **2 chaves SSH** no seu sistema:

### 1. Chave Principal (id_rsa)
- **Arquivo**: `~/.ssh/id_rsa` (privada) e `~/.ssh/id_rsa.pub` (pública)
- **Tipo**: RSA
- **Email**: delguersojr@gmail.com
- **Data**: Mais antiga (padrão do sistema)

**Chave Pública:**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCmsM5rXmAnz3x/pNtxgmErCGXqRaqrDpd+yg6Ds7jUrzQpbKrnitXgqNVCIYt6MkY4ssXd0RMNRqarXrtM7FFY0S7IJnE5/8xsqYLJETgEqQek7kIINW78qloLFmd6fLlpXARGrc4hXbGTJaf5oK5o6c8Rxp3b3++4dzbjyM1jKvCCeOO+fMOKv+Ch8N95d6bRJMQVUV3itCpik0B9zQxwJsk0vpt1qtDfZhP/RexUFWv52XjITriUl+lAphz+QcBJ/yI769l6/4qs04PgCBa0XXdX6GJNCiItsJJSPLK6/NaRwF/wVNXMdZ5V24WA3g/JhjuripDDWDscCtjwOOxbGHGJ1imOnldk9SC8NLWzLTGfU1pK+O0al8cy3Av/wXrrpls7/w1OXmnZE71rnmacbjHAuaWCPo+sUzqI4OsI98n+FATdLsQ7A5KUMcPhK2m749M7LSns31OmNxdrhPB0pH3zPMYlOucOgpuFofELtt/Pyh3lyZ7lwxh5Ef5XKXShDnaa2CHeSnzdviwR7wMQ2kdlE/TJW/RwWTUIdFFysbe3IP2PFFbgzGjwVxi84UWXL0fzDAGDJYLjfNgEKfqqdIJoNVgueSKYmVz58rCU/zz2PXBJRwOPddv3dmDAtgZYNAvr9EkA9I4Ifjg/6MrHINrzD3a4Tw9ICfx3IGqFgJ9+72Mw== delguersojr@gmail.com
```

### 2. Chave Específica (ssh-key-2025-08-01)
- **Arquivo**: `~/.ssh/ssh-key-2025-08-01.key` (privada) e `~/.ssh/ssh-key-2025-08-01.key.pub` (pública)
- **Tipo**: RSA
- **Data**: 01/08/2025 (mais recente)

**Chave Pública:**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCnvJ6naPNSN5RNq6koxjLYXlUTNPvDu/RVFsI/jFjOX1uHoPRlegLRYH2nS1K8jlsX2cE/d2gmJlNUF558YcSbStontjgafI8Du2EVQ9YcN5PP5hppYTDRumWR07fy/ZT1qMXPiS4JY+KSmY/bDAPyzbFqJewm4XYyjCDzv2pKev6zP8x0CumlPasKYVmMutAVUQh0Nruv5QK4r2jeSDpZd9l6S3Tzvrzz6op5MZwwljFI1cpSLim2Ck98ydV4YId98xYbKPEzuhyBQf+VEmbwW+wZ8bx9icQvzPSxDAsPPyk3eoIThDKTDTzXVUZzXaLDodEQC62jkX1j9tpDSR+z ssh-key-2025-08-01
```

## 🚀 Para Conectar ao Servidor Hostinger

### Opção 1: Usar a chave principal (recomendado)
```bash
ssh -i ~/.ssh/id_rsa root@72.60.145.13
```

### Opção 2: Usar a chave específica
```bash
ssh -i ~/.ssh/ssh-key-2025-08-01.key root@72.60.145.13
```

### Opção 3: Se a chave estiver no SSH Agent
```bash
ssh root@72.60.145.13
```

## 🔧 Configuração no SSH Config (Opcional)

Para facilitar, você pode criar um arquivo `~/.ssh/config`:

```
Host hostinger
    HostName 72.60.145.13
    User root
    IdentityFile ~/.ssh/id_rsa
    Port 22
```

Depois usar apenas:
```bash
ssh hostinger
```

## 📝 Próximos Passos

1. **Teste a conexão** com uma das chaves acima
2. **Configure a chave pública** no servidor da Hostinger (se necessário)
3. **Execute o deploy** seguindo o `HOSTINGER_DEPLOY.md`

## 🆘 Troubleshooting

Se não conseguir conectar:
1. Verifique se a chave está autorizada no servidor
2. Teste com `ssh -v root@72.60.145.13` para debug
3. Verifique se o servidor está rodando
4. Confirme se a porta 22 está aberta

#!/usr/bin/env python
"""
Script para testar as APIs de Supera News e Galeria
Execute: python testar_api.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from ct.models import SuperaNews, GaleriaFoto
from usuarios.models import Usuario

print("=" * 60)
print("TESTE DAS FUNCIONALIDADES - SUPERA NEWS E GALERIA")
print("=" * 60)

# 1. Verificar se os modelos existem
print("\n1. Verificando modelos no banco de dados...")
try:
    noticias_count = SuperaNews.objects.count()
    fotos_count = GaleriaFoto.objects.count()
    print(f"   ✅ SuperaNews: {noticias_count} notícia(s) cadastrada(s)")
    print(f"   ✅ GaleriaFoto: {fotos_count} foto(s) cadastrada(s)")
except Exception as e:
    print(f"   ❌ Erro ao acessar modelos: {e}")
    sys.exit(1)

# 2. Verificar se há gerentes
print("\n2. Verificando gerentes no sistema...")
gerentes = Usuario.objects.filter(tipo='gerente')
print(f"   Total de gerentes: {gerentes.count()}")
if gerentes.exists():
    for gerente in gerentes[:3]:
        print(f"   - {gerente.username} ({gerente.get_full_name()})")

# 3. Listar notícias existentes
print("\n3. Notícias cadastradas:")
noticias = SuperaNews.objects.all()[:5]
if noticias:
    for noticia in noticias:
        print(f"   - {noticia.titulo}")
        print(f"     Autor: {noticia.autor.get_full_name()}")
        print(f"     Imagem: {noticia.imagem}")
        print(f"     Ativa: {noticia.ativo}")
        print()
else:
    print("   Nenhuma notícia cadastrada ainda")

# 4. Listar fotos da galeria
print("\n4. Fotos da galeria:")
fotos = GaleriaFoto.objects.all()[:5]
if fotos:
    for foto in fotos:
        print(f"   - {foto.titulo}")
        print(f"     Autor: {foto.autor.get_full_name()}")
        print(f"     Imagem: {foto.imagem}")
        print(f"     Ativa: {foto.ativo}")
        print()
else:
    print("   Nenhuma foto cadastrada ainda")

# 5. Verificar configurações de MEDIA
print("\n5. Configurações de MEDIA:")
from django.conf import settings
print(f"   MEDIA_URL: {settings.MEDIA_URL}")
print(f"   MEDIA_ROOT: {settings.MEDIA_ROOT}")
print(f"   MEDIA_ROOT existe? {os.path.exists(settings.MEDIA_ROOT)}")

# Verificar diretórios de upload
supera_news_dir = os.path.join(settings.MEDIA_ROOT, 'supera_news')
galeria_dir = os.path.join(settings.MEDIA_ROOT, 'galeria_fotos')
print(f"   Diretório supera_news existe? {os.path.exists(supera_news_dir)}")
print(f"   Diretório galeria_fotos existe? {os.path.exists(galeria_dir)}")

# 6. Teste de criação (sem salvar)
print("\n6. Teste de validação (sem salvar):")
if gerentes.exists():
    gerente = gerentes.first()
    print(f"   Usando gerente: {gerente.username}")
    
    # Criar instância de teste (sem salvar)
    from django.core.files.uploadedfile import SimpleUploadedFile
    
    # Criar arquivo de imagem fake
    fake_image = SimpleUploadedFile(
        "test.jpg",
        b"fake image content",
        content_type="image/jpeg"
    )
    
    try:
        teste_noticia = SuperaNews(
            titulo="Teste de Notícia",
            descricao="Esta é uma notícia de teste",
            imagem=fake_image,
            autor=gerente
        )
        # Validar (mas não salvar)
        teste_noticia.full_clean()
        print("   ✅ Validação de SuperaNews OK")
    except Exception as e:
        print(f"   ❌ Erro na validação de SuperaNews: {e}")
    
    try:
        teste_foto = GaleriaFoto(
            titulo="Teste de Foto",
            descricao="Esta é uma foto de teste",
            imagem=fake_image,
            autor=gerente
        )
        # Validar (mas não salvar)
        teste_foto.full_clean()
        print("   ✅ Validação de GaleriaFoto OK")
    except Exception as e:
        print(f"   ❌ Erro na validação de GaleriaFoto: {e}")

print("\n" + "=" * 60)
print("TESTE CONCLUÍDO")
print("=" * 60)


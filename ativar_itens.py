#!/usr/bin/env python
"""
Script para ativar todos os itens de SuperaNews e GaleriaFoto
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from ct.models import SuperaNews, GaleriaFoto

# Ativar todas as notícias
noticias_atualizadas = SuperaNews.objects.filter(ativo=False).update(ativo=True)
print(f"✅ {noticias_atualizadas} notícia(s) ativada(s)")

# Ativar todas as fotos
fotos_atualizadas = GaleriaFoto.objects.filter(ativo=False).update(ativo=True)
print(f"✅ {fotos_atualizadas} foto(s) ativada(s)")

# Listar todos os itens
print("\nNotícias ativas:")
for noticia in SuperaNews.objects.filter(ativo=True):
    print(f"  - {noticia.titulo} (ativo={noticia.ativo})")

print("\nFotos ativas:")
for foto in GaleriaFoto.objects.filter(ativo=True):
    print(f"  - {foto.titulo} (ativo={foto.ativo})")


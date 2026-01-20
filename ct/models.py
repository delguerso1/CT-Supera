from django.db import models
from django.conf import settings

class CentroDeTreinamento(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    endereco = models.TextField(blank=True)
    telefone = models.CharField(max_length=15, blank=True, null=True)
    dias_semana = models.ManyToManyField(
        'turmas.DiaSemana',
        blank=True,
        related_name='centros_treinamento',
        help_text="Dias em que o CT funciona"
    )


    def __str__(self):
        return self.nome

    class Meta:
        verbose_name_plural = "Centros de Treinamento"


class SuperaNews(models.Model):
    titulo = models.CharField(max_length=200, help_text="Título da notícia")
    descricao = models.TextField(help_text="Descrição ou conteúdo da notícia")
    imagem = models.ImageField(upload_to='supera_news/', help_text="Imagem da notícia")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='noticias')
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    ativo = models.BooleanField(default=True, help_text="Se a notícia está ativa/visível")

    def __str__(self):
        return self.titulo

    class Meta:
        verbose_name = "Supera News"
        verbose_name_plural = "Supera News"
        ordering = ['-data_criacao']


class GaleriaFoto(models.Model):
    titulo = models.CharField(max_length=200, help_text="Título da foto")
    descricao = models.TextField(blank=True, help_text="Descrição ou legenda da foto")
    imagem = models.ImageField(upload_to='galeria_fotos/', help_text="Imagem da galeria")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fotos_galeria')
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    ativo = models.BooleanField(default=True, help_text="Se a foto está ativa/visível")

    def __str__(self):
        return self.titulo

    class Meta:
        verbose_name = "Foto da Galeria"
        verbose_name_plural = "Fotos da Galeria"
        ordering = ['-data_criacao']
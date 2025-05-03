from django import forms
from .models import Mensalidade
from django.apps import apps

class MensalidadeForm(forms.ModelForm):
    class Meta:
        model = Mensalidade
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        Usuario = apps.get_model('usuarios', 'Usuario')
        self.fields['aluno'].queryset = Usuario.objects.filter(tipo_usuario='aluno')

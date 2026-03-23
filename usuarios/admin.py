from django.contrib import admin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django import forms
from .models import Usuario, PushTokenExpo


class UsuarioCreationForm(forms.ModelForm):
    """Formulário para criar usuário no admin - CPF como login, senha hasheada."""
    password1 = forms.CharField(
        label="Senha",
        widget=forms.PasswordInput,
        min_length=8,
        help_text="Mínimo 8 caracteres.",
    )
    password2 = forms.CharField(
        label="Confirmação da senha",
        widget=forms.PasswordInput,
        min_length=8,
    )
    cpf = forms.CharField(
        max_length=14,
        label="CPF (login no mobile)",
        help_text="Apenas números, 11 dígitos. Será usado como login no app mobile.",
    )

    class Meta:
        model = Usuario
        fields = ("cpf", "tipo", "first_name", "last_name", "email", "telefone", "is_active")

    def clean_cpf(self):
        cpf = "".join(c for c in (self.cleaned_data.get("cpf") or "").strip() if c.isdigit())
        if len(cpf) != 11:
            raise forms.ValidationError("CPF deve conter exatamente 11 dígitos.")
        if Usuario.objects.filter(cpf=cpf).exists():
            raise forms.ValidationError("Já existe um usuário com este CPF.")
        return cpf

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("As senhas não coincidem.")
        return p2

    def save(self, commit=True):
        cpf = self.cleaned_data["cpf"]
        email = self.cleaned_data.get("email") or f"{cpf}@ctsupera.local"
        n = 0
        while Usuario.objects.filter(email=email).exists():
            n += 1
            email = f"{cpf}{n}@ctsupera.local"
        user = Usuario(
            username=cpf,
            cpf=cpf,
            tipo=self.cleaned_data["tipo"],
            first_name=self.cleaned_data.get("first_name") or "Usuario",
            last_name=self.cleaned_data.get("last_name") or "",
            email=email,
            telefone=self.cleaned_data.get("telefone") or None,
            is_active=self.cleaned_data.get("is_active", True),
        )
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class UsuarioChangeForm(forms.ModelForm):
    """Formulário para editar usuário no admin."""
    password = ReadOnlyPasswordHashField(
        label="Senha",
        help_text="Senhas não são armazenadas em texto. Use o link abaixo para alterar.",
    )

    class Meta:
        model = Usuario
        fields = "__all__"


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    add_form = UsuarioCreationForm
    form = UsuarioChangeForm

    list_display = ("first_name", "last_name", "cpf", "tipo", "email", "is_active")
    list_filter = ("tipo", "is_active")
    search_fields = ("email", "first_name", "last_name", "cpf")
    ordering = ["first_name"]

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Dados para login no mobile", {"fields": ("cpf", "tipo")}),
        ("Informações pessoais", {"fields": ("first_name", "last_name", "email", "telefone", "data_nascimento")}),
        ("Permissões", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "fields": ("cpf", "password1", "password2"),
                "description": "CPF = login no app mobile (11 dígitos). Senha mínima 8 caracteres.",
            },
        ),
        ("Tipo e dados", {"fields": ("tipo", "first_name", "last_name", "email", "telefone")}),
        ("Status", {"fields": ("is_active",)}),
    )

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            kwargs["form"] = self.add_form
        return super().get_form(request, obj, **kwargs)

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)

    def ativar_usuario(self, request, queryset):
        queryset.update(is_active=True)
    ativar_usuario.short_description = "Ativar usuários selecionados"

    def desativar_usuario(self, request, queryset):
        queryset.update(is_active=False)
    desativar_usuario.short_description = "Desativar usuários selecionados"

    actions = [ativar_usuario, desativar_usuario]


@admin.register(PushTokenExpo)
class PushTokenExpoAdmin(admin.ModelAdmin):
    list_display = ("usuario", "token_preview", "atualizado_em")
    search_fields = ("token", "usuario__cpf", "usuario__first_name")
    raw_id_fields = ("usuario",)
    readonly_fields = ("criado_em", "atualizado_em")

    @admin.display(description="Token")
    def token_preview(self, obj):
        t = obj.token or ""
        return (t[:36] + "…") if len(t) > 36 else t

from django.urls import path
from . import views

app_name = "alunos"

urlpatterns = [
     # 🔹 Alunos e check-in
    path("painel-aluno/", views.painel_aluno, name="painel_aluno"),
    path("editar-perfil/", views.editar_perfil_aluno, name="editar_perfil_aluno"),
    path("checkin/", views.realizar_checkin, name="realizar_checkin"),
    path("historico-pagamentos/", views.historico_pagamentos, name="historico_pagamentos"),
    path("pagamento/<int:mensalidade_id>/", views.realizar_pagamento, name="realizar_pagamento"),
 
]

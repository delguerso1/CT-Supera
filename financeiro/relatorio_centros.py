"""Relatório financeiro do mês por centro de treinamento e por turma.

A mensalidade é do aluno. Quando ele treina em mais de uma turma do mesmo
centro, o valor entra inteiro no centro e é dividido entre as turmas. Quando
treina em centros diferentes, o valor é dividido entre os centros, para o
total não ser contado duas vezes.
"""
from collections import defaultdict
from decimal import Decimal

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ct.models import CentroDeTreinamento
from financeiro.models import Mensalidade
from turmas.models import Turma
from usuarios.permissions import IsGerente
from wellhub.models import WellhubBooking

CENTAVOS = Decimal("0.01")
STATUS_WELLHUB = {"requested", "confirmed", "cancelled", "late_cancelled"}
STATUS_CANCELADOS = {"cancelled", "late_cancelled"}


def mes_anterior(mes, ano):
    if mes <= 1:
        return 12, ano - 1
    return mes - 1, ano


def _parse_periodo(mes_raw, ano_raw):
    hoje = timezone.localdate()
    try:
        mes = int(mes_raw)
        ano = int(ano_raw)
    except (TypeError, ValueError):
        return hoje.month, hoje.year
    if not (1 <= mes <= 12) or ano < 2000 or ano > 9999:
        return hoje.month, hoje.year
    return mes, ano


def _dinheiro(valor):
    if valor is None:
        return Decimal("0.00")
    return Decimal(valor).quantize(CENTAVOS)


def _numero(valor):
    return float(_dinheiro(valor))


def dividir_valor(valor, partes):
    """Divide um valor em N fatias de centavos. A sobra fica nas primeiras."""
    total = _dinheiro(valor)
    n = len(partes)
    if n == 0:
        return []
    centavos = int(total * 100)
    base, resto = divmod(centavos, n)
    fatias = []
    for indice, parte in enumerate(partes):
        cents = base + (1 if indice < resto else 0)
        fatias.append((parte, Decimal(cents) / Decimal(100)))
    return fatias


def _valor_mensalidade(mensalidade):
    if mensalidade.status == "pago" and mensalidade.valor_pago is not None:
        return _dinheiro(mensalidade.valor_pago)
    return _dinheiro(mensalidade.valor)


def _rotulo_turma(turma):
    if turma is None:
        return "Sem turma"
    dias = ", ".join(dia.nome for dia in turma.dias_semana.all())
    horario = turma.horario.strftime("%H:%M") if turma.horario else ""
    if dias and horario:
        return f"{dias} - {horario}"
    return dias or horario or f"Turma {turma.id}"


def _nome_cadastro(booking):
    cadastro = booking.cadastro
    if not cadastro:
        return "Aluno Wellhub"
    nome = f"{cadastro.first_name or ''} {cadastro.last_name or ''}".strip()
    return nome or "Aluno Wellhub"


def _chave_wellhub(booking):
    if booking.cadastro_id:
        return f"c{booking.cadastro_id}"
    return f"b{booking.id}"


def _bucket():
    return {
        "pago": Decimal("0.00"),
        "pendente": Decimal("0.00"),
        "atrasado": Decimal("0.00"),
        "qtd_pago": 0,
        "qtd_pendente": 0,
        "qtd_atrasado": 0,
        "alunos": set(),
        "wellhub_ids": set(),
        "wellhub_reservas": 0,
        "wellhub_confirmadas": 0,
        "wellhub_canceladas": 0,
        "wellhub_presencas": 0,
        "wellhub_faltas": 0,
        "wellhub_checkins": 0,
    }


def _aplicar_status(bucket, status, valor, aluno_id):
    bucket[status] += valor
    bucket[f"qtd_{status}"] += 1
    if aluno_id is not None:
        bucket["alunos"].add(aluno_id)


def _aplicar_wellhub(bucket, chave, booking):
    bucket["wellhub_ids"].add(chave)
    bucket["wellhub_reservas"] += 1
    if booking.status == "confirmed":
        bucket["wellhub_confirmadas"] += 1
    if booking.status in STATUS_CANCELADOS:
        bucket["wellhub_canceladas"] += 1
    if booking.presenca_confirmada:
        bucket["wellhub_presencas"] += 1
    if booking.ausencia_registrada:
        bucket["wellhub_faltas"] += 1
    if booking.checkin_validado:
        bucket["wellhub_checkins"] += 1


def _serial_bucket(bucket):
    return {
        "pago": _numero(bucket["pago"]),
        "pendente": _numero(bucket["pendente"]),
        "atrasado": _numero(bucket["atrasado"]),
        "qtd_pago": bucket["qtd_pago"],
        "qtd_pendente": bucket["qtd_pendente"],
        "qtd_atrasado": bucket["qtd_atrasado"],
        "alunos": len(bucket["alunos"]),
        "teve_wellhub": bool(bucket["wellhub_ids"]),
        "wellhub_alunos": len(bucket["wellhub_ids"]),
        "wellhub_reservas": bucket["wellhub_reservas"],
        "wellhub_confirmadas": bucket["wellhub_confirmadas"],
        "wellhub_canceladas": bucket["wellhub_canceladas"],
        "wellhub_presencas": bucket["wellhub_presencas"],
        "wellhub_faltas": bucket["wellhub_faltas"],
        "wellhub_checkins": bucket["wellhub_checkins"],
    }


class _Acumulador:
    def __init__(self):
        self.centros = {}
        self.totais = _bucket()
        self.linhas_wellhub = {}

    def centro(self, ct):
        chave = ct.id if ct is not None else 0
        if chave not in self.centros:
            self.centros[chave] = {
                "ct_id": ct.id if ct is not None else None,
                "nome": ct.nome if ct is not None else "Sem centro de treinamento",
                "bucket": _bucket(),
                "turmas": {},
            }
        return self.centros[chave]

    def turma(self, ct, turma):
        centro = self.centro(ct)
        chave = turma.id if turma is not None else 0
        if chave not in centro["turmas"]:
            horario = ""
            if turma is not None and turma.horario:
                horario = turma.horario.strftime("%H:%M")
            centro["turmas"][chave] = {
                "turma_id": turma.id if turma is not None else None,
                "nome": _rotulo_turma(turma),
                "horario": horario,
                "bucket": _bucket(),
            }
        return centro["turmas"][chave]


def montar_relatorio_periodo(mes, ano):
    acc = _Acumulador()

    for ct in CentroDeTreinamento.objects.all().order_by("nome"):
        acc.centro(ct)

    turmas_ativas = (
        Turma.objects.filter(ativo=True)
        .select_related("ct")
        .prefetch_related("dias_semana")
        .order_by("horario")
    )
    for turma in turmas_ativas:
        acc.turma(turma.ct, turma)

    mensalidades = (
        Mensalidade.objects.filter(
            data_vencimento__year=ano,
            data_vencimento__month=mes,
        )
        .select_related("aluno")
        .prefetch_related(
            "aluno__turmas_aluno__ct",
            "aluno__turmas_aluno__dias_semana",
        )
    )

    for mensalidade in mensalidades:
        status = mensalidade.status_efetivo
        if status not in ("pago", "pendente", "atrasado"):
            status = "pendente"
        valor = _valor_mensalidade(mensalidade)
        aluno = mensalidade.aluno
        aluno_id = aluno.id if aluno else None
        _aplicar_status(acc.totais, status, valor, aluno_id)

        turmas = list(aluno.turmas_aluno.all()) if aluno else []
        if not turmas:
            turmas = [None]

        por_centro = defaultdict(list)
        for turma in turmas:
            ct = turma.ct if turma is not None else None
            por_centro[ct].append(turma)

        for ct, valor_ct in dividir_valor(valor, list(por_centro.keys())):
            bucket_ct = acc.centro(ct)["bucket"]
            _aplicar_status(bucket_ct, status, valor_ct, aluno_id)
            for turma, valor_turma in dividir_valor(valor_ct, por_centro[ct]):
                bucket_turma = acc.turma(ct, turma)["bucket"]
                _aplicar_status(bucket_turma, status, valor_turma, aluno_id)

    reservas = (
        WellhubBooking.objects.filter(
            slot__data_aula__year=ano,
            slot__data_aula__month=mes,
        )
        .select_related("slot__turma__ct", "cadastro")
        .prefetch_related("slot__turma__dias_semana")
        .order_by("slot__data_aula", "cadastro__first_name")
    )

    for booking in reservas:
        if booking.status not in STATUS_WELLHUB:
            continue
        turma = booking.slot.turma
        ct = turma.ct
        chave = _chave_wellhub(booking)
        _aplicar_wellhub(acc.totais, chave, booking)
        _aplicar_wellhub(acc.centro(ct)["bucket"], chave, booking)
        _aplicar_wellhub(acc.turma(ct, turma)["bucket"], chave, booking)

        linha_id = (chave, turma.id)
        linha = acc.linhas_wellhub.get(linha_id)
        if linha is None:
            linha = {
                "chave": chave,
                "linha_id": f"{chave}-{turma.id}",
                "cadastro_id": booking.cadastro_id,
                "nome": _nome_cadastro(booking),
                "ct_id": ct.id if ct else None,
                "ct_nome": ct.nome if ct else "Sem centro de treinamento",
                "turma_id": turma.id,
                "turma_nome": _rotulo_turma(turma),
                "reservas": 0,
                "confirmadas": 0,
                "canceladas": 0,
                "presencas": 0,
                "faltas": 0,
                "checkins": 0,
            }
            acc.linhas_wellhub[linha_id] = linha
        linha["reservas"] += 1
        if booking.status == "confirmed":
            linha["confirmadas"] += 1
        if booking.status in STATUS_CANCELADOS:
            linha["canceladas"] += 1
        if booking.presenca_confirmada:
            linha["presencas"] += 1
        if booking.ausencia_registrada:
            linha["faltas"] += 1
        if booking.checkin_validado:
            linha["checkins"] += 1

    centros = []
    for centro in acc.centros.values():
        turmas = []
        for item in centro["turmas"].values():
            turmas.append(
                {
                    "turma_id": item["turma_id"],
                    "nome": item["nome"],
                    "horario": item["horario"],
                    **_serial_bucket(item["bucket"]),
                }
            )
        turmas.sort(key=lambda item: ((item["turma_id"] is None), item["horario"], item["nome"]))
        centros.append(
            {
                "ct_id": centro["ct_id"],
                "nome": centro["nome"],
                "turmas": turmas,
                **_serial_bucket(centro["bucket"]),
            }
        )
    centros.sort(key=lambda item: ((item["ct_id"] is None), item["nome"].lower()))

    alunos_wellhub = sorted(
        acc.linhas_wellhub.values(),
        key=lambda item: (
            item["nome"].lower(),
            item["ct_nome"].lower(),
            item["turma_nome"].lower(),
        ),
    )
    for linha in alunos_wellhub:
        linha.pop("chave", None)

    return {
        "mes": mes,
        "ano": ano,
        "totais": _serial_bucket(acc.totais),
        "centros_com_wellhub": sum(1 for centro in centros if centro["teve_wellhub"]),
        "centros": centros,
        "wellhub_alunos": alunos_wellhub,
    }


class RelatorioPorCentroAPIView(APIView):
    """Financeiro do mês por centro e turma, alunos Wellhub e outro mês para comparar."""

    permission_classes = [IsAuthenticated, IsGerente]

    def get(self, request):
        hoje = timezone.localdate()
        mes, ano = _parse_periodo(
            request.query_params.get("mes") or hoje.month,
            request.query_params.get("ano") or hoje.year,
        )
        mes_padrao, ano_padrao = mes_anterior(mes, ano)
        mes_comp, ano_comp = _parse_periodo(
            request.query_params.get("mes_comparacao") or mes_padrao,
            request.query_params.get("ano_comparacao") or ano_padrao,
        )
        return Response(
            {
                "mes": mes,
                "ano": ano,
                "mes_comparacao": mes_comp,
                "ano_comparacao": ano_comp,
                "atual": montar_relatorio_periodo(mes, ano),
                "comparacao": montar_relatorio_periodo(mes_comp, ano_comp),
            }
        )

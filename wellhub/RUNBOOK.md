# Runbook — Integração Wellhub (CT Supera)

## Visão geral

- **APIs:** Booking API + Access Control (validate check-in)
- **Piloto:** CT **Praia de Itaipuaçu**, turmas **07:00, 08:00, 19:00**
- **Dias Wellhub:** segunda e quarta (5 vagas/slot)
- **Webhook:** `POST /api/wellhub/webhook/`

## Variáveis de ambiente

```env
WELLHUB_API_BASE_URL=https://apitesting.partners.gympass.com
WELLHUB_API_KEY=<JWT sandbox ou produção>
WELLHUB_GYM_ID=438
WELLHUB_WEBHOOK_SECRET=<secret registrado no portal Wellhub>
WELLHUB_PRODUCT_ID=1
```

Nunca commitar credenciais no repositório.

## Setup inicial (sandbox)

1. Configurar `.env` no servidor ou ambiente local.
2. Garantir no banco:
   - CT `Praia de Itaipuaçu`
   - 3 turmas ativas nos horários 07:00, 08:00, 19:00
3. Executar:

```bash
python manage.py configurar_wellhub_praia
```

Com API indisponível (só local):

```bash
python manage.py configurar_wellhub_praia --skip-api
```

4. Registrar na Wellhub:
   - **Webhook URL:** `https://<dominio>/api/wellhub/webhook/`
   - **Secret:** mesmo valor de `WELLHUB_WEBHOOK_SECRET`
   - Habilitar eventos de **booking** e **check-in** no portal
   - Enviar Bearer token das APIs CT Supera (processo Wellhub)

## Operação diária

- **Cron (03:00):** `sincronizar_wellhub_slots` — recria/atualiza slots do mês (seg/qua)
- **Manual (gerente):** botão “Sincronizar slots Wellhub” no painel web/app
- **Cadastros:** menu **Wellhub** → listar/editar `CadastroWellhub`

## Comandos úteis

```bash
# Sync slots (mês corrente)
python manage.py sincronizar_wellhub_slots

# Apenas local, sem API
python manage.py sincronizar_wellhub_slots --skip-api

# Testes unitários
python manage.py test wellhub
```

## Homologação sandbox (checklist)

1. [ ] Turmas 07h/08h/19h com classes na Wellhub
2. [ ] Slots visíveis no app Wellhub **somente seg/qua**
3. [ ] Reserva teste → webhook → cadastro criado → booking **confirmed**
4. [ ] 6ª reserva na mesma aula → **rejected**
5. [ ] Cancelamento libera vaga (`total_booked` correto)
6. [ ] Webhook com assinatura inválida → HTTP **403**
7. [ ] Check-in teste no app → webhook `checkin.occurred` / `checkin-booking-occurred` → `POST /access/v1/validate`
8. [ ] Sexta **sem** slot Wellhub; matriculados CT seguem check-in normal

## Troubleshooting

| Problema | Ação |
|----------|------|
| `Esperadas 3 turmas` no setup | Verificar CT e horários no admin |
| Slots com `sync_error` | Ver logs; conferir `WELLHUB_API_KEY`, `product_id`, class_id |
| Webhook 403 | Conferir `WELLHUB_WEBHOOK_SECRET` e body bruto (HMAC-SHA1) |
| Reserva rejeitada “janela” | `opens_at` / `closes_at` do slot; re-sync |
| `total_booked` dessincronizado | `POST /api/wellhub/sync/slots/` ou cron |

## Reprocessar evento webhook

1. Django Admin → **Eventos webhook Wellhub**
2. Localizar evento com `processed=False` ou erro
3. Corrigir causa raiz (slot, cota, etc.)
4. Reenviar payload de teste via Postman (com assinatura válida) ou pedir reenvio à Wellhub

## Go-live produção

1. Trocar `WELLHUB_API_BASE_URL` para produção (`https://api.partners.gympass.com`)
2. Credenciais e `gym_id` de produção
3. Atualizar webhook URL + secret no portal Wellhub
4. Executar `configurar_wellhub_praia` uma vez
5. Monitorar primeira semana: Admin → Reservas Wellhub / Eventos webhook

## Access Validate (check-in)

Quando o usuário faz check-in no app Wellhub, a plataforma envia um webhook (`checkin.occurred` ou `checkin-booking-occurred`) para `POST /api/wellhub/webhook/`. O CT Supera responde chamando:

```
POST {WELLHUB_API_BASE_URL}/access/v1/validate
Header: X-Gym-Id: {WELLHUB_GYM_ID}
Header: Authorization: Bearer {WELLHUB_API_KEY}
Body: {"gympass_id": "<13 dígitos>"}
```

A resposta é gravada na reserva (`WellhubBooking.checkin_validado`). Na lista de presença do professor, alunos Wellhub com check-in validado aparecem com status de check-in realizado.

## Fora do escopo

- Aula experimental via Wellhub
- Publicação de outros CTs ou horários (sem alterar código/constants)

"""
Cliente para integração com a API do C6 Bank
Implementa autenticação OAuth2 e comunicação segura com certificados SSL
Tratamento de erros conforme RFC 7807
"""

import requests
import json
import logging
import base64
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
import os

logger = logging.getLogger(__name__)


class C6BankError(Exception):
    """
    Exceção base para erros da API do C6 Bank conforme RFC 7807
    
    Propriedades conforme RFC 7807:
    - type: URI que identifica o tipo do problema
    - title: Descrição legível do problema
    - status: Código HTTP
    - timestamp: Horário da ocorrência (opcional)
    - correlation_id: ID de correlação para suporte (opcional)
    - detail: Descrição detalhada (opcional)
    """
    
    def __init__(self, type_uri, title, status, timestamp=None, correlation_id=None, detail=None):
        self.type = type_uri
        self.title = title
        self.status = status
        self.timestamp = timestamp
        self.correlation_id = correlation_id
        self.detail = detail
        
        # Mensagem de erro principal
        message = f"[{status}] {title}"
        if detail:
            message += f": {detail}"
        if correlation_id:
            message += f" (Correlation ID: {correlation_id})"
            
        super().__init__(message)
    
    def to_dict(self):
        """Retorna o erro como dicionário conforme RFC 7807"""
        error_dict = {
            'type': self.type,
            'title': self.title,
            'status': self.status
        }
        if self.timestamp:
            error_dict['timestamp'] = self.timestamp
        if self.correlation_id:
            error_dict['correlation_id'] = self.correlation_id
        if self.detail:
            error_dict['detail'] = self.detail
        return error_dict
    
    def get_error_url(self):
        """Retorna a URL de documentação do erro"""
        error_type = self.type.split('/')[-1] if '/' in self.type else self.type
        return f"https://developers.c6bank.com.br/v1/error/{error_type}"


class C6BankInvalidRequestError(C6BankError):
    """Erro 400 - Requisição inválida"""
    pass


class C6BankUnauthorizedError(C6BankError):
    """Erro 401 - Não autorizado"""
    pass


class C6BankAccessDeniedError(C6BankError):
    """Erro 403 - Acesso negado (sem escopo necessário)"""
    pass


class C6BankNotFoundError(C6BankError):
    """Erro 404 - Entidade não encontrada"""
    pass


class C6BankUnprocessableEntityError(C6BankError):
    """Erro 422 - Entidade não pode ser processada"""
    pass


class C6BankTooManyRequestsError(C6BankError):
    """Erro 429 - Muitas requisições"""
    pass


class C6BankInternalServerError(C6BankError):
    """Erro 500 - Erro interno do servidor"""
    pass


class C6BankServiceUnavailableError(C6BankError):
    """Erro 503 - Serviço não disponível"""
    pass


class C6BankGatewayTimeoutError(C6BankError):
    """Erro 504 - Gateway timeout"""
    pass


class C6BankClient:
    """
    Cliente para comunicação com a API do C6 Bank
    Gerencia autenticação OAuth2 e requisições HTTP seguras
    """
    
    def __init__(self):
        self.client_id = settings.C6_BANK_CLIENT_ID
        self.client_secret = settings.C6_BANK_CLIENT_SECRET
        self.chave_pix_padrao = settings.C6_BANK_CHAVE_PIX
        self.cert_path = settings.C6_BANK_CERT_PATH
        self.key_path = settings.C6_BANK_KEY_PATH
        self.environment = settings.C6_BANK_ENVIRONMENT
        
        # URLs baseadas no ambiente (conforme documentação oficial)
        if self.environment == 'sandbox':
            self.base_url = "https://baas-api-sandbox.c6bank.info"
            self.auth_url = f"{self.base_url}/v1/auth/"
            self.pix_base_url = f"{self.base_url}/v2/pix"  # Endpoint PIX conforme documentação
            self.checkout_base_url = f"{self.base_url}/v1/checkouts"  # Endpoint Checkout conforme checkout.yaml
            self.statements_base_url = f"{self.base_url}/v1/c6pay/statement"  # Endpoint Statements conforme c6pay-statements.yaml
            self.bankslip_base_url = f"{self.base_url}/v1/bank_slips"  # Endpoint Boleto conforme bankslip-api.yaml
        else:
            self.base_url = "https://baas-api.c6bank.info"
            self.auth_url = f"{self.base_url}/v1/auth/"
            self.pix_base_url = f"{self.base_url}/v2/pix"  # Endpoint PIX conforme documentação
            self.checkout_base_url = f"{self.base_url}/v1/checkouts"  # Endpoint Checkout conforme checkout.yaml
            self.statements_base_url = f"{self.base_url}/v1/c6pay/statement"  # Endpoint Statements conforme c6pay-statements.yaml
            self.bankslip_base_url = f"{self.base_url}/v1/bank_slips"  # Endpoint Boleto conforme bankslip-api.yaml
        
        # Configuração de certificados SSL
        self.cert_config = self._setup_certificates()
        
    def _setup_certificates(self):
        """
        Configura os certificados SSL para comunicação segura
        """
        cert_config = {}
        
        # Verifica se os caminhos foram configurados
        if not self.cert_path or not self.key_path:
            logger.warning("Caminhos dos certificados não configurados - continuando sem certificados")
            return cert_config
        
        # Verifica se os arquivos existem
        if os.path.exists(self.cert_path) and os.path.exists(self.key_path):
            # Usa caminhos absolutos para evitar problemas de encoding
            cert_path_abs = os.path.abspath(self.cert_path)
            key_path_abs = os.path.abspath(self.key_path)
            
            cert_config = {
                'cert': (cert_path_abs, key_path_abs)
            }
            logger.info(f"Certificados SSL configurados: {cert_path_abs}, {key_path_abs}")
        else:
            logger.warning(f"Arquivos de certificado não encontrados:")
            logger.warning(f"  - Cert: {self.cert_path} (existe: {os.path.exists(self.cert_path) if self.cert_path else 'N/A'})")
            logger.warning(f"  - Key: {self.key_path} (existe: {os.path.exists(self.key_path) if self.key_path else 'N/A'})")
            logger.warning("Continuando sem certificados SSL")
            
        return cert_config
    
    def _parse_rfc7807_error(self, response):
        """
        Parseia erros RFC 7807 da resposta da API do C6 Bank
        
        Args:
            response: Objeto Response do requests
            
        Returns:
            C6BankError: Exceção apropriada baseada no tipo de erro
            
        Raises:
            C6BankError: Uma das exceções específicas baseada no status code
        """
        status_code = response.status_code
        
        # Verifica se o content-type é application/problem+json
        content_type = response.headers.get('Content-Type', '')
        is_rfc7807 = 'application/problem+json' in content_type or 'application/json' in content_type
        
        # Tenta parsear o JSON da resposta
        try:
            if is_rfc7807 and response.text:
                error_data = response.json()
            else:
                # Se não for JSON válido, cria um erro genérico
                error_data = {}
        except (ValueError, json.JSONDecodeError):
            error_data = {}
        
        # Extrai campos RFC 7807
        type_uri = error_data.get('type', '')
        title = error_data.get('title', 'Erro desconhecido')
        status = error_data.get('status', status_code)
        timestamp = error_data.get('timestamp')
        correlation_id = error_data.get('correlation_id')
        detail = error_data.get('detail')
        
        # Se não tiver type, tenta inferir do status code
        if not type_uri:
            error_type_map = {
                400: 'invalid_request',
                401: 'unauthorized',
                403: 'access_denied',
                404: 'not_found',
                422: 'unprocessable_entity',
                429: 'too_many_requests',
                500: 'internal_server_error',
                503: 'service_unavailable',
                504: 'gateway_timeout'
            }
            error_type = error_type_map.get(status_code, 'unknown_error')
            type_uri = f"https://developers.c6bank.com.br/v1/error/{error_type}"
        
        # Se não tiver title, usa um padrão baseado no status
        if not title or title == 'Erro desconhecido':
            title_map = {
                400: 'Requisição inválida',
                401: 'Não autorizado',
                403: 'Acesso negado',
                404: 'Entidade não encontrada',
                422: 'Entidade não pode ser processada',
                429: 'Muitas requisições',
                500: 'Erro interno do servidor',
                503: 'Serviço não disponível',
                504: 'Gateway timeout'
            }
            title = title_map.get(status_code, f'Erro HTTP {status_code}')
        
        # Log detalhado do erro
        logger.error(f"Erro RFC 7807 recebido:")
        logger.error(f"  Status: {status}")
        logger.error(f"  Type: {type_uri}")
        logger.error(f"  Title: {title}")
        if timestamp:
            logger.error(f"  Timestamp: {timestamp}")
        if correlation_id:
            logger.error(f"  Correlation ID: {correlation_id}")
        if detail:
            logger.error(f"  Detail: {detail}")
        logger.error(f"  Resposta completa: {response.text}")
        
        # Cria a exceção apropriada baseada no status code
        error_class_map = {
            400: C6BankInvalidRequestError,
            401: C6BankUnauthorizedError,
            403: C6BankAccessDeniedError,
            404: C6BankNotFoundError,
            422: C6BankUnprocessableEntityError,
            429: C6BankTooManyRequestsError,
            500: C6BankInternalServerError,
            503: C6BankServiceUnavailableError,
            504: C6BankGatewayTimeoutError
        }
        
        error_class = error_class_map.get(status_code, C6BankError)
        return error_class(
            type_uri=type_uri,
            title=title,
            status=status,
            timestamp=timestamp,
            correlation_id=correlation_id,
            detail=detail
        )
    
    def _get_access_token(self):
        """
        Obtém token de acesso OAuth2 do C6 Bank
        """
        cache_key = 'c6_bank_access_token'
        
        # Verifica se já existe um token válido no cache
        cached_token = cache.get(cache_key)
        if cached_token:
            return cached_token
            
        try:
            # Dados para autenticação - APENAS grant_type conforme documentação C6 Bank
            auth_data = {
                'grant_type': 'client_credentials'
            }
            
            # Cria credenciais base64 para HTTP Basic Auth
            credentials = f"{self.client_id}:{self.client_secret}"
            credentials_b64 = base64.b64encode(credentials.encode()).decode()
            
            # Headers da requisição - APENAS dois campos conforme documentação C6 Bank
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': f'Basic {credentials_b64}'
            }
            
            logger.info(f"Fazendo requisição de autenticação para: {self.auth_url}")
            logger.info(f"Client ID: {self.client_id}")
            logger.info(f"Ambiente: {self.environment}")
            
            # Prepara os certificados mTLS (obrigatórios para autenticação C6 Bank)
            cert_tuple = None
            if self.cert_config.get('cert'):
                cert_tuple = self.cert_config.get('cert')
                logger.info("Usando certificados SSL mTLS para autenticação")
            else:
                logger.warning("Certificados SSL não encontrados - autenticação pode falhar")
            
            # Faz a requisição de autenticação
            response = requests.post(
                self.auth_url,
                data=auth_data,
                headers=headers,
                cert=cert_tuple,
                timeout=30
            )
            
            logger.info(f"Resposta do servidor: Status {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get('access_token')
                expires_in = token_data.get('expires_in', 3600)
                
                # Armazena o token no cache com tempo de expiração
                cache.set(cache_key, access_token, expires_in - 60)  # -60 para renovar antes de expirar
                
                logger.info("Token de acesso obtido com sucesso")
                return access_token
            else:
                # Trata erros RFC 7807
                raise self._parse_rfc7807_error(response)
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao obter token de acesso: {str(e)}")
            raise Exception(f"Erro ao obter token de acesso: {str(e)}")
    
    def _make_request(self, method, endpoint, data=None, params=None, headers_extra=None):
        """
        Faz requisições HTTP para a API do C6 Bank
        
        Args:
            method (str): Método HTTP (GET, POST, PUT, DELETE)
            endpoint (str): Endpoint da API (relativo ou absoluto)
            data (dict): Dados JSON para enviar (opcional)
            params (dict): Parâmetros de query string (opcional)
            headers_extra (dict): Headers extras para adicionar (opcional)
        """
        try:
            # Obtém o token de acesso
            access_token = self._get_access_token()
            
            # URL completa - se endpoint já é URL completa, usa diretamente; senão concatena
            if endpoint.startswith('http://') or endpoint.startswith('https://'):
                url = endpoint
            else:
                # Concatena com base_url para endpoints relativos
                url = f"{self.base_url}{endpoint}"
            
            # Headers padrão
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'CT-Supera-Integration/1.0'
            }
            
            # Adiciona headers extras se fornecidos
            if headers_extra:
                headers.update(headers_extra)
            
            logger.info(f"Fazendo requisição {method} para: {url}")
            
            # Prepara os certificados
            cert_tuple = self.cert_config.get('cert') if self.cert_config.get('cert') else None
            
            # Faz a requisição
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                cert=cert_tuple,
                timeout=30
            )
            
            # Log da resposta
            logger.info(f"Resposta recebida: {response.status_code}")
            
            # Verifica se a resposta não foi bem-sucedida (não é 2XX)
            if not (200 <= response.status_code < 300):
                # Trata erros RFC 7807
                raise self._parse_rfc7807_error(response)
            
            return response
            
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro na requisição HTTP: {str(e)}")
            raise Exception(f"Erro na requisição HTTP: {str(e)}")
    
    def create_pix_payment(self, valor, descricao, chave_pix=None, expiracao_segundos=1800, devedor=None):
        """
        Cria uma cobrança PIX imediata via C6 Bank
        Conforme documentação: https://developers.c6bank.com.br/apis/pix
        
        Args:
            valor (float): Valor do pagamento em reais
            descricao (str): Descrição do pagamento
            chave_pix (str): Chave PIX do recebedor (opcional, usa padrão se não informada)
            expiracao_segundos (int): Tempo de expiração em segundos (padrão: 1800 = 30 minutos)
            devedor (dict): Dados do devedor (opcional). Formato:
                - Para pessoa física: {"cpf": "12345678909", "nome": "Nome Completo"}
                - Para pessoa jurídica: {"cnpj": "12345678000195", "nome": "Razão Social"}
                - NOTA: Email não é permitido em cobranças imediatas (apenas em cobranças com vencimento)
            
        Returns:
            dict: Dados da cobrança PIX criada
        """
        try:
            # Usa a chave PIX padrão se não for fornecida
            if not chave_pix:
                chave_pix = self.chave_pix_padrao
                logger.info(f"Usando chave PIX padrão: {chave_pix}")
            
            # Dados da cobrança PIX conforme padrão DICT (Especificação do Banco Central)
            # Documentação: https://developers.c6bank.com.br/apis/pix#description/o-que-esta-api-permite
            cobranca_data = {
                "calendario": {
                    "expiracao": expiracao_segundos  # Expiração em segundos
                },
                "valor": {
                    "original": f"{valor:.2f}"
                },
                "chave": chave_pix,  # Chave PIX do recebedor
                "solicitacaoPagador": descricao  # Texto livre para o pagador
            }
            
            # Adiciona dados do devedor se fornecido
            if devedor:
                # Validação: CPF e CNPJ não podem estar juntos
                if devedor.get('cpf') and devedor.get('cnpj'):
                    raise Exception("CPF e CNPJ não podem ser preenchidos juntos.")
                
                # Limpa CPF/CNPJ removendo caracteres não numéricos
                devedor_limpo = {}
                tem_cpf = False
                tem_cnpj = False
                
                if devedor.get('cpf'):
                    cpf_limpo = ''.join(filter(str.isdigit, str(devedor['cpf'])))
                    if len(cpf_limpo) != 11:
                        raise Exception("CPF deve conter exatamente 11 dígitos.")
                    devedor_limpo['cpf'] = cpf_limpo
                    tem_cpf = True
                
                if devedor.get('cnpj'):
                    cnpj_limpo = ''.join(filter(str.isdigit, str(devedor['cnpj'])))
                    if len(cnpj_limpo) != 14:
                        raise Exception("CNPJ deve conter exatamente 14 dígitos.")
                    devedor_limpo['cnpj'] = cnpj_limpo
                    tem_cnpj = True
                
                # Validação: se nome está presente, CPF ou CNPJ também devem estar
                nome_devedor = devedor.get('nome', '').strip() if devedor.get('nome') else ''
                if nome_devedor:
                    if not tem_cpf and not tem_cnpj:
                        raise Exception("Se o nome do devedor estiver preenchido, CPF ou CNPJ também devem estar.")
                    devedor_limpo['nome'] = nome_devedor[:200]  # Máximo 200 caracteres
                elif tem_cpf or tem_cnpj:
                    # Se tem CPF/CNPJ mas não tem nome, não adiciona devedor (não é obrigatório ter nome se não tiver CPF/CNPJ)
                    logger.warning("CPF/CNPJ fornecido sem nome. Devedor não será incluído na cobrança.")
                    devedor_limpo = None
                
                # NOTA: Email não é permitido em cobranças imediatas (apenas em cobranças com vencimento)
                # Se email for fornecido, será ignorado silenciosamente
                if devedor.get('email'):
                    logger.warning("Campo 'email' não é permitido em cobrança PIX imediata. Será ignorado.")
                
                # Só adiciona devedor se tiver dados válidos
                if devedor_limpo and (tem_cpf or tem_cnpj) and nome_devedor:
                    cobranca_data["devedor"] = devedor_limpo
                elif devedor_limpo:
                    logger.warning("Devedor incompleto. Não será incluído na cobrança.")
            
            # Validação da chave PIX
            if not chave_pix:
                raise Exception("Chave PIX não configurada. Verifique C6_BANK_CHAVE_PIX nas configurações.")
            
            # Endpoint conforme documentação oficial: POST /v2/pix/cob
            # Documentação: pix-api.yaml linha 164-200
            endpoint = "/v2/pix/cob"
            logger.info(f"Criando cobrança PIX: {self.base_url}{endpoint}")
            logger.info(f"Chave PIX: {chave_pix[:20]}... (mascarada)")
            logger.info(f"Valor: R$ {valor:.2f}, Descrição: {descricao}, Expiração: {expiracao_segundos}s")
            if 'devedor' in cobranca_data:
                devedor_info = cobranca_data['devedor']
                cpf_cnpj = devedor_info.get('cpf', '') or devedor_info.get('cnpj', '')
                cpf_cnpj_masked = f"{cpf_cnpj[:3]}***{cpf_cnpj[-2:]}" if len(cpf_cnpj) >= 5 else "***"
                logger.info(f"Devedor: {devedor_info.get('nome', 'N/A')} ({'CPF' if devedor_info.get('cpf') else 'CNPJ' if devedor_info.get('cnpj') else 'N/A'}: {cpf_cnpj_masked})")
            # Log do payload sem expor dados sensíveis
            payload_log = {**cobranca_data}
            if 'devedor' in payload_log:
                devedor_log = payload_log['devedor'].copy()
                if 'cpf' in devedor_log:
                    devedor_log['cpf'] = f"{devedor_log['cpf'][:3]}***{devedor_log['cpf'][-2:]}"
                if 'cnpj' in devedor_log:
                    devedor_log['cnpj'] = f"{devedor_log['cnpj'][:3]}***{devedor_log['cnpj'][-2:]}"
                payload_log['devedor'] = devedor_log
            payload_log['chave'] = chave_pix[:20] + '...'
            logger.info(f"Payload: {json.dumps(payload_log, indent=2, ensure_ascii=False)}")
            
            response = self._make_request('POST', endpoint, data=cobranca_data)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            cobranca_response = response.json()
            logger.info(f"Cobrança PIX criada com sucesso. TXID: {cobranca_response.get('txid')}")
            logger.info(f"Código PIX Copia e Cola disponível: {'sim' if cobranca_response.get('pixCopiaECola') else 'não'}")
            return cobranca_response
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao criar cobrança PIX: {str(e)}")
            raise Exception(f"Erro ao criar cobrança PIX: {str(e)}")
    
    def get_pix_payment_status(self, txid):
        """
        Consulta o status de uma cobrança PIX
        Conforme documentação: https://developers.c6bank.com.br/apis/pix
        
        Args:
            txid (str): ID da transação PIX (identificador único)
            
        Returns:
            dict: Status da cobrança PIX
        """
        try:
            # Endpoint conforme documentação oficial: GET /v2/pix/cob/{txid}
            # Documentação: pix-api.yaml linha 129-163
            endpoint = f"/v2/pix/cob/{txid}"
            logger.info(f"Consultando cobrança PIX: {self.base_url}{endpoint}")
            
            response = self._make_request('GET', endpoint)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao consultar cobrança PIX: {str(e)}")
            raise Exception(f"Erro ao consultar cobrança PIX: {str(e)}")
    
    def get_pix_copia_cola(self, txid):
        """
        Obtém o código PIX Copia e Cola de uma cobrança
        NOTA: Conforme documentação oficial, o código pixCopiaECola já vem
        na resposta ao criar ou consultar uma cobrança (campo pixCopiaECola).
        Este método faz uma consulta e retorna o código.
        
        Conforme documentação: https://developers.c6bank.com.br/apis/pix
        
        Args:
            txid (str): ID da transação PIX
            
        Returns:
            str: Código PIX Copia e Cola
        """
        try:
            # Consulta a cobrança para obter o pixCopiaECola
            cobranca = self.get_pix_payment_status(txid)
            
            # O código PIX Copia e Cola vem no campo pixCopiaECola da resposta
            pix_copia_cola = cobranca.get('pixCopiaECola')
            
            if not pix_copia_cola:
                logger.warning(f"Cobrança {txid} não possui código PIX Copia e Cola ainda")
                return None
            
            return pix_copia_cola
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao obter código PIX Copia e Cola: {str(e)}")
            raise Exception(f"Erro ao obter código PIX Copia e Cola: {str(e)}")
    
    def create_qr_code(self, txid):
        """
        DEPRECADO: Use get_pix_copia_cola() ou obtenha pixCopiaECola diretamente 
        da resposta ao criar/consultar cobrança.
        
        O código PIX Copia e Cola já vem na resposta da cobrança (campo pixCopiaECola).
        Não há endpoint separado para QR Code conforme documentação oficial.
        
        Mantido para compatibilidade com código existente.
        """
        logger.warning("create_qr_code() está deprecado. Use get_pix_copia_cola() ou pixCopiaECola da resposta da cobrança.")
        return {"pixCopiaECola": self.get_pix_copia_cola(txid)}
    
    def list_pix_immediate_charges(self, inicio, fim, cpf=None, cnpj=None, 
                                   location_presente=None, status=None, 
                                   pagina=1, itens_por_pagina=10):
        """
        Lista cobranças PIX imediatas por período
        Conforme documentação: pix-api.yaml linha 206-270
        
        Args:
            inicio (str): Data inicial no formato ISO 8601 (ex: '2025-01-01T00:00:00Z')
            fim (str): Data final no formato ISO 8601 (ex: '2025-01-31T23:59:59Z')
            cpf (str): Filtro pelo CPF do devedor (11 dígitos, opcional)
            cnpj (str): Filtro pelo CNPJ do devedor (14 dígitos, opcional)
            location_presente (bool): Filtro pela existência de location vinculada (opcional)
            status (str): Filtro pelo status da cobrança (opcional)
            pagina (int): Página atual (padrão: 1)
            itens_por_pagina (int): Itens por página (padrão: 10)
            
        Returns:
            dict: Lista de cobranças imediatas
            
        Raises:
            Exception: Se CPF e CNPJ forem informados juntos
        """
        try:
            # Validação: CPF e CNPJ não podem estar juntos
            if cpf and cnpj:
                raise Exception("CPF e CNPJ não podem ser utilizados ao mesmo tempo.")
            
            endpoint = "/v2/pix/cob"
            
            params = {
                'inicio': inicio,
                'fim': fim,
                'paginaAtual': pagina,
                'itensPorPagina': itens_por_pagina
            }
            
            if cpf:
                # Limpa CPF removendo caracteres não numéricos
                cpf_limpo = ''.join(filter(str.isdigit, cpf))
                if len(cpf_limpo) != 11:
                    raise Exception("CPF deve conter exatamente 11 dígitos.")
                params['cpf'] = cpf_limpo
            
            if cnpj:
                # Limpa CNPJ removendo caracteres não numéricos
                cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
                if len(cnpj_limpo) != 14:
                    raise Exception("CNPJ deve conter exatamente 14 dígitos.")
                params['cnpj'] = cnpj_limpo
            
            if location_presente is not None:
                params['locationPresente'] = location_presente
            
            if status:
                params['status'] = status
            
            logger.info(f"Listando cobranças PIX imediatas: {inicio} até {fim}")
            logger.info(f"Filtros: CPF={bool(cpf)}, CNPJ={bool(cnpj)}, Status={status}")
            
            response = self._make_request('GET', endpoint, params=params)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao listar cobranças PIX imediatas: {str(e)}")
            raise Exception(f"Erro ao listar cobranças PIX imediatas: {str(e)}")
    
    def create_pix_charge_with_due_date(self, txid, valor, chave_pix, data_vencimento, 
                                        devedor, validade_apos_vencimento=30,
                                        descricao=None, multa=None, juros=None, 
                                        desconto=None):
        """
        Cria uma cobrança PIX com vencimento
        Conforme documentação: pix-api.yaml linha 271-495
        
        Args:
            txid (str): ID da transação (identificador único, 26-35 caracteres alfanuméricos)
            valor (float): Valor da cobrança em reais
            chave_pix (str): Chave PIX do recebedor
            data_vencimento (str): Data de vencimento no formato 'YYYY-MM-DD'
            devedor (dict): Dados do devedor (obrigatório). Formato:
                - Para pessoa física: {"cpf": "12345678909", "nome": "Nome Completo", 
                                       "logradouro": "...", "cidade": "...", "uf": "...", "cep": "..."}
                - Para pessoa jurídica: {"cnpj": "12345678000195", "nome": "Razão Social",
                                         "logradouro": "...", "cidade": "...", "uf": "...", "cep": "..."}
            validade_apos_vencimento (int): Dias corridos após vencimento que ainda pode ser paga (padrão: 30)
            descricao (str): Descrição do pagamento (opcional)
            multa (dict): Configuração de multa (opcional). Formato: {"modalidade": 1 ou 2, "valorPerc": "15.00"}
            juros (dict): Configuração de juros (opcional). Formato: {"modalidade": 1 ou 2, "valorPerc": "2.00"}
            desconto (dict): Configuração de desconto (opcional). Formato: {"modalidade": 1, "descontoDataFixa": [...]}
            
        Returns:
            dict: Dados da cobrança PIX com vencimento criada
        """
        try:
            # Validação do TXID: deve ter entre 26 e 35 caracteres alfanuméricos
            import re
            txid_limpo = str(txid).strip()
            if not re.match(r'^[a-zA-Z0-9]{26,35}$', txid_limpo):
                raise Exception(f"TXID inválido. Deve ter entre 26 e 35 caracteres alfanuméricos. Recebido: '{txid_limpo}' ({len(txid_limpo)} caracteres)")
            
            # Usa a chave PIX padrão se não for fornecida
            if not chave_pix:
                chave_pix = self.chave_pix_padrao
                logger.info(f"Usando chave PIX padrão: {chave_pix}")
            
            # Validação do devedor
            if not devedor:
                raise Exception("Dados do devedor são obrigatórios para cobrança com vencimento.")
            
            # Validação: CPF e CNPJ não podem estar juntos
            if devedor.get('cpf') and devedor.get('cnpj'):
                raise Exception("CPF e CNPJ não podem ser preenchidos juntos.")
            
            # Limpa e valida dados do devedor
            devedor_limpo = {}
            if devedor.get('cpf'):
                cpf_limpo = ''.join(filter(str.isdigit, devedor['cpf']))
                if len(cpf_limpo) != 11:
                    raise Exception("CPF deve conter exatamente 11 dígitos.")
                devedor_limpo['cpf'] = cpf_limpo
            
            if devedor.get('cnpj'):
                cnpj_limpo = ''.join(filter(str.isdigit, devedor['cnpj']))
                if len(cnpj_limpo) != 14:
                    raise Exception("CNPJ deve conter exatamente 14 dígitos.")
                devedor_limpo['cnpj'] = cnpj_limpo
            
            if not devedor.get('nome'):
                raise Exception("Nome do devedor é obrigatório.")
            devedor_limpo['nome'] = devedor['nome'][:200]
            
            # Campos obrigatórios do devedor para cobrança com vencimento
            campos_obrigatorios = ['logradouro', 'cidade', 'uf', 'cep']
            for campo in campos_obrigatorios:
                if not devedor.get(campo):
                    raise Exception(f"Campo '{campo}' do devedor é obrigatório para cobrança com vencimento.")
                devedor_limpo[campo] = devedor[campo]
            
            if devedor.get('email'):
                devedor_limpo['email'] = devedor['email']
            
            # Monta o payload da cobrança
            cobranca_data = {
                "calendario": {
                    "dataDeVencimento": data_vencimento,
                    "validadeAposVencimento": validade_apos_vencimento
                },
                "devedor": devedor_limpo,
                "valor": {
                    "original": f"{valor:.2f}"
                },
                "chave": chave_pix
            }
            
            if descricao:
                cobranca_data["solicitacaoPagador"] = descricao
            
            if multa:
                cobranca_data["valor"]["multa"] = multa
            
            if juros:
                cobranca_data["valor"]["juros"] = juros
            
            if desconto:
                cobranca_data["valor"]["desconto"] = desconto
            
            # Endpoint conforme documentação: PUT /v2/pix/cobv/{txid}
            endpoint = f"/v2/pix/cobv/{txid}"
            logger.info(f"Criando cobrança PIX com vencimento: {self.base_url}{endpoint}")
            logger.info(f"TXID: {txid}, Valor: R$ {valor:.2f}, Vencimento: {data_vencimento}")
            logger.info(f"Devedor: {devedor_limpo.get('nome')} ({'CPF' if devedor_limpo.get('cpf') else 'CNPJ' if devedor_limpo.get('cnpj') else 'N/A'})")
            
            response = self._make_request('PUT', endpoint, data=cobranca_data)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            cobranca_response = response.json()
            logger.info(f"Cobrança PIX com vencimento criada com sucesso. TXID: {cobranca_response.get('txid')}")
            return cobranca_response
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao criar cobrança PIX com vencimento: {str(e)}")
            raise Exception(f"Erro ao criar cobrança PIX com vencimento: {str(e)}")
    
    def list_pix_charges_with_due_date(self, inicio, fim, cpf=None, cnpj=None,
                                      location_presente=None, status=None,
                                      lote_cobv_id=None, pagina=1, itens_por_pagina=10):
        """
        Lista cobranças PIX com vencimento por período
        Conforme documentação: pix-api.yaml linha 496-567
        
        Args:
            inicio (str): Data inicial no formato ISO 8601 (ex: '2025-01-01T00:00:00Z')
            fim (str): Data final no formato ISO 8601 (ex: '2025-01-31T23:59:59Z')
            cpf (str): Filtro pelo CPF do devedor (11 dígitos, opcional)
            cnpj (str): Filtro pelo CNPJ do devedor (14 dígitos, opcional)
            location_presente (bool): Filtro pela existência de location vinculada (opcional)
            status (str): Filtro pelo status da cobrança (opcional)
            lote_cobv_id (int): Filtro pelo ID do lote de cobrança com vencimento (opcional)
            pagina (int): Página atual (padrão: 1)
            itens_por_pagina (int): Itens por página (padrão: 10)
            
        Returns:
            dict: Lista de cobranças com vencimento
            
        Raises:
            Exception: Se CPF e CNPJ forem informados juntos
        """
        try:
            # Validação: CPF e CNPJ não podem estar juntos
            if cpf and cnpj:
                raise Exception("CPF e CNPJ não podem ser utilizados ao mesmo tempo.")
            
            endpoint = "/v2/pix/cobv"
            
            params = {
                'inicio': inicio,
                'fim': fim,
                'paginaAtual': pagina,
                'itensPorPagina': itens_por_pagina
            }
            
            if cpf:
                # Limpa CPF removendo caracteres não numéricos
                cpf_limpo = ''.join(filter(str.isdigit, cpf))
                if len(cpf_limpo) != 11:
                    raise Exception("CPF deve conter exatamente 11 dígitos.")
                params['cpf'] = cpf_limpo
            
            if cnpj:
                # Limpa CNPJ removendo caracteres não numéricos
                cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
                if len(cnpj_limpo) != 14:
                    raise Exception("CNPJ deve conter exatamente 14 dígitos.")
                params['cnpj'] = cnpj_limpo
            
            if location_presente is not None:
                params['locationPresente'] = location_presente
            
            if status:
                params['status'] = status
            
            if lote_cobv_id is not None:
                params['loteCobVId'] = lote_cobv_id
            
            logger.info(f"Listando cobranças PIX com vencimento: {inicio} até {fim}")
            logger.info(f"Filtros: CPF={bool(cpf)}, CNPJ={bool(cnpj)}, Status={status}, Lote={lote_cobv_id}")
            
            response = self._make_request('GET', endpoint, params=params)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao listar cobranças PIX com vencimento: {str(e)}")
            raise Exception(f"Erro ao listar cobranças PIX com vencimento: {str(e)}")
    
    def get_pix_charge_with_due_date(self, txid):
        """
        Consulta uma cobrança PIX com vencimento pelo txid
        Conforme documentação: pix-api.yaml linha 271-495 (GET /v2/pix/cobv/{txid})
        
        Args:
            txid (str): ID da transação PIX (identificador único)
            
        Returns:
            dict: Dados da cobrança PIX com vencimento
        """
        try:
            # Endpoint conforme documentação: GET /v2/pix/cobv/{txid}
            endpoint = f"/v2/pix/cobv/{txid}"
            logger.info(f"Consultando cobrança PIX com vencimento: {self.base_url}{endpoint}")
            
            response = self._make_request('GET', endpoint)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao consultar cobrança PIX com vencimento: {str(e)}")
            raise Exception(f"Erro ao consultar cobrança PIX com vencimento: {str(e)}")
    
    def configure_webhook(self, chave_pix, webhook_url):
        """
        Configura webhook para receber notificações PIX
        Conforme documentação: pix-api.yaml linha 1236-1283
        
        Args:
            chave_pix (str): Chave PIX do recebedor
            webhook_url (str): URL onde receber as notificações (deve ser HTTPS)
            
        Returns:
            dict: Dados do webhook configurado
        """
        try:
            # Endpoint conforme documentação: PUT /v2/pix/webhook/{chave}
            endpoint = f"/v2/pix/webhook/{chave_pix}"
            
            webhook_data = {
                "webhookUrl": webhook_url
            }
            
            logger.info(f"Configurando webhook para chave: {chave_pix}")
            logger.info(f"URL do webhook: {webhook_url}")
            
            response = self._make_request('PUT', endpoint, data=webhook_data)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            logger.info("Webhook configurado com sucesso")
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao configurar webhook: {str(e)}")
            raise Exception(f"Erro ao configurar webhook: {str(e)}")
    
    def get_webhook(self, chave_pix):
        """
        Consulta webhook configurado para uma chave PIX
        Conforme documentação: pix-api.yaml linha 1284-1309
        
        Args:
            chave_pix (str): Chave PIX do recebedor
            
        Returns:
            dict: Dados do webhook
        """
        try:
            endpoint = f"/v2/pix/webhook/{chave_pix}"
            
            response = self._make_request('GET', endpoint)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao consultar webhook: {str(e)}")
            raise Exception(f"Erro ao consultar webhook: {str(e)}")
    
    def delete_webhook(self, chave_pix):
        """
        Remove webhook configurado para uma chave PIX
        Conforme documentação: pix-api.yaml linha 1310-1337
        
        Args:
            chave_pix (str): Chave PIX do recebedor
            
        Returns:
            bool: True se removido com sucesso
        """
        try:
            endpoint = f"/v2/pix/webhook/{chave_pix}"
            
            response = self._make_request('DELETE', endpoint)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            # Status 204 não tem corpo, então apenas retorna True
            logger.info(f"Webhook removido com sucesso para chave: {chave_pix}")
            return True
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao remover webhook: {str(e)}")
            raise Exception(f"Erro ao remover webhook: {str(e)}")
    
    def list_webhooks(self, inicio=None, fim=None, pagina=1, itens_por_pagina=10):
        """
        Lista webhooks cadastrados
        Conforme documentação: pix-api.yaml linha 1338-1374
        
        Args:
            inicio (str): Data inicial (ISO 8601)
            fim (str): Data final (ISO 8601)
            pagina (int): Página atual
            itens_por_pagina (int): Itens por página
            
        Returns:
            dict: Lista de webhooks
        """
        try:
            endpoint = "/v2/pix/webhook"
            
            params = {
                'paginaAtual': pagina,
                'itensPorPagina': itens_por_pagina
            }
            
            if inicio:
                params['inicio'] = inicio
            if fim:
                params['fim'] = fim
            
            response = self._make_request('GET', endpoint, params=params)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao listar webhooks: {str(e)}")
            raise Exception(f"Erro ao listar webhooks: {str(e)}")
    
    # ========================================
    # API CHECKOUT - CARTÃO DE CRÉDITO/DÉBITO
    # ========================================
    # Conforme documentação: checkout.yaml
    
    def create_checkout(self, amount, description, payer=None, payment=None, expiration_hours=168, external_reference_id=None):
        """
        Cria um checkout para pagamento
        Conforme documentação: checkout.yaml linha 100-136
        
        Args:
            amount (float): Valor do checkout
            description (str): Descrição do checkout
            payer (dict): Dados do pagador (opcional)
            payment (dict): Configuração de pagamento (card, pix, etc)
            expiration_hours (int): Horas até expiração (padrão 168 = 7 dias)
            external_reference_id (str): ID externo para referência
            
        Returns:
            dict: Dados do checkout criado (id, url)
        """
        try:
            from datetime import datetime, timedelta
            
            # Endpoint conforme documentação: POST /v1/checkouts/
            endpoint = "/v1/checkouts/"
            
            # Calcula data de expiração (formato ISO 8601 com timezone Z)
            expiration = (datetime.now() + timedelta(hours=expiration_hours)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
            
            checkout_data = {
                "amount": amount,
                "description": description,
                "expiration_date_time": expiration
            }
            
            if payer:
                checkout_data["payer"] = payer
            
            if payment:
                checkout_data["payment"] = payment
            
            if external_reference_id:
                checkout_data["external_reference_id"] = external_reference_id
            
            logger.info(f"Criando checkout: R$ {amount}")
            
            response = self._make_request('POST', endpoint, data=checkout_data)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            checkout_response = response.json()
            logger.info(f"Checkout criado: ID {checkout_response.get('id')}")
            return checkout_response
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao criar checkout: {str(e)}")
            raise Exception(f"Erro ao criar checkout: {str(e)}")
    
    def get_checkout(self, checkout_id):
        """
        Consulta um checkout existente
        Conforme documentação: checkout.yaml linha 318-445
        
        Args:
            checkout_id (str): ID do checkout
            
        Returns:
            dict: Dados do checkout
        """
        try:
            endpoint = f"/v1/checkouts/{checkout_id}"
            
            response = self._make_request('GET', endpoint)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao consultar checkout: {str(e)}")
            raise Exception(f"Erro ao consultar checkout: {str(e)}")
    
    def cancel_checkout(self, checkout_id):
        """
        Cancela um checkout
        Conforme documentação: checkout.yaml linha 470-491
        
        Args:
            checkout_id (str): ID do checkout
            
        Returns:
            bool: True se cancelado com sucesso
        """
        try:
            endpoint = f"/v1/checkouts/{checkout_id}/cancel"
            
            response = self._make_request('PUT', endpoint)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            # Status 204 não tem corpo, então apenas retorna True
            logger.info(f"Checkout {checkout_id} cancelado com sucesso")
            return True
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao cancelar checkout: {str(e)}")
            raise Exception(f"Erro ao cancelar checkout: {str(e)}")
    
    def authorize_checkout_with_token(self, amount, description, card_token, payment_date_time=None, external_reference_id=None):
        """
        Autoriza checkout usando cartão tokenizado
        Conforme documentação: checkout.yaml linha 137-310
        
        Args:
            amount (float): Valor da transação
            description (str): Descrição
            card_token (str): Token do cartão
            payment_date_time (str): Data/hora do pagamento (ISO 8601)
            external_reference_id (str): ID externo
            
        Returns:
            dict: Dados da transação autorizada
        """
        try:
            from datetime import datetime
            
            endpoint = "/v1/checkouts/authorize"
            
            authorize_data = {
                "amount": amount,
                "description": description,
                "payment": {
                    "card": {
                        "card_info": {
                            "token": card_token
                        },
                        "type": "CREDIT",
                        "installments": 1,
                        "save_card": False
                    }
                }
            }
            
            if payment_date_time:
                authorize_data["payment_date_time"] = payment_date_time
            else:
                authorize_data["payment_date_time"] = datetime.now().isoformat()
            
            if external_reference_id:
                authorize_data["external_reference_id"] = external_reference_id
            
            response = self._make_request('POST', endpoint, data=authorize_data)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao autorizar checkout: {str(e)}")
            raise Exception(f"Erro ao autorizar checkout: {str(e)}")
    
    # ========================================
    # API C6 PAY STATEMENTS - TRANSAÇÕES E RECEBÍVEIS
    # ========================================
    # Conforme documentação: c6pay-statements.yaml
    
    def get_receivables(self, start_date, end_date=None, page=1, size=200):
        """
        Consulta recebíveis agendados ou liquidados
        Conforme documentação: c6pay-statements.yaml linha 48-85
        
        Args:
            start_date (str): Data inicial no formato 'YYYY-MM-DD'
            end_date (str): Data final no formato 'YYYY-MM-DD' (opcional)
            page (int): Página atual (padrão: 1)
            size (int): Itens por página (padrão: 200, máximo: 200)
            
        Returns:
            dict: Lista de recebíveis
        """
        try:
            endpoint = f"/v1/c6pay/statement/receivables"
            
            params = {
                'start_date': start_date,
                'page': page,
                'size': min(size, 200)  # Máximo 200
            }
            
            if end_date:
                params['end_date'] = end_date
            
            logger.info(f"Consultando recebíveis: {start_date} até {end_date or start_date}")
            
            response = self._make_request('GET', endpoint, params=params)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao consultar recebíveis: {str(e)}")
            raise Exception(f"Erro ao consultar recebíveis: {str(e)}")
    
    def get_transactions(self, start_date, end_date=None, page=1, size=200):
        """
        Consulta transações e cancelamentos
        Conforme documentação: c6pay-statements.yaml linha 87-124
        
        Args:
            start_date (str): Data inicial no formato 'YYYY-MM-DD'
            end_date (str): Data final no formato 'YYYY-MM-DD' (opcional)
            page (int): Página atual (padrão: 1)
            size (int): Itens por página (padrão: 200, máximo: 200)
            
        Returns:
            dict: Lista de transações
        """
        try:
            endpoint = f"/v1/c6pay/statement/transactions"
            
            params = {
                'start_date': start_date,
                'page': page,
                'size': min(size, 200)  # Máximo 200
            }
            
            if end_date:
                params['end_date'] = end_date
            
            logger.info(f"Consultando transações: {start_date} até {end_date or start_date}")
            
            response = self._make_request('GET', endpoint, params=params)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao consultar transações: {str(e)}")
            raise Exception(f"Erro ao consultar transações: {str(e)}")
    
    # ========================================
    # API BANK SLIP - BOLETO BANCÁRIO
    # ========================================
    # Conforme documentação: bankslip-api.yaml
    
    def create_bank_slip(self, external_reference_id, amount, due_date, payer, 
                        instructions=None, discount=None, interest=None, fine=None,
                        our_number=None, partner_software_name=None, partner_software_version=None):
        """
        Emite um novo boleto bancário
        Conforme documentação: bankslip-api.yaml linha 71-99
        
        Args:
            external_reference_id (str): Identificador único externo (1-10 caracteres alfanuméricos)
            amount (float): Valor do boleto
            due_date (str): Data de vencimento (formato YYYY-MM-DD)
            payer (dict): Dados do pagador (name, tax_id, address, email opcional)
            instructions (list): Lista de até 4 instruções (opcional)
            discount (dict): Descontos por antecipação (opcional)
            interest (dict): Juros por atraso (opcional)
            fine (dict): Multa por atraso (opcional)
            our_number (str): Nosso número (1-10 dígitos, opcional)
            partner_software_name (str): Nome do software parceiro (opcional)
            partner_software_version (str): Versão do software parceiro (opcional)
            
        Returns:
            dict: Dados do boleto emitido (id, digitable_line, bar_code, etc.)
        """
        try:
            import re
            
            # Validação do external_reference_id conforme bankslip-api.yaml linha 460-467
            # Padrão: ^[a-zA-Z0-9]{1,10}$ - apenas letras e números, máximo 10 caracteres
            if not external_reference_id:
                raise Exception("external_reference_id é obrigatório")
            
            external_ref_str = str(external_reference_id).strip()
            
            # Verifica se excede o tamanho máximo
            if len(external_ref_str) > 10:
                logger.warning(f"external_reference_id excede 10 caracteres ({len(external_ref_str)}): '{external_ref_str}'. Truncando para 10 caracteres.")
                external_ref_str = external_ref_str[:10]
            
            # Verifica se segue o padrão regex
            if not re.match(r'^[a-zA-Z0-9]{1,10}$', external_ref_str):
                raise Exception(f"external_reference_id inválido. Deve seguir o padrão ^[a-zA-Z0-9]{{1,10}}$ (apenas letras e números, máximo 10 caracteres). Recebido: '{external_ref_str}' ({len(external_ref_str)} caracteres)")
            
            endpoint = "/v1/bank_slips/"
            
            # Conforme bankslip-api.yaml linha 300-327 (bank_slip_create_request)
            bank_slip_data = {
                "external_reference_id": external_ref_str,
                "amount": amount,
                "due_date": due_date,
                "payer": payer
            }
            
            # Campos opcionais
            if instructions:
                bank_slip_data["instructions"] = instructions
            
            if discount:
                bank_slip_data["discount"] = discount
            
            if interest:
                bank_slip_data["interest"] = interest
            
            if fine:
                bank_slip_data["fine"] = fine
            
            if our_number:
                bank_slip_data["our_number"] = our_number
            
            # Headers opcionais conforme bankslip-api.yaml linha 207-222
            headers_extra = {}
            if partner_software_name:
                headers_extra['partner-software-name'] = partner_software_name
            if partner_software_version:
                headers_extra['partner-software-version'] = partner_software_version
            
            logger.info(f"Emitindo boleto: R$ {amount}, Vencimento: {due_date}")
            logger.info(f"Dados do pagador: Nome: {payer.get('name')}, CPF: {payer.get('tax_id')}, Email: {payer.get('email', 'N/A')}")
            logger.info(f"Endereço: {payer.get('address')}")
            
            # Log completo dos dados que serão enviados (sem CPF completo por segurança)
            cpf_log = payer.get('tax_id', '')
            cpf_masked = f"{cpf_log[:3]}***{cpf_log[-2:]}" if len(cpf_log) >= 5 else "***"
            logger.info(f"Payload completo (CPF mascarado): {json.dumps({**bank_slip_data, 'payer': {**payer, 'tax_id': cpf_masked}}, indent=2, ensure_ascii=False)}")
            
            # Faz a requisição com headers extras se necessário
            response = self._make_request('POST', endpoint, data=bank_slip_data, headers_extra=headers_extra)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            bank_slip_response = response.json()
            logger.info(f"Boleto emitido com sucesso. ID: {bank_slip_response.get('id')}")
            return bank_slip_response
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao emitir boleto: {str(e)}")
            raise Exception(f"Erro ao emitir boleto: {str(e)}")
    
    def get_bank_slip(self, bank_slip_id, partner_software_name=None, partner_software_version=None):
        """
        Consulta um boleto já emitido
        Conforme documentação: bankslip-api.yaml linha 136-156
        
        Args:
            bank_slip_id (str): ID do boleto no C6 Bank
            partner_software_name (str): Nome do software parceiro (opcional)
            partner_software_version (str): Versão do software parceiro (opcional)
            
        Returns:
            dict: Dados completos do boleto
        """
        try:
            endpoint = f"/v1/bank_slips/{bank_slip_id}"
            
            # Headers opcionais
            headers_extra = {}
            if partner_software_name:
                headers_extra['partner-software-name'] = partner_software_name
            if partner_software_version:
                headers_extra['partner-software-version'] = partner_software_version
            
            logger.info(f"Consultando boleto: {bank_slip_id}")
            
            response = self._make_request('GET', endpoint, headers_extra=headers_extra)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao consultar boleto: {str(e)}")
            raise Exception(f"Erro ao consultar boleto: {str(e)}")
    
    def update_bank_slip(self, bank_slip_id, amount=None, due_date=None, discount=None,
                        interest=None, fine=None, partner_software_name=None, partner_software_version=None):
        """
        Altera um boleto já emitido
        Conforme documentação: bankslip-api.yaml linha 108-135
        
        Args:
            bank_slip_id (str): ID do boleto no C6 Bank
            amount (float): Novo valor (opcional)
            due_date (str): Nova data de vencimento YYYY-MM-DD (opcional)
            discount (dict): Novos descontos (opcional)
            interest (dict): Novos juros (opcional)
            fine (dict): Nova multa (opcional)
            partner_software_name (str): Nome do software parceiro (opcional)
            partner_software_version (str): Versão do software parceiro (opcional)
            
        Returns:
            dict: Dados atualizados do boleto
        """
        try:
            endpoint = f"/v1/bank_slips/{bank_slip_id}"
            
            # Conforme bankslip-api.yaml linha 286-299 (bank_slip_alter_request)
            # Pelo menos um campo deve ser fornecido
            alter_data = {}
            
            if amount is not None:
                alter_data["amount"] = amount
            if due_date:
                alter_data["due_date"] = due_date
            if discount:
                alter_data["discount"] = discount
            if interest:
                alter_data["interest"] = interest
            if fine:
                alter_data["fine"] = fine
            
            if not alter_data:
                raise Exception("Pelo menos um campo deve ser fornecido para alteração")
            
            # Headers opcionais
            headers_extra = {}
            if partner_software_name:
                headers_extra['partner-software-name'] = partner_software_name
            if partner_software_version:
                headers_extra['partner-software-version'] = partner_software_version
            
            logger.info(f"Alterando boleto: {bank_slip_id}")
            
            response = self._make_request('PUT', endpoint, data=alter_data, headers_extra=headers_extra)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            return response.json()
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao alterar boleto: {str(e)}")
            raise Exception(f"Erro ao alterar boleto: {str(e)}")
    
    def cancel_bank_slip(self, bank_slip_id, partner_software_name=None, partner_software_version=None):
        """
        Cancela um boleto bancário
        Conforme documentação: bankslip-api.yaml linha 178-198
        
        Args:
            bank_slip_id (str): ID do boleto no C6 Bank
            partner_software_name (str): Nome do software parceiro (opcional)
            partner_software_version (str): Versão do software parceiro (opcional)
            
        Returns:
            bool: True se cancelado com sucesso
        """
        try:
            endpoint = f"/v1/bank_slips/{bank_slip_id}/cancel"
            
            # Headers opcionais
            headers_extra = {}
            if partner_software_name:
                headers_extra['partner-software-name'] = partner_software_name
            if partner_software_version:
                headers_extra['partner-software-version'] = partner_software_version
            
            logger.info(f"Cancelando boleto: {bank_slip_id}")
            
            response = self._make_request('PUT', endpoint, headers_extra=headers_extra)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            # Status 204 não tem corpo, então apenas retorna True
            logger.info(f"Boleto {bank_slip_id} cancelado com sucesso")
            return True
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao cancelar boleto: {str(e)}")
            raise Exception(f"Erro ao cancelar boleto: {str(e)}")
    
    def get_bank_slip_pdf(self, bank_slip_id, partner_software_name=None, partner_software_version=None):
        """
        Obtém o PDF do boleto bancário
        Conforme documentação: bankslip-api.yaml linha 157-177
        
        Args:
            bank_slip_id (str): ID do boleto no C6 Bank
            partner_software_name (str): Nome do software parceiro (opcional)
            partner_software_version (str): Versão do software parceiro (opcional)
            
        Returns:
            bytes: Conteúdo do PDF em bytes
        """
        try:
            endpoint = f"/v1/bank_slips/{bank_slip_id}/pdf"
            
            # Headers opcionais
            headers_extra = {}
            if partner_software_name:
                headers_extra['partner-software-name'] = partner_software_name
            if partner_software_version:
                headers_extra['partner-software-version'] = partner_software_version
            
            logger.info(f"Obtendo PDF do boleto: {bank_slip_id}")
            
            # Para PDF, precisa fazer requisição sem JSON
            access_token = self._get_access_token()
            
            url = f"{self.base_url}{endpoint}"
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/pdf'
            }
            
            # Adiciona headers opcionais
            headers.update(headers_extra)
            
            cert_tuple = self.cert_config.get('cert') if self.cert_config.get('cert') else None
            
            response = requests.get(
                url,
                headers=headers,
                cert=cert_tuple,
                timeout=30
            )
            
            # Verifica se a resposta não foi bem-sucedida (não é 2XX)
            if not (200 <= response.status_code < 300):
                # Trata erros RFC 7807
                raise self._parse_rfc7807_error(response)
            
            # Se chegou aqui, a resposta foi bem-sucedida (2XX)
            logger.info(f"PDF do boleto obtido com sucesso")
            return response.content
                
        except C6BankError:
            # Re-lança erros RFC 7807
            raise
        except Exception as e:
            logger.error(f"Erro ao obter PDF do boleto: {str(e)}")
            raise Exception(f"Erro ao obter PDF do boleto: {str(e)}")
    
    def test_connection(self):
        """
        Testa a conexão com a API do C6 Bank
        
        Returns:
            bool: True se a conexão foi bem-sucedida
        """
        try:
            # Tenta obter um token de acesso
            token = self._get_access_token()
            
            if token:
                logger.info("Conexão com C6 Bank testada com sucesso")
                return True
            else:
                logger.error("Falha ao obter token de acesso")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao testar conexão com C6 Bank: {str(e)}")
            return False


# Instância global do cliente
c6_client = C6BankClient()

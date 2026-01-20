"""
Tool: Code Analyzer
Análise estática de código React/TypeScript.

Risk Level: LOW (leitura apenas)

Detecta:
- onClick vazio: onClick={() => {})
- Handlers com console.log apenas
- TODOs em handlers
- onSubmit vazio
- Links com href="#"
"""

import re
from typing import Any, Optional
from dataclasses import dataclass

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


# Padrões problemáticos
ISSUE_PATTERNS = {
    "EMPTY_ONCLICK": {
        "pattern": r'onClick=\{?\(\)\s*=>\s*\{\s*\}\}?',
        "severity": "ERROR",
        "message": "Botão com onClick vazio - não executa nenhuma ação",
        "suggestion": "Implemente a função de callback ou remova o botão"
    },
    "CONSOLE_ONLY": {
        "pattern": r'onClick=\{?\(\)\s*=>\s*console\.(log|warn|error)',
        "severity": "WARNING",
        "message": "Handler com apenas console.log - provavelmente debug",
        "suggestion": "Substitua por lógica real ou remova"
    },
    "TODO_HANDLER": {
        "pattern": r'onClick=\{?.*TODO.*\}?',
        "severity": "WARNING",
        "message": "Handler com TODO - implementação pendente",
        "suggestion": "Implemente a funcionalidade marcada como TODO"
    },
    "EMPTY_ONSUBMIT": {
        "pattern": r'onSubmit=\{?\(\)\s*=>\s*\{\s*\}\}?',
        "severity": "ERROR",
        "message": "Formulário com onSubmit vazio",
        "suggestion": "Implemente o handler de submit do formulário"
    },
    "HREF_HASH": {
        "pattern": r'href=["\']#["\']',
        "severity": "WARNING",
        "message": "Link com href=# - não navega para lugar nenhum",
        "suggestion": "Use um href válido ou onClick com router.push()"
    },
    "EMPTY_ONCHANGE": {
        "pattern": r'onChange=\{?\(\)\s*=>\s*\{\s*\}\}?',
        "severity": "WARNING",
        "message": "Input com onChange vazio",
        "suggestion": "Implemente o handler de change"
    },
    "TODO_COMMENT": {
        "pattern": r'//\s*TODO:?',
        "severity": "INFO",
        "message": "Comentário TODO encontrado",
        "suggestion": "Resolver o TODO ou criar issue"
    },
    "FIXME_COMMENT": {
        "pattern": r'//\s*FIXME:?',
        "severity": "WARNING",
        "message": "Comentário FIXME encontrado",
        "suggestion": "Corrigir o problema indicado"
    },
    "DEBUGGER": {
        "pattern": r'\bdebugger\b',
        "severity": "ERROR",
        "message": "Statement debugger encontrado",
        "suggestion": "Remover debugger antes de deploy"
    },
    "DISABLED_TRUE": {
        "pattern": r'disabled=\{true\}',
        "severity": "INFO",
        "message": "Elemento permanentemente desabilitado",
        "suggestion": "Verificar se é intencional ou deveria ser condicional"
    },
}


class CodeAnalyzerTool:
    """Análise estática de código React/TypeScript."""
    
    name = "code_analyzer"
    description = """
    Analisa código React/TypeScript para encontrar problemas.
    
    Detecta automaticamente:
    - Handlers vazios (onClick, onSubmit, onChange)
    - Código de debug (console.log, debugger)
    - TODOs e FIXMEs
    - Links quebrados (href="#")
    - Elementos sempre desabilitados
    
    Ações:
    - analyze_file: Analisa conteúdo de arquivo
    - analyze_pattern: Busca padrão customizado
    
    Parâmetros:
    - action: analyze_file ou analyze_pattern
    - file_content: Conteúdo do arquivo a analisar
    - file_path: Caminho do arquivo (para contexto)
    - pattern: Padrão regex customizado (para analyze_pattern)
    - include_info: Incluir issues INFO (default: False)
    - categories: Lista de categorias a verificar (opcional)
    
    Retorna:
    - Lista de issues com severidade, linha, código
    - Contagem por severidade e categoria
    - Sugestões de correção
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        action: str = "analyze_file",
        file_content: Optional[str] = None,
        file_path: Optional[str] = None,
        pattern: Optional[str] = None,
        include_info: bool = False,
        categories: Optional[list[str]] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Analisa código para encontrar problemas.
        
        Args:
            action: analyze_file ou analyze_pattern
            file_content: Conteúdo do arquivo
            file_path: Caminho do arquivo
            pattern: Padrão regex customizado
            include_info: Incluir issues INFO
            categories: Categorias a verificar
            
        Returns:
            Issues encontradas com detalhes
        """
        logger.info(
            "Iniciando code_analyzer",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "action": action
            }
        )
        
        if action == "analyze_file":
            return await self._analyze_file(file_content, file_path, include_info, categories)
        elif action == "analyze_pattern":
            return await self._analyze_pattern(file_content, file_path, pattern)
        else:
            return {"success": False, "error": f"Ação desconhecida: {action}"}
    
    async def _analyze_file(
        self,
        content: Optional[str],
        file_path: Optional[str],
        include_info: bool,
        categories: Optional[list[str]]
    ) -> dict[str, Any]:
        """Analisa um arquivo específico."""
        if not content:
            return {"success": False, "error": "file_content é obrigatório"}
        
        file_path = file_path or "inline"
        issues = []
        lines = content.split('\n')
        
        # Filtrar categorias se especificado
        patterns_to_check = ISSUE_PATTERNS
        if categories:
            patterns_to_check = {
                k: v for k, v in ISSUE_PATTERNS.items() 
                if k in categories
            }
        
        for line_num, line in enumerate(lines, 1):
            for pattern_name, pattern_info in patterns_to_check.items():
                # Pular INFO se não solicitado
                if pattern_info["severity"] == "INFO" and not include_info:
                    continue
                    
                match = re.search(pattern_info["pattern"], line, re.IGNORECASE)
                if match:
                    issues.append({
                        "file": file_path,
                        "line": line_num,
                        "column": match.start(),
                        "severity": pattern_info["severity"],
                        "category": pattern_name,
                        "message": pattern_info["message"],
                        "code_snippet": line.strip()[:100],
                        "suggestion": pattern_info.get("suggestion")
                    })
        
        # Contar por severidade
        error_count = len([i for i in issues if i["severity"] == "ERROR"])
        warning_count = len([i for i in issues if i["severity"] == "WARNING"])
        info_count = len([i for i in issues if i["severity"] == "INFO"])
        
        # Agrupar por categoria
        by_category = {}
        for issue in issues:
            cat = issue["category"]
            if cat not in by_category:
                by_category[cat] = 0
            by_category[cat] += 1
        
        return {
            "success": True,
            "action": "analyze_file",
            "file_path": file_path,
            "issues": issues,
            "files_analyzed": 1,
            "error_count": error_count,
            "warning_count": warning_count,
            "info_count": info_count,
            "by_category": by_category,
            "message": f"Análise completa: 🔴{error_count} erros, 🟡{warning_count} warnings, 🔵{info_count} info"
        }
    
    async def _analyze_pattern(
        self,
        content: Optional[str],
        file_path: Optional[str],
        pattern: Optional[str]
    ) -> dict[str, Any]:
        """Busca padrão customizado."""
        if not pattern or not content:
            return {"success": False, "error": "pattern e file_content são obrigatórios"}
        
        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            return {"success": False, "error": f"Padrão regex inválido: {e}"}
        
        issues = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            match = regex.search(line)
            if match:
                issues.append({
                    "file": file_path or "inline",
                    "line": line_num,
                    "column": match.start(),
                    "severity": "WARNING",
                    "category": "CUSTOM_PATTERN",
                    "message": f"Padrão encontrado: {pattern}",
                    "code_snippet": line.strip()[:100]
                })
        
        return {
            "success": True,
            "action": "analyze_pattern",
            "pattern": pattern,
            "issues": issues,
            "files_analyzed": 1,
            "warning_count": len(issues),
            "message": f"Encontradas {len(issues)} ocorrências do padrão"
        }

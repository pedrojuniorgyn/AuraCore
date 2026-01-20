# agents/sdk/python/auracore/cli.py
"""
CLI do AuraCore.

Uso:
    auracore chat fiscal "Calcule o ICMS para SP"
    auracore voice transcribe audio.wav
    auracore rag query "legislação ICMS"
"""

import click
import asyncio
from typing import Any


@click.group()
@click.option("--api-key", envvar="AURACORE_API_KEY", help="API Key")
@click.option("--base-url", default="https://api.auracore.com.br", help="Base URL")
@click.pass_context
def cli(ctx: click.Context, api_key: str, base_url: str) -> None:
    """AuraCore CLI - Interface de linha de comando."""
    ctx.ensure_object(dict)
    ctx.obj["api_key"] = api_key
    ctx.obj["base_url"] = base_url


@cli.group()
def chat() -> None:
    """Comandos de chat com agents."""
    pass


@chat.command("send")
@click.argument("agent")
@click.argument("message")
@click.pass_context
def chat_send(ctx: click.Context, agent: str, message: str) -> None:
    """Envia mensagem para um agent."""
    from .client import AuraCore
    
    async def _run() -> None:
        async with AuraCore(
            api_key=ctx.obj["api_key"],
            base_url=ctx.obj["base_url"]
        ) as client:
            response = await client.agents.chat(agent, message)
            click.echo(f"\n🤖 {agent.upper()}:\n")
            click.echo(response.message)
            click.echo(f"\n📊 Tokens: {response.tokens_input} in / {response.tokens_output} out")
    
    asyncio.run(_run())


@chat.command("list")
@click.pass_context
def chat_list(ctx: click.Context) -> None:
    """Lista agents disponíveis."""
    from .client import AuraCore
    
    async def _run() -> None:
        async with AuraCore(
            api_key=ctx.obj["api_key"],
            base_url=ctx.obj["base_url"]
        ) as client:
            agents = await client.agents.list_agents()
            click.echo("\n🤖 Agents disponíveis:\n")
            for agent in agents:
                click.echo(f"  - {agent}")
    
    asyncio.run(_run())


@cli.group()
def voice() -> None:
    """Comandos de voz."""
    pass


@voice.command("transcribe")
@click.argument("audio_file", type=click.Path(exists=True))
@click.option("--language", "-l", default="pt-BR", help="Idioma")
@click.pass_context
def voice_transcribe(ctx: click.Context, audio_file: str, language: str) -> None:
    """Transcreve áudio para texto."""
    from .client import AuraCore
    
    async def _run() -> None:
        async with AuraCore(
            api_key=ctx.obj["api_key"],
            base_url=ctx.obj["base_url"]
        ) as client:
            result = await client.voice.transcribe(audio_file, language)
            click.echo(f"\n📝 Transcrição:\n")
            click.echo(result.text)
            click.echo(f"\n🎯 Confiança: {result.confidence:.2%}")
    
    asyncio.run(_run())


@voice.command("synthesize")
@click.argument("text")
@click.option("--output", "-o", default="output.mp3", help="Arquivo de saída")
@click.pass_context
def voice_synthesize(ctx: click.Context, text: str, output: str) -> None:
    """Sintetiza texto para áudio."""
    import base64
    from .client import AuraCore
    
    async def _run() -> None:
        async with AuraCore(
            api_key=ctx.obj["api_key"],
            base_url=ctx.obj["base_url"]
        ) as client:
            result = await client.voice.synthesize(text)
            
            with open(output, "wb") as f:
                f.write(base64.b64decode(result.audio_base64))
            
            click.echo(f"✅ Áudio salvo em: {output}")
            click.echo(f"⏱️ Duração: {result.duration_seconds:.2f}s")
    
    asyncio.run(_run())


@cli.group()
def rag() -> None:
    """Comandos de RAG."""
    pass


@rag.command("query")
@click.argument("query")
@click.option("--collection", "-c", default="legislation", help="Coleção")
@click.pass_context
def rag_query(ctx: click.Context, query: str, collection: str) -> None:
    """Faz query RAG."""
    from .client import AuraCore
    
    async def _run() -> None:
        async with AuraCore(
            api_key=ctx.obj["api_key"],
            base_url=ctx.obj["base_url"]
        ) as client:
            result = await client.rag.query(query, collection)
            
            click.echo(f"\n💡 Resposta:\n")
            click.echo(result.answer)
            
            if result.sources:
                click.echo(f"\n📚 Fontes:")
                for source in result.sources:
                    click.echo(f"  - {source.get('title', 'N/A')}")
    
    asyncio.run(_run())


@rag.command("collections")
@click.pass_context
def rag_collections(ctx: click.Context) -> None:
    """Lista coleções disponíveis."""
    from .client import AuraCore
    
    async def _run() -> None:
        async with AuraCore(
            api_key=ctx.obj["api_key"],
            base_url=ctx.obj["base_url"]
        ) as client:
            collections = await client.rag.list_collections()
            click.echo("\n📚 Coleções disponíveis:\n")
            for coll in collections:
                click.echo(f"  - {coll}")
    
    asyncio.run(_run())


@cli.group()
def docs() -> None:
    """Comandos de documentos."""
    pass


@docs.command("upload")
@click.argument("file", type=click.Path(exists=True))
@click.option("--type", "-t", "doc_type", default="pdf", help="Tipo do documento")
@click.pass_context
def docs_upload(ctx: click.Context, file: str, doc_type: str) -> None:
    """Faz upload de documento."""
    from .client import AuraCore
    
    async def _run() -> None:
        async with AuraCore(
            api_key=ctx.obj["api_key"],
            base_url=ctx.obj["base_url"]
        ) as client:
            doc = await client.documents.upload(file, doc_type)
            click.echo(f"\n✅ Documento enviado:")
            click.echo(f"  ID: {doc.id}")
            click.echo(f"  Nome: {doc.name}")
            click.echo(f"  Tipo: {doc.type}")
            click.echo(f"  Tamanho: {doc.size_bytes} bytes")
    
    asyncio.run(_run())


@cli.command("version")
def version() -> None:
    """Mostra versão do SDK."""
    from . import __version__
    click.echo(f"AuraCore SDK v{__version__}")


def main() -> None:
    cli(obj={})


if __name__ == "__main__":
    main()

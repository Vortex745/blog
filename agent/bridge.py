# nanobot sidecar bridge：把 nanobot SDK 包成 SSE HTTP 服务，供博客容器内网调用。
# 线格式契约见 README（/chat、/health）；本文件是唯一入口。LLM 配置变化由
# compose 重建容器生效（环境变量在创建时固化，进程内没有热更新通道）。
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import re
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from nanobot import Nanobot
from pydantic import BaseModel

CONFIG_DIR = Path("/app/config")
CONFIG_PATH = CONFIG_DIR / "config.json"
WORKSPACE_DIR = Path("/app/workspace")

SESSION_PREFIX = "visitor:"
DEFAULT_SESSION_TTL_DAYS = 7
SESSION_KEY_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9:_-]{0,127}")

# 参与 config 指纹的环境变量（顺序无关紧要，值变了指纹才变）。
FINGERPRINT_ENVS = ("AI_GATEWAY_API_KEY", "LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL", "AI_CHAT_MODEL")

RUN_FAILED_MESSAGE = "AI 服务暂时不可用，请稍后重试"
TOKEN_NOT_CONFIGURED = "鉴权未配置：服务端缺少 AGENT_BRIDGE_TOKEN"


def _env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def _fingerprint() -> str:
    raw = "\n".join(_env(name) for name in FINGERPRINT_ENVS)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:8]


def _llm_configured() -> bool:
    if _env("AI_GATEWAY_API_KEY"):
        return True
    return bool(_env("LLM_BASE_URL") and _env("LLM_API_KEY"))


def _chat_model() -> str:
    return _env("AI_CHAT_MODEL") or "openai/gpt-4o-mini"


def _ttl_days() -> int:
    raw = _env("AGENT_SESSION_TTL_DAYS")
    try:
        return max(0, int(raw)) if raw else DEFAULT_SESSION_TTL_DAYS
    except ValueError:
        return DEFAULT_SESSION_TTL_DAYS


def _write_config() -> None:
    """按当前环境变量生成 config.json；密钥写 ${VAR} 占位符，由 nanobot 启动时解析，落盘的只有占位符。"""
    if _env("AI_GATEWAY_API_KEY"):
        model = _chat_model()
        provider = {"apiBase": "https://ai-gateway.vercel.sh/v1", "apiKey": "${AI_GATEWAY_API_KEY}"}
    else:
        # 非 gateway 模式对齐旧 pi runtime 语义：模型名取 LLM_MODEL（admin 配置页写入的就是它）。
        model = _env("LLM_MODEL") or _chat_model()
        provider = {
            "apiBase": _env("LLM_BASE_URL") or None,
            "apiKey": "${LLM_API_KEY}" if _env("LLM_API_KEY") else None,
        }
    config = {
        "agents": {
            "defaults": {
                "model": model,
                "modelPreset": "custom",
                "workspace": str(WORKSPACE_DIR),
                "dream": {"enabled": False},
            }
        },
        "modelPresets": {"custom": {"provider": "custom", "model": model}},
        "providers": {"custom": provider},
        "tools": {
            "web": {"enable": False},
            "exec": {"enable": False},
            "file": {"enable": False},
            "cliApps": {"enable": False},
            "my": {"enable": False},
            "maxSessionMessagesPerMinute": 60,
        },
    }
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")


def _build_bot() -> Nanobot:
    _write_config()
    bot = Nanobot.from_config(config_path=CONFIG_PATH, workspace=WORKSPACE_DIR)
    # v1 零工具：cli_apps/my 由配置关闭；session/message/subagent/goal 工具在
    # nanobot 0.4.0 没有配置门控，注册后统一清空（get_definitions() 为空时
    # provider 请求不带 tools 字段）。bot.sessions.* 走 SessionManager，不受影响。
    registry = bot._loop.tools
    for name in list(registry.tool_names):
        registry.unregister(name)
    return bot


def _tool_names(bot: Nanobot) -> list[str]:
    definitions = bot._loop.tools.get_definitions()
    return [d["function"]["name"] for d in definitions if isinstance(d, dict) and "function" in d]


@dataclass
class BridgeState:
    bot: Nanobot | None = None
    fingerprint: str = ""


state = BridgeState()


async def _cleanup_sessions() -> None:
    """删除超过 TTL 未活跃的 visitor 会话；SDK API 缺失或单条失败只打日志，绝不让任务崩溃。"""
    if _ttl_days() <= 0:
        return  # TTL 设为 0 表示永不过期
    bot = state.bot
    if bot is None:
        return
    cutoff = datetime.now(UTC) - timedelta(days=_ttl_days())
    try:
        sessions = await bot.sessions.list()
    except Exception as exc:
        print(f"[sessions] 列举会话失败，本轮跳过：{type(exc).__name__}: {exc}")
        return
    for session in sessions:
        if not session.key.startswith(SESSION_PREFIX):
            continue
        try:
            updated = datetime.fromisoformat(session.updated_at) if session.updated_at else None
        except ValueError:
            updated = None
        if updated is None:
            print(f"[sessions] 会话 {session.key} 无有效时间戳，跳过")
            continue
        if updated < cutoff:
            try:
                await bot.sessions.delete(session.key)
                print(f"[sessions] 已清理过期会话（最后活跃 {session.updated_at}）")
            except Exception as exc:
                print(f"[sessions] 删除会话失败：{type(exc).__name__}: {exc}")


async def _ttl_worker() -> None:
    await asyncio.sleep(3600)  # 启动 1 小时后跑第一轮，之后每 24 小时一轮
    while True:
        try:
            await _cleanup_sessions()
        except Exception as exc:
            print(f"[sessions] 清理任务异常：{type(exc).__name__}: {exc}")
        await asyncio.sleep(86400)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    state.fingerprint = _fingerprint()
    state.bot = _build_bot()
    print(f"[startup] config fingerprint={state.fingerprint} llmConfigured={_llm_configured()}")
    print(f"[startup] 已注册工具列表: {_tool_names(state.bot) or '(空)'}")
    ttl_task = asyncio.create_task(_ttl_worker())
    yield
    ttl_task.cancel()
    if state.bot is not None:
        await state.bot.aclose()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


def _reject(request: Request) -> JSONResponse | None:
    expected = os.environ.get("AGENT_BRIDGE_TOKEN") or ""
    if not expected:
        return JSONResponse({"ok": False, "message": TOKEN_NOT_CONFIGURED}, status_code=503)
    provided = request.headers.get("x-agent-token") or ""
    # 头里可能出现任意字节，必须按字节比较：compare_digest 对非 ASCII str 会抛 TypeError。
    if not hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8")):
        return JSONResponse({"ok": False, "message": "鉴权失败"}, status_code=401)
    return None


def _sse(payload: dict[str, str]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


class ChatBody(BaseModel):
    session_key: str
    message: str


@app.get("/health")
async def health() -> dict[str, object]:
    return {"ok": True, "llmConfigured": _llm_configured(), "configFingerprint": _fingerprint()}


@app.post("/chat")
async def chat(request: Request, body: ChatBody) -> StreamingResponse:
    denied = _reject(request)
    if denied is not None:
        return denied
    if not body.message.strip() or not SESSION_KEY_PATTERN.fullmatch(body.session_key):
        return JSONResponse({"ok": False, "message": "请求参数不合法"}, status_code=400)

    bot = state.bot
    if bot is None:
        return JSONResponse({"ok": False, "message": RUN_FAILED_MESSAGE}, status_code=503)

    async def event_stream() -> AsyncIterator[str]:
        started = time.monotonic()
        final_type = "run.failed"
        delta_count = 0
        run = None
        try:
            run = await bot.run_streamed(body.message, session_key=body.session_key)
            async for event in run.stream_events():
                if event.type == "text.delta":
                    delta_count += 1
                    yield _sse({"type": "text.delta", "delta": event.delta})
                elif event.type == "run.completed":
                    # provider 报错（如配额/欠费）时 SDK 不发 run.failed，而是把错误
                    # 文本作为回复内容以 stop_reason="error" 完成——映射成 run.failed，
                    # 避免把英文报错当回答推给访客。
                    if event.result is not None and event.result.stop_reason == "error":
                        final_type = "run.failed"
                        yield _sse({"type": "run.failed", "message": RUN_FAILED_MESSAGE})
                    else:
                        final_type = "run.completed"
                        yield _sse({"type": "run.completed", "content": event.content})
                elif event.type == "run.failed":
                    yield _sse({"type": "run.failed", "message": RUN_FAILED_MESSAGE})
                # 其余事件类型（run.started / text.completed / reasoning.* / tool.*）一律忽略
        except Exception as exc:
            final_type = "run.failed"
            print(f"[chat] 运行异常：{type(exc).__name__}")
            yield _sse({"type": "run.failed", "message": RUN_FAILED_MESSAGE})
        finally:
            if run is not None:
                await run.aclose()  # 客户端断开时取消底层 run；幂等
            print(
                f"[chat] session={body.session_key.split(':', 1)[0]} final={final_type} "
                f"deltas={delta_count} elapsed={time.monotonic() - started:.2f}s"
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})

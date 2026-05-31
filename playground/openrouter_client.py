import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


DEFAULT_OPENROUTER_MODEL = "mistralai/mistral-7b-instruct:free"
OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"


def load_env() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)


def get_api_key() -> str | None:
    return os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")


def get_default_model() -> str:
    return os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)


def pick_free_model(api_key: str, preferred_model: str | None = None, timeout: float = 30.0) -> str:
    response = httpx.get(
        OPENROUTER_MODELS_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=timeout,
    )
    response.raise_for_status()

    rows = response.json().get("data", [])
    free_models = [r.get("id") for r in rows if str(r.get("id", "")).endswith(":free")]
    free_models = [m for m in free_models if m]

    if not free_models:
        raise RuntimeError("No free OpenRouter models available for this key right now.")

    ranked_models = [m for m in free_models if "reasoning" not in m.lower()]
    if not ranked_models:
        ranked_models = free_models

    if preferred_model and preferred_model in ranked_models:
        return preferred_model
    return ranked_models[0]


def chat_completion(
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 700,
    timeout: float = 60.0,
) -> str:
    text, _ = chat_completion_with_payload(
        api_key=api_key,
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
    )
    return text


def chat_completion_with_payload(
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 700,
    timeout: float = 60.0,
) -> tuple[str, dict]:
    response = httpx.post(
        OPENROUTER_CHAT_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        timeout=timeout,
    )
    response.raise_for_status()
    payload = response.json()
    message = payload.get("choices", [{}])[0].get("message", {})
    content = message.get("content")
    if isinstance(content, str):
        return content.strip(), payload
    if isinstance(content, list):
        parts = [c.get("text", "") for c in content if isinstance(c, dict)]
        return " ".join(p.strip() for p in parts if p.strip()), payload
    return "", payload

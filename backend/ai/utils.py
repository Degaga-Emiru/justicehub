import os
import time
import json
import hashlib
import requests
import re
from typing import Optional, Dict, Any

# --- Configuration ---
CONFIG = {
    'primary_model': os.getenv('HF_MODEL_ID', 'mistralai/Mistral-7B-Instruct-v0.2'),
    'api_key': os.getenv('HF_API_KEY'),
    'base_url': 'https://router.huggingface.co/v1',
    'timeout': 30,
}

def estimate_tokens(text: str) -> int:
    """Rough estimation of tokens: ~3.5 chars per token."""
    return len(text) // 3 + (1 if len(text) % 3 > 0 else 0)

def sanitize_prompt(text: str) -> str:
    """Strip control characters and limit length."""
    text = str(text).strip()
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text[:4096]

def sanitize_response(text: str) -> str:
    """Remove any prompt leakage markers."""
    markers = ['Assistant:', 'Assistant (helpful, concise):']
    for m in markers:
        if m in text:
            text = text.split(m)[-1]
    return text.strip()

def generate(prompt: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Call Hugging Face Inference API.
    Returns: {'text': str, 'model': str, 'latency_ms': int}
    """
    if not CONFIG['api_key']:
        raise ValueError("HF_API_KEY environment variable is not set")

    if options is None:
        options = {}

    clean_prompt = sanitize_prompt(prompt)
    start_time = time.time()

    try:
        response = requests.post(
            f"{CONFIG['base_url']}/chat/completions",
            headers={
                "Authorization": f"Bearer {CONFIG['api_key']}",
                "Content-Type": "application/json"
            },
            json={
                "model": CONFIG['primary_model'],
                "messages": [{"role": "user", "content": clean_prompt}],
                "temperature": options.get('temperature', 0.7),
                "max_tokens": options.get('max_new_tokens', 300),
            },
            timeout=CONFIG['timeout']
        )
        response.raise_for_status()
        data = response.json()

        # Parse content from OpenAI-compatible response
        raw_text = data['choices'][0]['message']['content']
        text = sanitize_response(raw_text)

        return {
            'text': text,
            'model': CONFIG['primary_model'],
            'latency_ms': int((time.time() - start_time) * 1000)
        }

    except Exception as e:
        print(f"[AI] Generation failed: {str(e)}")
        raise e

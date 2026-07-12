import asyncio
from groq import AsyncGroq
from google import genai
from google.genai import types
from app.core.config import settings

# Initialize clients if keys are present
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

gemini_client_1 = genai.Client(api_key=settings.GEMINI_API_KEY_1) if settings.GEMINI_API_KEY_1 else None
gemini_client_2 = genai.Client(api_key=settings.GEMINI_API_KEY_2) if settings.GEMINI_API_KEY_2 else None

AVAILABLE_MODELS = [
    {"id": "gpt-5.4-mini", "name": "GPT 5.4 Mini (OpenAI)", "provider": "openai"},
    {"id": "gpt-5.4", "name": "GPT 5.4 (OpenAI)", "provider": "openai_responses"},
    {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B (Groq)", "provider": "groq"},
    {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B (Groq)", "provider": "groq"},
    {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B (Groq)", "provider": "groq"},
    {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "provider": "gemini"},
    {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite", "provider": "gemini"},
    {"id": "gemini-flash-latest", "name": "Gemini Flash Latest", "provider": "gemini"}
]

import json
import httpx

async def stream_with_openai(model_id: str, prompt: str, system_prompt: str):
    if not settings.OPENAI_API_KEY:
        raise ValueError("OpenAI API key not configured")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}"
    }
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.4,
        "max_completion_tokens": 1024,
        "stream": True
    }
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", "https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=60.0) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        content = chunk["choices"][0]["delta"].get("content")
                        if content:
                            yield content
                    except Exception:
                        pass

async def stream_with_openai_responses(model_id: str, prompt: str, system_prompt: str):
    if not settings.OPENAI_API_KEY:
        raise ValueError("OpenAI API key not configured")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}"
    }
    payload = {
        "model": model_id,
        "input": f"{system_prompt}\n\nUser Question: {prompt}",
        "store": False
    }
    async with httpx.AsyncClient() as client:
        r = await client.post("https://api.openai.com/v1/responses", json=payload, headers=headers, timeout=60.0)
        r.raise_for_status()
        res_data = r.json()
        
        text = ""
        if "output" in res_data:
            output = res_data["output"]
            if isinstance(output, dict) and "text" in output:
                text = output["text"]
            elif isinstance(output, str):
                text = output
        elif "choices" in res_data:
            text = res_data["choices"][0]["message"]["content"]
        elif "content" in res_data:
            text = res_data["content"]
        
        if not text:
            def find_text(d):
                if isinstance(d, dict):
                    for k, v in d.items():
                        if k == "text" and isinstance(v, str):
                            return v
                        res = find_text(v)
                        if res:
                            return res
                elif isinstance(d, list):
                    for item in d:
                        res = find_text(item)
                        if res:
                            return res
                return None
            text = find_text(res_data) or str(res_data)

        chunk_size = 15
        for i in range(0, len(text), chunk_size):
            yield text[i:i+chunk_size]
            await asyncio.sleep(0.01)

async def stream_with_groq(model_id: str, prompt: str, system_prompt: str):
    if not groq_client:
        raise ValueError("Groq API key not configured")
    stream = await groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        model=model_id,
        temperature=0.4,
        max_tokens=1024,
        stream=True
    )
    async for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content

async def stream_with_gemini(client, model_id: str, prompt: str, system_prompt: str):
    if not client:
        raise ValueError("Gemini API key not configured")
    response = await client.aio.models.generate_content_stream(
        model=model_id,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.4,
            max_output_tokens=1024,
        ),
    )
    async for chunk in response:
        if chunk.text:
            yield chunk.text

async def generate_answer_stream(question: str, context: str, custom_instructions: str = "", preferred_model_id: str = None):
    system_prompt = (
        "You are an elite software engineer and candidate undergoing a live technical/system design interview.\n"
        "Your goal is to provide a clean, highly professional, and structured answer to the interviewer's question.\n"
        "Formatting Rules:\n"
        "- Act like a senior developer. Use natural, conversational, yet authoritative language. Never sound like an AI.\n"
        "- Speak in the first-person ('I', 'my') when explaining your past projects or resume details.\n"
        "- Organize your answer into distinct visual sections using professional Markdown. Keep paragraphs concise (2-3 sentences max).\n"
        "- Use a key-value format for structured points, bolding the first word/phrase like this: **Key term**: Description.\n"
        "- Highlight critical code terms, architecture components, or tools using `inline code backticks`.\n"
        "- Structure lists with bullet points. Avoid long, overwhelming text blocks.\n"
        "- Always prefix the first sentence of your response with '⭐ **Answer:** '.\n\n"
        f"Context/Resume/Previous Memory:\n{context}\n\n"
        f"Custom Instructions:\n{custom_instructions}"
    )
    
    models_to_try = []
    if preferred_model_id:
        preferred_model = next((m for m in AVAILABLE_MODELS if m["id"] == preferred_model_id), None)
        if preferred_model:
            models_to_try.append(preferred_model)
            
        fallback_model = next((m for m in AVAILABLE_MODELS if m["id"] == "gemini-2.5-flash-lite"), None)
        if fallback_model and fallback_model["id"] != preferred_model_id:
            models_to_try.append(fallback_model)
    
    for m in AVAILABLE_MODELS:
        if m not in models_to_try:
            models_to_try.append(m)

    for model in models_to_try:
        try:
            yield f"data: {json.dumps({'model': model['id'], 'provider': model['provider']})}\n\n"
            
            if model["provider"] == "openai":
                async for chunk in stream_with_openai(model["id"], question, system_prompt):
                    yield f"data: {json.dumps({'answer': chunk})}\n\n"
            elif model["provider"] == "openai_responses":
                async for chunk in stream_with_openai_responses(model["id"], question, system_prompt):
                    yield f"data: {json.dumps({'answer': chunk})}\n\n"
            elif model["provider"] == "groq":
                async for chunk in stream_with_groq(model["id"], question, system_prompt):
                    yield f"data: {json.dumps({'answer': chunk})}\n\n"
            elif model["provider"] == "gemini":
                try:
                    async for chunk in stream_with_gemini(gemini_client_1, model["id"], question, system_prompt):
                        yield f"data: {json.dumps({'answer': chunk})}\n\n"
                except Exception as e:
                    print(f"Gemini Key 1 failed for {model['id']}: {e}")
                    async for chunk in stream_with_gemini(gemini_client_2, model["id"], question, system_prompt):
                        yield f"data: {json.dumps({'answer': chunk})}\n\n"
            
            yield "data: [DONE]\n\n"
            return
        except Exception as e:
            print(f"Model {model['id']} failed: {e}. Falling back to next model...")
            continue
            
    yield f"data: {json.dumps({'answer': 'I am sorry, all AI models are unavailable.'})}\n\n"
    yield "data: [DONE]\n\n"

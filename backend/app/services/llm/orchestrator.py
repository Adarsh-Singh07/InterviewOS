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
    {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B (Groq)", "provider": "groq"},
    {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B (Groq)", "provider": "groq"},
    {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B (Groq)", "provider": "groq"},
    {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "provider": "gemini"},
    {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite", "provider": "gemini"},
    {"id": "gemini-flash-latest", "name": "Gemini Flash Latest", "provider": "gemini"}
]

import json

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
        "You are an expert candidate answering an interview question.\n"
        "Your goal is to provide a user-friendly, conversational, and highly relevant answer.\n"
        "Rules:\n"
        "- Act like a strong, experienced candidate. Be natural, easygoing, and confident. Do NOT sound like an AI.\n"
        "- If the question is about your background, answer in the first-person ('I', 'my') using the provided Context.\n"
        "- Use simple, clear language. Avoid overly corporate jargon unless appropriate.\n"
        "- Do NOT introduce yourself as an AI Copilot.\n"
        "- Provide a complete answer. Do not cut yourself off.\n"
        "- Format nicely with short paragraphs and bullet points if needed.\n"
        "- Prefix the very first sentence of your overall answer with '⭐ **Answer:** '.\n\n"
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
            
            if model["provider"] == "groq":
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

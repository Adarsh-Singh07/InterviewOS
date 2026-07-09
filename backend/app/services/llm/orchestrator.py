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

async def generate_with_groq(model_id: str, prompt: str, system_prompt: str) -> str:
    if not groq_client:
        raise ValueError("Groq API key not configured")
    response = await groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        model=model_id,
        temperature=0.4,
        max_tokens=1024,
    )
    return response.choices[0].message.content

async def generate_with_gemini(client, model_id: str, prompt: str, system_prompt: str) -> str:
    if not client:
        raise ValueError("Gemini API key not configured")
    def _call():
        response = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.4,
                max_output_tokens=1024,
            ),
        )
        return response.text
    return await asyncio.to_thread(_call)

async def generate_answer(question: str, context: str, custom_instructions: str = "", preferred_model_id: str = None) -> dict:
    system_prompt = (
        "You are an expert AI Interview Copilot assisting a candidate in real-time.\n"
        "Your goal is to provide a complete, intelligent, and highly relevant answer to the interviewer's question.\n"
        "Rules:\n"
        "- CRITICAL: If the question is about the candidate (e.g. 'introduce yourself', 'what is your experience'), you MUST answer in the first-person ('I', 'my') AS THE CANDIDATE, using the provided Resume/CV Context.\n"
        "- DO NOT introduce yourself as an AI Copilot. You represent the candidate.\n"
        "- DO NOT sound like a robotic AI. Use a natural, conversational, and confident tone.\n"
        "- Provide a complete answer. Do not cut yourself off.\n"
        "- Be concise but thorough. Focus on the core of the question.\n"
        "- Use highly readable Markdown formatting. Use bullet points heavily.\n"
        "- Bold the first few words of each bullet point (like a dictionary term), followed by a colon and the explanation.\n"
        "- Prefix the very first sentence of your overall answer with '⭐ **Answer:** '.\n\n"
        f"Context/Resume/Previous Memory:\n{context}\n\n"
        f"Custom Instructions:\n{custom_instructions}"
    )
    
    # Sort models so the preferred one is first
    models_to_try = []
    if preferred_model_id:
        preferred_model = next((m for m in AVAILABLE_MODELS if m["id"] == preferred_model_id), None)
        if preferred_model:
            models_to_try.append(preferred_model)
            
        # The user requested that after ANY model failing, it should immediately fallback to gemini-2.5-flash-lite
        fallback_model = next((m for m in AVAILABLE_MODELS if m["id"] == "gemini-2.5-flash-lite"), None)
        if fallback_model and fallback_model["id"] != preferred_model_id:
            models_to_try.append(fallback_model)
    
    # Add the rest of the models to the end of the queue just in case both fail
    for m in AVAILABLE_MODELS:
        if m not in models_to_try:
            models_to_try.append(m)

    for model in models_to_try:
        try:
            if model["provider"] == "groq":
                answer = await generate_with_groq(model["id"], question, system_prompt)
                return {"answer": answer, "provider": model["provider"], "model": model["id"]}
            elif model["provider"] == "gemini":
                # Try Gemini 1, if it fails, the exception will trigger the next model in the list
                # Wait, if we want to try both keys, we can try gemini_client_1, then gemini_client_2 manually
                try:
                    answer = await generate_with_gemini(gemini_client_1, model["id"], question, system_prompt)
                    return {"answer": answer, "provider": "gemini-1", "model": model["id"]}
                except Exception as e:
                    print(f"Gemini Key 1 failed for {model['id']}: {e}")
                    answer = await generate_with_gemini(gemini_client_2, model["id"], question, system_prompt)
                    return {"answer": answer, "provider": "gemini-2", "model": model["id"]}
        except Exception as e:
            print(f"Model {model['id']} failed: {e}. Falling back to next model...")
            continue
            
    return {"answer": "I'm sorry, all AI generation models have exhausted their rate limits or are currently unavailable.", "provider": "Error", "model": "none"}

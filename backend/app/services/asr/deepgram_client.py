import asyncio
import json
from deepgram import (
    DeepgramClient,
    LiveTranscriptionEvents,
    LiveOptions,
)
from app.core.config import settings

class ASRClient:
    def __init__(self):
        self.dg_client = None
        if settings.DEEPGRAM_API_KEY:
            self.dg_client = DeepgramClient(settings.DEEPGRAM_API_KEY)
            
    async def process_stream(self, websocket):
        """
        Connect to Deepgram, receive audio from websocket, send to Deepgram,
        receive transcript from Deepgram, send to websocket.
        """
        if not self.dg_client:
            await self._fallback_local_whisper(websocket)
            return

        try:
            # Create a websocket connection to Deepgram
            dg_connection = self.dg_client.listen.asyncwebsocket.v("1")
            
            # Buffer for current speaker block
            speaker_buffer = []

            async def on_message(self, result, **kwargs):
                sentence = result.channel.alternatives[0].transcript
                if len(sentence) == 0:
                    return
                is_final = result.is_final
                
                # Send transcript back to frontend
                await websocket.send_text(json.dumps({
                    "type": "transcript",
                    "text": sentence,
                    "is_final": is_final
                }))
                
                if is_final:
                    pass
                    # We now handle silence-based question detection purely on the frontend
                    # to ensure the full question context is captured.

            async def on_error(self, error, **kwargs):
                print(f"Deepgram Error: {error}")
                # Ideally, trigger fallback here

            dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
            dg_connection.on(LiveTranscriptionEvents.Error, on_error)

            options = LiveOptions(
                model="nova-2",
                language="en",
                smart_format=True,
                interim_results=True
            )
            
            await dg_connection.start(options)
            
            # Receive audio from frontend and send to Deepgram
            try:
                while True:
                    data = await websocket.receive_bytes()
                    await dg_connection.send(data)
            except Exception as e:
                pass # Client disconnected
            finally:
                await dg_connection.finish()
                
        except Exception as e:
            print(f"Deepgram connection failed, falling back to local: {e}")
            await self._fallback_local_whisper(websocket)

    async def _fallback_local_whisper(self, websocket):
        """
        Fallback for when Deepgram fails or credit expires.
        This would integrate with a local faster-whisper instance.
        """
        await websocket.send_text(json.dumps({
            "type": "status",
            "message": "Using local faster-whisper fallback..."
        }))
        
        # Stub loop
        try:
            while True:
                data = await websocket.receive_bytes()
                # Mock processing delay and result
                await asyncio.sleep(1)
                # In real code, append bytes to a buffer, run faster-whisper periodically
        except Exception:
            pass

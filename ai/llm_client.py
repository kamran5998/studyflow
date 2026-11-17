import os
import json
from typing import Optional, Dict, Any

class LLMService:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.client = None
        if self.api_key:
            try:
                from google import genai
                from google.genai import types
                self.client = genai.Client(
                    api_key=self.api_key,
                    http_options=types.HttpOptions(
                        headers={"User-Agent": "aistudio-build"},
                        timeout=15000  # 15 seconds
                    )
                )
            except Exception as e:
                print(f"[LLMService] Failed to initialize Gemini client: {e}")
                self.client = None

    def is_available(self) -> bool:
        return self.client is not None

    def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Calls Gemini with structured JSON output if available.
        Returns parsed dict or None if unavailable/failed.
        """
        if not self.client:
            return None
        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            )
            if system_instruction:
                config.system_instruction = system_instruction

            response = self.client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
                config=config
            )
            if response and response.text:
                return json.loads(response.text.strip())
        except Exception as e:
            print(f"[LLMService] generate_json error: {e}")
        return None

    def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
        """
        Calls Gemini for natural language completion.
        """
        if not self.client:
            return None
        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                temperature=0.4,
            )
            if system_instruction:
                config.system_instruction = system_instruction

            response = self.client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
                config=config
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            print(f"[LLMService] generate_text error: {e}")
        return None

# Singleton instance
llm_service = LLMService()

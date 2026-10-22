
import os
import logging

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv

from anthropic import (
    Anthropic,
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
    APIStatusError,
)

load_dotenv()

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

MODELS = {
    "sonnet": {
        "name": "Claude Sonnet 4.6",
        "id": "claude-sonnet-4-6",
    },
    "haiku": {
        "name": "Claude Haiku 4.5",
        "id": "claude-haiku-4-5-20251001",
    },
}

MAX_HISTORY = 20
MAX_MESSAGE_LENGTH = 4000


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/models", methods=["GET"])
def list_models():
    return jsonify(MODELS)


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid request format."
        }), 400

    message = data.get("message", "")
    model_key = data.get("model", "haiku")
    history = data.get("history", [])

    if not isinstance(message, str) or not message.strip():
        return jsonify({
            "error": "Please enter a message."
        }), 400

    message = message.strip()

    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify({
            "error": "Message is too long."
        }), 400

    if model_key not in MODELS:
        return jsonify({
            "error": "Invalid model selected."
        }), 400

    if not isinstance(history, list):
        return jsonify({
            "error": "Invalid conversation history."
        }), 400

    # Validate chat history received from the browser.
    cleaned_history = []

    for item in history[-MAX_HISTORY:]:
        if not isinstance(item, dict):
            continue

        role = item.get("role")
        content = item.get("content")

        if role not in ("user", "assistant"):
            continue

        if not isinstance(content, str):
            continue

        if not content.strip():
            continue

        cleaned_history.append({
            "role": role,
            "content": content[:MAX_MESSAGE_LENGTH]
        })

    messages = cleaned_history + [
        {
            "role": "user",
            "content": message
        }
    ]

    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        return jsonify({
            "error": "Claude API key is missing. Check your .env file."
        }), 503

    try:
        client = Anthropic(
            api_key=api_key,
            timeout=60.0,
            max_retries=1
        )

        response = client.messages.create(
            model=MODELS[model_key]["id"],
            max_tokens=1024,
            messages=messages
        )

        answer = "\n".join(
            block.text
            for block in response.content
            if block.type == "text"
        ).strip()

        if not answer:
            return jsonify({
                "error": "Claude returned an empty response."
            }), 502

        return jsonify({
            "response": answer,
            "model": MODELS[model_key]["name"],
            "model_id": response.model
        })

    except AuthenticationError:
        return jsonify({
            "error": "Invalid API key. Check your Anthropic credentials."
        }), 401

    except RateLimitError:
        return jsonify({
            "error": "API rate limit reached. Please try again later."
        }), 429

    except APITimeoutError:
        return jsonify({
            "error": "Claude took too long to respond."
        }), 504

    except APIConnectionError:
        return jsonify({
            "error": "Cannot connect to Claude. Check your internet."
        }), 503

    except BadRequestError:
        app.logger.exception("Anthropic rejected the request")
        return jsonify({
            "error": "Claude rejected the request. Try clearing the chat."
        }), 400

    except APIStatusError as error:
        app.logger.error(
            "Anthropic API status: %s",
            error.status_code
        )
        return jsonify({
            "error": "Claude API is temporarily unavailable."
        }), 502

    except Exception:
        app.logger.exception("Unexpected server error")
        return jsonify({
            "error": "An unexpected server error occurred."
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )

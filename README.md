# Assignment #13 — Multi-Model AI Chat

## Project Description

A web-based multi-model AI chat application developed using Python Flask, JavaScript, HTML, CSS, and the Anthropic Claude API.

The application allows users to communicate with two different Claude language models through a single web interface.

## Supported Models

- Claude Sonnet 4.6
- Claude Haiku 4.5

## Features

- Model selection using a dropdown
- Interactive chat interface
- AI-generated responses
- Conversation history during the browser session
- Switching between models
- Clear chat history
- API error handling
- Responsive dark-mode interface

## Technologies Used

- Python
- Flask
- Anthropic Claude API
- HTML5
- CSS3
- JavaScript
- Browser sessionStorage

## Installation

1. Clone or download the repository.
2. Create a virtual environment using `python3 -m venv .venv`.
3. Activate it with `source .venv/bin/activate`.
4. Install dependencies using `pip install -r requirements.txt`.
5. Copy `.env.example` to `.env`.
6. Add your Anthropic API key to `.env`.
7. Run `python app.py`.
8. Open `http://127.0.0.1:5000` in your browser.

## Testing

Test both Claude models, ask follow-up questions, switch models during a conversation, clear chat history, and check API error handling using an invalid API key.

## Session History

Conversation history is stored in the browser's sessionStorage and sent to the backend with each request. The application retains the latest 20 messages.

## Security

API credentials are stored in an environment file and accessed only by the Flask backend. The `.env` file is excluded from Git version control.

## Limitations

- An Anthropic API key and available API credits are required.
- Only text-based chat is supported.
- Chat history is session-based, not stored in a database.
- The development server is intended for local testing.

## Assignment Requirements

All five required features are implemented in the application.

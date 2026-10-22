
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const modelSelect = document.getElementById("model");
const activeModel = document.getElementById("activeModel");
const errorBox = document.getElementById("errorBox");

const HISTORY_KEY = "assignment13_chat_history";
const MODEL_KEY = "assignment13_selected_model";

const MODELS = {
    haiku: "Claude Haiku 4.5",
    sonnet: "Claude Sonnet 4.6"
};

let history = [];
let busy = false;

// Load session history safely.
try {
    const saved = JSON.parse(
        sessionStorage.getItem(HISTORY_KEY) || "[]"
    );

    if (Array.isArray(saved)) {
        history = saved.filter(item =>
            item &&
            (item.role === "user" ||
             item.role === "assistant") &&
            typeof item.content === "string"
        ).slice(-20);
    }
} catch (error) {
    console.warn("Could not load chat history.", error);
    history = [];
}

function saveHistory() {
    try {
        sessionStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history)
        );
    } catch (error) {
        console.warn("Could not save history.", error);
    }
}

function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
}

function hideError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideWelcome() {
    const welcome = document.getElementById("welcome");

    if (welcome) {
        welcome.remove();
    }
}

function addMessage(role, content, modelName = "") {
    hideWelcome();

    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;

    const label = document.createElement("div");
    label.className = "message-label";

    label.textContent = role === "user"
        ? "You"
        : (modelName || "Claude");

    const bubble = document.createElement("div");
    bubble.className = "message-content";

    // textContent prevents responses from injecting HTML.
    bubble.textContent = content;

    wrapper.appendChild(label);
    wrapper.appendChild(bubble);

    chatBox.appendChild(wrapper);
    scrollToBottom();

    return wrapper;
}

function renderHistory() {
    for (const item of history) {
        addMessage(
            item.role,
            item.content,
            item.modelName || "Claude"
        );
    }
}

function updateActiveModel() {
    activeModel.textContent =
        MODELS[modelSelect.value] || "Claude";

    try {
        sessionStorage.setItem(
            MODEL_KEY,
            modelSelect.value
        );
    } catch (error) {
        console.warn("Cannot save model selection.", error);
    }
}

function setBusy(value) {
    busy = value;

    sendBtn.disabled = value;
    modelSelect.disabled = value;
    clearBtn.disabled = value;

    sendBtn.textContent = value ? "Thinking..." : "Send";
}

async function sendMessage() {
    if (busy) return;

    const message = messageInput.value.trim();

    if (!message) {
        showError("Please type a message first.");
        return;
    }

    hideError();

    const selectedModel = modelSelect.value;
    const selectedName = MODELS[selectedModel];

    // Snapshot history before adding the current message.
    const previousHistory = history.slice(-20).map(item => ({
        role: item.role,
        content: item.content
    }));

    addMessage("user", message);
    messageInput.value = "";

    setBusy(true);

    const loading = addMessage(
        "assistant",
        "Claude is thinking...",
        selectedName
    );

    loading.querySelector(".message-content")
        .classList.add("typing");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                model: selectedModel,
                history: previousHistory
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "The server returned an invalid response."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error || "API request failed."
            );
        }

        if (typeof data.response !== "string") {
            throw new Error("Invalid AI response.");
        }

        loading.remove();

        addMessage(
            "assistant",
            data.response,
            data.model || selectedName
        );

        history.push({
            role: "user",
            content: message
        });

        history.push({
            role: "assistant",
            content: data.response,
            modelName: data.model || selectedName
        });

        history = history.slice(-20);

        saveHistory();

    } catch (error) {
        loading.remove();

        showError(error.message);

        // Keep the unsent message available for retry.
        messageInput.value = message;

    } finally {
        setBusy(false);
        messageInput.focus();
    }
}

// Send button.
sendBtn.addEventListener("click", sendMessage);

// Press Enter to send; Shift + Enter for newline.
messageInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        if (event.isComposing) return;

        event.preventDefault();
        sendMessage();
    }
});

// Model switching.
modelSelect.addEventListener("change", updateActiveModel);

// Clear chat history.
clearBtn.addEventListener("click", () => {
    if (busy) return;

    history = [];

    try {
        sessionStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.warn("Cannot clear session storage.", error);
    }

    hideError();

    chatBox.innerHTML = `
        <div class="welcome" id="welcome">
            <div class="welcome-icon">✦</div>
            <h2>How can I help you?</h2>
            <p>Select a Claude model and start your conversation.</p>
        </div>
    `;

    messageInput.value = "";
    messageInput.focus();
});

// Restore selected model.
try {
    const savedModel = sessionStorage.getItem(MODEL_KEY);

    if (savedModel && MODELS[savedModel]) {
        modelSelect.value = savedModel;
    }
} catch (error) {
    console.warn("Cannot restore model.", error);
}

updateActiveModel();
renderHistory();

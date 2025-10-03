class NerdChat {
    constructor() {
        this.isTyping = false;
        this.isMuted = false;
        this.selectedModel = null;
        this.isTransitioning = false;
        // Don't initialize elements and bind events in constructor - will be called after partials load
    }

    initialize() {
        this.initializeElements();

        // Ensure required elements exist before continuing
        if (!this.chatMessages || !this.chatMessagesContainer || !this.messageInput || !this.sendBtn) {
            console.error('Chat UI initialization failed: missing required DOM elements');
            return;
        }

        this.bindEvents();
        this.autoResizeTextarea();
        this.applyInitialSettings();
    }

    initializeElements() {
        // Match elements from partials/chat.html
        const chatMessagesEl = document.getElementById('chat-messages');
        // In chat.html, messages appear directly inside #chat-messages
        this.chatMessages = chatMessagesEl || null;
        this.chatMessagesContainer = chatMessagesEl || null;
        this.messageInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.uploadBtn = document.getElementById('image-btn');
        this.settingsBtn = document.getElementById('clear-chat-btn');
        // Optional/legacy elements may not exist in current partial
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.clearChatBtn = document.getElementById('clear-chat-btn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.fileInput = document.getElementById('image-input');
        this.muteBtn = document.getElementById('muteBtn');
        this.backBtn = document.querySelector('.back-btn');
    }

    bindEvents() {
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            this.messageInput.addEventListener('input', () => {
                this.autoResizeTextarea();
                this.updateSendButton();
            });
        }
        
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', () => this.fileInput?.click());
        }
        
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        if (this.closeSettings) {
            this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        }
        
        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) this.closeSettingsModal();
            });
        }
        
        if (this.clearChatBtn) {
            this.clearChatBtn.addEventListener('click', () => this.clearChat());
        }
        
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => this.toggleMute());
        }
        
        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => this.goBackToHome());
        }
    }

    goBackToHome() {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
    const chatApp = document.getElementById('chat-page');
        const landingPage = document.getElementById('landing-page');
        
        // Fade out chat app
        chatApp.classList.add('fade-out');
        
        setTimeout(() => {
            chatApp.style.display = 'none';
            chatApp.classList.remove('show', 'fade-out');
            
            // Show and fade in landing page
            landingPage.style.display = 'block';
            setTimeout(() => {
                landingPage.classList.add('show');
                this.isTransitioning = false;
            }, 50);
            
            // Reset selected model and clear selection
            this.selectedModel = null;
            this.clearModelSelection();
        }, 500);
    }

    setSelectedModel(model) {
        this.selectedModel = model;
        
        // Update chat header elements defined in chat.html
        const nameEl = document.getElementById('current-model-name');
        const statusEl = document.getElementById('current-model-status');
        const avatarEl = document.getElementById('current-model-avatar');
        if (nameEl) nameEl.textContent = model.name;
        if (statusEl) statusEl.textContent = 'Online';
        if (avatarEl) {
            avatarEl.src = model.image;
            avatarEl.alt = model.name;
        }
    }

    async loadAndRenderHistory(modelId) {
        this.clearChatInterface(false);

        try {
            const response = await fetch(`/history/${modelId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }
            const data = await response.json();

            if (data.history && data.history.length > 0) {
                const initialMsg = document.getElementById('initialMessage');
                if (initialMsg) initialMsg.style.display = 'none';
                for (const message of data.history) {
                    this.addMessageToUI(
                        message.role,
                        message.content,
                        false,
                        message.timestamp
                    );
                }
            } else {
                const initialMsg = document.getElementById('initialMessage');
                if (initialMsg) initialMsg.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading history:', error);
            this.addMessageToUI('system', 'Could not load chat history. Please try again.');
        } finally {
            this.scrollToBottom();
        }
    }

    clearChatInterface(animate = true) {
    if (!this.chatMessages) return;
    const messages = this.chatMessages.querySelectorAll('.message:not(#initialMessage)');
        
        if (animate) {
            messages.forEach((msg, index) => {
                msg.style.animationDelay = `${index * 0.02}s`;
                msg.classList.add('snapped');
            });
            setTimeout(() => {
                this.chatMessages.innerHTML = '';
                const initialMsg = document.getElementById('initialMessage');
                if (initialMsg) initialMsg.style.display = 'block';
            }, 700);
        } else {
            this.chatMessages.innerHTML = '';
            const initialMsg = document.getElementById('initialMessage');
            if (initialMsg) initialMsg.style.display = 'block';
        }
    }

    async clearChat() {
        if (!this.selectedModel) return;

        this.clearChatInterface(true);
        this.closeSettingsModal();

        try {
            await fetch('/clear_history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ model_id: this.selectedModel.id })
            });
        } catch (error) {
            console.error('Failed to clear history on server:', error);
        }
    }

    getSelectedModel() {
        return this.selectedModel;
    }

    clearModelSelection() {
        document.querySelectorAll('.model-card').forEach(card => {
            card.classList.remove('selected', 'selecting');
        });
    }

    applyInitialSettings() {
        const savedMuteState = localStorage.getItem('chatMuted') === 'true';
        this.isMuted = savedMuteState;
        if (this.muteBtn) {
            this.updateMuteIcon();
        }
    }

    updateSendButton() {
        if (this.messageInput && this.sendBtn) {
            const hasText = this.messageInput.value.trim().length > 0;
            const hasImage = this.fileInput && this.fileInput.files.length > 0;
            this.sendBtn.disabled = !hasText && !hasImage;
        }
    }

    autoResizeTextarea() {
        if (this.messageInput) {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = (this.messageInput.scrollHeight) + 'px';
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Handle file selection for image upload
        this.updateSendButton();
    }

    async sendMessage() {
        const messageText = this.messageInput.value.trim();
        const imageFile = this.fileInput.files[0];

        if (!messageText && !imageFile) return;

        this.addMessageToUI('user', messageText || 'Image sent', true);
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.showTyping();

        let imageDataUrl = null;
        if (imageFile) {
            imageDataUrl = await this.readFileAsDataURL(imageFile);
            this.fileInput.value = ''; // Reset file input
        }
        
        this.updateSendButton();

        try {
            const response = await fetch(this.selectedModel.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: messageText,
                    image_data: imageDataUrl
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'The server returned an error.');
            }

            const data = await response.json();
            this.addMessageToUI('model', data.reply, true);

        } catch (error) {
            console.error('Send message error:', error);
            this.addMessageToUI('system', `Error: ${error.message}`);
        } finally {
            this.hideTyping();
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    addMessageToUI(role, content, playSound = false, timestamp = null) {
    const initialMsg = document.getElementById('initialMessage');
    if (initialMsg) initialMsg.style.display = 'none';

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        // Sanitize content before inserting
        const sanitizedContent = this.sanitizeHTML(content);
        
        // Convert markdown-like code blocks to <pre> tags
        const formattedContent = sanitizedContent.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
        bubbleDiv.innerHTML = `<p>${formattedContent}</p>`;

        const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const infoDiv = document.createElement('div');
        infoDiv.className = 'message-info';
        infoDiv.innerHTML = `${time} ${role === 'user' ? '<span class="read-receipt">✓✓</span>' : ''}`;

        bubbleDiv.appendChild(infoDiv);
        messageDiv.appendChild(bubbleDiv);
        
    if (this.chatMessages) this.chatMessages.appendChild(messageDiv);

        if (playSound) {
            const soundId = role === 'user' ? 'outgoingMessageSound' : 'incomingMessageSound';
            this.playSound(soundId);
        }

        this.scrollToBottom();
    }

    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    showTyping() {
        if (this.isTyping) return;
        this.isTyping = true;
        if (this.typingIndicator) this.typingIndicator.classList.add('show');
        const statusEl = document.getElementById('current-model-status');
        if (statusEl) statusEl.textContent = 'typing...';
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        if (this.typingIndicator) this.typingIndicator.classList.remove('show');
        const statusEl = document.getElementById('current-model-status');
        if (statusEl) statusEl.textContent = 'Online';
    }

    scrollToBottom() {
        if (this.chatMessagesContainer) {
            this.chatMessagesContainer.scrollTop = this.chatMessagesContainer.scrollHeight;
        }
    }

    openSettings() {
        if (this.settingsModal) this.settingsModal.classList.add('show');
    }

    closeSettingsModal() {
        if (this.settingsModal) this.settingsModal.classList.remove('show');
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('chatMuted', this.isMuted);
        if (this.muteBtn) this.updateMuteIcon();
    }

    updateMuteIcon() {
        if (!this.muteBtn) return;
        const iconName = this.isMuted ? 'volume-x' : 'volume-2';
        this.muteBtn.innerHTML = `<svg data-feather="${iconName}"></svg>`;
        if (window.feather && typeof window.feather.replace === 'function') {
            window.feather.replace();
        }
    }

    playSound(soundId) {
        if (this.isMuted) return;
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.error("Sound play failed:", e));
        }
    }
}
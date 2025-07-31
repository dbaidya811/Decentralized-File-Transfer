// Initialize PeerJS
let peer;
let conn;
let peerId;
let fileQueue = [];
let currentFile = null;
let currentFileSize = 0;
let currentFileSent = 0;

// DOM Elements
const peerIdInput = document.getElementById('peer-id');
const peerInput = document.getElementById('peer-input');
const connectBtn = document.getElementById('connect');
const copyIdBtn = document.getElementById('copy-id');
const shareLinkBtn = document.getElementById('share-link');
const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const fileList = document.getElementById('file-list');
const statusMessages = document.getElementById('status-messages');

// Generate a shareable link
function generateShareLink(peerId) {
    return `${window.location.origin}${window.location.pathname}?connect=${encodeURIComponent(peerId)}`;
}



// Share link using Web Share API or copy to clipboard
async function shareLink() {
    if (!peerId) return;
    
    const shareData = {
        title: 'Connect to my Decentralized File Transfer',
        text: 'Send me files securely using this link',
        url: generateShareLink(peerId)
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
            addStatusMessage('Link shared successfully');
        } else {
            // Fallback for browsers that don't support Web Share API
            await navigator.clipboard.writeText(shareData.url);
            addStatusMessage('Link copied to clipboard');
        }
    } catch (err) {
        console.error('Error sharing:', err);
        addStatusMessage('Could not share link', 'error');
    }
}

// Initialize the application
function init() {
    // Create a new Peer
    peer = new Peer();
    
    // When peer is open, set the peer ID
    peer.on('open', (id) => {
        peerId = id;
        peerIdInput.value = id;
        addStatusMessage('Connected to PeerJS with ID: ' + id);
    });
    
    // Handle incoming connections
    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection(conn);
        addStatusMessage('Peer connected: ' + conn.peer);
    });
    
    // Handle errors
    peer.on('error', (err) => {
        console.error('PeerJS Error:', err);
        addStatusMessage('Error: ' + err.message, 'error');
    });
    
    // Setup UI event listeners
    setupEventListeners();
}

// Check URL for peer ID to connect to
function checkUrlForPeerId() {
    const urlParams = new URLSearchParams(window.location.search);
    const peerId = urlParams.get('connect');
    
    if (peerId) {
        // Auto-fill the peer ID input
        peerInput.value = peerId;
        // Optionally auto-connect
        // connectToPeer(peerId);
    }
}

// Setup UI event listeners
function setupEventListeners() {
    // Check URL for peer ID when page loads
    checkUrlForPeerId();
    
    // Connect button
    connectBtn.addEventListener('click', () => {
        const peerId = peerInput.value.trim();
        if (peerId) {
            connectToPeer(peerId);
        }
    });
    
    // Copy ID button
    copyIdBtn.addEventListener('click', () => {
        peerIdInput.select();
        document.execCommand('copy');
        addStatusMessage('Copied ID to clipboard');
    });
    
    // Share Link button
    shareLinkBtn.addEventListener('click', shareLink);
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    // Click to open file dialog
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
}

// Prevent default drag behaviors
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop area
function highlight() {
    dropArea.style.backgroundColor = '#f0f8ff';
}

// Remove highlight
function unhighlight() {
    dropArea.style.backgroundColor = '';
}

// Handle file selection
function handleFileSelect(e) {
    const files = e.target.files || (e.dataTransfer && e.dataTransfer.files);
    if (!files) return;
    
    Array.from(files).forEach(file => {
        addFileToQueue(file);
    });
    
    // Process the queue if not already processing
    if (!currentFile && fileQueue.length > 0) {
        processNextFile();
    }
}

// Handle dropped files
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFileSelect({ target: { files } });
    }
}

// Add file to transfer queue
function addFileToQueue(file) {
    fileQueue.push(file);
    addFileToList(file);
    addStatusMessage(`Added to queue: ${file.name} (${formatFileSize(file.size)})`);
}

// Add file to UI list
function addFileToList(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <span>${file.name} (${formatFileSize(file.size)})</span>
        <span class="status">Queued</span>
        <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
    `;
    fileList.appendChild(fileItem);
    
    // Store reference to progress elements
    file.progress = {
        status: fileItem.querySelector('.status'),
        bar: fileItem.querySelector('.progress')
    };
}

// Connect to a peer
function connectToPeer(peerId) {
    if (conn) {
        conn.close();
    }
    
    conn = peer.connect(peerId);
    setupConnection(conn);
    addStatusMessage('Connecting to peer: ' + peerId);
}

// Setup connection event handlers
function setupConnection(connection) {
    // Handle incoming data
    connection.on('data', (data) => {
        if (data.type === 'fileInfo') {
            receiveFileInfo(data);
        } else if (data.type === 'fileChunk') {
            receiveFileChunk(data);
        } else if (data.type === 'fileEnd') {
            finalizeFileTransfer();
        }
    });
    
    // Handle connection open
    connection.on('open', () => {
        addStatusMessage('Connected to peer: ' + connection.peer);
        // Process any queued files
        if (fileQueue.length > 0) {
            processNextFile();
        }
    });
    
    // Handle connection close
    connection.on('close', () => {
        addStatusMessage('Connection closed', 'error');
    });
    
    // Handle errors
    connection.on('error', (err) => {
        console.error('Connection error:', err);
        addStatusMessage('Connection error: ' + err.message, 'error');
    });
}

// Process the next file in the queue
function processNextFile() {
    if (fileQueue.length === 0 || !conn || conn.open !== true) {
        currentFile = null;
        return;
    }
    
    currentFile = fileQueue.shift();
    currentFileSize = currentFile.size;
    currentFileSent = 0;
    
    // Update UI
    currentFile.progress.status.textContent = 'Sending...';
    addStatusMessage(`Sending file: ${currentFile.name}`);
    
    // Send file info to peer
    conn.send({
        type: 'fileInfo',
        name: currentFile.name,
        size: currentFile.size,
        mimeType: currentFile.type
    });
    
    // Start sending file
    sendNextChunk();
}

// Send the next chunk of the file
function sendNextChunk(offset = 0, chunkSize = 16 * 1024) {
    if (!currentFile || !conn || conn.open !== true) return;
    
    const fileReader = new FileReader();
    const slice = currentFile.slice(offset, offset + chunkSize);
    
    fileReader.onload = (e) => {
        conn.send({
            type: 'fileChunk',
            data: e.target.result,
            offset: offset,
            size: e.target.result.byteLength
        });
        
        currentFileSent += e.target.result.byteLength;
        
        // Update progress
        const progress = Math.min(100, Math.round((currentFileSent / currentFileSize) * 100));
        currentFile.progress.bar.style.width = `${progress}%`;
        
        // Send next chunk if there's more data
        if (currentFileSent < currentFileSize) {
            setTimeout(() => sendNextChunk(offset + chunkSize, chunkSize), 0);
        } else {
            // File transfer complete
            conn.send({ type: 'fileEnd' });
            currentFile.progress.status.textContent = 'Sent ✔️';
            addStatusMessage(`File sent: ${currentFile.name}`);
            
            // Process next file in queue
            setTimeout(processNextFile, 100);
        }
    };
    
    fileReader.readAsArrayBuffer(slice);
}

// Handle incoming file info
function receiveFileInfo(fileInfo) {
    currentFile = {
        name: fileInfo.name,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        data: []
    };
    
    // Add to UI
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <span>${fileInfo.name} (${formatFileSize(fileInfo.size)})</span>
        <span class="status">Receiving...</span>
        <div class="progress-bar"><div class="progress" style="width: 0%"></div></div>
    `;
    fileList.appendChild(fileItem);
    
    // Store reference to progress elements
    currentFile.progress = {
        status: fileItem.querySelector('.status'),
        bar: fileItem.querySelector('.progress')
    };
    
    addStatusMessage(`Receiving file: ${fileInfo.name}`);
}

// Handle incoming file chunk
function receiveFileChunk(chunkData) {
    if (!currentFile) return;
    
    // Store the chunk
    currentFile.data.push({
        data: chunkData.data,
        offset: chunkData.offset
    });
    
    // Update progress
    const received = currentFile.data.reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
    const progress = Math.min(100, Math.round((received / currentFile.size) * 100));
    currentFile.progress.bar.style.width = `${progress}%`;
}

// Finalize file transfer
function finalizeFileTransfer() {
    if (!currentFile) return;
    
    // Sort chunks by offset
    currentFile.data.sort((a, b) => a.offset - b.offset);
    
    // Combine all chunks into a single ArrayBuffer
    const totalSize = currentFile.data.reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
    const buffer = new Uint8Array(totalSize);
    
    let offset = 0;
    currentFile.data.forEach(chunk => {
        buffer.set(new Uint8Array(chunk.data), chunk.offset);
        offset += chunk.data.byteLength;
    });
    
    // Create a blob and download link
    const blob = new Blob([buffer], { type: currentFile.mimeType });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    // Update UI
    currentFile.progress.status.textContent = 'Received ✔️';
    addStatusMessage(`File received: ${currentFile.name}`);
    
    // Reset current file
    currentFile = null;
}

// Add status message to UI
function addStatusMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `status-message ${type}`;
    messageEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    statusMessages.insertBefore(messageEl, statusMessages.firstChild);
    
    // Limit number of messages
    while (statusMessages.children.length > 50) {
        statusMessages.removeChild(statusMessages.lastChild);
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', init);

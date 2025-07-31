# Decentralized File Transfer

A peer-to-peer file transfer application that works directly in the browser using WebRTC. No central server is required for the actual file transfer.

## Features

- **No Server Required**: Files are transferred directly between peers using WebRTC
- **Secure**: End-to-end encrypted file transfer
- **Easy to Use**: Simple and intuitive user interface
- **Drag & Drop**: Easily add files by dragging and dropping
- **Progress Tracking**: Real-time progress updates for file transfers
- **Cross-Platform**: Works on any modern web browser

## How It Works

1. Open the application in two different browser windows/tabs or on two different devices
2. Copy the Peer ID from one window and paste it into the other window's "Connect to Peer" field
3. Click "Connect" to establish a direct connection
4. Drag and drop files to send them to the connected peer
5. The recipient will automatically receive and download the files

## Technologies Used

- **WebRTC**: For peer-to-peer connections
- **PeerJS**: Simplifies WebRTC peer-to-peer connections
- **HTML5 File API**: For handling file operations
- **CSS3**: For responsive and modern UI

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- An internet connection (only required for the initial peer connection)

### Installation

1. Clone this repository or download the source code
2. Open `index.html` in your web browser

### Usage

1. Open `index.html` in two different browser windows/tabs or on two different devices
2. Copy the Peer ID from one window
3. Paste the Peer ID into the other window's "Connect to Peer" field
4. Click "Connect"
5. Drag and drop files to send them to the connected peer

## How to Test

1. Open the application in two different browser windows
2. In the first window, copy your Peer ID
3. In the second window, paste the Peer ID and click "Connect"
4. Drag and drop a file into one of the windows
5. The file should automatically transfer to the other window

## Security Considerations

- All file transfers are encrypted end-to-end
- No files are stored on any server
- Peer connections are established directly between browsers
- The application uses secure WebRTC protocols

## Limitations

- Both peers need to be online at the same time
- NAT traversal might require a TURN server in some network configurations
- Large files may take time to transfer depending on the network speed

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [PeerJS](https://peerjs.com/) for simplifying WebRTC
- [WebRTC](https://webrtc.org/) for the peer-to-peer technology

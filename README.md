# Gamepad Tester 🎮

A sleek, modern web-based tool for testing gamepads and joysticks. It leverages Node.js on the backend for native OS-level gamepad access (via `gamepad-node`) and provides a real-time visual interface through WebSockets.

---

## ✨ Features

- **🎯 Real-Time Monitoring**: Instantly see button presses and stick movements.
- **📟 Visual Display**: Clear indicators for analog sticks, d-pad, and buttons.
- **🔌 Native Support**: Uses OS-level drivers (via SDL2/gamepad-node) for superior detection.
- **🎮 Broad Compatibility**: Built-in support for generic OEM controllers, Xbox, PlayStation, and Nintendo Switch Pro controllers.
- **🗺️ Internal Mapping**: Automatically handles hat/d-pad mapping and analog stick conversions for non-standard HID devices.
- **📡 WebSocket Driven**: Ultra-low latency communication between device and browser.

---

## 🚀 Quick Start

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or newer recommended)
- A connected USB or Bluetooth Gamepad.

### 🛠️ Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/frederic/gamepad-tester.git
    cd gamepad-tester
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

### 🏃 Running the Application

#### Option A: One-Click Launch (Windows)
Simply double-click **`run_tester.bat`**. This will:
1.  Check if Node.js is installed.
2.  Install all required dependencies (if they are missing).
3.  Start the application server automatically.

#### Option B: Manual Command Line
1.  **Start the server**:
    ```bash
    npm start
    ```

2.  **Open in Browser**:
    Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🏗️ How It Works

1.  **Backend (`server.js`)**: Uses the `gamepad-node` library to listen for native gamepad events from the operating system. It acts as a bridge between the physical device and the web application.
2.  **Communication**: It establishes a `Socket.io` server to pipe gamepad data to connected clients as fast as possible.
3.  **Frontend**: A simple `index.html` and `app.js` receive these events and render them on a dynamic board.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

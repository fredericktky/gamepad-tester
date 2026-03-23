const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

async function startServer() {
    const { GamepadManager, getSdl } = await import('gamepad-node');
    
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);
    const PORT = process.env.PORT || 3000;

    app.use(express.static(path.join(__dirname, 'public')));

    const manager = new GamepadManager();
    const sdl = getSdl();

    const manualJoysticks = new Map();

    function handleManualJoystick(device) {
        if (manualJoysticks.has(device.id)) return;
        
        try {
            console.log(`[Fallback] Opening ${device.name}...`);
            const instance = sdl.joystick.openDevice(device);
            const numButtons = instance.buttons ? instance.buttons.length : 0;
            const numAxes = instance.axes ? instance.axes.length : 0;
            const numHats = instance.hats ? instance.hats.length : 0;
            const index = 4 + manualJoysticks.size;
            const gpData = { index, id: device.name + " (Fallback)", buttons: Math.max(numButtons, 16), axes: numAxes };
            manualJoysticks.set(device.id, { device, instance, index, id: gpData.id, numButtons, numAxes, numHats });
            io.emit('gamepad-connected', gpData);
            console.log(`[Fallback] Opened index ${index} with ${numHats} hats`);
        } catch (err) {
            console.error(`[Fallback] Error:`, err.message);
        }
    }

    sdl.joystick.on('deviceAdd', (e) => {
        setTimeout(() => {
            const managed = manager.getGamepads().some(gp => gp && gp.id.includes(e.device.name));
            if (!managed) handleManualJoystick(e.device);
        }, 1500);
    });

    setTimeout(() => {
        sdl.joystick.devices.forEach(device => {
            const managed = manager.getGamepads().some(gp => gp && gp.id.includes(device.name));
            if (!managed) handleManualJoystick(device);
        });
    }, 2000);

    setInterval(() => {
        const managerGps = manager.getGamepads().filter(Boolean).map(gp => ({
            index: gp.index, id: gp.id, buttons: gp.buttons.map(b => ({ pressed: b.pressed, value: b.value })), axes: gp.axes
        }));

        const manualGps = [];
        for (const [id, entry] of manualJoysticks) {
            if (entry.instance.closed) continue;
            
            const buttons = [];
            for (let i = 0; i < 17; i++) {
                if (i < entry.numButtons) {
                    const pressed = entry.instance.buttons[i];
                    buttons.push({ pressed, value: pressed ? 1.0 : 0.0 });
                } else { buttons.push({ pressed: false, value: 0.0 }); }
            }

            if (entry.numHats > 0) {
                const hat = entry.instance.hats[0];
                // Support string-based hat values from node-sdl
                const up = hat === 'up' || hat === 'up-right' || hat === 'up-left' || hat === 'right-up' || hat === 'left-up';
                const down = hat === 'down' || hat === 'down-right' || hat === 'down-left' || hat === 'right-down' || hat === 'left-down';
                const left = hat === 'left' || hat === 'left-up' || hat === 'left-down' || hat === 'up-left' || hat === 'down-left';
                const right = hat === 'right' || hat === 'right-up' || hat === 'right-down' || hat === 'up-right' || hat === 'down-right';

                buttons[12] = { pressed: up, value: up ? 1.0 : 0.0 };
                buttons[13] = { pressed: down, value: down ? 1.0 : 0.0 };
                buttons[14] = { pressed: left, value: left ? 1.0 : 0.0 };
                buttons[15] = { pressed: right, value: right ? 1.0 : 0.0 };
            }

            const axes = [];
            for (let i = 0; i < entry.numAxes; i++) { axes.push(entry.instance.axes[i]); }
            manualGps.push({ index: entry.index, id: entry.id, buttons, axes });
        }

        const all = [...managerGps, ...manualGps];
        if (all.length > 0) io.emit('gamepad-update', all);
    }, 16);

    manager.on('gamepadconnected', (e) => {
        io.emit('gamepad-connected', { id: e.gamepad.id, index: e.gamepad.index, buttons: e.gamepad.buttons.length, axes: e.gamepad.axes.length });
    });

    manager.on('gamepaddisconnected', (e) => { io.emit('gamepad-disconnected', { index: e.gamepad.index }); });

    io.on('connection', (socket) => {
        const current = manager.getGamepads().filter(Boolean).map(gp => ({ ...gp, buttons: gp.buttons.map(b=>({pressed:b.pressed, value:b.value})) }));
        for (const [id, entry] of manualJoysticks) {
            current.push({ index: entry.index, id: entry.id, buttons: new Array(17).fill({pressed:false, value:0}), axes: new Array(entry.numAxes || 0).fill(0) });
        }
        socket.emit('initial-state', current);
    });

    server.listen(PORT, () => { console.log(`Server is running at http://localhost:${PORT}`); });
}

startServer().catch(err => { console.error("Failed to start server:", err); });

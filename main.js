import * as SerialPort from './modules/serial-port.js';

//创建发送器
const messageSender = new SerialPort.MessageSender();

//获取DOM元素
const connectButton = document.getElementById('connect_serial');
const sendMessageButton = document.getElementById('send_message');
const closeButton = document.getElementById('close_serial');

//绑定DOM元素事件
connectButton.addEventListener('pointerdown', () => {
    messageSender.connect();
});

sendMessageButton.addEventListener('pointerdown', () => {
    let messageRequest = new SerialPort.MessageRequest(0x05, new Uint8Array([0x02, 0x00, 0x80, 0x04, 0x00, 0x80]));
    messageSender.send(messageRequest);
});

closeButton.addEventListener('pointerdown', () => {
    messageSender.close();
});

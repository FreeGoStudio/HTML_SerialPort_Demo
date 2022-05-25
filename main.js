import * as Device from './modules/device-controller.js';

function receive(response) {
    console.log('接收数据-- blockIndex:',blockIndex,'content:', response.data);
}

//创建设备控制器
const deviceController = new Device.DeviceController(receive);

//获取DOM元素
const connectButton = document.getElementById('connect_serial');
const sendMessageButton = document.getElementById('send_message');
const closeButton = document.getElementById('close_serial');
const selectButton = document.getElementById('function_code');

//绑定DOM元素事件
connectButton.addEventListener('pointerdown', () => {
    deviceController.connect();
});

closeButton.addEventListener('pointerdown', () => {
    deviceController.close();
});

var blockIndex=0;

sendMessageButton.addEventListener('pointerdown', () => {
    let index = selectButton.selectedIndex;

    switch (index) {
        //0x04:设备重启
        case 0:
            deviceController.reboot();
            break;
        //0x05:蜂鸣器和指示灯显示
        case 1:
            deviceController.beeperAndLed();
            break;
        //0x06:设备握手
        case 2:
            deviceController.handshake();
            break;
        //0x09:卡选择取消
        case 3:
            deviceController.cardSelectCancel(1000);
            break;
        //0x0A:卡挂起
        case 4:
            deviceController.cardPending(1000);
            break;
        //0x20:卡检测请求
        case 5:
            deviceController.m1CardTestRequest(52);
            break;
        //0x21:下载密码表
        case 6:
            let passwordList = new Array();
            passwordList[0] = new Device.PasswordGroup(0, 0, new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
            passwordList[1] = new Device.PasswordGroup(8, 1, new Uint8Array([0x01, 0x02, 0x02, 0x01, 0x03, 0x04]));

            deviceController.m1DownloadPasswordList(passwordList);
            break;
        //0x22:读指定块内容(使用已下载秘钥)
        case 7:
            setInterval(() => {
                if(blockIndex>255){
                    clearInterval(this);
                }
                deviceController.m1ReadContentByKey(blockIndex, 0);
                blockIndex++;
            }, 2000);
            
            break;
        //0x23:写指定块号(使用已下载秘钥)
        case 8:
            setInterval(() => {
                if(blockIndex>255){
                    clearInterval(this);
                }
                deviceController.m1WriteContentByKey(blockIndex, 0, new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10]));
                blockIndex++;
            }, 2000);
            //deviceController.m1WriteContentByKey(0, 0, new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10]));
            break;
        //0x24:读指定块内容(使用指令秘钥)
        case 9:
            deviceController.m1ReadContentByCommand(4,0, new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
            break;
        //0x25:写指定块(使用指令秘钥)
        case 10:
            deviceController.m1WriteContentByCommand(0,0,new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]),new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10]));
            break;
        // //0x07:CPU 卡请求
        // case 11:

        //     break;
        // //0x08:CPU 通用指令
        // case 12:

        //     break;
        default:
            console.error('选择的指令不存在!');
            break;
    }
});

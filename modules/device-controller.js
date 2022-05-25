"use strict";
import * as SerialPort from './serial-port.js';
/**
 * 设备控制器
 */
export class DeviceController {
    constructor(callback) {
        this._messageSender = new SerialPort.MessageSender(callback);
    }

    /**
     * 将整形数转换成小端模式byte数组
     * @param {int} number 要转换的整形数值
     * @param {int} length 要转成什么byte数组，规定数组的长度
     * @returns {byte[]} byte数组
     */
    static IntToBytesLittleEndian(number, length) {
        var bytes = [];
        var i = 0;
        do {
            bytes[i++] = number & (255);
            number = number >> 8;
        } while (i < length)
        return bytes;
    }

    /**
     * 将整形数转换成大端模式byte数组
     * @param {int} number 要转换的整形数值
     * @param {int} length 要转成什么byte数组，规定数组的长度
     * @returns {byte[]} byte数组
     */
    static IntToBytesBigEndian(number, length) {
        var bytes = [];
        var i = length;
        do {
            bytes[--i] = number & (255);
            number = number >> 8;
        } while (i)
        return bytes;
    }

    /**
     * 连接设备
     */
    async connect() {
        this._messageSender.connect(115200,8,1,"none");
    }

    /**
     * 关闭设备连接
     */
    async close() {
        this._messageSender.close();
    }

    /**
     * 0x04:重启设备
     */
    async reboot() {
        let messageRequest = new SerialPort.MessageRequest(0x04, new Uint8Array());
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x05:蜂鸣器与指示灯显示
     * @param {int} beeperTime 蜂鸣器鸣叫总时长,单位:ms
     * @param {byte} beeperCycle 鸣叫周期时长,单位:ms
     * @param {int} ledTime 告警指示灯总时长,单位:ms
     * @param {byte} ledFlashCycle 告警灯闪烁周期时长,单位:ms
     */
    async beeperAndLed(beeperTime, beeperCycle, ledTime, ledFlashCycle) {
        if (beeperTime) {
            let beeperTimeArray = DeviceController.IntToBytesBigEndian(beeperTime, 2);
            let ledTimeArray = DeviceController.IntToBytesLittleEndian(ledTime, 2);

            let message = new Uint8Array(6);
            message[0] = beeperTimeArray[0];
            message[1] = beeperTimeArray[1];
            message[2] = beeperCycle;
            message[3] = ledTimeArray[0];
            message[4] = ledTimeArray[1];
            message[5] = ledFlashCycle;

            let messageRequest = new SerialPort.MessageRequest(0x05, message);
            this._messageSender.send(messageRequest);
        } else {
            this.beeperAndLed(512, 128, 1024, 128)
        }
    }

    /**
     * 0x06:设备握手
     */
    async handshake() {
        let messageRequest = new SerialPort.MessageRequest(0x06, new Uint8Array());
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x09:卡选择取消
     * @param {*} duration 指令超时时长,单位:ms
     */
    async cardSelectCancel(duration) {
        let durationArray = DeviceController.IntToBytesBigEndian(duration, 2);

        let message = new Uint8Array(2);
        message[0] = durationArray[0];
        message[1] = durationArray[1];

        let messageRequest = new SerialPort.MessageRequest(0x09, message);
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x0A:卡挂起
     * @param {int} duration 指令超时时长,单位:ms
     */
    async cardPending(duration) {
        let durationArray = DeviceController.IntToBytesBigEndian(duration, 2);

        let message = new Uint8Array(2);
        message[0] = durationArray[0];
        message[1] = durationArray[1];

        let messageRequest = new SerialPort.MessageRequest(0x0A, message);
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x20:M1卡检测请求
     * @param {byte} type 俺也不知道干什么用的 REQ_STD=26 REQ_ALL=52
     */
    async m1CardTestRequest(type) {
        let messageRequest = new SerialPort.MessageRequest(0x20, new Uint8Array([type]));
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x21:M1下载密码表
     * @param {Array<PasswordGroup>} passwordList 密码组集合
     */
    async m1DownloadPasswordList(passwordList) {
        if (passwordList) {
            if (passwordList.length < 1) {
                throw new Error('下载密码表的数量不能为0!');
            }

            let message = new Uint8Array(1 + 8 * passwordList.length);

            message[0] = passwordList.length;

            for (let i = 0; i < passwordList.length; i++) {
                const passwordGroup = passwordList[i];

                let num = i * 8 + 1;
                message[num] = passwordGroup.block;
                message[num + 1] = passwordGroup.passwordType;

                for (let j = 0; j < 6; j++) {
                    const element = passwordGroup.password[j];
                    message[num + 2 + j] = element;
                }
            }

            console.log("m1DownloadPasswordList.message:", message);

            let messageRequest = new SerialPort.MessageRequest(0x21, message);
            this._messageSender.send(messageRequest);
        } else {
            throw new Error('下载密码表不能为空!');
        }
    }

    /**
     * 0x22:M1读指定块内容(使用已下载秘钥)
     * @param {byte} block 区块号,0-255
     * @param {byte} passwordType 密码类型,0:A密码,1:B密码
     */
    async m1ReadContentByKey(block, passwordType) {
        if (block > 255) {
            throw new Error('区块号不能大于255!');
        }

        let messageRequest = new SerialPort.MessageRequest(0x22, new Uint8Array([block, passwordType]));
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x23:M1写指定块号(使用已下载秘钥)
     * @param {byte} block 区块号,0-255
     * @param {byte} passwordType 密码类型,0:A密码,1:B密码
     * @param {Uint8Array} content 写入数据内容,长度小于16
     */
    async m1WriteContentByKey(block, passwordType, content) {
        if (block > 255) {
            throw new Error('区块号不能大于255!');
        }

        if (content.length != 16) {
            throw new Error('写入数据内容的长度不等于16!');
        }

        let message = new Uint8Array(2 + content.length);
        message[0] = block;
        message[1] = passwordType;
        message.set(content, 2);
        
        console.log('m1WriteContentByKey.message:',message);

        let messageRequest = new SerialPort.MessageRequest(0x23, message);
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x24:M1读指定块内容(使用指令秘钥)
     * @param {byte} block 区块号,0-255
     * @param {byte} passwordType 密码类型,0:A密码,1:B密码
     * @param {Uint8Array} password 密码内容,固定长度6
     */
    async m1ReadContentByCommand(block, passwordType, password) {
        if (block > 255) {
            throw new Error('区块号不能大于255!');
        }

        if (password.length != 6) {
            throw new Error('密码的长度不等于6!');
        }

        let message = new Uint8Array(2 + password.length);
        message[0] = block;
        message[1] = passwordType;
        message.set(password, 2);

        let messageRequest = new SerialPort.MessageRequest(0x24, message);
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x25:M1写指定块(使用指令秘钥)
     * @param {byte} block 区块号,0-255
     * @param {byte} passwordType 密码类型,0:A密码,1:B密码
     * @param {Uint8Array} password 密码内容,固定长度6
     * @param {Uint8Array} content 写入数据内容,长度小于16
     */
    async m1WriteContentByCommand(block, passwordType, password, content) {
        if (block > 255) {
            throw new Error('区块号不能大于255!');
        }

        if (password.length != 6) {
            throw new Error('密码的长度不等于6!');
        }

        if (content.length != 16) {
            throw new Error('写入数据内容的长度不等于16!');
        }

        console.log("m1WriteContentByCommand.password:", password);
        console.log("m1WriteContentByCommand.content:", content);

        let message = new Uint8Array(2 + password.length + content.length);
        message[0] = block;
        message[1] = passwordType;
        message.set(password, 2);
        message.set(content, 2 + password.length);

        console.log("m1WriteContentByCommand.message:", message);

        let messageRequest = new SerialPort.MessageRequest(0x25, message);
        this._messageSender.send(messageRequest);
    }

    /**
     * 0x07:CPU 卡请求
     */
    async cpuCardRequest() {
        throw new Error('暂未实现!');
    }

    /**
     * 0x08:CPU 通用指令
     */
    async cpuGeneralCommand() {
        throw new Error('暂未实现!');
    }
}

export class PasswordGroup {
    /**
     * 构造函数
     * @param {int} block 区块号,0-128
     * @param {int} passwordType 密码类型, 0:A密码,1:B密码,2:不修改密码
     * @param {Uint8Array} password 密码:长度固定为6的byte数组
     */
    constructor(block, passwordType, password) {
        this._block = block;
        this._passwordType = passwordType;
        this._password = password;
    }

    get block() {
        return this._block;
    }

    get passwordType() {
        return this._passwordType;
    }

    get password() {
        return this._password;
    }
}

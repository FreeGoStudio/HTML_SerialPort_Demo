"use strict";
/**
 * 消息发送器类
 */
export class MessageSender {
    /**
     * 构造函数
     * @param {*function} callback 回调函数
     */
    constructor(callback) {
        this._callback = callback;
    }

    /**
     * 连接串口
     * @param {int} baudRate 波特率
     * @param {byte} dataBits 数据位
     * @param {byte} stopBits 停止位
     * @param {string} parity 奇偶校验位
     */
    async connect(baudRate,dataBits,stopBits,parity) {
        if ('serial' in navigator) {
            try {
                this.sequence = 0;
                this.port = await navigator.serial.requestPort();

                await this.port.open({ baudRate: baudRate, dataBits: dataBits, stopBits: stopBits, parity: parity });
                console.log('串口连接成功!');

                while (this.port && this.port.readable) {
                    this.reader = this.port.readable.getReader();

                    try {

                        while (true) {
                            const { value, done } = await this.reader.read();
                            if (done) {
                                this.reader.releaseLock();
                                break;
                            }

                            if (value) {
                                const response = new MessageResponse(value);
                                response.unpack();
                                this._callback(response);
                            }
                        }

                    } catch (error) {
                        console.error("读取串口出错:", error);
                    }
                }
            } catch (error) {
                console.error("打开串口失败:", error);
            }
        } else {
            console.error("该浏览器不支持串口!");
        }
    }

    /**
     * 发送方法
     */
    async send(messageRequest) {
        if (this.port) {
            try {
                this.sequence++;
                this.writer = this.port.writable.getWriter();

                let message = messageRequest.pack(this.sequence);

                let hexString='';
                message.forEach(element => {
                    hexString+=element.toString(16).toUpperCase()+','
                });
                console.log('发送数据:', hexString);
                
                await this.writer.write(message);

                this.writer.releaseLock();
                return message;
            } catch (error) {
                const errorMessage = `写入数据时出错:${error}`;
                console.error(errorMessage);
            }
        }
    }

    /**
     * 关闭方法
     */
    async close() {

        if (this.port) {
            const localPort = this.port;
            this.port = undefined;

            if (this.reader) {
                await this.reader.cancel();
            }

            if (localPort) {
                try {
                    await localPort.close();
                    console.log('串口关闭成功!');
                } catch (error) {
                    const errorMessage = `关闭串口出错:${error}`;
                    console.error(error);
                }
            }
        }
    }
}

/**
 * 消息请求对象
 */
export class MessageRequest {
    constructor(code, info) {
        this._code = code;
        this._info = info;
        this._infoLength = this._info.length;

        this._data = new Uint8Array(10 + this._infoLength);
    }

    static intToBytes(number, length) {
        var bytes = [];
        var i = length;
        do {
            bytes[--i] = number & (255);
            number = number >> 8;
        } while (i);
        return bytes;
    }

    /**
     * 打包
     */
    pack(sequence) {
        let index = 0;
        this._data[index++] = 0xFE;
        this._data[index++] = 0xFE;
        this._data[index++] = 0x68;
        this._data[index++] = 0x25;
        this._data[index++] = this._code;
        let infoLengthArray = MessageRequest.intToBytes(this._infoLength, 2);
        this._data[index++] = infoLengthArray[0];
        this._data[index++] = infoLengthArray[1];

        this._info.forEach(element => {
            this._data[index++] = element;
        });

        this._data[index++] = sequence;
        this._data[index++] = this.createToken();
        this._data[index++] = 0x16;

        return this._data;
    }

    /**
     * 生产令牌
     */
    createToken() {
        let verifyCode = 0;

        for (let index = 2; index < this._data.length - 2; index++) {
            const element = this._data[index];
            verifyCode += element;
        }
        return verifyCode = verifyCode % 256;
    }
}

/**
 * 消息响应对象
 */
export class MessageResponse {
    constructor(message) {
        this._data = message;
    }

    get data(){
        return this._data;
    }

    /**
     * 解包
     */
    unpack() {
        if (this._data.length < 2) {
            return;
        }

        this.preprocess();

        if (this.verify()) {
            let content = this._data.slice(5, this._data.length - 3);
            return content;
        } else {
            throw new Error('消息验证失败!请重试');
        }
    }

    /**
     * 预处理
     */
    preprocess() {
        let removeStart = 0;

        for (let index = 0; index < this._data.length; index++) {
            if (this._data[index] != 0xFE) {
                removeStart = index;
                break;
            }
        }

        this._data = this._data.slice(removeStart, this._data.length);
    }

    /**
     * 验证令牌
     */
    verify() {
        let verifyCode = 0;
        for (let index = 0; index < this._data.length - 2; index++) {
            const element = this._data[index];
            verifyCode += element;
        }

        verifyCode = verifyCode % 256;

        let token = this._data[this._data.length - 2];

        return verifyCode == token;
    }
}
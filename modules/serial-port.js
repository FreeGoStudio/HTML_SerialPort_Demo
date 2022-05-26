"use strict";
import * as IntConvert from './int-convert.js';
import * as BytesConvert from './bytes-convert.js';
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
    async connect(baudRate, dataBits, stopBits, parity) {
        if ('serial' in navigator) {
            try {
                this.sequence = 0;
                this.port = await navigator.serial.requestPort();

                //建立连接
                await this.port.open({ baudRate: baudRate, dataBits: dataBits, stopBits: stopBits, parity: parity });
                console.log('串口连接成功!');

                //读取数据
                while (this.port && this.port.readable) {
                    this.reader = this.port.readable.getReader();

                    try {
                        let cache = [];
                        while (true) {
                            const { value, done } = await this.reader.read();

                            if (done) {
                                //串行端口已关闭或没有更多数据进入
                                this.reader.releaseLock();
                                break;
                            }

                            if (value) {
                                let temp = Array.prototype.slice.call(value);
                                cache = cache.concat(temp);

                                if (cache.length > 10) {
                                    //检测缓冲区的开始是否正确, 如果不正确则丢弃
                                    if (cache[0] == 0xFE
                                        && cache[1] == 0xFE
                                        && cache[2] == 0xFE
                                        && cache[3] == 0x68
                                        && cache[4] == 0x26) {
                                        //进行判断是否是完整的包
                                        let contentLength = IntConvert.fromBytesBigEndian(cache.slice(6, 8));

                                        if (cache.length > 10 + contentLength) {
                                            //判断最后一位是否为尾码
                                            if (cache[10 + contentLength] == 0x16) {
                                                //获取该部分
                                                let content = cache.slice(0,11 + contentLength);

                                                cache.splice(0, 11 + contentLength);

                                                const response = new MessageResponse(content);
                                                response.unpack();
                                                this._callback(response);
                                            } else {
                                                //无效
                                                cache.splice(0, 10 + contentLength);
                                            }
                                        }

                                    } else {
                                        //将缓冲区的包丢弃, 直到下一个连续的0x16,0xFE,0xFE,0xFE
                                        for (let index = 0; index < cache.length; index++) {
                                            //边界判断
                                            if (index + 3 >= cache.length) {
                                                break;
                                            }

                                            if (cache[index] == 0x16
                                                && cache[index + 1] == 0xFE
                                                && cache[index + 2] == 0xFE
                                                && cache[index + 3] == 0xFE
                                                && cache[index + 4] == 0x68
                                                && cache[index + 5] == 0x26) {
                                                //丢弃之前的内容
                                                cache.splice(0, index + 1);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                    } catch (error) {
                        console.error("读取串口出错:", error);
                        this.reader.releaseLock();
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

                let hexString = '';
                message.forEach(element => {
                    hexString += element.toString(16).toUpperCase() + ','
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
        let infoLengthArray =  BytesConvert.toBytesBigEndian(this._infoLength, 2);
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

    get data() {
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
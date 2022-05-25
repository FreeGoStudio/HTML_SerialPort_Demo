"use strict";
/**
 * 将int转换成小端byte数组
 * @param {int} number 待转换整型数
 * @param {int} length 指定转换后数组长度
 * @returns {byte[]} 小端byte数组
 */
export function toBytesLittleEndian(number, length) {
    var bytes = [];
    var i = 0;
    do {
        bytes[i++] = number & (255);
        number = number >> 8;
    } while (i < length)
    return bytes;
}

/**
 * 将int转换成大端byte数组
 * @param {int} number 待转换整型数
 * @param {int} length 指定转换后数组长度
 * @returns {byte[]} 大端byte数组
 */
 export function toBytesBigEndian(number, length) {
    var bytes = [];
    var i = length;
    do {
        bytes[--i] = number & (255);
        number = number >> 8;
    } while (i)
    return bytes;
}

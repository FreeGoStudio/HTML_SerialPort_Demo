"use strict";

/**
 * 将小端byte数组转换成int
 * @param {byte[]} 待转换小端数组
 * @returns 转换后的整型数
 */
 export function fromBytesLittleEndian(bytes){
    var val = 0;
    for (var i = bytes.length - 1; i >= 0; i--) {        
        val += bytes[i];    
        if (i != 0) {
            val = val << 8;
        }    
    }
    return val;
}

/**
 * 将大端byte数组转换成int
 * @param {byte[]} bytes 待转换大端数组
 * @returns 转换后的整型数
 */
 export function fromBytesBigEndian(bytes){
    var val = 0;
    for (var i = 0; i < bytes.length; ++i) {        
        val += bytes[i];        
        if (i < bytes.length-1) {
            val = val << 8;
        }
    }
    return val;
}

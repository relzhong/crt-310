const ffi = require('ffi');
const ref = require('ref');
const path = require('path');
const bsplit = require('buffer-split');
const R = require('ramda');
const Decimal = require('decimal.js');
const hardware = {};

/**
   * 字符串转Hex Buffer
   * @param {String} req 字符 { 0 ~ F }
   * @param {Number} length 长度, 自动补长
   * @param {Number} type 拼接方式 { 0: 右边补0, 1: 左边补0 }
   * @return {Buffer} res
   */
function str2Hex(req, length, type) {
  if (length) {
    if (type) {
      // 左边补0
      if (req.length % 2) {
        req = '0' + req;
      }
      const surplusNum = length * 2 - req.length;
      const surplus = R.reduce(R.concat, '', R.repeat('0', surplusNum));
      req = R.splitEvery(2, surplus + req);

    } else {
      // 默认右边补0
      if (req.length % 2) {
        req = req + '0';
      }
      const surplusNum = length * 2 - req.length;
      const surplus = R.reduce(R.concat, '', R.repeat('0', surplusNum));
      req = R.splitEvery(2, req + surplus);
    }
  } else {
    if (req.length % 2) {
      req = req + '0';
    }
    req = R.splitEvery(2, req);
  }

  let buf = Buffer.from('');
  req.forEach(i => { buf = Buffer.concat([ buf, Buffer.alloc(1, new Decimal('0x' + i).toNumber()) ]); });
  return buf;
}

/**
     * Hex Buffer转字符串
     * @param {Buffer} req 字符
     * @return {String} res
     */
function hex2Str(req) {
  let dec = '';
  for (let i = 0; i < req.length; i++) {
    let d = new Decimal(req.readUIntBE(i, 1)).toHex().slice(2, 4)
      .toUpperCase();
    d = d.length % 2 ? '0' + d : '' + d;
    dec = dec + d;
  }
  return dec;
}

const libcrt = ffi.Library(path.join(__dirname, './lib/CRT_310'), {
  CommOpen: [ 'pointer', [ 'string' ]],
  CommClose: [ 'int', [ 'pointer' ]],
  CRT310_Reset: [ 'int', [ 'pointer', 'int' ]], // 0=不弹卡 1=前端弹卡 2=后端弹卡
  CRT310_CardSetting: [ 'int', [ 'pointer', 'int', 'int' ]],
  CRT310_CardPosition: [ 'int', [ 'pointer', 'int' ]],
  CRT310_GetStatus: [ 'int', [ 'pointer', 'pointer', 'pointer', 'pointer' ]],
  CRT310_MovePosition: [ 'int', [ 'pointer', 'int' ]],
  MC_ReadTrack: [ 'int', [ 'pointer', 'int', 'int', 'pointer', 'pointer' ]],
  CRT_IC_CardOpen: [ 'int', [ 'pointer' ]],
  CRT_IC_CardClose: [ 'int', [ 'pointer', 'int' ]],
  CRT_R_DetectCard: [ 'int', [ 'pointer', 'pointer', 'pointer' ]],
  CPU_ColdReset: [ 'int', [ 'pointer', 'int', 'pointer', 'pointer', 'pointer' ]],
  CPU_WarmReset: [ 'int', [ 'pointer', 'pointer', 'pointer', 'pointer' ]],
  CPU_T0_C_APDU: [ 'int', [ 'pointer', 'int', 'string', 'pointer', 'pointer' ]],
  CPU_T1_C_APDU: [ 'int', [ 'pointer', 'int', 'string', 'pointer', 'pointer' ]],
  GetErrCode: [ 'int', [ 'pointer' ]],
});

hardware.CommOpen = port => {
  try {
    const handle = libcrt.CommOpen(port);
    if (ref.isNull(handle)) {
      return { status: -1 };
    }
    return { status: 0, data: { handle } };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CommClose = handle => {
  try {
    const res = libcrt.CommClose(handle);
    if (res === 0) {
      return { status: 0 };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CRT310_Reset = (handle, eject) => {
  try {
    const res = libcrt.CRT310_Reset(handle, eject);
    if (res === 0) {
      return { status: 0 };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CRT310_CardSetting = (handle, cardIn, enableBackIn) => {
  try {
    const res = libcrt.CRT310_CardSetting(handle, cardIn, enableBackIn);
    if (res === 0) {
      return { status: 0 };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CRT310_CardPosition = (handle, position) => {
  try {
    const res = libcrt.CRT310_CardPosition(handle, position);
    if (res === 0) {
      return { status: 0 };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CRT310_MovePosition = (handle, position) => {
  try {
    const res = libcrt.CRT310_MovePosition(handle, position);
    if (res === 0) {
      return { status: 0 };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CRT310_GetStatus = handle => {
  try {
    const atPosition = ref.alloc(ref.types.byte);
    const frontSetting = ref.alloc(ref.types.byte);
    const rearSetting = ref.alloc(ref.types.byte);
    const res = libcrt.CRT310_GetStatus(handle, atPosition, frontSetting, rearSetting);
    if (res === 0) {
      return { status: 0, data: { atPosition: atPosition.deref(), frontSetting: frontSetting.deref(), rearSetting: rearSetting.deref() } };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.MC_ReadTrack = (handle, track) => {
  try {
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.MC_ReadTrack(handle, 0x30, track, len, data);
    if (res === 0) {
      let track1;
      let track2;
      let track3;
      const blockData = ref.reinterpret(data, len.deref());
      const blocks = bsplit(blockData, Buffer.from([ 0x1f ])).slice(1);
      if (blocks[0]) {
        track1 = (blocks[0][0] === 0x59) ? blocks[0].slice(1).toString() : undefined;
      }
      if (blocks[1]) {
        track2 = (blocks[1][0] === 0x59) ? blocks[1].slice(1).toString() : undefined;
      }
      if (blocks[2]) {
        track3 = (blocks[2][0] === 0x59) ? blocks[2].slice(1).toString() : undefined;
      }
      return { status: 0, data: { track1, track2, track3 } };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.GetErrCode = () => {
  try {
    const errorCode = ref.alloc(ref.types.int);
    const res = libcrt.GetErrCode(errorCode);
    if (res === 0) {
      return { status: 0, data: { errorCode: errorCode.deref() } };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CRT_IC_CardOpen = handle => {
  try {
    const res = libcrt.CRT_IC_CardOpen(handle);
    if (res === 0) {
      return { status: 0 };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CRT_IC_CardClose = handle => {
  try {
    const res = libcrt.CRT_IC_CardClose(handle);
    if (res === 0) {
      return { status: 0 };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CRT_R_DetectCard = handle => {
  try {
    const cardType = ref.alloc(ref.types.byte);
    const cardInfo = ref.alloc(ref.types.byte);
    const res = libcrt.CRT_R_DetectCard(handle, cardType, cardInfo);
    if (res === 0) {
      return { status: 0, data: { cardType: cardType.deref(), cardInfo: cardInfo.deref() } };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CPU_ColdReset = (handle, mode) => {
  try {
    const cpuType = ref.alloc(ref.types.byte);
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.CPU_ColdReset(handle, mode, cpuType, data, len);
    if (res === 0) {
      return { status: 0, data: { cpuType: cpuType.deref(), exData: ref.reinterpret(data, len.deref()).toString() } };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CPU_WarmReset = handle => {
  try {
    const cpuType = ref.alloc(ref.types.byte);
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.CPU_WarmReset(handle, cpuType, data, len);
    if (res === 0) {
      return { status: 0, data: { cpuType: cpuType.deref(), exData: ref.reinterpret(data, len.deref()).toString() } };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CPU_T0_C_APDU = (handle, apduData) => {
  try {
    const inData = str2Hex(apduData);
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.CPU_T0_C_APDU(handle, inData.length, inData, data, len);
    const outData = ref.reinterpret(data, len.deref());
    if (res === 0) {
      return { status: 0, data: { exData: hex2Str(outData) } };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

hardware.CPU_T1_C_APDU = (handle, apduData) => {
  try {
    const inData = str2Hex(apduData);
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.CPU_T1_C_APDU(handle, inData.length, inData, data, len);
    const outData = ref.reinterpret(data, len.deref());
    if (res === 0) {
      return { status: 0, data: { exData: hex2Str(outData) } };
    }
    return { status: -1 };
  } catch (e) {
    return { status: -1 };
  }
};

module.exports = hardware;

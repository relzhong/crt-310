const assert = require('assert');

const crt = require('../index');

describe('test com port connect', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should get error successfully', () => {
    crt.CRT310_Reset(device, 1);
    const res = crt.CRT310_GetStatus(device);
    assert(res.error === 0);
  });
  after(() => {
    crt.CommClose(device);
  });
});

describe('test mc track read', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should read track successfully', () => {
    const res = crt.MC_ReadTrack(device, 0x37);
    assert(res.error === 0);
  });
  it('should read track2 successfully', () => {
    const res = crt.MC_ReadTrack(device, 0x37);
    assert(res.data.track2);
  });
  after(() => {
    crt.CommClose(device);
  });
});

describe('test read move', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should enable read card', () => {
    const res = crt.CRT310_CardSetting(device, 2, 1);
    assert(res.error === 0);
  });
  it('should set card position to ic positon', () => {
    const res = crt.CRT310_CardPosition(device, 4);
    assert(res.error === 0);
  });
  it('should move card to front positon', () => {
    const res = crt.CRT310_MovePosition(device, 1);
    assert(res.error === 0);
  });
  after(() => {
    crt.CommClose(device);
  });
});

describe('test ic card read', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should enable read card', () => {
    const res = crt.CRT310_CardSetting(device, 2, 1);
    assert(res.error === 0);
  });
  it('should set card position to ic positon', () => {
    const res = crt.CRT310_CardPosition(device, 4);
    assert(res.error === 0);
  });
  it('should move card to ic positon', () => {
    const res = crt.CRT310_MovePosition(device, 4);
    assert(res.error === 0);
  });
  it('should open ic card', () => {
    const res = crt.CRT_IC_CardOpen(device);
    assert(res.error === 0);
  });
  it('should cold reset ic card', () => {
    const res = crt.CPU_ColdReset(device, 0);
    assert(res.error === 0);
  });
  it('should exec apdu in type 0 card', () => {
    const res = crt.CPU_T0_C_APDU(device, '00A404000E315041592E5359532E4444463031');
    assert(res.error === 0);
  });
  it('should exec apdu successfully', () => {
    const res = crt.CPU_T0_C_APDU(device, '00A404000E315041592E5359532E4444463031');
    assert(res.data.exData.slice(-4) === '9000');
  });
  after(() => {
    crt.CommClose(device);
  });
});

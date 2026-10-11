import test from 'node:test';
import assert from 'node:assert/strict';
import {id} from '../functions/activate-member/src/telegram/security.mjs';
import {botQrisIds,botQrisPrice} from '../functions/activate-member/src/telegram/bot-qris.mjs';
test('QRIS bot memakai harga tetap dan ID order deterministik',()=>{
 assert.equal(botQrisPrice,199000);
 assert.equal(botQrisIds.orderId('sandbox-1'),id('bot-qris-order','sandbox-1'));
 assert.notEqual(botQrisIds.currentId('bot-A','1'),botQrisIds.currentId('bot-A','2'));
});
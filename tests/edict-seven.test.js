import test from 'node:test';
import assert from 'node:assert/strict';
import { closeDay, createGame, decreeProgress, takeAction } from '../edict-seven/logic.js';
test('开局有七道圣旨与三次行动',()=>{const state=createGame(()=>.4);assert.equal(state.decrees.length,7);assert.equal(state.actions,3);});
test('行动会改变资源并消耗行动次数',()=>{const state=createGame(()=>.4),next=takeAction(state,'open-granary');assert.equal(next.actions,2);assert.equal(next.stats.grain,43);});
test('三次行动后才能结算当日圣旨',()=>{let state=createGame(()=>.4);assert.equal(closeDay(state),null);for(let i=0;i<3;i++)state=takeAction(state,'night-watch');state=closeDay(state);assert.equal(state.day,2);});
test('圣旨进度显示所需资源',()=>{assert.ok(decreeProgress(createGame(()=>.4)).length>0);});

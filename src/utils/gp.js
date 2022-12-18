const BTN = {};

BTN.RIGHTCLUSTER_DOWN = 0;
BTN.RIGHTCLUSTER_RIGHT = 1;
BTN.RIGHTCLUSTER_LEFT = 2;
BTN.RIGHTCLUSTER_UP = 3;

BTN.SHOULDERFRONT_LEFT = 4;
BTN.SHOULDERFRONT_RIGHT = 5;

BTN.SHOULDERBACK_LEFT = 6;
BTN.SHOULDERBACK_RIGHT = 7;

BTN.CENTERCLUSER_LEFT = 8;
BTN.CENTERCLUSTER_RIGHT = 9;

// BTN.SELECT = 8;
// BTN.START = 9;

BTN.STICKLEFT_PRESS = 10;
BTN.STICKRIGHT_PRESS = 11;

BTN.LEFTCLUSTER_UP = 12;
BTN.LEFTCLUSTER_DOWN = 13;
BTN.LEFTCLUSTER_LEFT = 14;
BTN.LEFTCLUSTER_RIGHT = 15;

/**
 * A string constant representing a specific key.
 * <br>-"META" is the command key on Mac.
 * @typedef {"RIGHTCLUSTER_DOWN" | "RIGHTCLUSTER_RIGHT" | "RIGHTCLUSTER_LEFT" | "RIGHTCLUSTER_UP"} gp.BtnConstant
 * @memberOf gp
 */

BTN.VENDOR_1 = 16;
BTN.VENDOR_2 = 17;

const btnLookup = [];
for (let id in BTN){
  btnLookup[BTN[id]] = id
}

const AXIS = {};
AXIS.LEFT_X = 0;
AXIS.LEFT_Y = 1;
AXIS.RIGHT_X = 2;
AXIS.RIGHT_Y = 3;

const BTNDOWN = 'btndown';
const BTNUP = 'btnup';

// Emitter method types

const EMIT_ON = 'on'
const EMIT_ONCE = 'once'

const axisLookup = [];
for (let id in AXIS){
  axisLookup[AXIS[id]] = id
}

function createUID(){
  return 1000000 + Math.round(Math.random()*8999999); // 7 char integer
}

// See: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad
// See: https://gamepad-tester.com/
// See: https://github.com/ArunMichaelDsouza/joypad.js
class GP extends PIXI.utils.EventEmitter {

  constructor(){

    super();

    this.axisThreshold = 0.04;

    this.inited = false;
    this.init();

  }

  init(){

    if (this.inited){
      return;
    }

    this.inited = true;
    this.gamepadInfo = {};
    this.lookupGamepadUIDByIndex = {};
    this.claimedGamepadIndex = -1;

    //this.claimedGamepadUIDs = [];

    this.btnsDown = {};

  }

  // To be called manually
  enable(_enable){

    if (this._onGpConnect){
      window.removeEventListener('gamepadconnected', this._onGpConnect);
      this._onGpConnect = null;
    }

    if (this._onGpDisconnect){
      window.removeEventListener('gamepaddisconnected', this._onGpDisconnect);
      this._onGpDisconnect = null;
    }

    if (_enable){
      this._onGpConnect = this.onGpConnect.bind(this)
      window.addEventListener('gamepadconnected', this._onGpConnect, false);
      this._onGpDisconnect = this.onGpDisconnect.bind(this)
      window.addEventListener('gamepaddisconnected', this._onGpDisconnect, false);
    }

  }

  onGpConnect(ev){

    let gamepadInfo = {};
    gamepadInfo.gamepad = ev.gamepad; // Store the gamepad
    gamepadInfo._prevBtns = null;

    gamepadInfo.claimed = false;

    let uid = createUID();
    this.gamepadInfo[uid] = gamepadInfo
    this.lookupGamepadUIDByIndex[ev.gamepad.index] = uid;

    this.listen(true);

  }

  onGpDisconnect(ev){

    let uid = this.lookupGamepadUIDByIndex[ev.gamepad.index]
    this.purgeGamepadInfo(uid);

  }

  purgeGamepadInfo(uid){

    if (uid){
      const index = this.gamepadInfo[uid].gamepad.index; // gampad.index is always unique
      delete this.lookupGamepadUIDByIndex[index]
      delete this.gamepadInfo[uid]
    }
    if (Object.keys(this.gamepadInfo).length < 1){
      this.listen(false);
    }

  }

  listen(enabled){
    ticker.remove(this.tick, this);
    if (enabled){
      ticker.add(this.tick, this);
    }
  }

  tick(dt){

    let gamepads = navigator.getGamepads();

    let anyClaimed = false;

    for (let i = 0; i < gamepads.length; i++){
      if (gamepads[i]){
        let uid = this.lookupGamepadUIDByIndex[gamepads[i].index];
        if (uid){

          for (let j = 0; j < gamepads[i].buttons.length; j++){

            if (this.gamepadInfo[uid].inputIndex > -1){
              this.btnsDown[String(this.gamepadInfo[uid].inputIndex) + ':' + btnLookup[j]] = gamepads[i].buttons[j].value ? true : false;
            }

            if (gamepads[i].buttons[j].value){

              if (!this.gamepadInfo[uid]._prevBtns || !this.gamepadInfo[uid]._prevBtns[j].value){
                // Btn down begin
                this._emitBtnEvent(BTNDOWN, this.gamepadInfo[uid].inputIndex, btnLookup[j])
              } else {
                // Btn held down
              }

            } else if (this.gamepadInfo[uid]._prevBtns && this.gamepadInfo[uid]._prevBtns[j].value){
              // Btn up
              this._emitBtnEvent(BTNUP, this.gamepadInfo[uid].inputIndex, btnLookup[j]);
              if (!anyClaimed && btnLookup[j] === 'CENTERCLUSTER_RIGHT' && !this.gamepadInfo[uid].claimed){
                this.gamepadInfo[uid].claimed = true;
                this.claimedGamepadIndex++;
                this.gamepadInfo[uid].inputIndex = this.claimedGamepadIndex;
                anyClaimed = true;
              }
            }
          }

          for (let j = 0; j < gamepads[i].axes.length; j++){
            if (Math.abs(gamepads[i].axes[j]) >= this.axisThreshold){
              // btnsDown.push('a'+String(j))
              // console.log(this.gamepadInfo[uid].inputIndex, axisLookup[j], gamepads[i].axes[j])
            }
          }

          this.gamepadInfo[uid]._prevBtns =  gamepads[i].buttons
          this.gamepadInfo[uid]._prevAxes =  gamepads[i].axes

        }
      }
    }
  }


  _emitBtnEvent(evType, inputIndex, btnStrID){

    if (inputIndex < 0){
      return;
    }

    const evName = evType + '|' + inputIndex + ':' + btnStrID
    this.emit(evName, btnStrID, inputIndex);

    // Fire wildcard button
    this.emit(evType + '|' + inputIndex + ':' + '*', btnStrID, inputIndex);

    // Fire wildcard input index
    this.emit(evType + '|' + '*' + ':' + btnStrID, btnStrID, inputIndex);

    // Fire wildcard both
    this.emit(evType + '|' + '*' + ':' + '*', btnStrID, inputIndex);

  }

  /**
   * Registers callback on key down event for provided kebtny/s.
   * @param {*} [context=null] - Optional context for callback.
   * @param {gp.BtnEventCallback} listener - Callback function.
   * @param {integer|"*")} inputIndex - Input index.
   * @param {...(integer|string|"*")} btn - An integer button index, a btn constant identifier. Can be an asterix for all (`*`).
   */
  onBtnDown(context, listener, inputIndex, ...btns){
    for (let btn of btns){
      this._registerKeyEvent(EMIT_ON, BTNDOWN, inputIndex, btn, listener, context);
    }
  }

  /**
   * Registers callback on key up event for provided btn/s.
   * @param {*} [context=null] - Optional context for callback.
   * @param {gp.BtnEventCallback} listener - Callback function.
   * @param {integer|"*")} inputIndex - Input index.
   * @param {...(integer|string|"*")} btn - An integer button index, a btn constant identifier. Can be an asterix for all (`*`).
   */
  onBtnUp(context, listener, inputIndex, ...btns){
    for (let btn of btns){
      this._registerKeyEvent(EMIT_ON, BTNUP, inputIndex, btn, listener, context);
    }
  }

  /**
   * Central method for handling all listener registrations.
   * @private
   */
  _registerKeyEvent(emitterMethod, evType, inputIndex, btn, listener, context){

    btn = this.parseBtn(btn);
    const evName = evType + '|' + inputIndex + ':' + btn
    // console.log('Registering listener:`'+evName+'`');
    this[emitterMethod](evName, listener, context); // Key code

  }

  /**
   * Unregisters btn down callback with matching criteria.
   * <br>- Same as `off()` though only targets up events.
   * @param {*} [context=null] - Optional context for callback.
   * @param {gp.BtnEventCallback} [listener=null] - Callback function.
   * @param {integer|"*")} inputIndex - Input index.
   * @param {...(integer|string|"*")} btn - An integer button index, a btn constant identifier. Can be an asterix for all (`*`).
   */
  offBtnDown(context, listener, inputIndex, ...btns){
    if (btn && btns.length > 0){
      for (let btn of btns){
        this._off(BTNDOWN, inputIndex, btn, listener, context);
      }
    } else {
      this._off(BTNDOWN, inputIndex, null, listener, context);
    }
  }

  /**
  * Unregisters key up callback with matching criteria.
  * <br>- Same as `off()` though only targets up events.
  * @param {*} [context=null] - Optional context for callback.
  * @param {gp.BtnEventCallback} [listener=null] - Callback function.
  * @param {integer|"*")} inputIndex - Input index.
  * @param {...(integer|string|"*")} btn - An integer button index, a btn constant identifier. Can be an asterix for all (`*`).
  */
  offBtnUp(context, listener, inputIndex, ...btns){
    if (btns && btns.length > 0){
      for (let btn of btns){
        this._off(BTNUP, inputIndex, btn, listener, context);
      }
    } else {
      this._off(BTNUP, inputIndex, null, listener, context);
    }
  }

  /**
   * A callback fired after a registered keyboard event fires.
   * @callback gp.BtnEventCallback
   * @param {string} btn - Button represented as a string.
   * @param {integer} inputIndex - The input index that fired the event.
   * @memberOf gp
   */
  off(context, listener, inputIndex, ...btns){
    if (btns && btns.length > 0){
      for (let btn of btns){
        this._off(null, inputIndex, btn, listener, context);
      }
    } else {
      this._off(null, inputIndex, null, listener, context);
    }
  }

  _off(evType, inputIndex, btn, listener, context){

    let evTypes = evType == null ? [BTNDOWN,BTNUP] : [evType];

    for (let _evType of evTypes){

      if (btn != null && btn != '*'){

        btn = this.parseBtn(btn);

        if (inputIndex != null && inputIndex !== '*'){
          // Specific inputIndex and btn
          const evName =  _evType + '|' + inputIndex + ':' + btn
          super.off(evName, listener, context);

        } else {

          // Specific btn, wildcard input index
          let evNames = [];
          for (let evName in this._events){ // https://github.com/primus/eventemitter3/blob/master/index.js
            let tmpEvName = evName;
            tmpEvName = tmpEvName.split(':').join('|')
            const parts = tmpEvName.split('|')
            if (parts[0] == _evType && parts[2] == btn){
              evNames.push(evName);
            }
          }
          for (let _evName of evNames){
            super.off(_evName, listener, context);
          }

        }

      } else {

        // Specific event type and wildcard or specific inputIndex
        //this.off(null, listener, context);
        let evNames = [];
        for (let evName in this._events){ // https://github.com/primus/eventemitter3/blob/master/index.js
          const parts = (inputIndex != null && inputIndex !== '*') ?  evName.split('|' + inputIndex + ':') : evName.split('|');
          if (parts[0] == _evType){
            evNames.push(evName);
          }
        }
        for (let _evName of evNames){
          super.off(_evName, listener, context);
        }

      }
    }


  }

  // Ensure btn ref is a string identifer and not a key
  parseBtn(btn){

    // If btn is number then lookitup and return string
    if (typeof btn === 'number'){
      return btnLookup(btn)
    }

    return btn; // btn is string identifier

  }


  isBtnDown(inputIndex, btnID){
    //if ((!inputIndex && inputIndex !==0) || inputIndex === '*'){
//
//      for (let i = 0 ; i < this.claimedGamepadIndex; i++){
//
//      }
//
//    }
    return this.btnsDown[String(inputIndex) + ':' + btnID]

  }

  destroy(reset){

    this.inited = false;

    this.enable(false);
    this.removeAllListeners();

    this.gamepadInfo = null;
    this.lookupGamepadUIDByIndex = null;

  }

}

export default GP;

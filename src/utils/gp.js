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

BTN.SELECT = 8;
BTN.START = 9;

BTN.STICKLEFT_PRESS = 10;
BTN.STICKRIGHT_PRESS = 11;

BTN.LEFTCLUSTER_UP = 12;
BTN.LEFTCLUSTER_DOWN = 13;
BTN.LEFTCLUSTER_LEFT = 14;
BTN.LEFTCLUSTER_RIGHT = 15;

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
    this.anyDupeChecks = false;
    this.lookupGamepadUIDByIndex = {};


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

    /*
    for (let i = 0; i < this.gamepads.length; i++){
      if (ev.gamepad.timestamp === this.gamepads[i].timestamp){
        // Duplicate connection
        return;
      }
    }
    */

    let gamepadInfo = {};
    gamepadInfo.gamepad = ev.gamepad
    gamepadInfo._prevBtns = null;
    gamepadInfo.checkForDupe = false;
    if (Object.keys(this.gamepadInfo).length > 0){
      // If other gamepads present then need to double check this is not a double entry.
      gamepadInfo.checkForDupe = true;
      this.anyDupeChecks = true;
    }

    //gamepadInfo.anyInput = false;
    gamepadInfo.anyNullInput = false; // Check that there has been some no input frames before checking for dupes.
    gamepadInfo.checkForNullInput = false;

    gamepadInfo.inputIndex = -1;
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
      const index = this.gamepadInfo[uid].gamepad.index
      delete this.lookupGamepadUIDByIndex[index]
      delete this.gamepadInfo[uid]
    }
    if (Object.keys(this.gamepadInfo).length < 0){
      this.listen(false);
    }

    // Reindex
    // - So that indexes are contiguous

    this.reindexInputs();

  }

  reindexInputs(){

    let indexes = [];
    for (let uid in this.gamepadInfo){
      if (this.gamepadInfo[uid].inputIndex > -1){
        indexes.push(this.gamepadInfo[uid].inputIndex);
      }
    }

    indexes.sort();

    let _i = -1;
    for (let uid in this.gamepadInfo){
      if (this.gamepadInfo[uid].inputIndex > -1){
        for (let i = 0; i < indexes.length; i++){
          if (this.gamepadInfo[uid].inputIndex === indexes[i]){
            _i++;
            this.gamepadInfo[uid].inputIndex = _i;
          }
        }
      }
    }

    return _i; // Max input

  }

  listen(enabled){
    ticker.remove(this.tick, this);
    if (enabled){
      ticker.add(this.tick, this);
    }
  }

  tick(dt){

    let gamepads = navigator.getGamepads();
    //let btnState = []

    let btnSigCount = {}
    let dupeCount = 0;

    for (let i = 0; i < gamepads.length; i++){
      if (gamepads[i]){
        let uid = this.lookupGamepadUIDByIndex[gamepads[i].index];
        if (uid){

          let btnsDown = [];
          if (this.anyDupeChecks && this.gamepadInfo[uid].checkForDupe){
            dupeCount++;
          }

          for (let j = 0; j < gamepads[i].buttons.length; j++){
            if (gamepads[i].buttons[j].value){
              console.log(this.gamepadInfo[uid].inputIndex, btnLookup[j]);
              if (!this.gamepadInfo[uid]._prevBtns || !this.gamepadInfo[uid]._prevBtns[j].value){
                btnsDown.push('b'+String(j)+'in')
              } else {
                btnsDown.push('b'+String(j))
              }
            } else if (this.gamepadInfo[uid]._prevBtns && this.gamepadInfo[uid]._prevBtns[j].value){
              btnsDown.push('b'+String(j)+'x')
              this.gamepadInfo[uid].checkForNullInput = true;
            }
          }

          if (this.anyDupeChecks){
            let _sig = btnsDown.join('|')
            this.gamepadInfo[uid]._sig = _sig
            if (!btnSigCount[_sig]){
              btnSigCount[_sig] = 0;
            }
            btnSigCount[_sig]++;
          }

          for (let j = 0; j < gamepads[i].axes.length; j++){
            if (Math.abs(gamepads[i].axes[j]) >= this.axisThreshold){
              btnsDown.push('a'+String(j))
              console.log(this.gamepadInfo[uid].inputIndex, axisLookup[j], gamepads[i].axes[j])
            }
          }

          if (btnsDown.length > 0 && this.gamepadInfo[uid].inputIndex < 0 && !this.gamepadInfo[uid].checkForDupe){
            this.gamepadInfo[uid].inputIndex = this.reindexInputs() + 1;
          }

          this.gamepadInfo[uid]._prevBtns =  gamepads[i].buttons
          this.gamepadInfo[uid]._prevAxes =  gamepads[i].axes

          if (this.gamepadInfo[uid].checkForNullInput && !this.gamepadInfo[uid].anyNullInput && btnsDown.length === 0){
            this.gamepadInfo[uid].anyNullInput = true; // Record 1+ frames of no-input. To detect devices with button locked down.
          }
        }
      }

    }

    if (this.anyDupeChecks && dupeCount === 0){
      this.anyDupeChecks = false;
    }

    if (this.anyDupeChecks){
      // Check for dupes
      for (let i = gamepads.length-1; i >= 0; i--){
        if (gamepads[i]){
          let uid = this.lookupGamepadUIDByIndex[gamepads[i].index];
          if (uid){
            if (this.gamepadInfo[uid].checkForDupe && this.gamepadInfo[uid].anyNullInput){
              if (this.gamepadInfo[uid]._sig.length > 0){ //  && this.gamepadInfo[uid]._sig.split('|').length === 1 Only check if a single button is involved.
                if (btnSigCount[this.gamepadInfo[uid]._sig] === 1){ // Unless 2+ identical sigs then stop checking
                  this.gamepadInfo[uid].checkForDupe = false;
                } else if (this.gamepadInfo[uid]._sig.split('x').length > 1){
                  this.purgeGamepadInfo(uid);
                  break;
                }
              }
            }
          }
        }
      }
    }

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

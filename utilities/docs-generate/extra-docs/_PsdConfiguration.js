
/** @class _PsdConfiguration
  * @hideconstructor
  * @example
  
Textures are exported via Choppy ({@link https://www.npmjs.com/package/choppy}).
  
The following layer naming conventions are supported:
  
- *Sprite* - `layer` in PSD. (`.img` is assumed)
  - Use `layer.div(white)` for a Sprite with the built in *PIXI.Texture.White*
  - Use `layer.div(empty)` for a Sprite with the built in *PIXI.Texture.Empty*
  - Use `layer.div(clone:other_layer)` for a Sprite with another Sprite texture. Note: Texture Packer will do this automatically when using spritesheets. 
  - Use `tint:#ff3300` to tint a white (or any) texture. It can handle: hex strings starting with #: "#ffffff" hex strings starting with 0x: "0xffffff" hex strings without prefix: "ffffff" css colors: "black")
- *Container* - `layer.div` in PSD.
- *Text* - `layer.tf` in PSD. 
- *Btn* - `layer.btn` in PSD. 
- *Graphics* - `layer.rect` in PSD. 

Defining a half resolution texture:
- Layer name: `halfres_layer(outputValueFactor:1,scale:0.5)`

Example (PSD Layer names):
-mysprite.div(white,ui) // Will output as a white box
-mysprite.div(empty) // Will be a hidden sprite without any texture

  */

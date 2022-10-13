
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

Accessilbity:

Adding the `alt` flag to any text field will render it as an accessible button with it's text as the alt text.
- `myBlurb.tf(alt)`

Adding an `alt` property to any display object will render it as an accessible button with it's text as the alt text.
- `myBlurb.tf(alt:Hello)`
- `accessibleZone.tf(alt:Welcome)`

The `alt` property also accepts references to any texture in the same psd, within curly brackets. Alt of referenced display object will be used, and if not set then text of any referenced text fields.
- `accessibleZone.tf(alt:{heading}! {body})`
- `heading.tf
- `body(alt:Welcome)`

  */

# Colour decoding fixtures

Real files used to verify `measure/decode.ts`. Small, non-identifying images only.

## Present

### `iphone-p3-hand.jpg` — Display P3 verification ✅

**Measured result:** decoding this photo and reading skin pixels both ways gives

| measured as | L\* | a\* | b\* | C\* | h (deg) |
| --- | --- | --- | --- | --- | --- |
| sRGB (profile ignored) | 48.59 | 7.92 | 12.79 | 15.04 | **58.23** |
| Display P3 (correct) | 48.74 | 10.56 | 14.63 | 18.04 | **54.18** |

A **-4.05 degree** hue shift, and +3.0 in chroma. With `HUE.skinByBand.span` at
10, that is 0.4 of the whole normalised half-axis — enough to move the undertone
label from neutral-warm to warm. This is why `decode.ts` reads the ICC profile.

A photo of a **hand** taken on an iPhone, exported so the embedded ICC profile
survives. Used to confirm that `decode.ts` reads the profile and that converting
Display P3 → sRGB shifts skin hue angle in the expected direction.

To keep the profile, AirDrop the photo to a Mac or use **Files → Save to Files**.
Do not send it through WhatsApp/Slack/iMessage — those strip or rewrite the ICC
profile, which would make the fixture useless.

Check it carries the profile before committing:

```
sips -g profile tests/fixtures/color/iphone-p3-hand.jpg
# expect: profile: Display P3
```

A hand rather than a face on purpose: it exercises the same skin-tone hue range
without committing anyone's face to the repository.

### `iphone-heic-sample.heic` ✅

Straight-from-camera HEIC (`ftyp` brand `heic`, Display P3, 5712x4284). Confirms
`sniffFormat()` identifies a real file and not just a synthetic header, and that
`decodeImage()` raises `unsupported_format` with the HEIC message rather than
throwing something opaque.

## Notes

Tests that need a fixture skip when it is absent, so the suite stays green
without them. Decoding under Node needs `tests/helpers/initCodecs.ts`: the
@jsquash codecs fetch their .wasm over HTTP, which works in the browser and in
the Playwright eval but not in Node, so tests compile the .wasm off disk and
hand it to each codec's `init()`.

These two files are ~4.8 MB of binary in git history. That is deliberate — the
whole point is testing against real camera output — but it is a one-off cost
worth knowing about.

# Colour decoding fixtures

Real files used to verify `measure/decode.ts`. Small, non-identifying images only.

## Wanted

### `iphone-p3-hand.jpg` — Display P3 verification

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

### `iphone-heic-sample.heic` — optional

Any straight-from-camera HEIC. Confirms `sniffFormat()` identifies a real file
and not just a synthetic header, and that the quality step returns the HEIC
message rather than throwing.

## Notes

Tests that need a fixture skip when it is absent, so the suite stays green
without them.

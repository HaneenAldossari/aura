import React from "react";
import { Composition } from "remotion";
import { HeroBg } from "./HeroBg";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeroBg"
      component={HeroBg}
      durationInFrames={300}  // 10 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

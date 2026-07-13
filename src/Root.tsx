import React from 'react';
import { Composition } from 'remotion';
import { SmartReel, defaultSmartReelProps } from './SmartReel';
import { TokyoReel, defaultTokyoReelProps, TOKYO_DURATION } from './TokyoReel';
import {
  RightCareReel,
  defaultRightCareReelProps,
  RIGHTCARE_DURATION,
} from './RightCareReel';
import {
  SmartMedReel,
  defaultSmartMedReelProps,
  SMARTMED_DURATION,
} from './SmartMedReel';
import {
  SmartLabReel,
  defaultSmartLabReelProps,
  SMARTLAB_DURATION,
  computeSmartLabDuration,
} from './SmartLabReel';
import {
  SmartMedHajjReel,
  defaultSmartMedHajjReelProps,
  SMARTMED_HAJJ_DURATION,
  computeSmartMedHajjDuration,
} from './SmartMedHajjReel';
import './style.css';
import './tokyo.css';
import './rightcare.css';
import './smartmed.css';
import './smartlab.css';
import './smartmed-hajj.css';
import { loadTimeline, timelineDuration } from './timeline';
import { loadPosterOverlayState } from './posterOverlay/overlayState';

const smartLabProjectId = () => {
  if (typeof process !== 'undefined' && process.env?.REMOTION_PROJECT_ID) {
    return process.env.REMOTION_PROJECT_ID;
  }
  return 'smartlab';
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SmartReel"
        component={SmartReel}
        durationInFrames={1050}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultSmartReelProps}
      />
      <Composition
        id="TokyoReel"
        component={TokyoReel}
        durationInFrames={TOKYO_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultTokyoReelProps}
      />
      <Composition
        id="RightCareReel"
        component={RightCareReel}
        durationInFrames={RIGHTCARE_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultRightCareReelProps}
      />
      <Composition
        id="SmartMedReel"
        component={SmartMedReel}
        durationInFrames={SMARTMED_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultSmartMedReelProps}
        calculateMetadata={({ props }) => {
          const tl = loadTimeline('smartmed');
          const overlayState = loadPosterOverlayState('smartmed');
          const nextProps = overlayState
            ? { ...props, posterOverlays: overlayState }
            : props;
          return tl
            ? {
                durationInFrames: timelineDuration(tl, 30, 5.5, 0),
                props: { ...nextProps, _tlState: tl },
              }
            : {
                durationInFrames: SMARTMED_DURATION,
                props: nextProps,
              };
        }}
      />
      <Composition
        id="SmartLabReel"
        component={SmartLabReel}
        durationInFrames={SMARTLAB_DURATION}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={defaultSmartLabReelProps}
        calculateMetadata={({ props }) => {
          const projectId = smartLabProjectId();
          const tl = loadTimeline(projectId);
          const overlayState = loadPosterOverlayState(projectId);
          const nextProps = overlayState
            ? { ...props, posterOverlays: overlayState }
            : props;
          if (tl) {
            return {
              durationInFrames: timelineDuration(tl, 30, 5, 0),
              props: { ...nextProps, _tlState: tl },
            };
          }
          return {
            durationInFrames: computeSmartLabDuration(nextProps, 30),
            props: nextProps,
          };
        }}
      />
      <Composition
        id="SmartMedHajjReel"
        component={SmartMedHajjReel}
        durationInFrames={SMARTMED_HAJJ_DURATION}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultSmartMedHajjReelProps}
        calculateMetadata={({ props }) => {
          const overlayState = loadPosterOverlayState('smartmed-hajj');
          const nextProps = overlayState
            ? { ...props, posterOverlays: overlayState }
            : props;
          // If a timeline file exists for this project (written by the
          // hub server when the user clicks Render), use it to compute
          // duration and pass the state down to the composition so it
          // can hide / reorder scenes.
          const tl = loadTimeline('smartmed-hajj');
          if (tl) {
            return {
              durationInFrames: timelineDuration(tl, 30, 5, 10),
              props: { ...nextProps, _tlState: tl },
            };
          }
          return {
            durationInFrames: computeSmartMedHajjDuration(nextProps, 30),
            props: nextProps,
          };
        }}
      />
    </>
  );
};

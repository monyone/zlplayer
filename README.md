# zlplayer [![npm](https://img.shields.io/npm/v/zlplayer.svg?style=flat)](https://www.npmjs.com/package/zlplayer)

HTML5 MPEG2-TS live stream player written in TypeScript.

## Overview

zlplayer works by decoding MPEG2-TS stream into VideoFrame/AudioData using [WebCodecs](https://www.w3.org/TR/webcodecs/),   
followed by feeding into an an HTML5 `<video>` element through [MediaStreamTrack Insertable Streams (a.k.a. Breakout Box)](https://alvestrand.github.io/mediacapture-transform/chrome-96.html).

## Feature

* Playback for MPEG2-TS stream with H.264 + AAC codec transported in http(s)
* Extremely low latency of less than 0.1 second in the best case

## Installation

```bash
npm install --save zlplayer
```

or 

```bash
yarn add zlplayer
```

## Build

```
yarn
yarn build
```

## Getting Started

```
<script src="zlplayer"></script>
<video id="videoElement"></video>
<script>
  var videoElement = document.getElementById('videoElement');
  var zlplayer = new window.zlplayer.Player({
    // some options
  });
  zlplayer.attachMedia(videoElement);
  zlplayer.load(/* url */).then(() => {
    videoElement.play()
  });
</script>
```

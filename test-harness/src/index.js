import React from 'react';
import ReactDOM from 'react-dom';
import SpeechRecognition from 'react-speech-recognition'
import Dictaphones from './Dictaphones';
import { createSpeechlySpeechRecognition } from './SpeechlySpeechRecognition'

const appId = process.env.REACT_APP_APP_ID
const SpeechlySpeechRecognition = createSpeechlySpeechRecognition(appId)
SpeechRecognition.applyPolyfill(SpeechlySpeechRecognition);

ReactDOM.render(
  <React.StrictMode>
    <Dictaphones />
  </React.StrictMode>,
  document.getElementById('root')
);


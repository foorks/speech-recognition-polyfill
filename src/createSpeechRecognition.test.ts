import { ErrNoAudioConsent } from '@speechly/browser-client'
import createSpeechlySpeechRecognition from './createSpeechRecognition';
import { MicrophoneNotAllowedError, SpeechRecognitionFailedError } from './types';
import {
  mockUndefinedWindow,
  mockUndefinedNavigator,
  mockMediaDevices,
  mockUndefinedMediaDevices,
  mockAudioContext,
  mockWebkitAudioContext,
  mockUndefinedAudioContext,
  mockUndefinedWebkitAudioContext,
  expectSentenceToBeTranscribedWithFinalResult,
  expectSentenceToBeTranscribedWithInterimAndFinalResults,
  expectSentenceToBeTranscribedWithFirstInitialResult,
} from './testUtils';
import TEST_DATA from './testData';

const { SENTENCE_ONE, SENTENCE_TWO } = TEST_DATA;

let _callback: any;
const mockOnSegmentChange = jest.fn((callback) => {
  _callback = callback;
});
const mockInitialize = jest.fn(() => Promise.resolve());
const mockStartContext = jest.fn(() => Promise.resolve());
const mockStopContext = jest.fn(() => Promise.resolve());
jest.mock('@speechly/browser-client', () => ({
  Client: function () {
    return {
      onSegmentChange: mockOnSegmentChange,
      initialize: mockInitialize,
      startContext: mockStartContext,
      stopContext: mockStopContext,
    };
  }
}));

const speak = (sentence: any) => {
  sentence.forEach(_callback)
}

const speakAndInterrupt = (sentence: any, interrupt: any) => {
  _callback(sentence[0]);
  interrupt();
  sentence.slice(1).forEach(_callback);
}

describe('createSpeechlySpeechRecognition', () => {
  beforeEach(() => {
    mockInitialize.mockClear();
    mockStartContext.mockClear();
    mockStopContext.mockClear();
    mockOnSegmentChange.mockClear();
  });

  it('calls initialize and startContext on Speechly client when starting transcription', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();

    await speechRecognition.start();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockStartContext).toHaveBeenCalledTimes(1);
  })

  it('calls given onresult for only the final result (interimResults: false)', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;

    await speechRecognition.start();
    speak(SENTENCE_ONE);

    expect(mockOnResult).toHaveBeenCalledTimes(1);
    expectSentenceToBeTranscribedWithFinalResult(SENTENCE_ONE, mockOnResult);
  })

  it('calls given onresult for each interim or final result (interimResults: true)', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;
    speechRecognition.interimResults = true;

    await speechRecognition.start();
    speak(SENTENCE_ONE);

    expect(mockOnResult).toHaveBeenCalledTimes(SENTENCE_ONE.length);
    expectSentenceToBeTranscribedWithInterimAndFinalResults(SENTENCE_ONE, mockOnResult);
  })

  it('transcribes two utterances when continuous is turned on (interimResults: false)', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;
    speechRecognition.continuous = true;

    await speechRecognition.start();
    speak(SENTENCE_ONE);
    speak(SENTENCE_TWO);

    expect(mockOnResult).toHaveBeenCalledTimes(2);
    expectSentenceToBeTranscribedWithFinalResult(SENTENCE_ONE, mockOnResult);
    expectSentenceToBeTranscribedWithFinalResult(SENTENCE_TWO, mockOnResult, 2);
  })

  it('transcribes only one of two utterances when continuous is turned off (interimResults: false)', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;

    await speechRecognition.start();
    speak(SENTENCE_ONE);
    speak(SENTENCE_TWO);

    expect(mockOnResult).toHaveBeenCalledTimes(1);
    expectSentenceToBeTranscribedWithFinalResult(SENTENCE_ONE, mockOnResult);
  })

  it('transcribes two utterances when continuous is turned on (interimResults: true)', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;
    speechRecognition.interimResults = true;
    speechRecognition.continuous = true;

    await speechRecognition.start();
    speak(SENTENCE_ONE);
    speak(SENTENCE_TWO);

    expect(mockOnResult).toHaveBeenCalledTimes(SENTENCE_ONE.length + SENTENCE_TWO.length);
    expectSentenceToBeTranscribedWithInterimAndFinalResults(SENTENCE_ONE, mockOnResult);
    expectSentenceToBeTranscribedWithInterimAndFinalResults(SENTENCE_TWO, mockOnResult, SENTENCE_ONE.length + 1);
  })

  it('transcribes only one of two utterances when continuous is turned off (interimResults: true)', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;
    speechRecognition.interimResults = true;

    await speechRecognition.start();
    speak(SENTENCE_ONE);
    speak(SENTENCE_TWO);

    expect(mockOnResult).toHaveBeenCalledTimes(SENTENCE_ONE.length);
    expectSentenceToBeTranscribedWithInterimAndFinalResults(SENTENCE_ONE, mockOnResult);
  })

  it('does not call initialize, stopContext or onend when stopping a transcription that was never started', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;

    await speechRecognition.stop();

    expect(mockInitialize).toHaveBeenCalledTimes(0);
    expect(mockStopContext).toHaveBeenCalledTimes(0);
    expect(mockOnEnd).toHaveBeenCalledTimes(0);
  })

  it('calls initialize, stopContext or onend when stopping a transcription that has been started', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;

    await speechRecognition.start();
    await speechRecognition.stop();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockStopContext).toHaveBeenCalledTimes(1);
    expect(mockOnEnd).toHaveBeenCalledTimes(1);
  })

  it('does not call initialize, stopContext or onend a second time when stopping a transcription that was already stopped', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;

    await speechRecognition.start();
    await speechRecognition.stop();
    await speechRecognition.stop();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockStopContext).toHaveBeenCalledTimes(1);
    expect(mockOnEnd).toHaveBeenCalledTimes(1);
  })

  it('does not call initialize, stopContext or onend when aborting a transcription that was never started', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;

    await speechRecognition.abort();

    expect(mockInitialize).toHaveBeenCalledTimes(0);
    expect(mockStopContext).toHaveBeenCalledTimes(0);
    expect(mockOnEnd).toHaveBeenCalledTimes(0);
  })

  it('calls initialize, stopContext or onend when aborting a transcription that has been started', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;

    await speechRecognition.start();
    await speechRecognition.abort();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockStopContext).toHaveBeenCalledTimes(1);
    expect(mockOnEnd).toHaveBeenCalledTimes(1);
  })

  it('does not call initialize, stopContext or onend a second time when aborting a transcription that was already aborted', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;

    await speechRecognition.start();
    await speechRecognition.abort();
    await speechRecognition.abort();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockStopContext).toHaveBeenCalledTimes(1);
    expect(mockOnEnd).toHaveBeenCalledTimes(1);
  })

  it('calling stop does not prevent ongoing utterance from being transcribed', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;
    speechRecognition.interimResults = true;

    await speechRecognition.start();
    speakAndInterrupt(SENTENCE_ONE, speechRecognition.stop);

    expect(mockOnResult).toHaveBeenCalledTimes(SENTENCE_ONE.length);
    expectSentenceToBeTranscribedWithInterimAndFinalResults(SENTENCE_ONE, mockOnResult);
  })

  it('calling abort prevents ongoing utterance from being transcribed', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;
    speechRecognition.interimResults = true;

    await speechRecognition.start();
    speakAndInterrupt(SENTENCE_ONE, speechRecognition.abort);

    expect(mockOnResult).toHaveBeenCalledTimes(1);
    expectSentenceToBeTranscribedWithFirstInitialResult(SENTENCE_ONE, mockOnResult);
  })

  it('calling stop prevents subsequent utterances from being transcribed', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;
    speechRecognition.interimResults = true;

    await speechRecognition.start();
    speakAndInterrupt(SENTENCE_ONE, speechRecognition.stop);
    speak(SENTENCE_TWO);

    expect(mockOnResult).toHaveBeenCalledTimes(SENTENCE_ONE.length);
    expectSentenceToBeTranscribedWithInterimAndFinalResults(SENTENCE_ONE, mockOnResult);
  })

  it('calling abort prevents subsequent utterances from being transcribed', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnResult = jest.fn();
    speechRecognition.onresult = mockOnResult;
    const mockOnEnd = jest.fn();
    speechRecognition.onend = mockOnEnd;
    speechRecognition.interimResults = true;

    await speechRecognition.start();
    speakAndInterrupt(SENTENCE_ONE, speechRecognition.abort);
    speak(SENTENCE_TWO);

    expect(mockOnResult).toHaveBeenCalledTimes(1);
    expectSentenceToBeTranscribedWithFirstInitialResult(SENTENCE_ONE, mockOnResult);
  })

  it('sets hasBrowserSupport to true when required APIs are defined (non-WebKit)', async () => {
    mockAudioContext();
    mockUndefinedWebkitAudioContext();
    mockMediaDevices();

    const SpeechRecognition = createSpeechlySpeechRecognition('app id');

    expect(SpeechRecognition.hasBrowserSupport).toEqual(true);
  })

  it('sets hasBrowserSupport to true when required APIs are defined (WebKit)', async () => {
    mockUndefinedAudioContext();
    mockWebkitAudioContext();
    mockMediaDevices();

    const SpeechRecognition = createSpeechlySpeechRecognition('app id');

    expect(SpeechRecognition.hasBrowserSupport).toEqual(true);
  })

  it('sets hasBrowserSupport to false when all AudioContext APIs are undefined', async () => {
    mockUndefinedAudioContext();
    mockUndefinedWebkitAudioContext();
    mockMediaDevices();

    const SpeechRecognition = createSpeechlySpeechRecognition('app id');

    expect(SpeechRecognition.hasBrowserSupport).toEqual(false);
  })

  it('sets hasBrowserSupport to false when MediaDevices API is undefined', async () => {
    mockAudioContext();
    mockUndefinedMediaDevices();

    const SpeechRecognition = createSpeechlySpeechRecognition('app id');

    expect(SpeechRecognition.hasBrowserSupport).toEqual(false);
  })

  it('sets hasBrowserSupport to false when Navigator API is undefined', async () => {
    mockAudioContext();
    mockUndefinedNavigator();

    const SpeechRecognition = createSpeechlySpeechRecognition('app id');

    expect(SpeechRecognition.hasBrowserSupport).toEqual(false);
  })

  it('sets hasBrowserSupport to false when window is undefined', async () => {
    mockUndefinedWindow();

    const SpeechRecognition = createSpeechlySpeechRecognition('app id');

    expect(SpeechRecognition.hasBrowserSupport).toEqual(false);
  })

  it('calls onerror with MicrophoneNotAllowedError error when no microphone permission given on start', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnError = jest.fn();
    speechRecognition.onerror = mockOnError;
    mockInitialize.mockImplementationOnce(() => Promise.reject(ErrNoAudioConsent))

    await speechRecognition.start();

    expect(mockOnError).toHaveBeenCalledTimes(1);
    expect(mockOnError).toHaveBeenCalledWith(MicrophoneNotAllowedError);
  })

  it('calls onerror with SpeechRecognitionFailedError error when speech recognition fails on start', async () => {
    const SpeechRecognition = createSpeechlySpeechRecognition('app id');
    const speechRecognition = new SpeechRecognition();
    const mockOnError = jest.fn();
    speechRecognition.onerror = mockOnError;
    mockInitialize.mockImplementationOnce(() => Promise.reject(new Error('generic failure')))

    await speechRecognition.start();

    expect(mockOnError).toHaveBeenCalledTimes(1);
    expect(mockOnError).toHaveBeenCalledWith(SpeechRecognitionFailedError);
  })
})
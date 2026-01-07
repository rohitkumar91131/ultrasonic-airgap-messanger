"use client";
import { useState, useRef, useEffect } from 'react';

export default function Receiver() {
  const [status, setStatus] = useState("Idle. Click Start.");
  const [receivedText, setReceivedText] = useState("");
  const [bitsBuffer, setBitsBuffer] = useState([]); 
  const [isListening, setIsListening] = useState(false);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const isReadingRef = useRef(false); 
  const frameRef = useRef(null);

  // Constants
  const FREQ_LOW = 19000;
  const FREQ_HIGH = 19500;
  const BIT_DURATION = 300; 

  // --- NEW: Watch for bits and decode safely ---
  useEffect(() => {
    // Only run if we have bits and it is a complete set of 8
    if (bitsBuffer.length > 0 && bitsBuffer.length % 8 === 0) {
        const byte = bitsBuffer.slice(-8).join("");
        const charCode = parseInt(byte, 2);
        
        if (charCode >= 32 && charCode <= 126) {
            const char = String.fromCharCode(charCode);
            setReceivedText(curr => curr + char);
        }
    }
  }, [bitsBuffer]); // Run this whenever bitsBuffer changes

  // --- AUDIO SETUP ---
  const startListening = async () => {
    try {
      setStatus("Requesting Microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();

      audioContextRef.current = ctx;
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; 
      analyser.smoothingTimeConstant = 0; 
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      setStatus("Listening for signal...");
      
      cancelAnimationFrame(frameRef.current);
      watchForStartBit();
      
    } catch (err) { 
      console.error(err); 
      setStatus("Error: " + err.message);
    }
  };

  const getFreqData = () => {
    if (!analyserRef.current || !audioContextRef.current) return { low: 0, high: 0 };
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(data);
    
    const ctx = audioContextRef.current;
    const sampleRate = ctx.sampleRate; 
    const nyquist = sampleRate / 2;
    const lowIndex = Math.round((FREQ_LOW / nyquist) * bufferLength);
    const highIndex = Math.round((FREQ_HIGH / nyquist) * bufferLength);
    const getMax = (idx) => Math.max(data[idx-1] || 0, data[idx], data[idx+1] || 0);

    return { low: getMax(lowIndex), high: getMax(highIndex) };
  };

  const watchForStartBit = () => {
    if (isReadingRef.current) return; 

    const { low, high } = getFreqData();
    const NOISE_FLOOR = 30; 
    const DIFF_REQUIRED = 15;

    if (high > NOISE_FLOOR && high > (low + DIFF_REQUIRED)) {
      console.log("Start Bit Detected!");
      isReadingRef.current = true;
      setStatus("Signal Detected...");
      setBitsBuffer([]); 
      setTimeout(readNextBit, BIT_DURATION * 1.5);
    } else {
      frameRef.current = requestAnimationFrame(watchForStartBit);
    }
  };

  const readNextBit = () => {
    const { low, high } = getFreqData();
    let bit = null;

    if (low < 50 && high < 50) {
      console.log("Silence detected. Stopping.");
      finishReading();
      return;
    }

    if (high > (low + 20)) bit = 1;
    else if (low > (high + 20)) bit = 0;
    else {
        finishReading();
        return;
    }

    // FIX: Just add the bit. Do NOT calculate text here.
    setBitsBuffer(prev => [...prev, bit]);

    setTimeout(readNextBit, BIT_DURATION);
  };

  const finishReading = () => {
    isReadingRef.current = false;
    setStatus("Listening for next signal...");
    watchForStartBit(); 
  };

  return (
    <div className="p-6 border-2 border-purple-500 rounded-lg shadow-lg bg-white">
      <h2 className="text-xl font-bold mb-4 text-purple-700">Receiver</h2>
      
      {!isListening ? (
        <button 
          onClick={startListening} 
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded w-full"
        >
          Start Listener
        </button>
      ) : (
        <div className="animate-pulse flex items-center justify-center gap-2 mb-4 bg-red-100 p-2 rounded">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm font-bold text-red-600">MICROPHONE ACTIVE</span>
        </div>
      )}
      
      <div className="bg-gray-900 text-green-400 p-4 rounded min-h-[150px] font-mono mt-4 relative">
        <p className="text-xs text-gray-500 mb-2 border-b border-gray-700 pb-1">STATUS: {status}</p>
        <p className="text-3xl font-bold tracking-widest break-words">
           {receivedText}<span className="animate-ping inline-block w-2 h-4 bg-green-500 ml-1"></span>
        </p>
        <button 
            onClick={() => { setReceivedText(""); setBitsBuffer([]); }}
            className="absolute top-2 right-2 text-xs text-gray-500 hover:text-white"
        >
            CLEAR
        </button>
      </div>
    </div>
  );
}
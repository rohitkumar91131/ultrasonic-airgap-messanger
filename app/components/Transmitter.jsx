"use client";
import { useState, useRef } from 'react';

export default function Transmitter() {
  const [text, setText] = useState("A"); 
  const [status, setStatus] = useState("Idle");
  
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  
  // CONFIGURATION
  const FREQ_LOW = 19000;  // Represents '0'
  const FREQ_HIGH = 19500; // Represents '1' & Start Bit
  const BIT_DURATION = 300; // Milliseconds per bit

  // Convert string to binary array [0, 1, 0, 0, ...]
  const stringToBinary = (str) => {
    let binaryArray = [];
    for (let i = 0; i < str.length; i++) {
      let charCode = str.charCodeAt(i);
      let bin = charCode.toString(2).padStart(8, "0"); 
      binaryArray = binaryArray.concat(bin.split("").map(Number));
    }
    return binaryArray;
  };

  const sendMessage = async () => {
    if (!text) return;
    setStatus("Preparing...");

    // 1. Initialize Audio Context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    // 2. Setup Oscillator & Gain
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(FREQ_LOW, ctx.currentTime);
    gain.gain.value = 0.5; // 50% Volume (Safe for speakers)

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // --- TRANSMISSION LOGIC ---
    const startTime = ctx.currentTime + 0.1; // Start slightly in future
    osc.start(startTime);

    // Step A: Send START BIT (High frequency for 1 duration)
    osc.frequency.setValueAtTime(FREQ_HIGH, startTime);

    // Step B: Send DATA BITS
    const bits = stringToBinary(text);
    
    bits.forEach((bit, index) => {
      // Offset by 1 because of the Start Bit
      const time = startTime + ((index + 1) * (BIT_DURATION / 1000));
      const freq = bit === 1 ? FREQ_HIGH : FREQ_LOW;
      osc.frequency.setValueAtTime(freq, time);
    });

    // Step C: STOP
    const totalDuration = (bits.length + 1) * (BIT_DURATION / 1000);
    osc.stop(startTime + totalDuration);

    setStatus(`Sending "${text}"...`);
    
    // Reset status after done
    setTimeout(() => {
      setStatus("Sent!");
      setTimeout(() => setStatus("Idle"), 1000);
    }, (totalDuration * 1000) + 200);
  };

  return (
    <div className="p-6 border-2 border-blue-500 rounded-lg shadow-lg bg-white">
      <h2 className="text-xl font-bold mb-4 text-blue-700">Transmitter</h2>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={10} 
          className="border-2 border-gray-300 p-2 rounded text-black w-full font-mono focus:border-blue-500 outline-none"
          placeholder="Type here..."
        />
        <button 
          onClick={sendMessage}
          disabled={status !== "Idle" && status !== "Sent!"}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded disabled:bg-gray-400 transition-all"
        >
          SEND
        </button>
      </div>
      
      <div className="bg-gray-100 p-3 rounded">
        <p className="text-sm text-gray-600 font-mono">Status: {status}</p>
      </div>
    </div>
  );
}
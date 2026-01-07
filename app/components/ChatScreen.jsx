"use client";
import { useState, useRef, useEffect } from 'react';
import { Send, Wifi, WifiOff } from 'lucide-react';

const ChatScreen = () => {
  // --- UI STATE ---
  const [messages, setMessages] = useState([
    { id: 1, text: "Tap the Red Button to go Online!", type: 'received', time: 'System' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Offline");
  
  // NEW: State for Loading Animation
  const [isReceiving, setIsReceiving] = useState(false); 

  // --- REFS ---
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const isReadingRef = useRef(false);
  const frameRef = useRef(null);
  const messagesEndRef = useRef(null);
  const bitsBufferRef = useRef([]); 
  const isTransmittingRef = useRef(false); 

  // --- CONFIG ---
  const FREQ_LOW = 19000;
  const FREQ_HIGH = 19500;
  const BIT_DURATION = 300;

  // Scroll bottom logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isReceiving]);

  // --- HELPER LOGIC ---
  const stringToBinary = (str) => {
    let binaryArray = [];
    for (let i = 0; i < str.length; i++) {
      let charCode = str.charCodeAt(i);
      let bin = charCode.toString(2).padStart(8, "0"); 
      binaryArray = binaryArray.concat(bin.split("").map(Number));
    }
    return binaryArray;
  };

  const getFreqData = () => {
    if (!analyserRef.current || !audioContextRef.current) return { low: 0, high: 0 };
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(data);
    const ctx = audioContextRef.current;
    const nyquist = ctx.sampleRate / 2;
    const lowIndex = Math.round((FREQ_LOW / nyquist) * bufferLength);
    const highIndex = Math.round((FREQ_HIGH / nyquist) * bufferLength);
    const getMax = (idx) => Math.max(data[idx-1] || 0, data[idx], data[idx+1] || 0);
    return { low: getMax(lowIndex), high: getMax(highIndex) };
  };

  // --- 1. SEND LOGIC ---
  const handleSend = async () => {
    if (!inputText.trim()) return;

    if (isReadingRef.current) {
        setStatus("⚠️ Channel Busy!");
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 
        setTimeout(() => setStatus("Online"), 2000);
        return;
    }
    const { low, high } = getFreqData();
    if (low > 40 || high > 40) {
        setStatus("⚠️ Interference!");
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        setTimeout(() => setStatus("Online"), 2000);
        return;
    }

    isTransmittingRef.current = true;

    const newMsg = { 
        id: Date.now(), 
        text: inputText, 
        type: 'sent', 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    };
    setMessages(prev => [...prev, newMsg]);
    const textToSend = inputText;
    setInputText(""); 

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(FREQ_LOW, ctx.currentTime);
    gain.gain.value = 0.5;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const startTime = ctx.currentTime + 0.1;
    osc.start(startTime);

    osc.frequency.setValueAtTime(FREQ_HIGH, startTime); 
    const bits = stringToBinary(textToSend);
    bits.forEach((bit, index) => {
      const time = startTime + ((index + 1) * (BIT_DURATION / 1000));
      osc.frequency.setValueAtTime(bit === 1 ? FREQ_HIGH : FREQ_LOW, time);
    });

    const totalDuration = (bits.length + 1) * (BIT_DURATION / 1000);
    osc.stop(startTime + totalDuration);

    setTimeout(() => {
        isTransmittingRef.current = false;
    }, (totalDuration * 1000) + 500);
  };

  // --- 2. RECEIVE LOGIC ---
  const toggleListening = async () => {
    if (isListening) {
      window.location.reload(); 
      return;
    }
    try {
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
      setStatus("Online");
      watchForStartBit();
    } catch (err) { alert("Error: " + err.message); }
  };

  const watchForStartBit = () => {
    if (isTransmittingRef.current) {
        frameRef.current = requestAnimationFrame(watchForStartBit);
        return;
    }
    if (isReadingRef.current) return; 

    const { low, high } = getFreqData();
    const NOISE_FLOOR = 30;
    const DIFF = 15;

    if (high > NOISE_FLOOR && high > (low + DIFF)) {
      isReadingRef.current = true;
      setStatus("Incoming...");
      setIsReceiving(true); 
      bitsBufferRef.current = []; 
      setTimeout(readNextBit, BIT_DURATION * 1.5);
    } else {
      frameRef.current = requestAnimationFrame(watchForStartBit);
    }
  };

  const readNextBit = () => {
    const { low, high } = getFreqData();
    let bit = null;

    if (low < 50 && high < 50) { finishReading(); return; }
    
    if (high > (low + 20)) bit = 1;
    else if (low > (high + 20)) bit = 0;
    else { finishReading(); return; }

    bitsBufferRef.current.push(bit);
    setTimeout(readNextBit, BIT_DURATION);
  };

  const finishReading = () => {
    isReadingRef.current = false;
    setIsReceiving(false); 
    setStatus("Online");
    
    const bits = bitsBufferRef.current;
    if (bits.length > 0 && bits.length % 8 === 0) {
        let decodedMsg = "";
        for (let i = 0; i < bits.length; i += 8) {
            const byte = bits.slice(i, i + 8).join("");
            const charCode = parseInt(byte, 2);
            if (charCode >= 32 && charCode <= 126) {
                decodedMsg += String.fromCharCode(charCode);
            }
        }
        
        if (decodedMsg.length > 0) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: decodedMsg,
                type: 'received',
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            }]);
            if (navigator.vibrate) navigator.vibrate(200);
        }
    }
    bitsBufferRef.current = [];
    watchForStartBit();
  };

  return (
    // MAIN CONTAINER: h-full w-full (Inherits from page.js)
    <div className="flex flex-col h-full w-full bg-gray-100 font-sans relative">
      
      {/* CSS Styles for Animations */}
      <style jsx>{`
        @keyframes popIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bounceDelay {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        .animate-pop { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .dot-bounce { animation: bounceDelay 1.2s infinite ease-in-out both; }
        .delay-100 { animation-delay: 0.2s; }
        .delay-200 { animation-delay: 0.4s; }
      `}</style>

      {/* HEADER */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md z-20 shrink-0">
        <div>
          <h1 className="font-bold text-lg tracking-wide">Sonic Chat</h1>
          <div className="flex items-center gap-2 text-xs opacity-90 mt-1 font-mono">
             <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
             {status}
          </div>
        </div>
        <button 
          onClick={toggleListening}
          className={`p-3 rounded-full transition-all active:scale-90 shadow-lg ${
            isListening ? 'bg-blue-800 ring-2 ring-blue-400' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isListening ? <Wifi size={24} /> : <WifiOff size={24} />}
        </button>
      </div>

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ded8] pb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-xl shadow-sm text-[15px] relative leading-relaxed animate-pop ${
                msg.type === 'sent' ? 'bg-[#dcf8c6] text-black rounded-tr-none' : 'bg-white text-black rounded-tl-none'
            }`}>
              <p>{msg.text}</p>
              <span className="text-[10px] text-gray-500 block text-right mt-1 opacity-70">{msg.time}</span>
            </div>
          </div>
        ))}

        {/* LOADING ANIMATION */}
        {isReceiving && (
          <div className="flex justify-start animate-pop">
            <div className="bg-white px-4 py-4 rounded-xl rounded-tl-none shadow-sm flex items-center gap-1.5">
              <div className="w-2 h-2 bg-gray-400 rounded-full dot-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full dot-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full dot-bounce delay-200"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <div className="bg-white p-3 flex items-center gap-2 border-t border-gray-200 shrink-0 safe-area-bottom">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type here..."
          className="flex-1 bg-gray-100 border border-gray-300 text-black text-lg rounded-full px-5 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          disabled={!isListening}
          className={`p-4 rounded-full text-white transition-all shadow-md active:scale-90 flex items-center justify-center ${
            isListening && inputText.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Send size={24} />
        </button>
      </div>
    </div>
  );
}

export default ChatScreen;
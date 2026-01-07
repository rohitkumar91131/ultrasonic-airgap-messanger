export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Privacy Policy for Sonic Chat</h1>
        <p className="mb-4 text-gray-600">Last Updated: January 2026</p>

        <h2 className="text-xl font-bold mt-6 mb-2">1. Microphone Access</h2>
        <p className="text-gray-700 mb-4">
          Sonic Chat requires access to your device's microphone solely to detect 
          ultrasonic sound waves (19kHz) for data transmission purposes.
        </p>

        <h2 className="text-xl font-bold mt-6 mb-2">2. No Recording</h2>
        <p className="text-gray-700 mb-4">
          <strong>We do not record, store, or transmit your voice data to any server.</strong> 
          All audio processing happens locally on your device (Client-Side) using the Web Audio API. 
          The raw audio data is analyzed in real-time to decode binary signals and is immediately discarded.
        </p>

        <h2 className="text-xl font-bold mt-6 mb-2">3. Data Collection</h2>
        <p className="text-gray-700 mb-4">
          This is an offline-first PWA. We do not collect any personal data, IP addresses, or chat logs.
          Your messages disappear when you refresh the page.
        </p>

        <h2 className="text-xl font-bold mt-6 mb-2">4. Contact</h2>
        <p className="text-gray-700">
          This is an open-source educational project. 
          For concerns, contact: rohit@rohits.online
        </p>
      </div>
    </div>
  );
}
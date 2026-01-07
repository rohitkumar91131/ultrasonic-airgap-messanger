"use client";
import dynamic from 'next/dynamic';

// SSR False zaroori hai audio/mic ke liye
const ChatScreen = dynamic(() => import('./components/ChatScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[100dvh] bg-gray-100 text-gray-500 font-mono animate-pulse">
      Loading Sonic Chat...
    </div>
  )
});

export default function Home() {
  return (
    // OUTER CONTAINER (Desktop Background)
    <main className="min-h-[100dvh] bg-gray-200 flex items-center justify-center">
      
      {/* APP CONTAINER
          1. Mobile: w-full h-[100dvh] -> Poori screen lega.
          2. Desktop: md:h-[85vh] md:w-[450px] -> Ek phone size ka box banega.
          3. Styling: Shadow aur Rounded corners sirf desktop pe dikhenge.
      */}
      <div className="
        w-full h-[100dvh] 
        md:h-[85vh] md:w-[480px] 
        bg-white 
        md:rounded-3xl md:shadow-2xl md:border md:border-gray-300 
        overflow-hidden flex flex-col relative
      ">
        <ChatScreen />
      </div>

    </main>
  );
}
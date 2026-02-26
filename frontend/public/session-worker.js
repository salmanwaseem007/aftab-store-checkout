// Session Keep-Alive Web Worker
// Runs every 60 seconds and posts keep-alive messages to the main thread

let intervalId = null;

// Start the keep-alive interval
function startKeepAlive() {
  // Clear any existing interval
  if (intervalId) {
    clearInterval(intervalId);
  }

  // Set up 60-second interval
  intervalId = setInterval(() => {
    console.log('Session keep-alive: mousemove event triggered');
    
    // Post message to main thread
    self.postMessage({ type: 'keep-alive' });
  }, 60000); // 60 seconds
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type } = event.data;

  if (type === 'start') {
    startKeepAlive();
    self.postMessage({ type: 'started' });
  } else if (type === 'stop') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    self.postMessage({ type: 'stopped' });
  }
});

// Initial message to confirm worker is ready
self.postMessage({ type: 'ready' });


import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { FaMicrophone, FaVolumeUp } from 'react-icons/fa';

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const responseRef = useRef(null);
  const recognitionRef = useRef(null);

  // 🎤 Setup speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => prev + ' ' + transcript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 🗣️ Ensure voices are loaded
  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  // 🌐 Language detector for speech synthesis
  function detectLanguage(text) {
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bangla
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh'; // Chinese
    if (/[\u3040-\u30ff]/.test(text)) return 'ja'; // Japanese
    if (/[\uac00-\ud7af]/.test(text)) return 'ko'; // Korean
    if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
    if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Russian
    if (/[\u0e00-\u0e7f]/.test(text)) return 'th'; // Thai
    if (/[\u0100-\u017F]/.test(text)) return 'pl'; // Polish
    if (/[\u0370-\u03FF]/.test(text)) return 'el'; // Greek
    if (/[\u0590-\u05FF]/.test(text)) return 'he'; // Hebrew
    if (/[\u1780-\u17FF]/.test(text)) return 'km'; // Khmer
    if (/[\u1000-\u109F]/.test(text)) return 'my'; // Burmese
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or'; // Odia
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0D80-\u0DFF]/.test(text)) return 'si'; // Sinhala
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u1E00-\u1EFF]/.test(text)) return 'vi'; // Vietnamese
    return 'en';
  }

  // 📥 Get full page context from content script
  const getPageContext = () => {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) return resolve({ text: '', imageBase64: null, url: '' });
        chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' }, (res) => {
          resolve({
            text: res?.text || '',
            imageBase64: res?.imageBase64 || null,
            url: tab.url || '',
          });
        });
      });
    });
  };

  // 🧠 Submit prompt to FastAPI backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse('Loading...');

    try {
      const { text, imageBase64, url } = await getPageContext();
      const lang = 'Auto';

      const context = `Website: ${url}\nLanguage: ${lang}\n\nPage Text:\n${text.slice(0, 2000)}\n\nImage Base64:\n${imageBase64 ? imageBase64.substring(0, 300) + '...' : 'none'}`;

      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      const data = await res.json();
      const resp = data.response?.trim();
      setResponse(resp && resp.toLowerCase() !== 'none' ? resp : 'No response received.');
    } catch (err) {
      console.error(err);
      setResponse('❌ Failed to get a response. Check server or CORS.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        responseRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  return (
    <div className="chat-container">
      <h1 className="app-title">Promptly AI</h1>

      <form className="chat-form" onSubmit={handleSubmit}>
        <label htmlFor="prompt" className="input-label">Ask something about this page:</label>
        <textarea
          id="prompt"
          className="chat-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Summarize this page or list key features..."
          required
        />

        <button
          type="button"
          className="mic-button"
          onClick={() => recognitionRef.current?.start()}
        >
          <FaMicrophone />
          {listening ? 'Listening...' : 'Speak'}
        </button>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Thinking...' : 'Submit'}
        </button>
      </form>

      <div className="response-container" ref={responseRef}>
        <h2 className="response-title">Response</h2>
        <div className="chat-response">{response}</div>

        {response && (
          <button
            className="speak-button"
            onClick={() => {
              const utterance = new SpeechSynthesisUtterance(response);
              const voices = window.speechSynthesis.getVoices();
              const lang = detectLanguage(response);
              const voice = voices.find((v) => v.lang.toLowerCase().startsWith(lang));

              if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
              } else {
                utterance.lang = lang;
              }

              window.speechSynthesis.speak(utterance);
            }}
          >
            <FaVolumeUp /> Speak Response
          </button>
        )}
      </div>
    </div>
  );
}

export default App;

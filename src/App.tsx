import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, StopCircle, Trash2, ArrowLeft, Copy, CreditCard, ThumbsUp, ThumbsDown, X, AlertTriangle, CheckCircle, Info, AlertCircle, Cpu, ExternalLink } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

function App() {
  // State variables
  const [status, setStatus] = useState('Aguardando inicio...');
  const [activeTab, setActiveTab] = useState('home');
  const [cookie, setCookie] = useState('');
  const [cardList, setCardList] = useState('');
  const [threadCount, setThreadCount] = useState(2);
  const [stats, setStats] = useState({
    lives: 0,
    dies: 0,
    errors: 0,
    tested: 0,
    total: 0
  });
  const [results, setResults] = useState({
    lives: [] as string[],
    dies: [] as string[],
    errors: [] as string[]
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs
  const livesRef = useRef<HTMLDivElement>(null);
  
  // Helper functions
  const removeLine = () => {
    const lines = cardList.split('\n');
    lines.splice(0, 1);
    setCardList(lines.join('\n'));
  };
  
  const copyLives = () => {
    if (livesRef.current) {
      const range = document.createRange();
      range.selectNode(livesRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      
      try {
        document.execCommand('copy');
        window.getSelection()?.removeAllRanges();
        showToast('Copiado para a área de transferência!', 'success');
      } catch (err) {
        showToast('Erro ao copiar', 'error');
      }
    }
  };
  
  const clearLives = () => {
    setResults(prev => ({ ...prev, lives: [] }));
    showToast('Aprovadas limpas', 'info');
  };
  
  const clearDies = () => {
    setResults(prev => ({ ...prev, dies: [] }));
    showToast('Reprovadas limpas', 'info');
  };
  
  const clearErrors = () => {
    setResults(prev => ({ ...prev, errors: [] }));
    showToast('Erros limpos', 'info');
  };
  
  // Toast notification system
  const showToast = (message: string, type: string) => {
    switch(type) {
      case 'success':
        toast.success(message, {
          icon: <CheckCircle className="text-green-500" size={18} />,
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid #1e293b'
          }
        });
        break;
      case 'error':
        toast.error(message, {
          icon: <AlertCircle className="text-red-500" size={18} />,
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid #1e293b'
          }
        });
        break;
      case 'warning':
        toast.error(message, {
          icon: <AlertTriangle className="text-yellow-500" size={18} />,
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid #1e293b'
          }
        });
        break;
      default:
        toast(message, {
          icon: <Info className="text-blue-500" size={18} />,
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid #1e293b'
          }
        });
    }
  };
  
  // Check API connection
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        // Make a simple request to check if the API is running
        await axios.post('http://localhost:5000/api/check-card', { 
          card: 'connection-test',
          cookie: 'test'
        });
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
        console.error('API connection failed:', error);
      }
    };
    
    checkConnection();
  }, []);
  
  // Mock audio for live cards
  const audio = {
    play: () => console.log('Playing audio')
  };
  
  // Main checker function
  const testCard = async (tested: number, total: number, list: string[], threadId: number) => {
    if (!isRunning || isPaused || tested >= total) {
      if (tested >= total && threadId === 0) {
        setStatus('Teste finalizado');
        setIsRunning(false);
        showToast(`Teste de ${total} itens finalizado`, 'success');
      }
      return;
    }
    
    // Calculate which card this thread should process
    const cardIndex = tested * threadCount + threadId;
    if (cardIndex >= list.length) return;
    
    const card = list[cardIndex];
    
    try {
      // Make API request to the Express server
      const response = await axios.post('http://localhost:5000/api/check-card', {
        card,
        cookie
      });
      
      const data = response.data;
      
      if (data.status === 'live') {
        // Live card
        setStats(prev => ({ ...prev, lives: prev.lives + 1 }));
        setResults(prev => ({ ...prev, lives: [...prev.lives, data.message] }));
        setStatus(`${card} -> LIVE`);
        showToast(`Aprovada! ${card}`, 'success');
        audio.play();
      } else if (data.status === 'die') {
        // Dead card
        setStats(prev => ({ ...prev, dies: prev.dies + 1 }));
        setResults(prev => ({ ...prev, dies: [...prev.dies, data.message] }));
        setStatus(`${card} -> DIE`);
        showToast(`Reprovada! ${card}`, 'error');
      } else {
        // Error
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        setResults(prev => ({ ...prev, errors: [...prev.errors, data.message] }));
        setStatus(`${card} -> ERROR`);
        showToast(`Ocorreu um erro! ${card}`, 'warning');
      }
      
      setStats(prev => ({ ...prev, tested: prev.tested + 1 }));
      
      // Only remove line if this is the first thread
      if (threadId === 0) {
        removeLine();
      }
      
      // Continue testing next card
      testCard(tested + 1, Math.ceil(total / threadCount), list, threadId);
    } catch (error) {
      // Handle API error
      setStats(prev => ({ ...prev, errors: prev.errors + 1, tested: prev.tested + 1 }));
      const errorMessage = `Erro | ${card} | Motivo: Falha na conexão com o servidor`;
      setResults(prev => ({ ...prev, errors: [...prev.errors, errorMessage] }));
      setStatus(`${card} -> ERROR`);
      showToast(`Erro de conexão! ${card}`, 'warning');
      
      // Only remove line if this is the first thread
      if (threadId === 0) {
        removeLine();
      }
      
      // Continue testing next card
      testCard(tested + 1, Math.ceil(total / threadCount), list, threadId);
    }
  };
  
  // Action handlers
  const handleStart = () => {
    if (!isConnected) {
      showToast('Servidor API não está disponível. Verifique se o servidor está rodando na porta 5000.', 'error');
      return;
    }
    
    if (!cardList.trim()) {
      showToast('Insira uma lista de cartões', 'error');
      return;
    }
    
    const list = cardList.trim().split('\n');
    const total = list.length;
    
    setStats({
      lives: 0,
      dies: 0,
      errors: 0,
      tested: 0,
      total
    });
    
    setResults({
      lives: [],
      dies: [],
      errors: []
    });
    
    setIsRunning(true);
    setIsPaused(false);
    setStatus('Checker iniciado, aguarde...');
    showToast(`Checker Iniciado com ${threadCount} threads`, 'success');
    
    // Start testing with multiple threads
    for (let i = 0; i < threadCount; i++) {
      testCard(0, Math.ceil(total / threadCount), list, i);
    }
  };
  
  const handlePause = () => {
    setIsPaused(true);
    setStatus('Checker pausado...');
    showToast('Checker Pausado!', 'info');
  };
  
  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setStatus('Checker parado...');
    showToast('Checker Parado!', 'info');
  };
  
  const handleClean = () => {
    setCardList('');
    setCookie('');
    setStats({
      lives: 0,
      dies: 0,
      errors: 0,
      tested: 0,
      total: 0
    });
    setResults({
      lives: [],
      dies: [],
      errors: []
    });
    setStatus('Aguardando inicio...');
    showToast('Checker Limpo!', 'info');
  };
  
  // Simple fade transitions
  const fadeTransition = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0f172a] to-[#1e293b] opacity-90"></div>
      
      {/* Toast notifications */}
      <Toaster position="top-right" />
      
      <div className="container mx-auto p-4 relative z-10">
        {/* Header */}
        <motion.div 
          className="mb-6"
          {...fadeTransition}
        >
          <button 
            className="bg-[#1e293b] hover:bg-[#334155] transition-colors px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 border border-[#475569]/30"
            onClick={() => window.location.href = '/'}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </motion.div>
        
        {/* Main panel */}
        <motion.div 
          className="bg-[#1e293b]/80 rounded-xl shadow-lg p-6 mb-6 border border-[#475569]/30 backdrop-blur-sm"
          {...fadeTransition}
        >
          <div className="container-fluid">
            <h3 className="text-2xl font-bold flex items-center gap-3 mb-2 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              <CreditCard className="text-blue-400" /> CHECKER ALLBINS PRE-AUTH [GATE AMAZON]
            </h3>
            <div className="text-sm text-gray-300 border-b border-[#475569]/30 pb-4">
              <span className="font-medium">
                Usuário: <span className="text-blue-400">Demo</span> | 
                Expira em: <span className="text-blue-400">01/01/2026</span> | 
                Último Login: <span className="text-blue-400">01/01/2025</span>
              </span>
            </div>
            
            {/* API Status Indicator */}
            <div className="mt-3 flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-300">
                API: {isConnected ? 
                  <span className="text-green-400">Conectada (Porta 5000)</span> : 
                  <span className="text-red-400">Desconectada (Verifique o servidor)</span>
                }
              </span>
            </div>
          </div>
          
          {/* Thread selection */}
          <div className="mt-4 mb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="text-sm text-gray-300 font-medium flex items-center gap-1.5">
                <Cpu size={16} className="text-blue-400" /> Threads:
              </label>
              <div className="flex gap-2">
                {[2, 4, 6].map(count => (
                  <button
                    key={count}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      threadCount === count 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-[#1e293b] text-gray-300 hover:bg-[#334155]'
                    }`}
                    onClick={() => setThreadCount(count)}
                  >
                    {count}x
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-400 ml-0 sm:ml-2">
                {threadCount === 2 
                  ? 'Velocidade normal, menor consumo' 
                  : threadCount === 4 
                    ? 'Velocidade média, consumo moderado' 
                    : 'Velocidade máxima, maior consumo'}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button 
              className={`bg-[#1e40af] hover:bg-[#1e3a8a] transition-colors px-5 py-2.5 rounded-lg shadow flex items-center gap-2 font-medium ${(isRunning && !isPaused) || !isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleStart}
              disabled={(isRunning && !isPaused) || !isConnected}
            >
              <Play size={18} /> Iniciar
            </button>
            <button 
              className={`bg-[#0369a1] hover:bg-[#0c4a6e] transition-colors px-5 py-2.5 rounded-lg shadow flex items-center gap-2 font-medium ${!isRunning || isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handlePause}
              disabled={!isRunning || isPaused}
            >
              <Pause size={18} /> Pausar
            </button>
            <button 
              className={`bg-[#b91c1c] hover:bg-[#991b1b] transition-colors px-5 py-2.5 rounded-lg shadow flex items-center gap-2 font-medium ${!isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleStop}
              disabled={!isRunning}
            >
              <StopCircle size={18} /> Parar
            </button>
            <button 
              className="bg-[#4f46e5] hover:bg-[#4338ca] transition-colors px-5 py-2.5 rounded-lg shadow flex items-center gap-2 font-medium"
              onClick={handleClean}
            >
              <Trash2 size={18} /> Limpar
            </button>
          </div>
          
          {/* Status */}
          <div className="mt-6">
            <span 
              className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                status.includes('LIVE') ? 'bg-green-500/80' :
                status.includes('DIE') ? 'bg-red-500/80' :
                status.includes('ERROR') ? 'bg-yellow-500/80' :
                status.includes('pausado') ? 'bg-blue-500/80' :
                status.includes('parado') ? 'bg-gray-500/80' :
                status.includes('finalizado') ? 'bg-green-700/80' : 'bg-yellow-500/80'
              }`}
            >
              {status}
            </span>
          </div>
        </motion.div>
        
        {/* Tabs */}
        <motion.div 
          className="bg-[#1e293b]/80 rounded-xl shadow-lg overflow-hidden border border-[#475569]/30 backdrop-blur-sm"
          {...fadeTransition}
        >
          {/* Tab headers */}
          <div className="flex flex-wrap border-b border-[#475569]/50">
            <button 
              className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 font-medium transition-colors ${activeTab === 'home' ? 'bg-[#0f172a] text-blue-400' : 'bg-[#1e293b] hover:bg-[#0f172a]/50'}`}
              onClick={() => setActiveTab('home')}
            >
              <CreditCard size={18} className={activeTab === 'home' ? 'text-blue-400' : ''} /> 
              <span className="hidden sm:inline">Cartões</span>
            </button>
            <button 
              className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 font-medium transition-colors ${activeTab === 'lives' ? 'bg-[#0f172a] text-green-400' : 'bg-[#1e293b] hover:bg-[#0f172a]/50'}`}
              onClick={() => setActiveTab('lives')}
            >
              <ThumbsUp size={18} className={activeTab === 'lives' ? 'text-green-400' : ''} /> 
              <span className="hidden sm:inline">Aprovadas</span>
            </button>
            <button 
              className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 font-medium transition-colors ${activeTab === 'dies' ? 'bg-[#0f172a] text-red-400' : 'bg-[#1e293b] hover:bg-[#0f172a]/50'}`}
              onClick={() => setActiveTab('dies')}
            >
              <ThumbsDown size={18} className={activeTab === 'dies' ? 'text-red-400' : ''} /> 
              <span className="hidden sm:inline">Reprovadas</span>
            </button>
            <button 
              className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 font-medium transition-colors ${activeTab === 'errors' ? 'bg-[#0f172a] text-yellow-400' : 'bg-[#1e293b] hover:bg-[#0f172a]/50'}`}
              onClick={() => setActiveTab('errors')}
            >
              <X size={18} className={activeTab === 'errors' ? 'text-yellow-400' : ''} /> 
              <span className="hidden sm:inline">Erros</span>
            </button>
          </div>
          
          {/* Tab content */}
          <div className="bg-[#0f172a] p-4 sm:p-6">
            <AnimatePresence mode="wait">
              {/* Home tab */}
              {activeTab === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6 text-sm">
                    <div className="bg-[#1e293b]/50 p-3 rounded-lg border border-[#475569]/20 flex flex-col items-center">
                      <span className="text-gray-400 mb-1">Aprovadas</span>
                      <span className="text-xl sm:text-2xl font-bold text-green-400">{stats.lives}</span>
                    </div>
                    <div className="bg-[#1e293b]/50 p-3 rounded-lg border border-[#475569]/20 flex flex-col items-center">
                      <span className="text-gray-400 mb-1">Reprovadas</span>
                      <span className="text-xl sm:text-2xl font-bold text-red-400">{stats.dies}</span>
                    </div>
                    <div className="bg-[#1e293b]/50 p-3 rounded-lg border border-[#475569]/20 flex flex-col items-center">
                      <span className="text-gray-400 mb-1">Erros</span>
                      <span className="text-xl sm:text-2xl font-bold text-yellow-400">{stats.errors}</span>
                    </div>
                    <div className="bg-[#1e293b]/50 p-3 rounded-lg border border-[#475569]/20 flex flex-col items-center">
                      <span className="text-gray-400 mb-1">Testadas</span>
                      <span className="text-xl sm:text-2xl font-bold text-blue-400">{stats.tested}</span>
                    </div>
                    <div className="bg-[#1e293b]/50 p-3 rounded-lg border border-[#475569]/20 flex flex-col items-center">
                      <span className="text-gray-400 mb-1">Total</span>
                      <span className="text-xl sm:text-2xl font-bold text-indigo-400">{stats.total}</span>
                    </div>
                  </div>
                  
                  <div className="mb-5">
                    <label className="text-sm text-gray-300 mb-2 block">Cookie Amazon</label>
                    <input 
                      type="text" 
                      placeholder="INSIRA COOKIE : AMAZON.IT" 
                      className="w-full bg-[#0f172a] border border-[#475569]/50 rounded-lg p-3 sm:p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      value={cookie}
                      onChange={(e) => setCookie(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Lista de Cartões</label>
                    <textarea 
                      placeholder="Insira sua lista de cartões (um por linha)..." 
                      rows={10} 
                      className="w-full bg-[#0f172a] border border-[#475569]/50 rounded-lg p-3 sm:p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors resize-none"
                      value={cardList}
                      onChange={(e) => setCardList(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
              
              {/* Lives tab */}
              {activeTab === 'lives' && (
                <motion.div
                  key="lives"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <div>
                      <h5 className="text-xl font-semibold text-green-400 mb-1">Aprovadas</h5>
                      <div className="text-sm text-gray-300">Total: <span className="font-bold text-green-400">{stats.lives}</span></div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        className="bg-[#1e293b] hover:bg-[#334155] border border-[#475569]/30 transition-colors px-3 py-2 rounded-lg shadow flex items-center gap-2"
                        onClick={copyLives}
                      >
                        <Copy size={16} className="text-blue-400" />
                        <span className="text-sm">Copiar</span>
                      </button>
                      <button 
                        className="bg-[#1e293b] hover:bg-[#334155] border border-[#475569]/30 transition-colors px-3 py-2 rounded-lg shadow flex items-center gap-2"
                        onClick={clearLives}
                      >
                        <Trash2 size={16} className="text-red-400" />
                        <span className="text-sm">Limpar</span>
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    ref={livesRef} 
                    className="max-h-[300px] sm:max-h-[400px] overflow-auto bg-[#0f172a] p-4 rounded-lg border border-[#475569]/30 shadow-inner"
                  >
                    {results.lives.length === 0 ? (
                      <div className="text-gray-400 text-center py-8">Nenhum cartão aprovado ainda</div>
                    ) : (
                      results.lives.map((live, index) => (
                        <div 
                          key={index} 
                          className="text-green-400 mb-2 p-2 border-b border-[#475569]/10 last:border-0 text-sm sm:text-base break-all"
                        >
                          {live}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Dies tab */}
              {activeTab === 'dies' && (
                <motion.div
                  key="dies"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <div>
                      <h5 className="text-xl font-semibold text-red-400 mb-1">Reprovadas</h5>
                      <div className="text-sm text-gray-300">Total: <span className="font-bold text-red-400">{stats.dies}</span></div>
                    </div>
                    
                    <button 
                      className="bg-[#1e293b] hover:bg-[#334155] border border-[#475569]/30 transition-colors px-3 py-2 rounded-lg shadow flex items-center gap-2 self-start sm:self-auto"
                      onClick={clearDies}
                    >
                      <Trash2 size={16} className="text-red-400" />
                      <span className="text-sm">Limpar</span>
                    </button>
                  </div>
                  
                  <div 
                    className="max-h-[300px] sm:max-h-[400px] overflow-auto bg-[#0f172a] p-4 rounded-lg border border-[#475569]/30 shadow-inner"
                  >
                    {results.dies.length === 0 ? (
                      <div className="text-gray-400 text-center py-8">Nenhum cartão reprovado ainda</div>
                    ) : (
                      results.dies.map((die, index) => (
                        <div 
                          key={index} 
                          className="text-red-400 mb-2 p-2 border-b border-[#475569]/10 last:border-0 text-sm sm:text-base break-all"
                        >
                          {die}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Errors tab */}
              {activeTab === 'errors' && (
                <motion.div
                  key="errors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <div>
                      <h5 className="text-xl font-semibold text-yellow-400 mb-1">Erros</h5>
                      <div className="text-sm text-gray-300">Total: <span className="font-bold text-yellow-400">{stats.errors}</span></div>
                    </div>
                    
                    <button 
                      className="bg-[#1e293b] hover:bg-[#334155] border border-[#475569]/30 transition-colors px-3 py-2 rounded-lg shadow flex items-center gap-2 self-start sm:self-auto"
                      onClick={clearErrors}
                    >
                      <Trash2 size={16} className="text-red-400" />
                      <span className="text-sm">Limpar</span>
                    </button>
                  </div>
                  
                  <div 
                    className="max-h-[300px] sm:max-h-[400px] overflow-auto bg-[#0f172a] p-4 rounded-lg border border-[#475569]/30 shadow-inner"
                  >
                    {results.errors.length === 0 ? (
                      <div className="text-gray-400 text-center py-8">Nenhum erro encontrado ainda</div>
                    ) : (
                      results.errors.map((error, index) => (
                        <div 
                          key={index} 
                          className="text-yellow-400 mb-2 p-2 border-b border-[#475569]/10 last:border-0 text-sm sm:text-base break-all"
                        >
                          {error}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="text-gray-300 text-sm mb-1">
            Sistema desenvolvido por <span className="font-bold text-blue-400">@PladixOficial</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <a 
              href="https://t.me/pladixoficial" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-400 transition-colors text-xs flex items-center gap-1"
            >
              <ExternalLink size={12} />
              t.me/pladixoficial
            </a>
          </div>
          <div className="text-gray-500 text-xs mt-2">
            CHECKER ALLBINS PRE-AUTH © 2025
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;